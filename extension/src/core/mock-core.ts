import type { DesignSnapshot, SelectedElement, StylePatch, StyleStudioCore } from '../types';
import { MOCK_SELECTED_ELEMENT, MOCK_SNAPSHOT } from './mock-data';

export interface MockCoreOptions {
  /** Simulated work latency. Set to 0 in tests. */
  latencyMs?: number;
}

/**
 * Development stand-in for the backend-owned content-script core. It keeps its
 * own applied/undone patch stacks so the panel's history and the "page" state
 * stay in step the way they will with the real implementation.
 */
export class MockStyleStudioCore implements StyleStudioCore {
  private applied: StylePatch[] = [];
  private undone: StylePatch[] = [];
  private readonly latencyMs: number;

  constructor(options: MockCoreOptions = {}) {
    this.latencyMs = options.latencyMs ?? 450;
  }

  private delay(factor = 1): Promise<void> {
    const ms = this.latencyMs * factor;
    return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
  }

  async analyzePage(): Promise<DesignSnapshot> {
    await this.delay(1.5);
    this.applied = [];
    this.undone = [];
    return {
      ...structuredClone(MOCK_SNAPSHOT),
      id: `snapshot_${Date.now().toString(36)}`,
      capturedAt: new Date().toISOString(),
    };
  }

  async selectElement(): Promise<SelectedElement> {
    await this.delay();
    return structuredClone(MOCK_SELECTED_ELEMENT);
  }

  async applyPatch(patch: StylePatch): Promise<void> {
    await this.delay(0.05);
    this.applied.push(patch);
    this.undone = [];
  }

  async undo(): Promise<void> {
    await this.delay(0.05);
    const patch = this.applied.pop();
    if (patch) this.undone.push(patch);
  }

  async redo(): Promise<void> {
    await this.delay(0.05);
    const patch = this.undone.pop();
    if (patch) this.applied.push(patch);
  }

  async resetSession(): Promise<void> {
    await this.delay(0.05);
    this.applied = [];
    this.undone = [];
  }

  /** Test/dev inspection helpers — not part of `StyleStudioCore`. */
  get appliedPatches(): readonly StylePatch[] {
    return this.applied;
  }

  get undonePatches(): readonly StylePatch[] {
    return this.undone;
  }
}
