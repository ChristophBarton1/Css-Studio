# Style Studio — frontend agent instructions

You are the frontend implementation agent for Style Studio. Build the Chrome
extension UI described in `docs/frontend-spec.md`. Read that document and
`docs/fable-integration.md` completely before making changes.

## Ownership boundary

You own all visible product surfaces:

- the Chrome side-panel UI
- onboarding and empty states
- visual controls and navigation
- the element-picker overlay presentation
- code-editor presentation
- export and upgrade dialogs
- frontend state, accessibility, responsive behavior, and UI tests

Create the frontend only inside `extension/` unless a documentation correction
is required. Do not move or rewrite the backend.

The following paths are backend-owned and must not be changed without explicit
approval:

- `src/`
- `tests/`
- `package.json` at repository root
- `package-lock.json` at repository root
- `.env.example`
- backend request/response semantics in `docs/openapi.yaml`

## Required frontend stack

- WXT
- Preact
- TypeScript in strict mode
- Preact Signals for shared UI state
- CSS Modules and CSS custom properties
- CodeMirror 6, loaded dynamically only when the Code tab opens
- Vitest for unit/component tests
- Playwright for extension interaction tests when practical

Do not use React, Next.js, Tailwind for the extension's own UI, shadcn, Radix,
Material UI, Chakra, or another component library. Use native accessible controls
and small local components. Use inline SVG icons or a tree-shakeable icon set.

## Product principles

1. The visual editor is the product; code is an escape hatch.
2. The panel must feel immediate, calm, and lightweight.
3. Free users receive a genuinely useful editor. Never add fake-disabled core
   controls merely to create upgrade pressure.
4. Pro is sold through professional workflows: unlimited projects, responsive
   editing, states, versions, and platform-specific handoffs.
5. Never send the full DOM, cookies, form values, or browsing history to the API.
6. Always show what will be exported before an external handoff.

## Architecture boundary

The UI must depend on a local `StyleStudioCore` interface, not directly on DOM
scanning internals. Provide a mock implementation for development. The backend
team will later provide the real content-script implementation.

```ts
interface StyleStudioCore {
  analyzePage(): Promise<DesignSnapshot>;
  selectElement(): Promise<SelectedElement>;
  applyPatch(patch: StylePatch): Promise<void>;
  resetSession(): Promise<void>;
  undo(): Promise<void>;
  redo(): Promise<void>;
}
```

Do not invent a second backend. Use the endpoints documented in
`docs/openapi.yaml`. Fetch capability values instead of hard-coding platform and
framework lists. Backend entitlement responses are authoritative.

## Required workflow

Before coding:

1. Inspect the repository and read the two referenced specifications.
2. Write a short implementation plan.
3. Scaffold only `extension/`.
4. Start with static UI and a typed mock core/API client.
5. Implement one complete vertical flow before adding secondary controls:
   Analyze page → edit primary color → preview change → open Export → generate
   universal preview.

During implementation:

- keep components focused and small
- model loading, empty, error, free, Pro, and offline states explicitly
- preserve keyboard navigation and visible focus styles
- add tests for state transitions and entitlement gates
- dynamically import optional heavy modules
- do not silently broaden Chrome permissions

Before handing off:

1. Run typecheck, tests, and production build.
2. Report bundle sizes for the initial panel and content script.
3. List remaining mocks and backend integration points.
4. Include screenshots of Design, Typography, Colors, Code, and Export tabs.

## Definition of done for the first frontend milestone

- WXT extension loads unpacked in Chrome.
- Toolbar action opens the native side panel.
- All primary tabs render without layout shift.
- Mock analysis populates detected colors, fonts, and elements.
- Visual changes update the mock preview immediately.
- Undo, redo, and reset work in the session.
- Free and Pro states match backend entitlements.
- Export preview calls the backend when available and has a documented mock mode.
- No initial CodeMirror download before opening the Code tab.
- Typecheck, tests, and build pass.

If a product decision is missing, choose the smallest reversible implementation
that follows `docs/frontend-spec.md`. Stop and ask before changing backend
contracts, pricing semantics, permissions, or privacy behavior.
