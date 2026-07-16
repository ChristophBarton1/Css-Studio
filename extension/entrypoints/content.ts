/**
 * In-page core for Style Studio, registered declaratively so it is present on
 * every http(s) page as soon as the extension loads — on-demand injection via
 * `scripting.executeScript` proved unreliable (activeTab grants don't always
 * apply when the action click opens the side panel). The script is inert until
 * the side panel sends a request; `executeScript` remains only as a fallback
 * for tabs opened before the extension was (re)loaded.
 *
 * All analysis stays in the browser: results go only to the side panel.
 */
import { createPageSession } from '../src/core/page-dom';
import type { CoreRequest, CoreResponse } from '../src/core/rpc';

declare global {
  interface Window {
    __STYLE_STUDIO_CORE__?: boolean;
  }
}

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_idle',
  main() {
    // Guard against double injection registering duplicate listeners.
    if (window.__STYLE_STUDIO_CORE__) return;
    window.__STYLE_STUDIO_CORE__ = true;

    const session = createPageSession(document);

    browser.runtime.onMessage.addListener(
      (message: CoreRequest, _sender, sendResponse: (response: CoreResponse) => void) => {
        void (async (): Promise<CoreResponse> => {
          try {
            switch (message?.type) {
              case 'ss:ping':
                return { ok: true, data: 'pong' };
              case 'ss:analyze':
                return { ok: true, data: await session.analyze() };
              case 'ss:apply':
                session.applyPayload(message.payload);
                return { ok: true, data: null };
              case 'ss:reset':
                session.reset();
                return { ok: true, data: null };
              case 'ss:select':
                return { ok: true, data: await session.select() };
              default:
                return { ok: false, error: 'Unknown request' };
            }
          } catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : String(error) };
          }
        })().then(sendResponse);
        return true; // keep the message channel open for the async response
      },
    );
  },
});
