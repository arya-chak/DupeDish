import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const pricesQuery = z.object({
  dish: z.string().min(1),
  storeId: z.string().min(1),
});

const router = new Hono();

router.get('/', zValidator('query', pricesQuery), async (c) => {
  const query = c.req.valid('query');
  return c.json({ ok: true, stub: true, received: query });
});

export default router;
