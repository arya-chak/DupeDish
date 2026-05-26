import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { supabase } from '../lib/supabase';

const CookedBodySchema = z.object({
  userId: z.string().uuid(),
});

const router = new Hono();

router.post('/:id/cooked', zValidator('json', CookedBodySchema), async (c) => {
  const dupeId = c.req.param('id');
  const { userId } = c.req.valid('json');

  // Fetch dupe — validates ownership and retrieves pricing fields
  const { data: dupe, error: fetchError } = await supabase
    .from('dupes')
    .select('id, user_id, restaurant_price, home_cost_per_meal')
    .eq('id', dupeId)
    .single();

  if (fetchError || !dupe) {
    return c.json({ error: 'Dupe not found' }, 404);
  }

  if (dupe.user_id !== userId) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const restaurantPrice = dupe.restaurant_price as number | null;
  const homeCostPerMeal = dupe.home_cost_per_meal as number | null;

  if (restaurantPrice == null || homeCostPerMeal == null) {
    return c.json({ error: 'Dupe is missing pricing data' }, 422);
  }

  const amountSaved = Math.round((restaurantPrice - homeCostPerMeal) * 100) / 100;

  // Mark cooked
  const { error: updateError } = await supabase
    .from('dupes')
    .update({ cooked_at: new Date().toISOString() })
    .eq('id', dupeId);

  if (updateError) {
    console.error('[dupes/cooked] Failed to set cooked_at:', updateError);
    return c.json({ error: 'Failed to mark as cooked' }, 500);
  }

  // Append ledger row
  const { error: ledgerError } = await supabase.from('savings_ledger').insert({
    user_id: userId,
    dupe_id: dupeId,
    amount_saved: amountSaved,
    logged_at: new Date().toISOString(),
  });

  if (ledgerError) {
    console.error('[dupes/cooked] Failed to insert ledger row:', ledgerError);
    return c.json({ error: 'Failed to log savings' }, 500);
  }

  return c.json({ success: true, amountSaved });
});

export default router;
