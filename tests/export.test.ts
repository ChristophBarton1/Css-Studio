import { describe, expect, it } from "vitest";
import type { ExportRequest } from "../src/contracts/export.js";
import {
  ExportNotAllowedError,
  generateAgentPack,
} from "../src/exports/generate-agent-pack.js";

const request: ExportRequest = {
  plan: "pro",
  target: "codex",
  framework: "react",
  styling: "tailwind",
  mode: "restyle-existing",
  includeReferenceImage: false,
  instructions: "Keep the current layout.",
  snapshot: {
    id: "snapshot-1",
    name: "Modern SaaS",
    sourceUrl: "https://example.com/",
    capturedAt: "2026-07-16T10:00:00.000Z",
    colors: [{ name: "primary", value: "#6c5ce7", role: "brand" }],
    typography: [
      {
        role: "heading",
        fontFamily: "Space Grotesk",
        fontSize: "48px",
        fontWeight: 700,
        lineHeight: "1.1",
      },
    ],
    spacing: { md: "16px" },
    radii: { button: "10px" },
    shadows: {},
    generatedCss: ":root { --color-primary: #6c5ce7; }",
    changedSelectors: ["h1", ".button"],
  },
};

describe("agent pack generation", () => {
  it("creates a Codex-specific pack", () => {
    const pack = generateAgentPack(request);
    expect(pack.files["IMPLEMENTATION.md"]).toContain("preserve its architecture");
    expect(pack.files["AGENTS.style-studio.md"]).toBeDefined();
    expect(pack.files["design-tokens.json"]).toContain("#6c5ce7");
  });

  it("creates an official Lovable handoff URL", () => {
    const pack = generateAgentPack({ ...request, target: "lovable" });
    expect(pack.handoffUrl).toMatch(/^https:\/\/lovable\.dev\/\?autosubmit=true#prompt=/);
  });

  it("blocks paid adapters for free users", () => {
    expect(() => generateAgentPack({ ...request, plan: "free" })).toThrow(
      ExportNotAllowedError,
    );
  });
});
