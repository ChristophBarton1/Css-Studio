import { render } from '@testing-library/preact';
import type { ComponentChildren } from 'preact';
import { createMockApi } from '../api/mock-api';
import { MockStyleStudioCore } from '../core/mock-core';
import { StudioProvider } from '../state/context';
import { createStudioStore, type StudioStore } from '../state/studio';

/** Store wired to zero-latency mocks for deterministic tests. */
export function createTestStore(): StudioStore {
  return createStudioStore({
    core: new MockStyleStudioCore({ latencyMs: 0 }),
    api: createMockApi({ latencyMs: 0 }),
    apiMode: 'mock',
  });
}

export function renderWithStudio(node: ComponentChildren, store: StudioStore = createTestStore()) {
  return { store, ...render(<StudioProvider value={store}>{node}</StudioProvider>) };
}
