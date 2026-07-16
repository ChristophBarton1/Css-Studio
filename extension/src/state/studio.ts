import { computed, signal } from '@preact/signals';
import type {
  DesignSnapshot,
  Entitlements,
  ExportTarget,
  Plan,
  SelectedElement,
  StylePatch,
  StyleStudioApi,
  StyleStudioCore,
} from '../types';
import { classifyPageUrl } from '../platform/page';
import { queryActiveTab, storageGet, storageSet } from '../platform/chrome';
import { resolveDesign } from './resolve-design';

export type PageStatus =
  | 'checking'
  | 'unsupported'
  | 'permission-required'
  | 'idle'
  | 'analyzing'
  | 'ready';

export type TabId = 'design' | 'typography' | 'colors' | 'elements' | 'code' | 'export';

export type StatusKind = 'ready' | 'analyzing' | 'offline' | 'unsupported';

export interface UpgradeContext {
  source: 'export-target' | 'duplicates' | 'projects' | 'scss';
  target?: ExportTarget;
}

export interface StoredProject {
  id: string;
  name: string;
  savedAt: string;
  snapshot: DesignSnapshot;
  patches: StylePatch[];
}

export interface StudioDeps {
  core: StyleStudioCore;
  api: StyleStudioApi;
  apiMode: 'mock' | 'http';
  /** 'page' when the real in-page core drives the open tab. */
  coreMode?: 'page' | 'mock';
}

const PROJECTS_KEY = 'ss:projects';
const DEMO_HOSTNAME = 'demo.stylestud.io';

