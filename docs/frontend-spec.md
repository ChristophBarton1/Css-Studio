# Style Studio frontend product specification

This is the implementation brief for the Fable 5 / Claude Code frontend agent.
It describes the first shippable Chrome extension UI. Backend behavior is
specified separately in `openapi.yaml` and `fable-integration.md`.

## Product promise

Style Studio lets a user visually restyle a real website, understand its design
system, and hand the result to CSS or an AI coding tool. The experience should
feel closer to a focused design inspector than a full IDE.

Primary user journey:

1. Open a website.
2. Open Style Studio from the Chrome toolbar.
3. Analyze the current page.
4. Adjust typography, colors, and common element styles.
5. Compare, undo, or save the result.
6. Export CSS for free or a professional Agent Pack on Pro.

## Surface and layout

Use the native Chrome side panel. It is resizable, so the UI must remain usable
from 360px to approximately 720px wide.

Recommended structure:

```text
┌─────────────────────────────────────────────┐
│ Style Studio        example.com      • Live │
├─────────────────────────────────────────────┤
│ Design Type Colors Elements Code Export     │
├─────────────────────────────────────────────┤
│                                             │
│ Active tab content                          │
│                                             │
├─────────────────────────────────────────────┤
│ Undo  Redo  Reset             Save project  │
└─────────────────────────────────────────────┘
```

- Header and tab bar remain visible while tab content scrolls.
- Footer actions remain visible but must not cover tab content.
- At narrow widths, tabs may become horizontally scrollable.
- Avoid nested cards everywhere. Use sections, dividers, and compact rows.
- Controls should feel dense enough for professional use without resembling
  browser DevTools.

## Visual language

- neutral near-white panel background
- one restrained violet or indigo accent
- 8px base spacing grid with 4px for compact internal gaps
- approximately 8–10px control radius
- subtle borders instead of large shadows
- 13–14px default UI text
- clear hierarchy through weight and spacing, not oversized headings
- motion duration between 120ms and 180ms
- respect `prefers-reduced-motion`
- support light theme first; structure tokens so dark theme can be added later

Define all UI values as CSS custom properties in one token file. Do not scatter
raw colors across components.

## Global states

The entire panel must explicitly support:

- unsupported page, such as `chrome://` URLs
- permission required for current site
- ready but not analyzed
- analyzing
- analysis complete
- live changes applied
- offline backend with local editor still available
- recoverable API error
- Free plan
- Pro plan
- loading subscription state

Never replace the editor with a blank spinner. Preserve the last usable state and
show progress locally.

## Header

Show:

- Style Studio wordmark
- current hostname, truncated safely
- status: Ready, Analyzing, Live, Offline, or Unsupported
- overflow menu for settings, help, privacy, and keyboard shortcuts

The status indicator needs text as well as color. Do not rely on color alone.

## Design tab

Purpose: fast global transformation.

Sections:

1. Page analysis summary
   - number of detected colors, font families, and styled roles
   - Rescan button
2. Presets
   - Original
   - Modern SaaS
   - Editorial
   - Soft Minimal
   - High Contrast
3. Global style
   - density: Compact, Default, Comfortable
   - corner style: Sharp, Soft, Rounded
   - shadow style: None, Subtle, Elevated
4. Before/after toggle

Applying a preset must create one undoable transaction, not dozens of individual
history steps.

## Typography tab

Detected roles:

- H1 through H6
- body
- small or muted text
- button and control labels
- links
- code or monospace text

Each role row shows current font, size, weight, line height, and occurrence count.
Selecting a role opens controls for:

- font family
- font size and unit
- weight
- line height
- letter spacing
- text transform
- reset role

Start with system fonts and a small curated list. Webfonts must load only after
selection. Do not fetch every font for the dropdown.

## Colors tab

Show detected colors grouped semantically where possible:

- Brand
- Background
- Surface
- Foreground
- Muted foreground
- Border
- Success, warning, and danger

Each row includes swatch, normalized value, occurrence count, and edit action.
Editing supports HEX, RGB/HSL display, native eyedropper when available, and
reset. A global replacement requires a confirmation preview:

```text
Replace #6C5CE7 in 23 matching elements?
```

Near-duplicate consolidation is visible as a Pro suggestion, but basic color
editing remains free.

## Elements tab

Start with common roles rather than every DOM node:

- buttons
- links
- inputs
- cards or surfaces
- images
- selected element

Supported controls in the first milestone:

- text and background color
- padding and gap
- border width, style, and color
- radius
- shadow
- opacity
- display visibility toggle

Provide an "Select on page" action. The visible selection overlay belongs to the
frontend, but calls the `StyleStudioCore` abstraction for selection data.

## Code tab

The Code tab is an advanced escape hatch.

