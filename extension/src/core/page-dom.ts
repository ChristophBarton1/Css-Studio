/**
 * The real in-page core: DOM analysis, live style application, and the
 * element picker. Runs inside the content script but only depends on a
 * `Document`, so the analysis and rendering logic is unit-testable.
 */
import type { ColorToken, DetectedElementRole, SelectedElement, TypographyToken } from '../types';
import {
  firstFontFamily,
  hue,
  luminance,
  normalizeFontWeight,
  parseCssColor,
  saturation,
  toHex,
} from './analyze-helpers';
import type { AnalyzeResult, ApplyPayload } from './rpc';

const MAX_NODES = 4000;
const STYLE_ID = '__style-studio-overrides__';
const ID_ATTR = 'data-ss-id';
const CARD_ATTR = 'data-ss-card';

const BUTTON_SELECTOR = 'button, [role="button"], input[type="submit"], input[type="button"]';
const LINK_SELECTOR = 'a[href]';
const INPUT_SELECTOR = 'input:not([type="submit"]):not([type="button"]), select, textarea';

const ROLE_SELECTORS: Record<string, string> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  body: 'p, li',
  small: 'small',
  button: BUTTON_SELECTOR,
  link: LINK_SELECTOR,
  code: 'code, pre',
};

type ColorProp = 'color' | 'background-color' | 'border-color';

interface ColorStats {
  parsed: NonNullable<ReturnType<typeof parseCssColor>>;
  textCount: number;
  bgCount: number;
  borderCount: number;
  accentCount: number; // usages on buttons/links
  usages: Array<{ el: Element; prop: ColorProp }>;
}

export interface PageSession {
  analyze(): Promise<AnalyzeResult>;
  applyPayload(payload: ApplyPayload): void;
  reset(): void;
  select(): Promise<SelectedElement>;
}

