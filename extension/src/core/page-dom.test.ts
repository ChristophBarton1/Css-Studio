// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { MOCK_SNAPSHOT } from './mock-data';
import { createColorPatch, createCustomCssPatch } from '../state/patches';
import { resolveDesign } from '../state/resolve-design';
import { createPageSession } from './page-dom';
import { buildApplyPayload } from './rpc';

/**
 * jsdom computes inline styles only, so the fixture styles everything inline.
 * That is enough to exercise detection, tagging, and rule generation.
 */
function mountFixture(): void {
  document.body.innerHTML = `
    <main style="background-color: rgb(255, 255, 255)">
      <h1 style="color: rgb(24, 24, 27); font-family: Arial; font-size: 40px; font-weight: bold; line-height: 44px">Welcome</h1>
      <p style="color: rgb(24, 24, 27); font-size: 16px; font-family: Arial; font-weight: normal; line-height: 24px">Some body text</p>
      <p style="color: rgb(24, 24, 27); font-size: 16px; font-family: Arial; font-weight: normal; line-height: 24px">More body text</p>
      <a href="#" style="color: rgb(37, 99, 235)">A link</a>
      <button style="background-color: rgb(37, 99, 235); color: rgb(255, 255, 255)">Buy now</button>
      <button style="background-color: rgb(37, 99, 235); color: rgb(255, 255, 255)">Try free</button>
      <input type="text" style="border-top-width: 1px; border-top-style: solid; border-top-color: rgb(228, 228, 239)" />
      <img src="x.png" alt="" />
    </main>
  `;
}

describe('createPageSession', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.getElementById('__style-studio-overrides__')?.remove();
  });

  it('detects colors with roles, typography, and element counts from the DOM', async () => {
    mountFixture();
    const session = createPageSession(document);
    const result = await session.analyze();

    const primary = result.colors.find((c) => c.role === 'brand');
    expect(primary?.value).toBe('#2563EB');
    expect(result.colors.find((c) => c.role === 'foreground')?.value).toBe('#18181B');
    expect(result.colors.find((c) => c.role === 'background')?.value).toBe('#FFFFFF');

    const h1 = result.typography.find((t) => t.role === 'h1');
    expect(h1?.fontSize).toBe('40px');
    expect(h1?.fontWeight).toBe(700);

    const buttons = result.elements?.find((e) => e.role === 'buttons');
    expect(buttons?.occurrences).toBe(2);
    expect(result.elements?.find((e) => e.role === 'images')?.occurrences).toBe(1);
    expect(result.sourceUrl).toContain('localhost');
  });

  it('renders a color replacement as scoped !important rules on tagged elements', async () => {
    mountFixture();
    const session = createPageSession(document);
    const analysis = await session.analyze();

    const snapshot = { ...MOCK_SNAPSHOT, ...analysis };
    const primary = analysis.colors.find((c) => c.role === 'brand')!;
    const design = resolveDesign(snapshot, [createColorPatch(primary, '#FF0000')])!;
    session.applyPayload(buildApplyPayload(design));

    const style = document.getElementById('__style-studio-overrides__');
    expect(style?.textContent).toContain('#FF0000 !important');
    expect(style?.textContent).toContain('[data-ss-id=');
    // Buttons using the primary background were tagged during analysis.
    expect(document.querySelectorAll('button[data-ss-id]').length).toBe(2);
  });

  it('appends user CSS and clears everything on reset', async () => {
    mountFixture();
    const session = createPageSession(document);
    const analysis = await session.analyze();
    const snapshot = { ...MOCK_SNAPSHOT, ...analysis };

    const design = resolveDesign(snapshot, [createCustomCssPatch('h1 { color: red; }', '')])!;
    session.applyPayload(buildApplyPayload(design));
    const style = document.getElementById('__style-studio-overrides__');
    expect(style?.textContent).toContain('h1 { color: red; }');

    session.reset();
    expect(style?.textContent).toBe('');
  });
});

describe('buildApplyPayload', () => {
  it('includes only changed values', () => {
    const primary = MOCK_SNAPSHOT.colors[0]!;
    const design = resolveDesign(MOCK_SNAPSHOT, [createColorPatch(primary, '#FF0000')])!;
    const payload = buildApplyPayload(design);
    expect(payload.colors).toEqual({ primary: '#FF0000' });
    expect(payload.typography).toEqual([]);
    expect(payload.global).toEqual({});
    expect(payload.customCss).toBe('');
  });
});
