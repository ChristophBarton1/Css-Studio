import type { StyleStudioApi } from '../types';
import { readRuntimeEnv } from '../platform/env';
import { createHttpApi } from './http-client';
import { createMockApi } from './mock-api';

export type ApiMode = 'mock' | 'http';

export interface ApiHandle {
  api: StyleStudioApi;
  mode: ApiMode;
  baseUrl: string;
}

/**
 * Mock mode (documented): the mock API is used when `WXT_USE_MOCK_API=true`,
 * or by default in `wxt dev`. Production builds talk to the real backend at
 * `WXT_API_BASE_URL` (default http://localhost:8787).
 */
export function createApi(): ApiHandle {
  const env = readRuntimeEnv();
  if (env.useMockApi) {
    return { api: createMockApi(), mode: 'mock', baseUrl: 'in-memory mock' };
  }
  return { api: createHttpApi({ baseUrl: env.apiBaseUrl }), mode: 'http', baseUrl: env.apiBaseUrl };
}
