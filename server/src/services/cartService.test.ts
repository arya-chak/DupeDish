import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRedisGet, mockRedisSet } = vi.hoisted(() => ({
  mockRedisGet: vi.fn(),
  mockRedisSet: vi.fn(),
}));

vi.mock('../lib/redis', () => ({
  redis: { get: mockRedisGet, set: mockRedisSet },
}));

const mockEnv = vi.hoisted(() => ({
  INSTACART_API_KEY: 'test-key' as string | undefined,
}));

vi.mock('../lib/env', () => ({ env: mockEnv }));

import { buildCartLink } from './cartService';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
  mockEnv.INSTACART_API_KEY = 'test-key';
});

describe('buildCartLink', () => {
  it('returns null immediately when INSTACART_API_KEY is absent', async () => {
    mockEnv.INSTACART_API_KEY = undefined;

    const result = await buildCartLink([{ name: 'chicken', quantity: 1, unit: 'lb' }], 'Test');

    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockRedisGet).not.toHaveBeenCalled();
  });

  it('returns cached URL without calling Instacart on Redis hit', async () => {
    mockRedisGet.mockResolvedValueOnce('https://instacart.com/cached');

    const result = await buildCartLink([{ name: 'onion', quantity: 2 }], 'Test');

    expect(result).toBe('https://instacart.com/cached');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns null when Instacart API throws', async () => {
    mockRedisGet.mockResolvedValueOnce(null);
    mockFetch.mockRejectedValueOnce(new Error('network failure'));

    const result = await buildCartLink([{ name: 'garlic', quantity: 3, unit: 'cloves' }], 'Test');

    expect(result).toBeNull();
  });
});
