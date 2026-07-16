import type {
  AgentPack,
  ApiResult,
  Capabilities,
  Entitlements,
  EntitlementsResponse,
  ExportRequest,
  ExportTarget,
  HealthResponse,
  Plan,
  StyleStudioApi,
} from '../types';

export interface MockApiOptions {
  /** Simulated network latency. Set to 0 in tests. */
  latencyMs?: number;
}

const ALL_TARGETS: ExportTarget[] = [
  'universal',
  'codex',
  'claude-code',
  'lovable',
  'cursor',
  'windsurf',
];

/** Mirrors `src/billing/entitlements.ts` in the backend. Keep in sync. */
const ENTITLEMENTS: Record<Plan, Entitlements> = {
  free: {
    savedProjects: 2,
    versionsPerProject: 1,
    responsiveEditing: false,
    stateEditing: false,
    cloudBackup: false,
    professionalExports: false,
    exportTargets: ['universal'],
  },
  pro: {
    savedProjects: 'unlimited',
    versionsPerProject: 'unlimited',
    responsiveEditing: true,
    stateEditing: true,
    cloudBackup: true,
    professionalExports: true,
    exportTargets: ALL_TARGETS,
  },
  team: {
    savedProjects: 'unlimited',
    versionsPerProject: 'unlimited',
    responsiveEditing: true,
    stateEditing: true,
    cloudBackup: true,
    professionalExports: true,
    exportTargets: ALL_TARGETS,
  },
};

const CAPABILITIES: Capabilities = {
  targets: ALL_TARGETS,
  frameworks: ['html', 'react', 'nextjs', 'vue', 'svelte'],
  styling: ['css', 'scss', 'tailwind'],
};

function tokensMarkdown(request: ExportRequest): string {
  const colorRows = request.snapshot.colors
    .map((color) => `| ${color.name} | \`${color.value}\` | ${color.role} |`)
    .join('\n');
  const typeRows = request.snapshot.typography
    .map(
      (t) =>
        `| ${t.role} | ${t.fontFamily} | ${t.fontSize} | ${t.fontWeight} | ${t.lineHeight} |`,
    )
    .join('\n');
  return [
    '## Color tokens',
    '',
    '| Token | Value | Role |',
    '| --- | --- | --- |',
    colorRows,
    '',
    '## Typography',
    '',
    '| Role | Family | Size | Weight | Line height |',
    '| --- | --- | --- | --- | --- |',
    typeRows,
  ].join('\n');
}

function buildPrompt(request: ExportRequest): string {
  const instructions = request.instructions?.trim();
  return [
    `# Restyle ${request.snapshot.sourceUrl}`,
    '',
    `Apply the design system below to a ${request.framework} project using ${request.styling}.`,
    `Implementation mode: ${request.mode}. Keep existing layout and functionality intact.`,
    '',
    tokensMarkdown(request),
    '',
    '## Generated CSS',
    '',
    '```css',
    request.snapshot.generatedCss,
    '```',
    '',
    '## Rules',
    '',
    '- Apply colors through CSS custom properties where possible.',
    '- Do not change markup structure or behavior.',
    ...(request.snapshot.changedSelectors.length
      ? ['- Focus on these selectors: ' + request.snapshot.changedSelectors.join(', ')]
      : []),
    ...(instructions ? ['', '## Additional instructions', '', instructions] : []),
    '',
  ].join('\n');
}

function tokensCss(request: ExportRequest): string {
  return request.snapshot.generatedCss || '/* No generated CSS yet. */';
}

function buildPack(request: ExportRequest): AgentPack {
  const prompt = buildPrompt(request);
  switch (request.target) {
    case 'universal':
      return {
        target: 'universal',
        files: {
          'style-studio-prompt.md': prompt,
          'design-tokens.json': JSON.stringify(
            { colors: request.snapshot.colors, typography: request.snapshot.typography },
            null,
            2,
          ),
        },
      };
    case 'codex':
      return {
        target: 'codex',
        files: {
          'AGENTS.md': prompt,
          'style-guide.md': tokensMarkdown(request),
          'tokens.css': tokensCss(request),
        },
      };
    case 'claude-code':
      return {
        target: 'claude-code',
        files: {
          'CLAUDE.md': prompt,
          'style-guide.md': tokensMarkdown(request),
          'tokens.css': tokensCss(request),
        },
      };
    case 'cursor':
      return {
        target: 'cursor',
        files: { '.cursorrules': prompt, 'tokens.css': tokensCss(request) },
      };
    case 'windsurf':
      return {
        target: 'windsurf',
        files: { '.windsurfrules': prompt, 'tokens.css': tokensCss(request) },
      };
    case 'lovable':
      return {
        target: 'lovable',
        files: { 'lovable-prompt.md': prompt },
        handoffUrl: `https://lovable.dev/?prompt=${encodeURIComponent(prompt.slice(0, 1_500))}`,
      };
  }
}

/**
 * In-memory stand-in for the backend with identical entitlement gating.
 * Selected automatically in development — see `src/api/index.ts`.
 */
export function createMockApi(options: MockApiOptions = {}): StyleStudioApi {
  const latencyMs = options.latencyMs ?? 350;
  async function respond<T>(data: T): Promise<ApiResult<T>> {
    if (latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, latencyMs));
    return { ok: true, data };
  }

  return {
    health: () =>
      respond<HealthResponse>({ status: 'ok', service: 'style-studio-mock', version: '0.1.0' }),
    capabilities: () => respond(structuredClone(CAPABILITIES)),
    entitlements: (plan: Plan) =>
      respond<EntitlementsResponse>({ plan, entitlements: structuredClone(ENTITLEMENTS[plan]) }),
    exportPreview: async (request: ExportRequest): Promise<ApiResult<AgentPack>> => {
      if (latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, latencyMs));
      if (!ENTITLEMENTS[request.plan].exportTargets.includes(request.target)) {
        return {
          ok: false,
          error: {
            kind: 'upgrade-required',
            message: `The ${request.target} export requires Pro.`,
            status: 402,
            requiredPlan: 'pro',
          },
        };
      }
      return { ok: true, data: buildPack(request) };
    },
  };
}
