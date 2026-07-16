/**
 * Panel-side implementation of `StyleStudioCore` that drives the real page:
 * it injects the content script into the active tab on demand and talks to it
 * over extension messaging. Undo/redo state mirrors the panel's history; the
 * page side is a stateless renderer of the resolved diff.
 */
import type { DesignSnapshot, SelectedElement, StylePatch, StyleStudioCore } from '../types';
import {
  getActiveTabId,
  hasPageAccess,
  injectContentScript,
  sendTabMessage,
} from '../platform/chrome';
import { resolveDesign } from '../state/resolve-design';
import { buildApplyPayload, type AnalyzeResult, type CoreRequest, type CoreResponse } from './rpc';

const CONTENT_SCRIPT_FILE = 'content-scripts/content.js';

const ACCESS_ERROR =
  'Could not reach the page. Reload the tab, click the Style Studio icon again, and retry.';

export function isPageCoreAvailable(): boolean {
  return hasPageAccess();
}

export class PageStyleStudioCore implements StyleStudioCore {
  private tabId: number | null = null;
  private snapshot: DesignSnapshot | null = null;
  private applied: StylePatch[] = [];
  private undone: StylePatch[] = [];

  private async ensureReady(): Promise<number> {
    if (this.tabId === null) {
      this.tabId = await getActiveTabId();
    }
    const tabId = this.tabId;
    if (tabId === null) throw new Error(ACCESS_ERROR);

    const alive = await this.ping(tabId);
    if (!alive) {
      const injected = await injectContentScript(tabId, CONTENT_SCRIPT_FILE);
      if (!injected || !(await this.ping(tabId))) throw new Error(ACCESS_ERROR);
    }
    return tabId;
  }

  private async ping(tabId: number): Promise<boolean> {
    try {
      const response = await sendTabMessage<CoreResponse>(tabId, { type: 'ss:ping' } satisfies CoreRequest);
      return response?.ok === true;
    } catch {
      return false;
    }
  }

  private async call<T>(request: CoreRequest): Promise<T> {
    const tabId = await this.ensureReady();
    let response: CoreResponse<T>;
    try {
      response = await sendTabMessage<CoreResponse<T>>(tabId, request);
    } catch {
      throw new Error(ACCESS_ERROR);
    }
    if (!response || !response.ok) {
      throw new Error(response && !response.ok ? response.error : ACCESS_ERROR);
    }
    return response.data;
  }

  private async sync(): Promise<void> {
    if (!this.snapshot) return;
    const design = resolveDesign(this.snapshot, this.applied);
    if (!design) return;
    await this.call({ type: 'ss:apply', payload: buildApplyPayload(design) });
  }

  async analyzePage(): Promise<DesignSnapshot> {
    const result = await this.call<AnalyzeResult>({ type: 'ss:analyze' });
    this.applied = [];
    this.undone = [];
    this.snapshot = {
      ...result,
      id: `snapshot_${Date.now().toString(36)}`,
      capturedAt: new Date().toISOString(),
    };
    return this.snapshot;
  }

  async selectElement(): Promise<SelectedElement> {
    return this.call<SelectedElement>({ type: 'ss:select' });
  }

  async applyPatch(patch: StylePatch): Promise<void> {
    this.applied.push(patch);
    this.undone = [];
    await this.sync();
  }

  async undo(): Promise<void> {
    const patch = this.applied.pop();
    if (!patch) return;
    this.undone.push(patch);
    await this.sync();
  }

  async redo(): Promise<void> {
    const patch = this.undone.pop();
    if (!patch) return;
    this.applied.push(patch);
    await this.sync();
  }

  async resetSession(): Promise<void> {
    this.applied = [];
    this.undone = [];
    await this.call({ type: 'ss:reset' });
  }
}
