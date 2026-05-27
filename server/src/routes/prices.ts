import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { resolvePrice, PriceServiceError } from '../services/priceService';
import { getUserPantry } from '../services/pantryService';

const pricesQuery = z.object({
  recipeId: z.string().min(1),
  locationId: z.string().min(1),
  servings: z.coerce.number().int().min(1),
  timesMaking: z.coerce.number().int().min(1),
  budgetMode: z.enum(['true', 'false']).transform((v) => v === 'true').default('false'),
  userId: z.string().optional(),
});

const router = new Hono();

router.get('/', zValidator('query', pricesQuery), async (c) => {
  const query = c.req.valid('query');
  try {
    const pantryItems = query.userId
      ? (await getUserPantry(query.userId)).map((p) => p.canonical_name)
      : [];

    const result = await resolvePrice({ ...query, pantryItems });
    return c.json(result);
  } catch (err) {
    if (err instanceof PriceServiceError) {
      return c.json({ error: err.message }, 500);
    }
    throw err;
  }
});

export default router;
