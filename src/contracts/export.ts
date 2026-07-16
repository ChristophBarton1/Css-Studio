import { z } from "zod";

export const planSchema = z.enum(["free", "pro", "team"]);
export type Plan = z.infer<typeof planSchema>;

export const exportTargetSchema = z.enum([
  "universal",
  "codex",
  "claude-code",
  "lovable",
  "cursor",
  "windsurf",
]);
export type ExportTarget = z.infer<typeof exportTargetSchema>;

export const frameworkSchema = z.enum([
  "html",
  "react",
  "nextjs",
  "vue",
  "svelte",
]);

export const stylingSchema = z.enum(["css", "scss", "tailwind"]);

const colorTokenSchema = z.object({
  name: z.string().min(1).max(80),
  value: z.string().min(1).max(120),
  role: z.string().min(1).max(80),
});

const typographyTokenSchema = z.object({
  role: z.string().min(1).max(80),
  fontFamily: z.string().min(1).max(200),
  fontSize: z.string().min(1).max(40),
  fontWeight: z.number().int().min(1).max(1000),
  lineHeight: z.string().min(1).max(40),
});

export const designSnapshotSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(120),
  sourceUrl: z.string().url(),
  capturedAt: z.string().datetime(),
  colors: z.array(colorTokenSchema).max(200),
  typography: z.array(typographyTokenSchema).max(100),
  spacing: z.record(z.string(), z.string()).default({}),
  radii: z.record(z.string(), z.string()).default({}),
  shadows: z.record(z.string(), z.string()).default({}),
  generatedCss: z.string().max(500_000),
  changedSelectors: z.array(z.string().max(500)).max(2_000).default([]),
});

export type DesignSnapshot = z.infer<typeof designSnapshotSchema>;

export const exportRequestSchema = z.object({
  plan: planSchema,
  target: exportTargetSchema,
  framework: frameworkSchema,
  styling: stylingSchema,
  mode: z.enum([
    "restyle-existing",
    "generate-new",
    "tokens-only",
    "selected-component",
    "fix-inconsistencies",
  ]),
  snapshot: designSnapshotSchema,
  instructions: z.string().max(10_000).default(""),
  includeReferenceImage: z.boolean().default(false),
});

export type ExportRequest = z.infer<typeof exportRequestSchema>;

export interface AgentPack {
  target: ExportTarget;
  files: Record<string, string>;
  handoffUrl?: string;
}
