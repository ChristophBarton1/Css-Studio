# Style Studio Backend

Backend and non-visual core contracts for the Style Studio Chrome extension.
The visible extension UI can be built independently by Fable against this API.

Frontend agents must read [`CLAUDE.md`](./CLAUDE.md) and
[`docs/frontend-spec.md`](./docs/frontend-spec.md) before creating the WXT
extension under `extension/`.

## Current milestone

- Free, Pro, and Team entitlement definitions
- Typed design snapshot and export contracts
- Universal, Codex, Claude Code, Cursor, Windsurf, and Lovable adapters
- Lovable Build-with-URL handoff
- Hono API with validation and upgrade responses
- Unit tests for plan gating and export generation

## Local development

```bash
npm install
npm run dev
```

The API starts on `http://localhost:8787` by default.

```bash
npm run typecheck
npm test
```

## API for Fable

### `GET /health`

Service health check.

### `GET /v1/capabilities`

Returns targets, frameworks, and supported styling systems. Fable should render
these values instead of hard-coding them.

### `GET /v1/entitlements/:plan`

Returns the exact UI feature gates for `free`, `pro`, or `team`.

### `POST /v1/exports/preview`

Validates a design snapshot and returns the generated Agent Pack as named text
files. A ZIP/storage endpoint will build on the same response shape.

Paid adapter requested on a free plan:

```json
{
  "error": "upgrade_required",
  "requiredPlan": "pro"
}
```

## Privacy boundary

The contracts accept visual tokens, generated CSS, changed selectors, and an
optional reference image flag. They intentionally do not accept cookies, form
values, browsing history, or the complete DOM.

## Next backend milestones

1. PostgreSQL project/version schema and repository layer
2. Supabase JWT verification
3. Billing webhook and durable entitlement lookup
4. ZIP generation and R2 signed downloads
5. Extension core package for DOM analysis and CSS application
