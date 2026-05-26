import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { resolvePrice, PriceServiceError } from '../services/priceService';

const pricesQuery = z.object({
  recipeId: z.string().min(1),
  locationId: z.string().min(1),
  servings: z.coerce.number().int().min(1),
  timesMaking: z.coerce.number().int().min(1),
  budgetMode: z.enum(['true', 'false']).transform((v) => v === 'true').default('false'),
});

const router = new Hono();

router.get('/', zValidator('query', pricesQuery), async (c) => {
  const query = c.req.valid('query');
  try {
    const result = await resolvePrice(query);
    return c.json(result);
  } catch (err) {
    if (err instanceof PriceServiceError) {
      return c.json({ error: err.message }, 500);
    }
    throw err;
  }
});

export default router;
