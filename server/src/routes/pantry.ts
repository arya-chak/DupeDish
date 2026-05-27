import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import * as pantryService from '../services/pantryService';

const PantryItemInputSchema = z.object({
  canonical_name: z.string().min(1),
  quantity: z.number().positive().optional(),
  unit: z.string().optional(),
});

const PostBodySchema = z.union([
  z.array(PantryItemInputSchema).min(1),
  PantryItemInputSchema,
]);

const router = new Hono();

router.get('/', async (c) => {
  const userId = c.req.query('userId');
  if (!userId) return c.json({ error: 'userId required' }, 400);

  const items = await pantryService.getUserPantry(userId);
  return c.json({ items });
});

// Must be registered before /:canonicalName to prevent shadowing
router.get('/staples', async (c) => {
  const userId = c.req.query('userId');
  if (!userId) return c.json({ error: 'userId required' }, 400);

  const staples = await pantryService.getStaplesWithOwnership(userId);
  return c.json({ staples });
});

router.post('/', zValidator('json', PostBodySchema), async (c) => {
  const userId = c.req.query('userId');
  if (!userId) return c.json({ error: 'userId required' }, 400);

  const body = c.req.valid('json');
  const items = Array.isArray(body) ? body : [body];

  const result = await pantryService.addPantryItems(userId, items);
  return c.json({ items: result }, 201);
});

router.delete('/:canonicalName', async (c) => {
  const userId = c.req.query('userId');
  if (!userId) return c.json({ error: 'userId required' }, 400);

  const canonicalName = decodeURIComponent(c.req.param('canonicalName'));

  try {
    await pantryService.removePantryItem(userId, canonicalName);
    return new Response(null, { status: 204 });
  } catch (err) {
    if (err instanceof Error && (err as NodeJS.ErrnoException).code === 'not_found') {
      return c.json({ error: 'Item not found' }, 404);
    }
    throw err;
  }
});

export default router;
