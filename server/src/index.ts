import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { env } from './lib/env';
import searchRoute from './routes/search';
import recipeRoute from './routes/recipe';
import pricesRoute from './routes/prices';
import cartRoute from './routes/cart';
import dupesRoute from './routes/dupes';

const app = new Hono();

app.use('*', logger());

app.route('/api/search', searchRoute);
app.route('/api/recipe', recipeRoute);
app.route('/api/prices', pricesRoute);
app.route('/api/cart-link', cartRoute);
app.route('/api/dupes', dupesRoute);

app.onError((err, c) => {
  console.error(err);
  return c.json({ ok: false, error: err.message }, 500);
});

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
});
