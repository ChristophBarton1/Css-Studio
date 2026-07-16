import type { DesignSnapshot, SelectedElement } from '../types';

/**
 * Deterministic analysis result for a fictional SaaS landing page. This is the
 * single source of mock detection data until the backend team ships the real
 * content-script core.
 */
export const MOCK_SNAPSHOT: DesignSnapshot = {
  id: 'snapshot_mock',
  name: 'Page analysis',
  sourceUrl: 'https://demo.stylestud.io/',
  capturedAt: '2026-07-16T10:00:00.000Z',
  colors: [
    { name: 'primary', value: '#6C5CE7', role: 'brand', occurrences: 23 },
    { name: 'primary-hover', value: '#5747D6', role: 'brand', occurrences: 9 },
    { name: 'background', value: '#FFFFFF', role: 'background', occurrences: 41 },
    { name: 'surface', value: '#F7F7FB', role: 'surface', occurrences: 18 },
    { name: 'text', value: '#18181B', role: 'foreground', occurrences: 87 },
    { name: 'text-muted', value: '#64748B', role: 'muted-foreground', occurrences: 32 },
    { name: 'border', value: '#E4E4EF', role: 'border', occurrences: 26 },
    { name: 'divider', value: '#E7E7F1', role: 'border', occurrences: 7 },
    { name: 'success', value: '#16A34A', role: 'success', occurrences: 4 },
    { name: 'warning', value: '#D97706', role: 'warning', occurrences: 3 },
    { name: 'danger', value: '#DC2626', role: 'danger', occurrences: 5 },
  ],
  typography: [
    { role: 'h1', fontFamily: 'Inter', fontSize: '44px', fontWeight: 700, lineHeight: '1.1', occurrences: 1 },
    { role: 'h2', fontFamily: 'Inter', fontSize: '32px', fontWeight: 700, lineHeight: '1.15', occurrences: 6 },
    { role: 'h3', fontFamily: 'Inter', fontSize: '22px', fontWeight: 600, lineHeight: '1.25', occurrences: 14 },
    { role: 'body', fontFamily: 'Inter', fontSize: '16px', fontWeight: 400, lineHeight: '1.6', occurrences: 142 },
    { role: 'small', fontFamily: 'Inter', fontSize: '13px', fontWeight: 400, lineHeight: '1.5', occurrences: 28 },
    { role: 'button', fontFamily: 'Inter', fontSize: '14px', fontWeight: 600, lineHeight: '1.2', occurrences: 12 },
    { role: 'link', fontFamily: 'Inter', fontSize: '16px', fontWeight: 500, lineHeight: '1.6', occurrences: 34 },
    { role: 'code', fontFamily: 'JetBrains Mono', fontSize: '13px', fontWeight: 400, lineHeight: '1.55', occurrences: 9 },
  ],
  spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '40px' },
  radii: { button: '10px', card: '14px', input: '8px' },
  shadows: { card: '0 1px 3px rgba(16, 24, 40, 0.08)' },
  generatedCss: '',
  changedSelectors: [],
  elements: [
    { role: 'buttons', label: 'Buttons', selector: 'button, .btn, [role="button"]', occurrences: 12 },
    { role: 'links', label: 'Links', selector: 'a', occurrences: 34 },
    { role: 'inputs', label: 'Inputs', selector: 'input, select, textarea', occurrences: 6 },
    { role: 'cards', label: 'Cards & surfaces', selector: '.card, [class*="card"]', occurrences: 8 },
    { role: 'images', label: 'Images', selector: 'img', occurrences: 5 },
  ],
};

export const MOCK_SELECTED_ELEMENT: SelectedElement = {
  selector: '.hero .btn-primary',
  tag: 'button',
  role: 'buttons',
  summary: 'Primary button “Start free trial” in the hero section',
  styles: {
    color: '#FFFFFF',
    'background-color': '#6C5CE7',
    'border-radius': '10px',
    padding: '12px 20px',
    opacity: '1',
  },
};
