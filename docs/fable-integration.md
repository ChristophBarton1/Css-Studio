# Fable integration handoff

Fable owns the visible UI. The backend owns validation, entitlements, and Agent
Pack generation. UI labels may be localized, but submitted enum values must use
the API values from `GET /v1/capabilities`.

## Recommended export flow

1. Fetch `/v1/capabilities` when the export dialog opens.
2. Fetch `/v1/entitlements/{plan}` for visible locks and upgrade labels.
3. Assemble the current visual state into a `DesignSnapshot`.
4. Submit the selection to `/v1/exports/preview`.
5. Render returned filenames and previews.
6. If the response is `402`, show the Pro upgrade dialog.
7. If `handoffUrl` is present, show an additional "Open in Lovable" action.

The UI must not infer paid access locally. It may hide controls for convenience,
but the backend remains authoritative.

## Example request

```json
{
  "plan": "pro",
  "target": "codex",
  "framework": "react",
  "styling": "tailwind",
  "mode": "restyle-existing",
  "instructions": "Keep the existing layout and functionality.",
  "includeReferenceImage": false,
  "snapshot": {
    "id": "snapshot_demo",
    "name": "Modern SaaS",
    "sourceUrl": "https://example.com/",
    "capturedAt": "2026-07-16T10:00:00.000Z",
    "colors": [
      { "name": "primary", "value": "#6c5ce7", "role": "brand" },
      { "name": "text", "value": "#18181b", "role": "foreground" }
    ],
    "typography": [
      {
        "role": "heading",
        "fontFamily": "Space Grotesk",
        "fontSize": "48px",
        "fontWeight": 700,
        "lineHeight": "1.1"
      }
    ],
    "spacing": { "md": "16px" },
    "radii": { "button": "10px" },
    "shadows": {},
    "generatedCss": ":root { --color-primary: #6c5ce7; }",
    "changedSelectors": ["h1", ".button"]
  }
}
```

## Privacy requirements

- Never include cookies, tokens, form values, or browsing history.
- Do not send the complete DOM.
- Reference images require an explicit user choice.
- Show a payload preview before any third-party handoff.