export function createStudioStore(deps: StudioDeps) {
  const { core, api, apiMode } = deps;
  const coreMode = deps.coreMode ?? 'mock';

  // --- page & analysis -----------------------------------------------------
  const pageStatus = signal<PageStatus>('checking');
  const hostname = signal<string>('');
  const analysisError = signal<string | null>(null);
  const snapshot = signal<DesignSnapshot | null>(null);

  // --- session history (frontend-owned) ------------------------------------
  const past = signal<readonly StylePatch[]>([]);
  const future = signal<readonly StylePatch[]>([]);

  // --- plan & entitlements --------------------------------------------------
  const plan = signal<Plan>('free');
  const entitlements = signal<Entitlements | null>(null);
  const entitlementsStatus = signal<'loading' | 'ready' | 'error'>('loading');

  // --- environment & UI ------------------------------------------------------
  const offline = signal(false);
  const activeTab = signal<TabId>('design');
  const upgradePrompt = signal<UpgradeContext | null>(null);
  const selectedElement = signal<SelectedElement | null>(null);
  const codeDraft = signal<string | null>(null);
  const notice = signal<string | null>(null);
  const savedProjectCount = signal(0);

  let noticeTimer: ReturnType<typeof setTimeout> | undefined;

  // --- derived ---------------------------------------------------------------
  const design = computed(() => resolveDesign(snapshot.value, past.value));
  const originalDesign = computed(() => resolveDesign(snapshot.value, []));
  const canUndo = computed(() => past.value.length > 0);
  const canRedo = computed(() => future.value.length > 0);
  const isDirty = computed(() => past.value.length > 0);
  const lastPatchLabel = computed(() => past.value[past.value.length - 1]?.label ?? null);

  const statusKind = computed<StatusKind>(() => {
    if (pageStatus.value === 'unsupported') return 'unsupported';
    if (offline.value) return 'offline';
    if (pageStatus.value === 'analyzing') return 'analyzing';
    return 'ready';
  });

  function showNotice(message: string): void {
    notice.value = message;
    if (noticeTimer) clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => {
      notice.value = null;
    }, 4000);
  }

  // --- actions ----------------------------------------------------------------
  async function initialize(): Promise<void> {
    const tab = await queryActiveTab();
    if (tab === null) {
      // Outside an extension context (dev preview): run against the mock host.
      hostname.value = DEMO_HOSTNAME;
      pageStatus.value = 'idle';
    } else if (tab.url) {
      const support = classifyPageUrl(tab.url);
      if (support.supported) {
        hostname.value = support.hostname;
        pageStatus.value = 'idle';
      } else {
        hostname.value = 'unsupported page';
        pageStatus.value = 'unsupported';
      }
    } else {
      // Extension context without URL access (e.g. before activeTab grants).
      hostname.value = 'current page';
      pageStatus.value = 'idle';
    }
    const projects = await storageGet<StoredProject[]>(PROJECTS_KEY);
    savedProjectCount.value = projects?.length ?? 0;
    void loadEntitlements();
    if (apiMode === 'http') {
      const health = await api.health();
      offline.value = !health.ok;
    }
  }

  async function loadEntitlements(): Promise<void> {
    entitlementsStatus.value = 'loading';
    const result = await api.entitlements(plan.value);
    if (result.ok) {
      entitlements.value = result.data.entitlements;
      entitlementsStatus.value = 'ready';
      offline.value = false;
    } else {
      entitlementsStatus.value = 'error';
      if (result.error.kind === 'network' || result.error.kind === 'timeout') {
        offline.value = true;
      }
    }
  }

  async function setPlan(next: Plan): Promise<void> {
    plan.value = next;
    await loadEntitlements();
  }

  async function analyze(): Promise<void> {
    if (pageStatus.value === 'unsupported' || pageStatus.value === 'analyzing') return;
    const hadSession = isDirty.value;
    pageStatus.value = 'analyzing';
    analysisError.value = null;
    try {
      const result = await core.analyzePage();
      snapshot.value = result;
      past.value = [];
      future.value = [];
      selectedElement.value = null;
      pageStatus.value = 'ready';
      if (hadSession) showNotice('Page re-analyzed — session history cleared.');
    } catch (error) {
      analysisError.value =
        error instanceof Error && error.message
          ? error.message
          : 'Analyzing the page failed. You can retry — nothing was changed.';
      pageStatus.value = snapshot.value ? 'ready' : 'idle';
    }
  }

  async function commit(patch: StylePatch): Promise<void> {
    if (patch.changes.length === 0) return;
    past.value = [...past.value, patch];
    future.value = [];
    try {
      await core.applyPatch(patch);
    } catch (error) {
      showNotice(
        error instanceof Error && error.message
          ? error.message
          : 'Applying the change to the page failed.',
      );
    }
  }

  async function undo(): Promise<void> {
    const patch = past.value[past.value.length - 1];
    if (!patch) return;
    past.value = past.value.slice(0, -1);
    future.value = [patch, ...future.value];
    try {
      await core.undo();
    } catch {
      showNotice('Undo could not be applied to the page.');
    }
  }

  async function redo(): Promise<void> {
    const patch = future.value[0];
    if (!patch) return;
    future.value = future.value.slice(1);
    past.value = [...past.value, patch];
    try {
      await core.redo();
    } catch {
      showNotice('Redo could not be applied to the page.');
    }
  }

  async function reset(): Promise<void> {
    past.value = [];
    future.value = [];
    codeDraft.value = null;
    try {
      await core.resetSession();
    } catch {
      showNotice('Resetting the page failed.');
    }
  }

  async function selectElement(): Promise<void> {
    try {
      selectedElement.value = await core.selectElement();
    } catch (error) {
      showNotice(
        error instanceof Error && error.message ? error.message : 'Element selection failed.',
      );
    }
  }

  async function saveProject(): Promise<{ saved: boolean; reason?: 'limit' | 'nothing' | 'error' }> {
    const currentSnapshot = snapshot.value;
    if (!currentSnapshot || !isDirty.value) return { saved: false, reason: 'nothing' };
    const limit = entitlements.value?.savedProjects ?? 2;
    if (limit !== 'unlimited' && savedProjectCount.value >= limit) {
      upgradePrompt.value = { source: 'projects' };
      return { saved: false, reason: 'limit' };
    }
    const projects = (await storageGet<StoredProject[]>(PROJECTS_KEY)) ?? [];
    const project: StoredProject = {
      id: `project_${Date.now().toString(36)}`,
      name: `${hostname.value} — ${new Date().toLocaleDateString()}`,
      savedAt: new Date().toISOString(),
      snapshot: currentSnapshot,
      patches: [...past.value],
    };
    const stored = await storageSet(PROJECTS_KEY, [...projects, project]);
    if (!stored) {
      showNotice('Saving is unavailable outside the extension context.');
      return { saved: false, reason: 'error' };
    }
    savedProjectCount.value = projects.length + 1;
    const limitLabel = limit === 'unlimited' ? '' : ` (${savedProjectCount.value} of ${limit})`;
    showNotice(`Project saved locally${limitLabel}.`);
    return { saved: true };
  }

  return {
    // deps
    api,
    apiMode,
    coreMode,
    // signals
    pageStatus,
    hostname,
    analysisError,
    snapshot,
    past,
    future,
    plan,
    entitlements,
    entitlementsStatus,
    offline,
    activeTab,
    upgradePrompt,
    selectedElement,
    codeDraft,
    notice,
    savedProjectCount,
    // derived
    design,
    originalDesign,
    canUndo,
    canRedo,
    isDirty,
    lastPatchLabel,
    statusKind,
    // actions
    initialize,
    loadEntitlements,
    setPlan,
    analyze,
    commit,
    undo,
    redo,
    reset,
    selectElement,
    saveProject,
    showNotice,
  };
}

export type StudioStore = ReturnType<typeof createStudioStore>;
