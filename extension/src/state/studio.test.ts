import { describe, expect, it } from 'vitest';
import type { ApiResult, StyleStudioApi } from '../types';
import { createMockApi } from '../api/mock-api';
import { MockStyleStudioCore } from '../core/mock-core';
import { buildPresetPatch, PRESETS } from '../features/design/presets';
import { createTestStore } from '../test/render';
import { createColorPatch } from './patches';
import { createStudioStore } from './studio';

async function analyzedStore() {
  const store = createTestStore();
  await store.analyze();
  return store;
}

function primaryOf(store: Awaited<ReturnType<typeof analyzedStore>>) {
  return store.design.value!.colors.find((c) => c.name === 'primary')!;
}

describe('studio store history', () => {
  it('analyze populates the snapshot and status', async () => {
    const store = createTestStore();
    expect(store.snapshot.value).toBeNull();
    await store.analyze();
    expect(store.snapshot.value).not.toBeNull();
    expect(store.pageStatus.value).toBe('ready');
    expect(store.statusKind.value).toBe('ready');
  });

  it('commit → undo → redo transitions', async () => {
    const store = await analyzedStore();
    await store.commit(createColorPatch(primaryOf(store), '#FF0000'));

    expect(primaryOf(store).value).toBe('#FF0000');
    expect(store.canUndo.value).toBe(true);
    expect(store.canRedo.value).toBe(false);
    expect(store.isDirty.value).toBe(true);

    await store.undo();
    expect(primaryOf(store).value).toBe('#6C5CE7');
    expect(store.canUndo.value).toBe(false);
    expect(store.canRedo.value).toBe(true);
    expect(store.isDirty.value).toBe(false);

    await store.redo();
    expect(primaryOf(store).value).toBe('#FF0000');
    expect(store.canRedo.value).toBe(false);
  });

  it('a new commit clears the redo stack', async () => {
    const store = await analyzedStore();
    await store.commit(createColorPatch(primaryOf(store), '#FF0000'));
    await store.undo();
    await store.commit(createColorPatch(primaryOf(store), '#00FF00'));
    expect(store.canRedo.value).toBe(false);
    expect(primaryOf(store).value).toBe('#00FF00');
  });

  it('applying a preset is exactly ONE undoable transaction', async () => {
    const store = await analyzedStore();
    const preset = PRESETS.find((p) => p.name === 'modern-saas')!;
    await store.commit(buildPresetPatch(preset, store.design.value!, store.originalDesign.value!));

    expect(store.past.value).toHaveLength(1);
    expect(primaryOf(store).value).toBe('#6366F1');
    expect(store.design.value!.global.corner).toBe('rounded');

    await store.undo();
    expect(primaryOf(store).value).toBe('#6C5CE7');
    expect(store.design.value!.global.corner).toBe('soft');
    expect(store.past.value).toHaveLength(0);
  });

  it('reset clears the whole session', async () => {
    const store = await analyzedStore();
    await store.commit(createColorPatch(primaryOf(store), '#FF0000'));
    await store.reset();
    expect(store.isDirty.value).toBe(false);
    expect(store.canUndo.value).toBe(false);
    expect(store.canRedo.value).toBe(false);
    expect(primaryOf(store).value).toBe('#6C5CE7');
  });

  it('history entries carry user-intent labels', async () => {
    const store = await analyzedStore();
    await store.commit(createColorPatch(primaryOf(store), '#FF0000'));
    expect(store.lastPatchLabel.value).toBe('Changed primary color');
  });
});

describe('studio store entitlements and offline state', () => {
  it('loads free entitlements from the API', async () => {
    const store = createTestStore();
    await store.loadEntitlements();
    expect(store.entitlementsStatus.value).toBe('ready');
    expect(store.entitlements.value?.exportTargets).toEqual(['universal']);
  });

  it('switching plans refetches entitlements', async () => {
    const store = createTestStore();
    await store.setPlan('pro');
    expect(store.entitlements.value?.exportTargets).toContain('codex');
    expect(store.entitlements.value?.savedProjects).toBe('unlimited');
  });

  it('a network failure flips the offline flag but keeps the editor state', async () => {
    const failing: StyleStudioApi = {
      ...createMockApi({ latencyMs: 0 }),
      entitlements: async (): Promise<ApiResult<never>> => ({
        ok: false,
        error: { kind: 'network', message: 'unreachable' },
      }),
    };
    const store = createStudioStore({
      core: new MockStyleStudioCore({ latencyMs: 0 }),
      api: failing,
      apiMode: 'http',
    });
    await store.analyze();
    await store.commit(createColorPatch(store.design.value!.colors[0]!, '#FF0000'));
    await store.loadEntitlements();

    expect(store.offline.value).toBe(true);
    expect(store.entitlementsStatus.value).toBe('error');
    // Local editor state survives the offline backend.
    expect(store.snapshot.value).not.toBeNull();
    expect(store.isDirty.value).toBe(true);
  });
});