export function createPageSession(doc: Document): PageSession {
  const view = doc.defaultView;
  if (!view) throw new Error('Document has no window');
  const win: Window & typeof globalThis = view;

  let idCounter = 0;
  /** color name → css prop → tagged element ids */
  let colorIndex = new Map<string, Map<ColorProp, string[]>>();

  function ensureId(el: Element): string {
    let id = el.getAttribute(ID_ATTR);
    if (!id) {
      idCounter += 1;
      id = String(idCounter);
      el.setAttribute(ID_ATTR, id);
    }
    return id;
  }

  function styleElement(): HTMLStyleElement {
    let el = doc.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!el) {
      el = doc.createElement('style');
      el.id = STYLE_ID;
      doc.documentElement.appendChild(el);
    }
    return el;
  }

  // ---------------------------------------------------------------- analyze

  async function analyze(): Promise<AnalyzeResult> {
    reset();
    colorIndex = new Map();

    const stats = new Map<string, ColorStats>();
    const record = (raw: string, prop: ColorProp, el: Element, isAccent: boolean): void => {
      const parsed = parseCssColor(raw);
      if (!parsed || parsed.a < 0.05) return;
      const hex = toHex(parsed);
      let entry = stats.get(hex);
      if (!entry) {
        entry = { parsed, textCount: 0, bgCount: 0, borderCount: 0, accentCount: 0, usages: [] };
        stats.set(hex, entry);
      }
      if (prop === 'color') entry.textCount += 1;
      else if (prop === 'background-color') entry.bgCount += 1;
      else entry.borderCount += 1;
      if (isAccent) entry.accentCount += 1;
      entry.usages.push({ el, prop });
    };

    let cardCount = 0;
    const radiusSamples: Record<'button' | 'input' | 'card', string[]> = {
      button: [],
      input: [],
      card: [],
    };
    let cardShadow = '';

    // Include <body> itself so the page background is detected and replaceable.
    // The scan is synchronous on purpose: yielding (rAF/setTimeout) can stall in
    // throttled tabs, which kills the extension message channel mid-response.
    // Bounded at MAX_NODES it stays well under a frame budget on typical pages.
    const nodes = [doc.body, ...Array.from(doc.querySelectorAll('body *'))].slice(0, MAX_NODES);
    for (let i = 0; i < nodes.length; i += 1) {
      const el = nodes[i]!;
      const tag = el.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'META' || tag === 'LINK') {
        continue;
      }
      const cs = win.getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;

      const isButton = el.matches(BUTTON_SELECTOR);
      const isLink = el.matches(LINK_SELECTOR);
      const isAccent = isButton || isLink;

      const hasOwnText = Array.from(el.childNodes).some(
        (node) => node.nodeType === 3 && node.textContent && node.textContent.trim().length > 0,
      );
      if (hasOwnText) record(cs.color, 'color', el, isAccent);
      record(cs.backgroundColor, 'background-color', el, isAccent);
      if (Number.parseFloat(cs.borderTopWidth) > 0) {
        record(cs.borderTopColor, 'border-color', el, false);
      }

      const radius = Number.parseFloat(cs.borderRadius) || 0;
      if (isButton && radiusSamples.button.length < 20) radiusSamples.button.push(cs.borderRadius);
      if (el.matches(INPUT_SELECTOR) && radiusSamples.input.length < 20) {
        radiusSamples.input.push(cs.borderRadius);
      }
      const hasShadow = cs.boxShadow !== '' && cs.boxShadow !== 'none';
      if (!isButton && radius >= 6 && hasShadow && cardCount < 200) {
        el.setAttribute(CARD_ATTR, '');
        cardCount += 1;
        if (radiusSamples.card.length < 20) radiusSamples.card.push(cs.borderRadius);
        if (!cardShadow) cardShadow = cs.boxShadow;
      }
    }

    const colors = classifyColors(stats, doc, win);

    // Tag elements and build the color index so replacements can target them.
    for (const color of colors) {
      const entry = stats.get(color.value);
      if (!entry) continue;
      const byProp = new Map<ColorProp, string[]>();
      for (const usage of entry.usages.slice(0, 800)) {
        const id = ensureId(usage.el);
        const list = byProp.get(usage.prop) ?? [];
        list.push(id);
        byProp.set(usage.prop, list);
      }
      colorIndex.set(color.name, byProp);
    }

    const typography = detectTypography(doc, win);
    const elements = detectElements(doc, cardCount);

    const mode = (samples: string[], fallback: string): string => {
      const counts = new Map<string, number>();
      for (const sample of samples) {
        if (sample && sample !== '0px') counts.set(sample, (counts.get(sample) ?? 0) + 1);
      }
      return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? fallback;
    };

    return {
      name: 'Page analysis',
      sourceUrl: win.location.href,
      colors,
      typography,
      spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '40px' },
      radii: {
        button: mode(radiusSamples.button, '6px'),
        input: mode(radiusSamples.input, '6px'),
        card: mode(radiusSamples.card, '12px'),
      },
      shadows: cardShadow ? { card: cardShadow } : {},
      generatedCss: '',
      changedSelectors: [],
      elements,
    };
  }

  // ------------------------------------------------------------------ apply

  function applyPayload(payload: ApplyPayload): void {
    const lines: string[] = [];

    for (const [name, value] of Object.entries(payload.colors)) {
      const byProp = colorIndex.get(name);
      if (!byProp) continue;
      for (const [prop, ids] of byProp) {
        for (let i = 0; i < ids.length; i += 50) {
          const selector = ids
            .slice(i, i + 50)
            .map((id) => `[${ID_ATTR}="${id}"]`)
            .join(',');
          lines.push(`${selector} { ${prop}: ${value} !important; }`);
        }
      }
    }

    for (const token of payload.typography) {
      const selector = ROLE_SELECTORS[token.role];
      if (!selector) continue;
      lines.push(`${selector} {`);
      lines.push(`  font-family: ${token.fontFamily}, sans-serif !important;`);
      lines.push(`  font-size: ${token.fontSize} !important;`);
      lines.push(`  font-weight: ${token.fontWeight} !important;`);
      lines.push(`  line-height: ${token.lineHeight} !important;`);
      if (token.letterSpacing) lines.push(`  letter-spacing: ${token.letterSpacing} !important;`);
      if (token.textTransform) lines.push(`  text-transform: ${token.textTransform} !important;`);
      lines.push('}');
    }

    if (payload.global.corner) {
      const radius = { sharp: '0px', soft: '8px', rounded: '16px' }[payload.global.corner];
      lines.push(
        `${BUTTON_SELECTOR}, ${INPUT_SELECTOR}, [${CARD_ATTR}] { border-radius: ${radius} !important; }`,
      );
    }
    if (payload.global.shadow) {
      const shadow = {
        none: 'none',
        subtle: '0 1px 3px rgba(16, 24, 40, 0.10)',
        elevated: '0 10px 30px rgba(16, 24, 40, 0.18)',
      }[payload.global.shadow];
      lines.push(`[${CARD_ATTR}] { box-shadow: ${shadow} !important; }`);
      if (payload.global.shadow === 'none') {
        lines.push(`${BUTTON_SELECTOR} { box-shadow: none !important; }`);
      }
    }
    if (payload.global.density && payload.global.density !== 'default') {
      const padding = payload.global.density === 'compact' ? '4px 10px' : '14px 22px';
      lines.push(`${BUTTON_SELECTOR} { padding: ${padding} !important; }`);
    }

    for (const [selector, props] of Object.entries(payload.elements)) {
      const declarations = Object.entries(props)
        .filter(([, value]) => value !== '')
        .map(([prop, value]) => `${prop}: ${value} !important;`)
        .join(' ');
      if (declarations) lines.push(`${selector} { ${declarations} }`);
    }

    if (payload.customCss.trim()) {
      lines.push('/* Style Studio — user CSS */');
      lines.push(payload.customCss);
    }

    styleElement().textContent = lines.join('\n');
  }

  function reset(): void {
    const el = doc.getElementById(STYLE_ID);
    if (el) el.textContent = '';
  }

  // ----------------------------------------------------------------- select

  function select(): Promise<SelectedElement> {
    return new Promise((resolve, reject) => {
      const overlay = doc.createElement('div');
      overlay.setAttribute(
        'style',
        [
          'position: fixed',
          'z-index: 2147483647',
          'pointer-events: none',
          'border: 2px solid #2563EB',
          'background: rgba(37, 99, 235, 0.08)',
          'border-radius: 2px',
          'top: 0; left: 0; width: 0; height: 0',
        ].join(';'),
      );
      doc.documentElement.appendChild(overlay);

      const cleanup = (): void => {
        overlay.remove();
        doc.removeEventListener('mousemove', onMove, true);
        doc.removeEventListener('click', onClick, true);
        doc.removeEventListener('keydown', onKey, true);
      };

      const onMove = (event: MouseEvent): void => {
        const target = event.target as Element | null;
        if (!target || target === overlay) return;
        const rect = target.getBoundingClientRect();
        overlay.style.top = `${rect.top}px`;
        overlay.style.left = `${rect.left}px`;
        overlay.style.width = `${rect.width}px`;
        overlay.style.height = `${rect.height}px`;
      };

      const onClick = (event: MouseEvent): void => {
        event.preventDefault();
        event.stopPropagation();
        const target = event.target as Element | null;
        cleanup();
        if (!target) {
          reject(new Error('Nothing selected'));
          return;
        }
        resolve(describeElement(target));
      };

      const onKey = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') {
          cleanup();
          reject(new Error('Selection cancelled'));
        }
      };

      doc.addEventListener('mousemove', onMove, true);
      doc.addEventListener('click', onClick, true);
      doc.addEventListener('keydown', onKey, true);
    });
  }

  function describeElement(el: Element): SelectedElement {
    const cs = win!.getComputedStyle(el);
    const id = ensureId(el);
    const tag = el.tagName.toLowerCase();
    const text = (el.textContent ?? '').trim().slice(0, 40);
    const classes = Array.from(el.classList).slice(0, 2).join('.');
    const role = el.matches(BUTTON_SELECTOR)
      ? 'buttons'
      : el.matches(LINK_SELECTOR)
        ? 'links'
        : el.matches(INPUT_SELECTOR)
          ? 'inputs'
          : tag === 'img'
            ? 'images'
            : 'element';
    return {
      selector: `[${ID_ATTR}="${id}"]`,
      tag,
      role,
      summary: `<${tag}${classes ? `.${classes}` : ''}>${text ? ` — “${text}”` : ''}`,
      styles: {
        color: toHex(parseCssColor(cs.color) ?? { r: 0, g: 0, b: 0, a: 1 }),
        'background-color': toHex(
          parseCssColor(cs.backgroundColor) ?? { r: 255, g: 255, b: 255, a: 1 },
        ),
        'border-radius': cs.borderRadius,
        padding: cs.padding,
        opacity: cs.opacity,
        display: '',
      },
    };
  }

  return { analyze, applyPayload, reset, select };
}

