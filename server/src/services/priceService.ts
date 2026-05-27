import { redis } from '../lib/redis';
import { supabase } from '../lib/supabase';
import { getKrogerToken } from '../lib/krogerAuth';
import { scalePrice } from '../lib/unitConversion';
import { krogerProvider } from '../providers/krogerProvider';
import { PriceRequest, PriceResponse, ResolvedIngredient, Substitution } from '../types/price';

const KROGER_BASE = 'https://api.kroger.com/v1';
const PRICE_TTL_SECONDS = 24 * 60 * 60; // 24 hours

export class PriceServiceError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'PriceServiceError';
  }
}

interface IngredientMapRow {
  canonical_name: string;
  kroger_sku: string | null;
  preferred_sku: string | null;
  usda_avg_price: number | null;
  unit: string | null;
  is_produce: boolean;
  is_pantry_staple: boolean;
  budget_tier: string;
}

interface RecipeIngredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
}

interface KrogerProduct {
  productId: string;
  upc: string;
  items: Array<{
    size: string;
    price?: { regular: number; promo: number };
    inventory?: { stockLevel?: string }; // "HIGH" | "LOW" | "TEMPORARILY_OUT_OF_STOCK"
  }>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function resolvePrice(req: PriceRequest): Promise<PriceResponse> {
  const pantrySet = new Set(req.pantryItems ?? []);

  // ── 1. Redis cache ────────────────────────────────────────────────────────
  const cacheKey = `price:${req.recipeId}:${req.locationId}:${req.budgetMode}`;
  const cached = await redis.get<PriceResponse>(cacheKey);
  if (cached) return cached;

  // ── 2. Fetch recipe from Postgres ─────────────────────────────────────────
  const { data: recipeRows, error: recipeError } = await supabase
    .from('recipe_cache')
    .select('ingredients')
    .eq('cache_key', req.recipeId)
    .limit(1);

  if (recipeError || !recipeRows || recipeRows.length === 0) {
    throw new PriceServiceError('Recipe not found');
  }

  const ingredients = (recipeRows[0] as { ingredients: RecipeIngredient[] }).ingredients;
  const ingredientNames = ingredients.map((i) => i.name);

  // ── 3. Bulk fetch ingredient_map rows ─────────────────────────────────────
  const { data: mapData } = await supabase
    .from('ingredient_map')
    .select('canonical_name, kroger_sku, preferred_sku, usda_avg_price, unit, is_produce, is_pantry_staple, budget_tier')
    .in('canonical_name', ingredientNames);

  const mapByName = new Map<string, IngredientMapRow>(
    (mapData ?? []).map((r) => [r.canonical_name, r as IngredientMapRow]),
  );

  // ── 4. Insert unrecognized ingredients ────────────────────────────────────
  const unrecognized = ingredientNames.filter((name) => !mapByName.has(name));
  for (const name of unrecognized) {
    const newRow: IngredientMapRow = {
      canonical_name: name,
      kroger_sku: null,
      preferred_sku: null,
      usda_avg_price: null,
      unit: null,
      is_produce: false,
      is_pantry_staple: false,
      budget_tier: 'standard',
    };
    mapByName.set(name, newRow);
    // Fire-and-forget — ignore conflict if another request already inserted
    supabase.from('ingredient_map')
      .insert({ canonical_name: name, is_produce: false, budget_tier: 'standard' })
      .then(() => {});
  }

  // ── 5. Budget mode substitution ───────────────────────────────────────────
  const substitutionsApplied: Substitution[] = [];

  if (req.budgetMode) {
    const premiumNames = [...mapByName.values()]
      .filter((r) => r.budget_tier === 'premium')
      .map((r) => r.canonical_name);

    if (premiumNames.length > 0) {
      const { data: subs } = await supabase
        .from('ingredient_substitutions')
        .select('from_name, to_name, notes')
        .in('from_name', premiumNames)
        .eq('direction', 'budget');

      if (subs && subs.length > 0) {
        const subNames = subs.map((s: { to_name: string }) => s.to_name);
        const { data: subRows } = await supabase
          .from('ingredient_map')
          .select('canonical_name, kroger_sku, preferred_sku, usda_avg_price, unit, is_produce, is_pantry_staple, budget_tier')
          .in('canonical_name', subNames);

        const subRowByName = new Map<string, IngredientMapRow>(
          (subRows ?? []).map((r) => [r.canonical_name, r as IngredientMapRow]),
        );

        for (const sub of subs as Array<{ from_name: string; to_name: string; notes: string | null }>) {
          const substituteRow = subRowByName.get(sub.to_name);
          if (substituteRow) {
            mapByName.set(sub.from_name, substituteRow);
            substitutionsApplied.push({
              originalName: sub.from_name,
              substituteName: sub.to_name,
              notes: sub.notes ?? undefined,
            });
          }
        }
      }
    }
  }

  // ── 6. Partition into buckets ─────────────────────────────────────────────
  type BucketItem = { ingredient: RecipeIngredient; mapRow: IngredientMapRow };
  const bucketA: BucketItem[] = []; // produce → USDA
  const bucketB: BucketItem[] = []; // known kroger_sku → batch call
  const bucketC: BucketItem[] = []; // no sku, not produce → live name search

  for (const ingredient of ingredients) {
    const mapRow = mapByName.get(ingredient.name);
    if (!mapRow) continue;
    if (mapRow.is_produce) {
      bucketA.push({ ingredient, mapRow });
    } else if (mapRow.kroger_sku) {
      bucketB.push({ ingredient, mapRow });
    } else {
      bucketC.push({ ingredient, mapRow });
    }
  }

  // ── 7. Bucket B — single batch Kroger SKU call ───────────────────────────
  // key: upc → { price, size, inStock }
  const skuResults = new Map<string, { price: number; size: string; inStock: boolean }>();

  if (bucketB.length > 0) {
    const uniqueSkus = [...new Set(bucketB.map((b) => b.mapRow.kroger_sku!))];
    const params = new URLSearchParams({
      'filter.productId': uniqueSkus.join(','),
      'filter.locationId': req.locationId,
      'filter.fulfillment': 'ais',
    });

    try {
      const token = await getKrogerToken();
      const res = await fetch(`${KROGER_BASE}/products?${params}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });

      if (res.status === 429) {
        console.warn('[priceService] Kroger API rate limit (429) on batch SKU call');
      } else if (res.ok) {
        const data = await res.json() as { data: KrogerProduct[] };
        for (const product of (data.data ?? [])) {
          const item = product.items?.[0];
          const price = item?.price?.regular ?? item?.price?.promo;
          if (price != null) {
            const stockLevel = item?.inventory?.stockLevel;
            skuResults.set(product.upc, {
              price,
              size: item.size ?? '',
              inStock: stockLevel === 'HIGH' || stockLevel === 'LOW',
            });
          }
        }
      }
    } catch (err) {
      console.error('[priceService] Bucket B batch call failed:', err);
    }
  }

  // ── 8. Bucket C — sequential live name searches ──────────────────────────
  // key: canonical_name (resolved, possibly substitute) → { price, size, sku, inStock }
  const nameResults = new Map<string, { price: number; size: string; sku: string; inStock: boolean }>();

  for (const { ingredient, mapRow } of bucketC) {
    const searchName = mapRow.canonical_name;
    const result = await krogerProvider.searchByName(searchName, req.locationId);

    if (result) {
      nameResults.set(searchName, { price: result.price, size: result.size, sku: result.sku, inStock: result.inStock });
      // Async writeback — does not block response
      supabase.from('ingredient_map').update({
        kroger_sku: result.sku,
        preferred_sku: result.sku,
        price_source: 'kroger',
        updated_at: new Date().toISOString(),
      }).eq('canonical_name', searchName).then(() => {});
    }

    await sleep(100);
  }

  // ── 9. Assemble ResolvedIngredient[] ─────────────────────────────────────
  const resolvedIngredients: ResolvedIngredient[] = [];

  for (const ingredient of ingredients) {
    const mapRow = mapByName.get(ingredient.name);
    if (!mapRow) continue;

    let rawPrice: number;
    let packageSize: string;
    let source: 'kroger' | 'usda_avg';
    let isEstimate: boolean;
    let krogerSku: string | undefined;
    let inStock: boolean | undefined;

    if (mapRow.is_produce) {
      // Bucket A: always USDA
      rawPrice = mapRow.usda_avg_price ?? 0;
      packageSize = mapRow.unit ?? 'lb';
      source = 'usda_avg';
      isEstimate = true;
      inStock = undefined;
    } else if (mapRow.kroger_sku) {
      // Bucket B: batch result or USDA fallback
      const hit = skuResults.get(mapRow.kroger_sku);
      if (hit) {
        rawPrice = hit.price;
        packageSize = hit.size;
        source = 'kroger';
        isEstimate = false;
        krogerSku = mapRow.kroger_sku;
        inStock = hit.inStock;
      } else {
        rawPrice = mapRow.usda_avg_price ?? 0;
        packageSize = mapRow.unit ?? 'lb';
        source = 'usda_avg';
        isEstimate = true;
        inStock = undefined;
      }
    } else {
      // Bucket C: live search result or USDA fallback
      const hit = nameResults.get(mapRow.canonical_name);
      if (hit) {
        rawPrice = hit.price;
        packageSize = hit.size;
        source = 'kroger';
        isEstimate = false;
        krogerSku = hit.sku;
        inStock = hit.inStock;
      } else {
        rawPrice = mapRow.usda_avg_price ?? 0;
        packageSize = mapRow.unit ?? 'lb';
        source = 'usda_avg';
        isEstimate = true;
        inStock = undefined;
      }
    }

    const scaledPrice = scalePrice(ingredient.quantity, ingredient.unit, packageSize, rawPrice, mapRow.canonical_name);
    const pantryOwned = pantrySet.has(mapRow.canonical_name);
    const price = pantryOwned ? 0 : scaledPrice;
    const pricePerUnit = ingredient.quantity > 0 ? price / ingredient.quantity : 0;

    resolvedIngredients.push({
      name: mapRow.canonical_name,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      price,
      pricePerUnit,
      source,
      isEstimate,
      krogerSku,
      inStock,
      ...(pantryOwned ? { pantryOwned: true } : {}),
    });
  }

  // ── 10. Assemble and cache response ──────────────────────────────────────
  const totalCost = resolvedIngredients.reduce((sum, i) => sum + i.price, 0);

  const response: PriceResponse = {
    recipeId: req.recipeId,
    resolvedAt: new Date().toISOString(),
    store: { name: 'Kroger', locationId: req.locationId },
    ingredients: resolvedIngredients,
    totalCost,
    budgetMode: req.budgetMode,
    substitutionsApplied,
  };

  await redis.set(cacheKey, response, { ex: PRICE_TTL_SECONDS });
  return response;
}
