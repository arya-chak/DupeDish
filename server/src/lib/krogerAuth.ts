import { env } from './env';
import { redis } from './redis';

const KROGER_BASE = 'https://api.kroger.com/v1';
const TOKEN_KEY = 'kroger:access_token';
const TOKEN_TTL_SECONDS = 28 * 60; // 28 minutes — Kroger TTL is 30, cache 2 min early

export class KrogerAuthError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'KrogerAuthError';
  }
}

export async function getKrogerToken(): Promise<string> {
  const cached = await redis.get<string>(TOKEN_KEY);
  if (cached) return cached;

  const creds = Buffer.from(`${env.KROGER_CLIENT_ID}:${env.KROGER_CLIENT_SECRET}`).toString('base64');

  let res: Response;
  try {
    res = await fetch(`${KROGER_BASE}/connect/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${creds}`,
      },
      body: 'grant_type=client_credentials&scope=product.compact',
    });
  } catch (err) {
    throw new KrogerAuthError('Kroger token request failed', err);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new KrogerAuthError(`Kroger auth HTTP ${res.status}: ${body}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  await redis.set(TOKEN_KEY, data.access_token, { ex: TOKEN_TTL_SECONDS });
  return data.access_token;
}
