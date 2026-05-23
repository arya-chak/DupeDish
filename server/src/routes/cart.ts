import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const cartBody = z.object({
  skus: z.array(z.string().min(1)).min(1),
});

const router = new Hono();

router.post('/', zValidator('json', cartBody), async (c) => {
  const body = c.req.valid('json');
  return c.json({ ok: true, stub: true, received: body });
});

export default router;
