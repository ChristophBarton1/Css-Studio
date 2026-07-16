import { useRef } from 'preact/hooks';
import type { TabId } from '../state/studio';
import { useStudio } from '../state/context';
import styles from './TabBar.module.css';

export const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'design', label: 'Design' },
  { id: 'typography', label: 'Type' },
  { id: 'colors', label: 'Colors' },
  { id: 'elements', label: 'Elements' },
  { id: 'code', label: 'Code' },
  { id: 'export', label: 'Export' },
];

export function tabPanelId(id: TabId): string {
  return `panel-${id}`;
}

export function TabBar() {
  const studio = useStudio();
  const listRef = useRef<HTMLDivElement>(null);
  const active = studio.activeTab.value;
  const disabled = studio.pageStatus.value === 'unsupported';

  function focusTab(index: number): void {
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    const target = buttons?.[(index + TABS.length) % TABS.length];
    target?.focus();
    const id = target?.dataset['tab'] as TabId | undefined;
    if (id) studio.activeTab.value = id;
  }

  function onKeyDown(event: KeyboardEvent): void {
    const index = TABS.findIndex((tab) => tab.id === active);
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        focusTab(index + 1);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        focusTab(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusTab(0);
        break;
      case 'End':
        event.preventDefault();
        focusTab(TABS.length - 1);
        break;
    }
  }

  return (
    <div class={styles.tablist} role="tablist" aria-label="Style Studio sections" ref={listRef}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          class={styles.tab}
          role="tab"
          data-tab={tab.id}
          id={`tab-${tab.id}`}
          aria-selected={active === tab.id}
          aria-controls={tabPanelId(tab.id)}
          tabIndex={active === tab.id ? 0 : -1}
          disabled={disabled}
          onClick={() => (studio.activeTab.value = tab.id)}
          onKeyDown={onKeyDown}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