- modes: CSS first; SCSS shown as planned/Pro until compiler support exists
- Tailwind is initially an export target, not an arbitrary live compiler
- CodeMirror 6 loads only when this tab is opened
- show validation errors without blocking valid declarations
- actions: Format, Apply, Revert, Copy
- preserve unsaved code when switching tabs
- clearly distinguish generated CSS from user-authored CSS

Do not include an HTML or JavaScript runner in version one.

## Export tab

Export modes:

- CSS
- Universal LLM prompt
- Codex Agent Pack
- Claude Code Agent Pack
- Cursor
- Windsurf
- Lovable

Form fields come from `/v1/capabilities`:

- target
- framework
- styling system
- implementation mode
- optional instructions
- include reference image, off by default

Show an exact payload/file preview before handoff. The user must understand which
data leaves the browser.

Free behavior:

- CSS export available
- universal prompt available
- paid targets display a clear Pro badge

Pro behavior:

- all adapters available
- Agent Pack file list preview
- Lovable shows "Open in Lovable" when `handoffUrl` is returned

Handle HTTP 402 as an upgrade state, not a generic error.

## Upgrade dialog

Do not interrupt basic editing. Open the dialog only after the user deliberately
selects a paid workflow.

Content:

- headline tied to the attempted outcome
- three concise benefits
- annual option emphasized: 49 EUR/year
- monthly option: 6.99 EUR/month
- restore purchase action
- privacy and cancellation link

Avoid countdown timers, fake scarcity, and repeated modal prompts. Founder
lifetime pricing is a launch campaign and must not be hard-coded into the core
interface.

## Session history

The frontend owns session undo/redo state. Every history entry should represent a
user intent, such as "Changed primary color" or "Applied Modern SaaS preset".

Required behavior:

- undo and redo buttons with disabled states
- keyboard shortcuts where Chrome permits them
- reset confirmation only when unsaved changes exist
- original styles recoverable without reloading the page

Persistent version history is Pro and will later come from the backend.

## Frontend folder structure

Create this structure under `extension/`:

```text
extension/
├── entrypoints/
│   ├── background.ts
│   ├── content.ts
│   └── sidepanel/
│       ├── index.html
│       ├── main.tsx
│       └── App.tsx
├── src/
│   ├── api/
│   ├── components/
│   ├── core/
│   ├── features/
│   │   ├── design/
│   │   ├── typography/
│   │   ├── colors/
│   │   ├── elements/
│   │   ├── code/
│   │   └── export/
│   ├── state/
│   ├── styles/
│   ├── test/
│   └── types/
├── public/
├── tests/
├── package.json
├── tsconfig.json
└── wxt.config.ts
```

Prefer colocated feature tests. Create shared components only after the same UI
pattern is used more than once.

## API integration

Base URL must come from extension configuration, not a hard-coded production
hostname. Create a small typed client for:

- `GET /health`
- `GET /v1/capabilities`
- `GET /v1/entitlements/:plan`
- `POST /v1/exports/preview`

API client requirements:

- abort timeout
- typed success and error results
- special handling for 400 and 402
- no automatic retries for export creation
- mock adapter selectable in development
- never log export payloads in production

## Accessibility

- all controls reachable by keyboard
- visible focus states
- icon buttons have accessible names and tooltips
- tabs use correct tab semantics and arrow navigation
- errors associated with their fields
- contrast meets WCAG AA
- color controls expose textual values
- drag interactions always have a non-drag alternative

## Performance budgets

Targets for the first production build:

- initial side-panel JavaScript: under 100 KB gzip
- content script: under 35 KB gzip
- background service worker: under 15 KB gzip
- no CodeMirror in the initial side-panel chunk
- no SCSS or Tailwind compiler in the initial build
- user control updates reflected within one animation frame where possible
- page analysis work chunked so the host page remains responsive

If a budget is exceeded, report the cause instead of hiding it.

## Testing requirements

Unit/component tests:

- entitlement presentation
- history transactions
- color replacement confirmation
- export form validation
- HTTP 402 upgrade handling
- API timeout and offline state

Extension tests:

- action opens side panel
- tab keyboard navigation
- mock analysis flow
- one color edit and undo
- CodeMirror lazy loading
- free universal export
- Pro Codex export preview

Test fixtures should include a semantic HTML page and a React-style page with
div-based headings. Do not test against changing public websites.

## Explicit non-goals for version one

- HTML editing
- arbitrary JavaScript execution
- full Tailwind compilation in the browser
- full SCSS compilation in the initial bundle
- Figma plugin
- collaborative multiplayer editing
- AI-generated redesigns
- mobile browser support

## Frontend milestone order

1. WXT side-panel shell and UI tokens
2. typed mock core and mock API
3. Design tab vertical flow
4. Typography and Colors
5. Elements and selection presentation
6. session history
7. lazy Code tab
8. Export and upgrade flows
9. accessibility and error states
10. production build, tests, bundle report, and screenshots
