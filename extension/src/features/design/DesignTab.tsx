import { useState } from 'preact/hooks';
import { useStudio } from '../../state/context';
import { createGlobalStylePatch } from '../../state/patches';
import type { CornerStyle, Density, ShadowStyle } from '../../state/resolve-design';
import ui from '../../styles/ui.module.css';
import { EmptyState } from '../../components/EmptyState';
import { SegmentedControl } from '../../components/SegmentedControl';
import { buildPresetPatch, PRESETS } from './presets';
import { PreviewCard } from './PreviewCard';
import styles from './DesignTab.module.css';

export function DesignTab() {
  const studio = useStudio();
  const [compare, setCompare] = useState<'after' | 'before'>('after');
  const snapshot = studio.snapshot.value;
  const design = studio.design.value;
  const original = studio.originalDesign.value;
  const analyzing = studio.pageStatus.value === 'analyzing';

  if (!snapshot || !design || !original) {
    return (
      <EmptyState
        title="Analyze this page to get started"
        action={
          <button class={ui.btnPrimary} disabled={analyzing} onClick={() => void studio.analyze()}>
            {analyzing ? 'Analyzing…' : 'Analyze page'}
          </button>
        }
      >
        Style Studio scans the page's colors, fonts, and common elements. Nothing is sent to a
        server during analysis.
        {studio.analysisError.value && (
          <span class={ui.errorText} role="alert" style={{ display: 'block', marginTop: '8px' }}>
            {studio.analysisError.value}
          </span>
        )}
      </EmptyState>
    );
  }

  const styledRoles = snapshot.elements?.length ?? 0;
  const activePreset = design.presetName ?? 'original';

  return (
    <div>
      <section class={ui.section} aria-label="Page analysis summary">
        <div class={styles.summary}>
          <div class={styles.summaryStats}>
            <span class={styles.stat}>
              <span class={styles.statValue}>{snapshot.colors.length}</span>
              <span class={styles.statLabel}>colors</span>
            </span>
            <span class={styles.stat}>
              <span class={styles.statValue}>{snapshot.typography.length}</span>
              <span class={styles.statLabel}>font roles</span>
            </span>
            <span class={styles.stat}>
              <span class={styles.statValue}>{styledRoles}</span>
              <span class={styles.statLabel}>styled roles</span>
            </span>
          </div>
          <button
            class={ui.btn}
            disabled={analyzing}
            onClick={() => void studio.analyze()}
            title="Re-analyze the current page"
          >
            {analyzing ? 'Scanning…' : 'Rescan'}
          </button>
        </div>
      </section>

      <section class={ui.section} aria-label="Presets">
        <h3 class={ui.sectionTitle}>Presets</h3>
        <div class={styles.presetGrid}>
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              class={styles.preset}
              aria-pressed={activePreset === preset.name}
              onClick={() => void studio.commit(buildPresetPatch(preset, design, original))}
            >
              <span class={styles.presetSwatches} aria-hidden="true">
                {preset.swatches.map((swatch) => (
                  <span class={styles.presetSwatch} style={{ background: swatch }} />
                ))}
              </span>
              <span class={styles.presetLabel}>{preset.label}</span>
              <span class={styles.presetDescription}>{preset.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section class={ui.section} aria-label="Global style">
        <h3 class={ui.sectionTitle}>Global style</h3>
        <div class={styles.globalRow}>
          <span class={styles.globalLabel}>Density</span>
          <SegmentedControl<Density>
            label="Density"
            options={[
              { value: 'compact', label: 'Compact' },
              { value: 'default', label: 'Default' },
              { value: 'comfortable', label: 'Comfortable' },
            ]}
            value={design.global.density}
            onChange={(value) =>
              void studio.commit(createGlobalStylePatch('density', value, design.global.density))
            }
          />
        </div>
        <div class={styles.globalRow}>
          <span class={styles.globalLabel}>Corners</span>
          <SegmentedControl<CornerStyle>
            label="Corner style"
            options={[
              { value: 'sharp', label: 'Sharp' },
              { value: 'soft', label: 'Soft' },
              { value: 'rounded', label: 'Rounded' },
            ]}
            value={design.global.corner}
            onChange={(value) =>
              void studio.commit(createGlobalStylePatch('corner', value, design.global.corner))
            }
          />
        </div>
        <div class={styles.globalRow}>
          <span class={styles.globalLabel}>Shadows</span>
          <SegmentedControl<ShadowStyle>
            label="Shadow style"
            options={[
              { value: 'none', label: 'None' },
              { value: 'subtle', label: 'Subtle' },
              { value: 'elevated', label: 'Elevated' },
            ]}
            value={design.global.shadow}
            onChange={(value) =>
              void studio.commit(createGlobalStylePatch('shadow', value, design.global.shadow))
            }
          />
        </div>
      </section>

      <section class={ui.section} aria-label="Preview">
        <div class={styles.compareRow}>
          <h3 class={ui.sectionTitle} style={{ margin: 0 }}>
            Preview
          </h3>
          <SegmentedControl<'before' | 'after'>
            label="Compare before and after"
            options={[
              { value: 'before', label: 'Before' },
              { value: 'after', label: 'After' },
            ]}
            value={compare}
            onChange={setCompare}
          />
        </div>
        <PreviewCard
          design={compare === 'after' ? design : original}
          label={compare === 'after' ? 'After — current changes' : 'Before — original page'}
        />
        <p class={`${ui.small} ${ui.muted}`} style={{ marginBottom: 0 }}>
          {studio.coreMode === 'page'
            ? 'Panel preview — your changes are also applied to the open page as you edit.'
            : 'Mock preview — this environment runs against sample data.'}
        </p>
      </section>
    </div>
  );
}
