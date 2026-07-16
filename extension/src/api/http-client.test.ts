import { describe, expect, it, vi } from 'vitest';
import { createHttpApi } from './http-client';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('createHttpApi', () => {
  it('returns typed data on success', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(200, { status: 'ok', service: 's', version: '1' }));
    const api = createHttpApi({ baseUrl: 'http://backend', fetchFn });
    const result = await api.health();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe('ok');
    expect(fetchFn).toHaveBeenCalledWith('http://backend/health', expect.anything());
  });

  it('maps HTTP 400 to invalid-request with issues', async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse(400, { error: 'invalid_request', issues: [{ path: ['snapshot'] }] }),
    );
    const api = createHttpApi({ baseUrl: 'http://backend', fetchFn });
    const result = await api.capabilities();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('invalid-request');
      expect(result.error.issues).toEqual([{ path: ['snapshot'] }]);
    }
  });

  it('maps HTTP 402 to upgrade-required with the required plan', async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse(402, { error: 'upgrade_required', requiredPlan: 'pro' }),
    );
    const api = createHttpApi({ baseUrl: 'http://backend', fetchFn });
    const result = await api.entitlements('free');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('upgrade-required');
      expect(result.error.requiredPlan).toBe('pro');
      expect(result.error.status).toBe(402);
    }
  });

  it('maps other statuses to http-error', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(500, {}));
    const api = createHttpApi({ baseUrl: 'http://backend', fetchFn });
    const result = await api.health();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('http-error');
  });

  it('maps fetch rejections to a network error', async () => {
    const fetchFn = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    const api = createHttpApi({ baseUrl: 'http://backend', fetchFn });
    const result = await api.health();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('network');
  });

  it('aborts slow requests and reports a timeout', async () => {
    const fetchFn = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    const api = createHttpApi({ baseUrl: 'http://backend', timeoutMs: 20, fetchFn });
    const result = await api.health();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('timeout');
  });
});
