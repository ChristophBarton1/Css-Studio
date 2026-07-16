import { render } from 'preact';
import '../../src/styles/tokens.css';
import '../../src/styles/global.css';
import { createApi } from '../../src/api';
import { MockStyleStudioCore } from '../../src/core/mock-core';
import { isPageCoreAvailable, PageStyleStudioCore } from '../../src/core/page-core';
import { StudioProvider } from '../../src/state/context';
import { createStudioStore } from '../../src/state/studio';
import { App } from './App';

const { api, mode } = createApi();

// Inside Chrome the real page core drives the open tab; outside an extension
// context (dev preview, screenshots) the mock core keeps the panel usable.
const pageCore = isPageCoreAvailable();

const store = createStudioStore({
  core: pageCore ? new PageStyleStudioCore() : new MockStyleStudioCore(),
  api,
  apiMode: mode,
  coreMode: pageCore ? 'page' : 'mock',
});

void store.initialize();

const root = document.getElementById('app');
if (root) {
  render(
    <StudioProvider value={store}>
      <App />
    </StudioProvider>,
    root,
  );
}
