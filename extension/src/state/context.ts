import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { StudioStore } from './studio';

const StudioContext = createContext<StudioStore | null>(null);

export const StudioProvider = StudioContext.Provider;

export function useStudio(): StudioStore {
  const store = useContext(StudioContext);
  if (!store) {
    throw new Error('useStudio must be used inside a <StudioProvider>');
  }
  return store;
}
