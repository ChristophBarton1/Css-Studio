import { screen, waitFor } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { createTestStore, renderWithStudio } from '../../test/render';
import { ExportTab } from './ExportTab';

async function storeWithAnalysis(plan: 'free' | 'pro') {
  const store = createTestStore();
  await store.setPlan(plan);
  await store.analyze();
  return store;
}

describe('ExportTab entitlement presentation', () => {
  it('free plan: universal is open, paid targets carry a Pro badge', async () => {
    const store = await storeWithAnalysis('free');
    renderWithStudio(<ExportTab />, store);

    await waitFor(() => expect(screen.getByText('Universal')).toBeInTheDocument());

    const universal = screen.getByText('Universal').closest('button')!;
    expect(universal.textContent).not.toContain('Pro');

    for (const label of ['Codex', 'Claude Code', 'Cursor', 'Windsurf', 'Lovable']) {
      const button = screen.getByText(label).closest('button')!;
      expect(button.textContent).toContain('Pro');
    }
  });

  it('pro plan: no Pro badges on targets', async () => {
    const store = await storeWithAnalysis('pro');
    renderWithStudio(<ExportTab />, store);

    await waitFor(() => expect(screen.getByText('Codex')).toBeInTheDocument());
    const codex = screen.getByText('Codex').closest('button')!;
    expect(codex.textContent).not.toContain('Pro');
  });

  it('payload preview shows the exact request that would be sent', async () => {
    const store = await storeWithAnalysis('free');
    renderWithStudio(<ExportTab />, store);
    await waitFor(() => expect(screen.getByText('Universal')).toBeInTheDocument());
    expect(screen.getByText(/What leaves the browser/)).toBeInTheDocument();
    expect(screen.getByText(/"includeReferenceImage": false/)).toBeInTheDocument();
  });
});
