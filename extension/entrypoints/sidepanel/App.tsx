import type { JSX } from 'preact';
import { useEffect } from 'preact/hooks';
import { Footer } from '../../src/components/Footer';
import { Header } from '../../src/components/Header';
import { TabBar, tabPanelId, TABS } from '../../src/components/TabBar';
import { CodeTab } from '../../src/features/code/CodeTab';
import { ColorsTab } from '../../src/features/colors/ColorsTab';
import { DesignTab } from '../../src/features/design/DesignTab';
import { ElementsTab } from '../../src/features/elements/ElementsTab';
import { ExportTab } from '../../src/features/export/ExportTab';
import { UpgradeDialog } from '../../src/features/export/UpgradeDialog';
import { TypographyTab } from '../../src/features/typography/TypographyTab';
import { useStudio } from '../../src/state/context';
import type { TabId } from '../../src/state/studio';
import ui from '../../src/styles/ui.module.css';
import styles from './App.module.css';

const TAB_COMPONENTS: Record<TabId, () => JSX.Element> = {
  design: DesignTab,
  typography: TypographyTab,
  colors: ColorsTab,
  elements: ElementsTab,
  code: CodeTab,
  export: ExportTab,
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable ||
    target.closest('.cm-editor') !== null
  );
}

export function App() {
  const studio = useStudio();
  const activeTab = studio.activeTab.value;
  const ActiveTabComponent = TAB_COMPONENTS[activeTab];

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (!(event.ctrlKey || event.metaKey) || isEditableTarget(event.target)) return;
      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        void studio.undo();
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault();
        void studio.redo();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- store identity is stable
  }, []);

  if (studio.pageStatus.value === 'unsupported') {
    return (
      <div class={styles.app}>
        <Header />
        <main class={styles.unsupported}>
          <p style={{ fontWeight: 650 }}>This page can't be styled</p>
          <p class={`${ui.small} ${ui.muted}`}>
            Chrome doesn't allow extensions on internal pages like this one. Open a regular
            website and Style Studio will be ready.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div class={styles.app}>
      <Header />
      <TabBar />
      <main
        class={styles.content}
        role="tabpanel"
        id={tabPanelId(activeTab)}
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={0}
      >
        <ActiveTabComponent />
      </main>
      {/* Hidden panels keep aria-controls targets valid for inactive tabs. */}
      {TABS.filter((tab) => tab.id !== activeTab).map((tab) => (
        <div key={tab.id} id={tabPanelId(tab.id)} hidden />
      ))}
      <Footer />
      <UpgradeDialog />
    </div>
  );
}
