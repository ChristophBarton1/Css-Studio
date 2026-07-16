import { describe, expect, it } from 'vitest';
import type { ExportRequest } from '../types';
import { createMockApi } from './mock-api';

const api = createMockApi({ latencyMs: 0 });

function request(overrides: Partial<ExportRequest> = {}): ExportRequest {
  return {
    plan: 'free',
    target: 'universal',
    framework: 'react',
    styling: 'css',
    mode: 'restyle-existing',
    instructions: '',
    includeReferenceImage: false,
    snapshot: {
      id: 'snapshot_test',
      name: 'Test',
      sourceUrl: 'https://example.com/',
      capturedAt: '2026-07-16T10:00:00.000Z',
      colors: [{ name: 'primary', value: '#6C5CE7', role: 'brand' }],
      typography: [
        { role: 'h1', fontFamily: 'Inter', fontSize: '44px', fontWeight: 700, lineHeight: '1.1' },
      ],
      spacing: {},
      radii: {},
      shadows: {},
      generatedCss: ':root { --ss-color-primary: #6c5ce7; }',
      changedSelectors: [':root'],
    },
    ...overrides,
  };
}

describe('createMockApi', () => {
  it('mirrors backend capabilities', async () => {
    const result = await api.capabilities();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.targets).toContain('universal');
      expect(result.data.frameworks).toContain('react');
      expect(result.data.styling).toEqual(['css', 'scss', 'tailwind']);
    }
  });

  it('free plan gets only the universal target', async () => {
    const result = await api.entitlements('free');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.entitlements.exportTargets).toEqual(['universal']);
      expect(result.data.entitlements.savedProjects).toBe(2);
    }
  });

  it('free universal export succeeds with files', async () => {
    const result = await api.exportPreview(request());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.data.files)).toContain('style-studio-prompt.md');
      expect(result.data.files['style-studio-prompt.md']).toContain('#6C5CE7');
    }
  });

  it('free plan requesting codex is refused with upgrade-required (402 semantics)', async () => {
    const result = await api.exportPreview(request({ target: 'codex' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('upgrade-required');
      expect(result.error.requiredPlan).toBe('pro');
    }
  });

  it('pro codex export returns an agent pack', async () => {
    const result = await api.exportPreview(request({ plan: 'pro', target: 'codex' }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(Object.keys(result.data.files)).toContain('AGENTS.md');
  });

  it('pro lovable export includes a handoff URL', async () => {
    const result = await api.exportPreview(request({ plan: 'pro', target: 'lovable' }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.handoffUrl).toMatch(/^https:\/\/lovable\.dev\//);
  });
});
