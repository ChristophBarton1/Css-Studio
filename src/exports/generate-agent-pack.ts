import { canExportTo } from "../billing/entitlements.js";
import type {
  AgentPack,
  DesignSnapshot,
  ExportRequest,
  ExportTarget,
} from "../contracts/export.js";

const TARGET_GUIDANCE: Record<ExportTarget, string> = {
  universal: "Use the supplied files as the source of truth for the visual implementation.",
  codex:
    "Inspect the repository first, preserve its architecture, edit existing files, and run the relevant checks after implementation.",
  "claude-code":
    "Inspect CLAUDE.md and repository conventions before editing. Make focused changes and verify them with the existing checks.",
  lovable:
    "Apply the visual system without replacing working application logic. Reuse existing components and integrations.",
  cursor:
    "Follow repository rules and implement the design through reusable tokens and existing components.",
  windsurf:
    "Preserve application behavior, follow workspace rules, and prefer small, verifiable edits.",
};

const MODE_GUIDANCE: Record<ExportRequest["mode"], string> = {
  "restyle-existing":
    "Restyle the existing application. Do not change its information architecture, behavior, or content unless explicitly requested.",
  "generate-new":
    "Create a new implementation matching the supplied design system and reference material.",
  "tokens-only":
    "Integrate only the design tokens. Do not restructure components or alter application behavior.",
  "selected-component":
    "Implement only the selected component or scoped selectors represented by this export.",
  "fix-inconsistencies":
    "Consolidate near-duplicate visual values into semantic tokens while preserving the rendered design.",
};

export class ExportNotAllowedError extends Error {
  constructor(plan: ExportRequest["plan"], target: ExportTarget) {
    super(`The ${plan} plan cannot export to ${target}.`);
    this.name = "ExportNotAllowedError";
  }
}

function extractTokens(snapshot: DesignSnapshot): Record<string, unknown> {
  return {
    colors: Object.fromEntries(
      snapshot.colors.map((color) => [color.name, { value: color.value, role: color.role }]),
    ),
    typography: snapshot.typography,
    spacing: snapshot.spacing,
    radii: snapshot.radii,
    shadows: snapshot.shadows,
  };
}

function buildImplementationBrief(request: ExportRequest): string {
  const { snapshot } = request;
  return `# Style Studio implementation brief

## Objective

${MODE_GUIDANCE[request.mode]}

## Target

- Agent: ${request.target}
- Framework: ${request.framework}
- Styling: ${request.styling}
- Source: ${snapshot.sourceUrl}
- Snapshot: ${snapshot.name}

## Agent instructions

${TARGET_GUIDANCE[request.target]}

- Treat \`design-tokens.json\` as the visual source of truth.
- Use \`styles.css\` as a rendered reference, not necessarily as code to paste verbatim.
- Preserve accessibility, responsive behavior, and interactive states.
- Do not add a UI library unless the user explicitly requests it.
- Keep changes scoped to the supplied selectors where possible.

## User instructions

${request.instructions || "No additional instructions."}
`;
}

function buildLovableUrl(brief: string): string {
  const prompt =
    brief.length > 12_000
      ? `${brief.slice(0, 12_000)}\n\n[Agent Pack contains the remaining details.]`
      : brief;
  return `https://lovable.dev/?autosubmit=true#prompt=${encodeURIComponent(prompt)}`;
}

export function generateAgentPack(request: ExportRequest): AgentPack {
  if (!canExportTo(request.plan, request.target)) {
    throw new ExportNotAllowedError(request.plan, request.target);
  }

  const brief = buildImplementationBrief(request);
  const pack: AgentPack = {
    target: request.target,
    files: {
      "IMPLEMENTATION.md": brief,
      "design-tokens.json": `${JSON.stringify(extractTokens(request.snapshot), null, 2)}\n`,
      "styles.css": `${request.snapshot.generatedCss.trim()}\n`,
      "changes.json": `${JSON.stringify(
        {
          sourceUrl: request.snapshot.sourceUrl,
          capturedAt: request.snapshot.capturedAt,
          selectors: request.snapshot.changedSelectors,
          mode: request.mode,
        },
        null,
        2,
      )}\n`,
    },
  };

  if (request.target === "codex") {
    pack.files["AGENTS.style-studio.md"] = brief;
  }
  if (request.target === "claude-code") {
    pack.files["CLAUDE.style-studio.md"] = brief;
  }
  if (request.target === "cursor") {
    pack.files[".cursor/rules/style-studio.mdc"] = brief;
  }
  if (request.target === "windsurf") {
    pack.files[".windsurf/rules/style-studio.md"] = brief;
  }
  if (request.target === "lovable") {
    pack.handoffUrl = buildLovableUrl(brief);
  }

  return pack;
}
