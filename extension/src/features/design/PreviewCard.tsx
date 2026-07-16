import type { JSX } from 'preact';
import type { TypographyToken } from '../../types';
import type { ResolvedDesign } from '../../state/resolve-design';
import styles from './PreviewCard.module.css';

interface PreviewCardProps {
  design: ResolvedDesign;
  label: string;
}

const CORNER_RADII = { sharp: '0px', soft: '8px', rounded: '14px' } as const;
const SHADOWS = {
  none: 'none',
  subtle: '0 1px 3px rgba(16, 24, 40, 0.10)',
  elevated: '0 8px 24px rgba(16, 24, 40, 0.16)',
} as const;
const DENSITY = {
  compact: { pad: '10px', gap: '8px', btnPad: '4px 10px' },
  default: { pad: '16px', gap: '12px', btnPad: '7px 14px' },
  comfortable: { pad: '24px', gap: '16px', btnPad: '10px 18px' },
} as const;

/**
 * In-panel mock preview of the current working design. Stands in for the live
 * page until the real content-script core applies changes to the site itself.
 */
export function PreviewCard({ design, label }: PreviewCardProps) {
  const color = (name: string, fallback: string): string =>
    design.colors.find((c) => c.name === name)?.value ?? fallback;
  const type = (role: string) => design.typography.find((t) => t.role === role);

  const primary = color('primary', '#6C5CE7');
  const background = color('background', '#FFFFFF');
  const surface = color('surface', '#F7F7FB');
  const text = color('text', '#18181B');
  const muted = color('text-muted', '#64748B');
  const border = color('border', '#E4E4EF');

  const h1 = type('h1');
  const body = type('body');
  const button = type('button');

  // Detected families may not be installed locally — keep the preview sane.
  const family = (token?: TypographyToken): string | undefined =>
    token ? `${token.fontFamily}, sans-serif` : undefined;

  const density = DENSITY[design.global.density];
  const radius = CORNER_RADII[design.global.corner];
  const shadow = SHADOWS[design.global.shadow];

  const pageStyle: JSX.CSSProperties = {
    background,
    color: text,
    '--pv-pad': density.pad,
    '--pv-gap': density.gap,
    '--pv-btn-pad': density.btnPad,
  } as JSX.CSSProperties;

  return (
    <div class={styles.frame} role="img" aria-label={`${label} design preview`}>
      <div class={styles.frameLabel} aria-hidden="true">
        <span>{label}</span>
        <span>{design.presetName ?? 'custom'}</span>
      </div>
      <div class={styles.page} style={pageStyle}>
        <div class={styles.nav}>
          <span class={styles.navBrand} style={{ background: primary }} />
          <span style={{ fontSize: '12px', fontWeight: 700 }}>Acme</span>
          <span class={styles.navLinks} style={{ color: muted }}>
            <span>Product</span>
            <span>Pricing</span>
            <span style={{ color: primary, fontWeight: 600 }}>Sign in</span>
          </span>
        </div>
        <h3
          class={styles.heading}
          style={{
            fontFamily: family(h1),
            fontWeight: h1?.fontWeight ?? 700,
            lineHeight: h1?.lineHeight ?? '1.1',
            fontSize: '20px',
          }}
        >
          Ship your design system faster
        </h3>
        <p
          class={styles.paragraph}
          style={{
            fontFamily: family(body),
            fontWeight: body?.fontWeight ?? 400,
            lineHeight: body?.lineHeight ?? '1.6',
            fontSize: '12px',
            color: muted,
          }}
        >
          Restyle any page visually, then hand off clean tokens to your team.
        </p>
        <div class={styles.buttonRow}>
          <span
            class={styles.button}
            style={{
              background: primary,
              color: '#FFFFFF',
              borderRadius: radius,
              fontFamily: family(button),
              fontWeight: button?.fontWeight ?? 600,
              fontSize: '12px',
              boxShadow: shadow,
            }}
          >
            Start free trial
          </span>
          <span
            class={styles.button}
            style={{
              background: 'transparent',
              color: text,
              border: `1px solid ${border}`,
              borderRadius: radius,
              fontFamily: family(button),
              fontWeight: button?.fontWeight ?? 600,
              fontSize: '12px',
            }}
          >
            Live demo
          </span>
        </div>
        <div
          class={styles.card}
          style={{
            background: surface,
            border: `1px solid ${border}`,
            borderRadius: radius,
            boxShadow: shadow,
            padding: density.pad,
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 650 }}>“Saved us a full sprint.”</span>
          <span style={{ fontSize: '11px', color: muted }}>Jordan — Head of Product, Verve</span>
        </div>
      </div>
    </div>
  );
}
