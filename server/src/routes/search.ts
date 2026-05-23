import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const searchBody = z.object({
  query: z.string().min(1),
  servingsPerBatch: z.number().int().positive(),
  timesMaking: z.number().int().positive(),
  calorieTarget: z.number().positive().optional(),
  flags: z.array(z.string()).optional(),
});

const router = new Hono();

router.post('/', zValidator('json', searchBody), async (c) => {
  const body = c.req.valid('json');
  return c.json({ ok: true, stub: true, received: body });
});

export default router;
