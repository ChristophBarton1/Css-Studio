/**
 * Thin, defensive wrappers around the extension APIs so the rest of the UI
 * (and the unit tests) never touch `chrome`/`browser` globals directly.
 * Everything degrades gracefully outside an extension context.
 */

interface ActiveTabInfo {
  id?: number;
  url?: string;
  title?: string;
}

type ExtensionGlobal = {
  tabs?: {
    query(info: { active: boolean; currentWindow: boolean }): Promise<ActiveTabInfo[]>;
    sendMessage?(tabId: number, message: unknown): Promise<unknown>;
  };
  scripting?: {
    executeScript(injection: { target: { tabId: number }; files: string[] }): Promise<unknown>;
  };
  storage?: {
    local: {
      get(key: string): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
    };
  };
};

function extensionApi(): ExtensionGlobal | undefined {
  const g = globalThis as Record<string, unknown>;
  return (g['browser'] ?? g['chrome']) as ExtensionGlobal | undefined;
}

export async function queryActiveTab(): Promise<ActiveTabInfo | null> {
  const tabs = extensionApi()?.tabs;
  if (!tabs?.query) return null;
  try {
    const result = await tabs.query({ active: true, currentWindow: true });
    return result[0] ?? null;
  } catch {
    return null;
  }
}

/** True when the panel can inject into and message the active tab. */
export function hasPageAccess(): boolean {
  const ext = extensionApi();
  return Boolean(ext?.tabs?.sendMessage && ext.scripting?.executeScript);
}

export async function getActiveTabId(): Promise<number | null> {
  const tab = await queryActiveTab();
  return typeof tab?.id === 'number' ? tab.id : null;
}

export async function sendTabMessage<T>(tabId: number, message: unknown): Promise<T> {
  const tabs = extensionApi()?.tabs;
  if (!tabs?.sendMessage) throw new Error('Messaging unavailable');
  return (await tabs.sendMessage(tabId, message)) as T;
}

export async function injectContentScript(tabId: number, file: string): Promise<boolean> {
  const scripting = extensionApi()?.scripting;
  if (!scripting) return false;
  try {
    await scripting.executeScript({ target: { tabId }, files: [file] });
    return true;
  } catch {
    return false;
  }
}

export async function storageGet<T>(key: string): Promise<T | undefined> {
  const storage = extensionApi()?.storage;
  if (!storage) return undefined;
  try {
    const items = await storage.local.get(key);
    return items[key] as T | undefined;
  } catch {
    return undefined;
  }
}

export async function storageSet(key: string, value: unknown): Promise<boolean> {
  const storage = extensionApi()?.storage;
  if (!storage) return false;
  try {
    await storage.local.set({ [key]: value });
    return true;
  } catch {
    return false;
  }
}
