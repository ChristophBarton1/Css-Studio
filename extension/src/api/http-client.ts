import type {
  AgentPack,
  ApiError,
  ApiResult,
  Capabilities,
  EntitlementsResponse,
  ExportRequest,
  HealthResponse,
  Plan,
  StyleStudioApi,
} from '../types';

export interface HttpApiOptions {
  baseUrl: string;
  /** Abort requests after this many milliseconds. Default 10 s. */
  timeoutMs?: number;
  /** Injectable for tests. */
  fetchFn?: typeof fetch;
}

function isAbortError(error: unknown): boolean {
  // DOMException is not `instanceof Error` in every runtime — check the name.
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { name?: unknown }).name === 'AbortError'
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

/**
 * Typed client for the Style Studio backend (`docs/openapi.yaml`).
 * No automatic retries; payloads are never logged.
 */
export function createHttpApi(options: HttpApiOptions): StyleStudioApi {
  const timeoutMs = options.timeoutMs ?? 10_000;
  const fetchFn = options.fetchFn ?? fetch;
  const baseUrl = options.baseUrl.replace(/\/+$/, '');

  async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchFn(`${baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...init?.headers },
      });
      const body: unknown = await response.json().catch(() => null);
      if (response.ok) {
        return { ok: true, data: body as T };
      }
      const record = asRecord(body);
      let error: ApiError;
      if (response.status === 400) {
        error = {
          kind: 'invalid-request',
          message: 'The backend rejected the request as invalid.',
          status: 400,
          issues: record['issues'],
        };
      } else if (response.status === 402) {
        error = {
          kind: 'upgrade-required',
          message: typeof record['message'] === 'string' ? record['message'] : 'This feature requires Pro.',
          status: 402,
          requiredPlan: (record['requiredPlan'] as Plan | undefined) ?? 'pro',
        };
      } else {
        error = {
          kind: 'http-error',
          message: `The backend responded with HTTP ${response.status}.`,
          status: response.status,
        };
      }
      return { ok: false, error };
    } catch (caught) {
      if (isAbortError(caught)) {
        return {
          ok: false,
          error: { kind: 'timeout', message: `The request timed out after ${timeoutMs} ms.` },
        };
      }
      return {
        ok: false,
        error: { kind: 'network', message: 'The backend could not be reached.' },
      };
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    health: () => request<HealthResponse>('/health'),
    capabilities: () => request<Capabilities>('/v1/capabilities'),
    entitlements: (plan: Plan) => request<EntitlementsResponse>(`/v1/entitlements/${plan}`),
    exportPreview: (body: ExportRequest) =>
      request<AgentPack>('/v1/exports/preview', { method: 'POST', body: JSON.stringify(body) }),
  };
}
