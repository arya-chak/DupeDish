import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { generateRecipe, buildCacheKey } from '../services/recipeService';
import { resolvePrice, PriceServiceError } from '../services/priceService';
import { calculateSavings } from '../services/savingsService';
import { RecipeGenerationError } from '../types/recipe';
import { supabase } from '../lib/supabase';

const SearchRequestSchema = z.object({
  dishName: z.string().min(1),
  restaurantName: z.string().optional(),
  servings: z.number().int().min(1).max(20),
  calorieTarget: z.number().int().positive().optional(),
  dietaryFlags: z.array(z.string()).optional(),
  // Pricing + savings fields — all required together to run the full pipeline
  userId: z.string().uuid().optional(),
  locationId: z.string().optional(),
  timesMaking: z.number().int().min(1).optional(),
  budgetMode: z.boolean().optional(),
  restaurantPrice: z.number().positive().optional(),
  restaurantCalories: z.number().int().positive().optional(),
});

type SearchBody = z.infer<typeof SearchRequestSchema>;

function hasSavingsFields(body: SearchBody): body is SearchBody & {
  userId: string;
  locationId: string;
  timesMaking: number;
  restaurantPrice: number;
  restaurantCalories: number;
} {
  return !!(
    body.userId &&
    body.locationId &&
    body.timesMaking != null &&
    body.restaurantPrice != null &&
    body.restaurantCalories != null
  );
}

const router = new Hono();

router.post('/', zValidator('json', SearchRequestSchema), async (c) => {
  const body = c.req.valid('json');

  try {
    const recipe = await generateRecipe(body);

    if (!hasSavingsFields(body)) {
      return c.json({ recipe });
    }

    const cacheKey = buildCacheKey(body);

    // ── Prices ───────────────────────────────────────────────────────────────
    const priceResponse = await resolvePrice({
      recipeId: cacheKey,
      locationId: body.locationId,
      servings: body.servings,
      timesMaking: body.timesMaking,
      budgetMode: body.budgetMode ?? false,
    });

    // ── Pantry + ledger (parallel) ────────────────────────────────────────────
    const [pantryResult, ledgerResult] = await Promise.all([
      supabase
        .from('pantry_items')
        .select('canonical_name')
        .eq('user_id', body.userId),
      supabase
        .from('savings_ledger')
        .select('amount_saved, logged_at')
        .eq('user_id', body.userId),
    ]);

    const pantryItems = (pantryResult.data ?? []).map(
      (r: { canonical_name: string }) => r.canonical_name,
    );

    let ledgerSummary: { totalSaved: number; weeksActive: number } | undefined;
    const ledgerRows = ledgerResult.data ?? [];
    if (ledgerRows.length > 0) {
      const totalSaved = ledgerRows.reduce(
        (sum: number, r: { amount_saved: number }) => sum + r.amount_saved,
        0,
      );
      const oldest = Math.min(
        ...ledgerRows.map((r: { logged_at: string }) => new Date(r.logged_at).getTime()),
      );
      const weeksActive = Math.max(1, Math.ceil((Date.now() - oldest) / (7 * 24 * 60 * 60 * 1000)));
      ledgerSummary = { totalSaved, weeksActive };
    }

    // ── Savings ──────────────────────────────────────────────────────────────
    const savingsResult = calculateSavings({
      pricedIngredients: priceResponse.ingredients,
      pantryItems,
      servingsPerBatch: body.servings,
      timesMaking: body.timesMaking,
      restaurantPrice: body.restaurantPrice,
      restaurantCalories: body.restaurantCalories,
      homeCaloriesPerServing: recipe.caloriesPerServing,
      ledgerSummary,
    });

    // ── Persist dupe row ──────────────────────────────────────────────────────
    const { data: dupeRow, error: dupeError } = await supabase
      .from('dupes')
      .insert({
        user_id: body.userId,
        dish_name: body.dishName,
        restaurant: body.restaurantName ?? null,
        restaurant_price: body.restaurantPrice,
        restaurant_calories: body.restaurantCalories,
        home_cost_total: savingsResult.adjustedGroceryTotal,
        home_cost_per_meal: savingsResult.perMealCostHome,
        home_calories_per_serving: recipe.caloriesPerServing,
        servings_per_batch: body.servings,
        times_making: body.timesMaking,
        total_meals: body.servings * body.timesMaking,
        calorie_target: body.calorieTarget ?? null,
        recipe_cache_key: cacheKey,
      })
      .select('id')
      .single();

    if (dupeError) {
      console.error('[search] Failed to insert dupe row:', dupeError);
    }

    return c.json({
      recipe,
      prices: priceResponse,
      savings: savingsResult,
      dupeId: dupeRow?.id ?? null,
    });
  } catch (err) {
    if (err instanceof RecipeGenerationError) {
      return c.json({ error: 'Recipe generation failed' }, 500);
    }
    if (err instanceof PriceServiceError) {
      return c.json({ error: 'Price lookup failed' }, 500);
    }
    throw err;
  }
});

export default router;
