# Style Studio — Chrome extension frontend

First frontend milestone of the Style Studio side-panel UI. Built with WXT,
Preact, TypeScript (strict), Preact Signals, and CSS Modules, against the
backend contract in [`../docs/openapi.yaml`](../docs/openapi.yaml).

## Develop

```bash
cd extension
npm install
npm run dev        # wxt dev server (mock API by default)
npm run typecheck  # tsc --noEmit
npm test           # vitest (44 tests)
npm run build      # production build into .output/chrome-mv3 (talks to the backend)
npm run build:test # TEST build into .output/chrome-mv3-testing (mock API baked in)
```

## Testing without a backend (recommended for manual QA)

1. `npm run build:test`
2. Open `chrome://extensions`, enable *Developer mode*, click *Load unpacked*,
   and select `extension/.output/chrome-mv3-testing`.
3. Pin **Style Studio** and click its toolbar icon — the side panel opens.
4. Click *Analyze page*, then walk the tabs. Everything works offline: the
   in-memory mock API answers capabilities/entitlements/exports, including the
   402 → upgrade dialog when a free plan requests a Pro target. Use the header
   ⋮ menu → *Plan (dev preview)* to simulate free/pro/team.

To test against the real backend instead: run `npm run dev` at the repository
root (API on `http://localhost:8787`), build with `npm run build`, and load
`extension/.output/chrome-mv3`. Clicking the toolbar action opens the native
side panel (`sidePanel.setPanelBehavior`, Chrome ≥ 116).

## API modes (documented mock mode)

| Mode | When | What |
| --- | --- | --- |
| `mock` | Default in `wxt dev`, or `WXT_USE_MOCK_API=true` | In-memory `createMockApi()` mirroring the backend's capabilities, entitlement gates (`free` → universal only), and adapter outputs, including 402 semantics. |
| `http` | Production builds, or `WXT_USE_MOCK_API=false` | Typed client for `GET /health`, `GET /v1/capabilities`, `GET /v1/entitlements/:plan`, `POST /v1/exports/preview`. Abort timeout (10 s), typed 400/402 handling, no retries, no payload logging. |

The base URL comes from `WXT_API_BASE_URL` (default `http://localhost:8787`) —
never a hard-coded production hostname. The header menu → *Settings & about*
shows the active mode; *Plan (dev preview)* simulates free/pro/team until real
auth exists. Entitlement responses from the backend remain authoritative.

## Architecture

- `entrypoints/sidepanel/` — panel shell (`App.tsx`), store bootstrap.
- `entrypoints/background.ts` — opens the side panel from the action.
- `entrypoints/content.ts` — the **real in-page core**, registered
  declaratively for `http(s)` pages (inert until the panel sends a request).
  On-demand `executeScript` injection remains only as a fallback for tabs that
  predate the extension load — activeTab grants proved unreliable when the
  action click opens the side panel. Wraps `src/core/page-dom.ts`.
- `src/core/page-dom.ts` — DOM analysis (color roles, typography, elements),
  live style application via one scoped `<style>` element with per-element
  `data-ss-id` targeting, and the element-picker overlay. Verified end-to-end
  in headless Chrome against a fixture page.
- `src/core/page-core.ts` — panel-side `StyleStudioCore` that mirrors history
  and sends the resolved diff to the page (the page side is stateless).
- `src/core/mock-core.ts` — fallback core used outside an extension context
  (dev preview, screenshots). The UI only ever talks to the
  `StyleStudioCore` interface from `CLAUDE.md`.
- `src/state/` — Signals store: snapshot, patch-based session history
  (undo/redo/reset, one preset = one transaction), resolved working design,
  generated CSS, entitlements, offline/unsupported states.
- `src/api/` — typed HTTP client + mock API, selected in `src/api/index.ts`.
- `src/features/` — design / typography / colors / elements / code / export tabs.
- `src/styles/tokens.css` — every UI value as a CSS custom property
  (light-first; dark theme can override under one selector later).

## Bundle report (production, gzip)

| Artifact | Raw | Gzip | Budget | Status |
| --- | --- | --- | --- | --- |
| Initial side-panel JS (`chunks/sidepanel-*.js`) | 89.3 KB | **30.6 KB** | < 100 KB | ✅ |
| Side-panel CSS | 19.6 KB | 4.2 KB | — | ✅ |
| Content script (real page core) | 13.7 KB | **5.5 KB** | < 35 KB | ✅ |
| Background service worker | 0.7 KB | **0.4 KB** | < 15 KB | ✅ |
| CodeMirror chunk (`chunks/editor-*.js`, lazy) | 440.2 KB | 146.1 KB | not in initial chunk | ✅ loaded only when the Code tab opens |

Manifest permissions: `sidePanel`, `storage`, `activeTab`, `scripting`, plus
host permissions for `http://*/*` and `https://*/*` (required for reliable
analysis/editing of the page the user opens the panel on; Chrome shows the
standard "read and change site data" notice at install). The content script is
passive until the side panel sends a request, and page data never leaves the
browser except through the Export payload the user previews.

## Remaining mocks / backend integration points

1. **Page core is a frontend baseline** — analysis heuristics, style
   application, and the picker live in `src/core/page-dom.ts` behind the
   `StyleStudioCore` interface. The backend team can replace or extend the
   internals without touching the UI (single construction site in
   `entrypoints/sidepanel/main.tsx`).
2. **`MockStyleStudioCore`** — still used automatically outside an extension
   context (dev preview in a plain browser tab, screenshot tooling).
3. **Mock API** (`src/api/mock-api.ts`) — dev default; mirrors
   `src/billing/entitlements.ts` and the adapter file names loosely. Keep in
   sync or delete once a dev backend is always available.
4. **Plan switcher** (header menu) — simulates plans; replace with real
   auth/subscription state (`loading subscription state` is already modeled).
5. **Upgrade dialog checkout** — buttons intentionally report that billing is
   not wired up; connect to the billing flow later. Prices are display-only.
6. **Hostname/status detection** — uses `tabs.query` + `activeTab` when
   available and falls back to a demo hostname outside an extension context.
   Permission-required state is modeled but not yet driven by real probing.
7. **Save project** — stores sessions in `storage.local` with the free-plan
   limit enforced; cloud projects/versions arrive with the backend milestones.
8. **Typography webfonts** — curated system-font list only; webfont loading
   after selection is future work.

## Screenshots

`screenshots/` (captured from the production build against the live backend):
full vertical flow — analyze → edit primary color (confirmation with
occurrence count) → live preview → undo → Code tab (lazy CodeMirror) →
Export universal preview → free-plan Codex attempt ending in the 402 upgrade
dialog.