// ---------------------------------------------------------- classification

function classifyColors(
  stats: Map<string, ColorStats>,
  doc: Document,
  win: Window & typeof globalThis,
): ColorToken[] {
  const assigned = new Set<string>();
  const colors: ColorToken[] = [];
  const total = (s: ColorStats) => s.textCount + s.bgCount + s.borderCount;

  const push = (name: string, role: string, hex: string | undefined): void => {
    if (!hex || assigned.has(hex)) return;
    const entry = stats.get(hex);
    assigned.add(hex);
    colors.push({ name, value: hex, role, occurrences: entry ? total(entry) : 1 });
  };

  const pick = (
    filter: (hex: string, s: ColorStats) => boolean,
    rank: (s: ColorStats) => number,
  ): string | undefined =>
    [...stats.entries()]
      .filter(([hex, s]) => !assigned.has(hex) && filter(hex, s))
      .sort((a, b) => rank(b[1]) - rank(a[1]))[0]?.[0];

  // Brand: the most-used saturated color on buttons/links.
  push(
    'primary',
    'brand',
    pick(
      (_hex, s) => s.accentCount > 0 && saturation(s.parsed) > 0.25,
      (s) => s.accentCount,
    ) ??
      pick(
        (_hex, s) => saturation(s.parsed) > 0.35 && total(s) > 1,
        (s) => saturation(s.parsed) * total(s),
      ),
  );

  // Background: the page's own background, then the most-used light backgrounds.
  const bodyBg = parseCssColor(win.getComputedStyle(doc.body).backgroundColor);
  const bodyHex = bodyBg && bodyBg.a > 0.05 ? toHex(bodyBg) : '#FFFFFF';
  push('background', 'background', stats.has(bodyHex) ? bodyHex : undefined);
  if (!stats.has(bodyHex)) push('background', 'background', pick((_h, s) => s.bgCount > 0 && luminance(s.parsed) > 0.55, (s) => s.bgCount));
  push('surface', 'surface', pick((_h, s) => s.bgCount > 1 && luminance(s.parsed) > 0.5, (s) => s.bgCount));

  // Text colors.
  push('text', 'foreground', pick((_h, s) => s.textCount > 0 && luminance(s.parsed) < 0.55, (s) => s.textCount));
  push('text-muted', 'muted-foreground', pick((_h, s) => s.textCount > 1 && luminance(s.parsed) < 0.75, (s) => s.textCount));

  // Borders.
  push('border', 'border', pick((_h, s) => s.borderCount > 0, (s) => s.borderCount));

  // Signal colors by hue.
  const signal = (min: number, max: number) =>
    pick(
      (_h, s) => {
        const h = hue(s.parsed);
        const inRange = min <= max ? h >= min && h <= max : h >= min || h <= max;
        return inRange && saturation(s.parsed) > 0.35 && total(s) > 0;
      },
      (s) => total(s),
    );
  push('success', 'success', signal(85, 170));
  push('warning', 'warning', signal(20, 60));
  push('danger', 'danger', signal(345, 12));

  // Keep the most-used remaining colors visible under "Other".
  const leftovers = [...stats.entries()]
    .filter(([hex, s]) => !assigned.has(hex) && total(s) >= 3)
    .sort((a, b) => total(b[1]) - total(a[1]))
    .slice(0, 3);
  leftovers.forEach(([hex], index) => push(`color-${index + 1}`, 'palette', hex));

  return colors;
}

