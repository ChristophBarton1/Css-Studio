import { describe, expect, it } from 'vitest';
import { createPatch } from '../state/patches';
import { MockStyleStudioCore } from './mock-core';

const patch = () =>
  createPatch('Changed primary color', [
    { kind: 'color', target: 'primary', property: 'value', value: '#FF0000', previousValue: '#6C5CE7' },
  ]);

describe('MockStyleStudioCore', () => {
  it('analyzePage returns detected colors, typography, and elements', async () => {
    const core = new MockStyleStudioCore({ latencyMs: 0 });
    const snapshot = await core.analyzePage();
    expect(snapshot.colors.length).toBeGreaterThan(5);
    expect(snapshot.typography.length).toBeGreaterThan(5);
    expect(snapshot.elements?.length).toBeGreaterThan(3);
    expect(snapshot.colors.find((c) => c.name === 'primary')?.value).toBe('#6C5CE7');
  });

  it('applyPatch / undo / redo keep consistent stacks', async () => {
    const core = new MockStyleStudioCore({ latencyMs: 0 });
    await core.applyPatch(patch());
    expect(core.appliedPatches).toHaveLength(1);
    await core.undo();
    expect(core.appliedPatches).toHaveLength(0);
    expect(core.undonePatches).toHaveLength(1);
    await core.redo();
    expect(core.appliedPatches).toHaveLength(1);
    expect(core.undonePatches).toHaveLength(0);
  });

  it('resetSession clears both stacks', async () => {
    const core = new MockStyleStudioCore({ latencyMs: 0 });
    await core.applyPatch(patch());
    await core.undo();
    await core.resetSession();
    expect(core.appliedPatches).toHaveLength(0);
    expect(core.undonePatches).toHaveLength(0);
  });
});
