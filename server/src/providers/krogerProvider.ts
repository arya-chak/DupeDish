import { getKrogerToken } from '../lib/krogerAuth';
import { GroceryProvider, ProviderResult } from './groceryProvider';

const KROGER_BASE = 'https://api.kroger.com/v1';

interface KrogerItem {
  itemId: string;
  size: string;
  soldBy: string;
  price?: { regular: number; promo: number };
  inventory?: { stockLevel?: string }; // "HIGH" | "LOW" | "TEMPORARILY_OUT_OF_STOCK"
}

interface KrogerProduct {
  productId: string;
  upc: string;
  brand: string;
  description: string;
  items: KrogerItem[];
}

// ── Product selection rules (ported from sku_lookup.ts selectProduct) ─────────

function selectByBestValue(
  candidates: KrogerProduct[],
): KrogerProduct | null {
  const scored = candidates
    .map((p) => {
      const item = p.items?.[0];
      const price = item?.price?.regular ?? item?.price?.promo ?? Infinity;
      const size = item?.size ?? '';
      return { product: p, pricePerUnit: parsePricePerUnit(price, size), price };
    })
    .filter((s) => s.price < Infinity)
    .sort((a, b) => a.pricePerUnit - b.pricePerUnit);

  return scored[0]?.product ?? candidates[0] ?? null;
}

function parsePricePerUnit(price: number, size: string): number {
  const s = size.toLowerCase().trim();
  const lbMatch = s.match(/(\d+(?:\.\d+)?)\s*lb/);
  const ozMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:fl\s*)?oz/);
  const ctMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:ct|count|pk|pack)/);
  const gMatch = s.match(/(\d+(?:\.\d+)?)\s*g\b/);
  if (lbMatch) return price / (parseFloat(lbMatch[1]) * 16);
  if (ozMatch) return price / parseFloat(ozMatch[1]);
  if (ctMatch) return price / parseFloat(ctMatch[1]);
  if (gMatch) return price / (parseFloat(gMatch[1]) / 28.35);
  return price;
}

function selectProduct(candidates: KrogerProduct[], canonicalName: string): KrogerProduct | null {
  if (candidates.length === 0) return null;

  const name = canonicalName.toLowerCase();

  // Ground proteins — reject pre-formed patties and frozen
  if (name.includes('ground beef') || name.includes('ground turkey') || name.includes('ground chicken')) {
    const filtered = candidates.filter((p) => {
      const d = p.description.toLowerCase();
      return !d.includes('patti') && !d.includes('burger') && !d.includes('frozen');
    });
    const pool = filtered.length > 0 ? filtered : candidates;
    const roll = pool.find((p) => p.description.toLowerCase().includes('roll'));
    return roll ?? selectByBestValue(pool);
  }

  // Fresh proteins — prefer non-frozen
  const FRESH_PROTEIN_KEYWORDS = [
    'chicken breast', 'chicken thigh', 'chicken tender',
    'salmon', 'tilapia', 'cod', 'shrimp',
  ];
  if (FRESH_PROTEIN_KEYWORDS.some((k) => name.includes(k))) {
    const fresh = candidates.filter((p) => !p.description.toLowerCase().includes('frozen'));
    return selectByBestValue(fresh.length > 0 ? fresh : candidates);
  }

  // Prefer Kroger store brand
  const krogerBrand = candidates.filter(
    (p) => p.brand?.toLowerCase() === 'kroger' || p.description.toLowerCase().startsWith('kroger'),
  );
  if (krogerBrand.length > 0) return selectByBestValue(krogerBrand);

  // Reject organic / premium labels
  const nonPremium = candidates.filter((p) => {
    const d = p.description.toLowerCase();
    return !d.includes('organic') && !d.includes('natural') && !d.includes('premium')
      && !d.includes('artisan') && !d.includes('grass-fed') && !d.includes('free-range');
  });
  const pool = nonPremium.length > 0 ? nonPremium : candidates;

  // Cheese — reject club/bulk packs
  if (name.includes('cheese')) {
    const standard = pool.filter((p) => {
      const d = p.description.toLowerCase();
      return !d.includes('club') && !d.includes('2 lb') && !d.includes('3 lb');
    });
    return selectByBestValue(standard.length > 0 ? standard : pool);
  }

  return selectByBestValue(pool);
}

function toProviderResult(product: KrogerProduct): ProviderResult | null {
  const item = product.items?.[0];
  const price = item?.price?.regular ?? item?.price?.promo;
  if (price == null) return null;
  const stockLevel = item?.inventory?.stockLevel;
  return {
    sku: product.upc,
    description: product.description,
    price,
    promoPrice: item?.price?.promo ?? undefined,
    size: item?.size ?? '',
    inStock: stockLevel === 'HIGH' || stockLevel === 'LOW',
    // TEMPORARILY_OUT_OF_STOCK → false; undefined/missing → false (conservative)
  };
}

// ── Provider implementation ────────────────────────────────────────────────────

async function krogerFetch(path: string): Promise<KrogerProduct[]> {
  const token = await getKrogerToken();
  const res = await fetch(`${KROGER_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });

  if (res.status === 429) {
    console.warn('[krogerProvider] Rate limit (429) received');
    return [];
  }
  if (res.status === 204 || !res.ok) return [];

  const data = await res.json() as { data: KrogerProduct[] };
  return data.data ?? [];
}

export const krogerProvider: GroceryProvider = {
  name: 'kroger',

  async searchBySku(sku: string, locationId?: string): Promise<ProviderResult | null> {
    const params = new URLSearchParams({
      'filter.productId': sku,
      'filter.fulfillment': 'ais',
    });
    if (locationId) params.set('filter.locationId', locationId);

    const products = await krogerFetch(`/products?${params}`);
    const product = products.find((p) => p.upc === sku) ?? products[0];
    return product ? toProviderResult(product) : null;
  },

  async searchByName(canonicalName: string, locationId?: string): Promise<ProviderResult | null> {
    const params = new URLSearchParams({
      'filter.term': canonicalName,
      'filter.fulfillment': 'ais',
      'filter.limit': '5',
    });
    if (locationId) params.set('filter.locationId', locationId);

    const products = await krogerFetch(`/products?${params}`);
    const selected = selectProduct(products, canonicalName);
    return selected ? toProviderResult(selected) : null;
  },
};
