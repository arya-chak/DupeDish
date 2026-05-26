import { createHash } from 'crypto';
import { redis } from '../lib/redis';
import { env } from '../lib/env';

export interface CartIngredient {
  name: string;
  quantity: number;
  unit?: string;
}

const CART_TTL_SECONDS = 604800; // 7 days

export async function buildCartLink(
  ingredients: CartIngredient[],
  title: string
): Promise<string | null> {
  if (!env.INSTACART_API_KEY) return null;

  const sorted = [...ingredients].sort((a, b) => a.name.localeCompare(b.name));
  const hash = createHash('sha256').update(JSON.stringify(sorted)).digest('hex');
  const cacheKey = `cart_link:${hash}`;

  const cached = await redis.get<string>(cacheKey);
  if (cached) return cached;

  const lineItems = sorted.map((ing) => {
    const item: Record<string, unknown> = { name: ing.name };
    if (ing.unit !== undefined) {
      item.line_item_measurements = [{ quantity: ing.quantity, unit: ing.unit }];
    }
    return item;
  });

  try {
    const response = await fetch('https://connect.instacart.com/idp/v1/products/products_link', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.INSTACART_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, link_type: 'shopping_list', line_items: lineItems }),
    });

    if (!response.ok) {
      console.error(`Instacart API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = (await response.json()) as { link?: string };
    const url = data.link;
    if (!url) {
      console.error('Instacart response missing link field', data);
      return null;
    }

    await redis.set(cacheKey, url, { ex: CART_TTL_SECONDS });
    return url;
  } catch (err) {
    console.error('buildCartLink error:', err);
    return null;
  }
}
