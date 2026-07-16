import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { createTestStore, renderWithStudio } from '../../test/render';
import { ColorsTab } from './ColorsTab';

async function openPrimaryEditor() {
  const store = createTestStore();
  await store.analyze();
  const utils = renderWithStudio(<ColorsTab />, store);
  const editButtons = screen.getAllByRole('button', { name: 'Edit' });
  fireEvent.click(editButtons[0]!); // first row = primary (brand group is first)
  return utils;
}

describe('ColorsTab replacement confirmation', () => {
  it('asks for confirmation with the occurrence count before replacing', async () => {
    const { store } = await openPrimaryEditor();

    const hexInput = screen.getByLabelText('primary hex value');
    fireEvent.input(hexInput, { target: { value: '#FF0000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() =>
      expect(screen.getByText(/23 matching elements/)).toBeInTheDocument(),
    );
    // Nothing committed yet — the confirmation is a preview step.
    expect(store.past.value).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Replace' }));
    await waitFor(() => expect(store.past.value).toHaveLength(1));
    expect(store.past.value[0]?.label).toBe('Changed primary color');
    expect(store.design.value?.colors.find((c) => c.name === 'primary')?.value).toBe('#FF0000');
  });

  it('cancel keeps the color untouched', async () => {
    const { store } = await openPrimaryEditor();

    fireEvent.input(screen.getByLabelText('primary hex value'), { target: { value: '#00FF00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(screen.getByText(/matching elements/)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(store.past.value).toHaveLength(0);
    expect(store.design.value?.colors.find((c) => c.name === 'primary')?.value).toBe('#6C5CE7');
  });

  it('rejects invalid hex values with an inline error', async () => {
    await openPrimaryEditor();
    fireEvent.input(screen.getByLabelText('primary hex value'), { target: { value: 'nope' } });
    await waitFor(() =>
      expect(screen.getByText(/Enter a hex color/)).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
  });
});