function detectTypography(doc: Document, win: Window & typeof globalThis): TypographyToken[] {
  const tokens: TypographyToken[] = [];
  for (const [role, selector] of Object.entries(ROLE_SELECTORS)) {
    const matches = doc.querySelectorAll(selector);
    if (matches.length === 0) continue;
    const counts = new Map<string, { count: number; token: TypographyToken }>();
    for (const el of Array.from(matches).slice(0, 40)) {
      const cs = win.getComputedStyle(el);
      if (cs.display === 'none') continue;
      const token: TypographyToken = {
        role,
        fontFamily: firstFontFamily(cs.fontFamily || 'system-ui'),
        fontSize: cs.fontSize || '16px',
        fontWeight: normalizeFontWeight(cs.fontWeight || '400'),
        lineHeight: cs.lineHeight || 'normal',
        occurrences: matches.length,
      };
      const key = `${token.fontFamily}|${token.fontSize}|${token.fontWeight}|${token.lineHeight}`;
      const entry = counts.get(key);
      if (entry) entry.count += 1;
      else counts.set(key, { count: 1, token });
    }
    const best = [...counts.values()].sort((a, b) => b.count - a.count)[0];
    if (best) tokens.push(best.token);
  }
  return tokens;
}

function detectElements(doc: Document, cardCount: number): DetectedElementRole[] {
  const roles: DetectedElementRole[] = [
    {
      role: 'buttons',
      label: 'Buttons',
      selector: BUTTON_SELECTOR,
      occurrences: doc.querySelectorAll(BUTTON_SELECTOR).length,
    },
    {
      role: 'links',
      label: 'Links',
      selector: LINK_SELECTOR,
      occurrences: doc.querySelectorAll(LINK_SELECTOR).length,
    },
    {
      role: 'inputs',
      label: 'Inputs',
      selector: INPUT_SELECTOR,
      occurrences: doc.querySelectorAll(INPUT_SELECTOR).length,
    },
    {
      role: 'cards',
      label: 'Cards & surfaces',
      selector: `[${CARD_ATTR}]`,
      occurrences: cardCount,
    },
    {
      role: 'images',
      label: 'Images',
      selector: 'img',
      occurrences: doc.querySelectorAll('img').length,
    },
  ];
  return roles.filter((role) => role.occurrences > 0);
}
