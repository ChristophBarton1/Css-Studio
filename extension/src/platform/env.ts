export interface RuntimeEnv {
  dev: boolean;
  /** Mock API is the documented default during development. */
  useMockApi: boolean;
  apiBaseUrl: string;
}

export const DEFAULT_API_BASE_URL = 'http://localhost:8787';

export function readRuntimeEnv(): RuntimeEnv {
  const env = import.meta.env;
  const dev = Boolean(env?.DEV);
  const mockFlag = env?.WXT_USE_MOCK_API;
  const useMockApi = mockFlag === 'true' || (dev && mockFlag !== 'false');
  const apiBaseUrl = env?.WXT_API_BASE_URL ?? DEFAULT_API_BASE_URL;
  return { dev, useMockApi, apiBaseUrl };
}
