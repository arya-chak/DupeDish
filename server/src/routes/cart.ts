import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { buildCartLink } from '../services/cartService';

const cartBody = z.object({
  dupeId: z.string().uuid(),
  title: z.string().min(1),
  ingredients: z
    .array(
      z.object({
        name: z.string().min(1),
        quantity: z.number().positive(),
        unit: z.string().optional(),
      })
    )
    .min(1),
});

const router = new Hono();

router.post('/', zValidator('json', cartBody), async (c) => {
  const { title, ingredients } = c.req.valid('json');
  const cartLink = await buildCartLink(ingredients, title);
  return c.json({ cartLink });
});

export default router;
