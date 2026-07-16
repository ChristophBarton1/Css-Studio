/**
 * Shared frontend types.
 *
 * The API-facing shapes (`Plan`, `ExportTarget`, `ApiDesignSnapshot`, …) mirror
 * `docs/openapi.yaml` exactly. UI-only metadata (occurrence counts, detected
 * element roles) lives on optional fields and is stripped before anything is
 * sent to the backend — see `src/features/export/export-request.ts`.
 */

export type Plan = 'free' | 'pro' | 'team';

export type ExportTarget =
  | 'universal'
  | 'codex'
  | 'claude-code'
  | 'lovable'
  | 'cursor'
  | 'windsurf';

export type Framework = 'html' | 'react' | 'nextjs' | 'vue' | 'svelte';

export type Styling = 'css' | 'scss' | 'tailwind';

export type ExportMode =
  | 'restyle-existing'
  | 'generate-new'
  | 'tokens-only'
  | 'selected-component'
  | 'fix-inconsistencies';

export interface ColorToken {
  name: string;
  value: string;
  role: string;
  /** UI-only. Stripped before export. */
  occurrences?: number;
}

export interface TypographyToken {
  role: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: number;
  lineHeight: string;
  /** UI-only. Stripped before export. */
  letterSpacing?: string;
  /** UI-only. Stripped before export. */
  textTransform?: string;
  /** UI-only. Stripped before export. */
  occurrences?: number;
}

export interface DetectedElementRole {
  role: 'buttons' | 'links' | 'inputs' | 'cards' | 'images';
  label: string;
  selector: string;
  occurrences: number;
}

/** Snapshot as produced by page analysis, including UI-only metadata. */
export interface DesignSnapshot {
  id: string;
  name: string;
  sourceUrl: string;
  capturedAt: string;
  colors: ColorToken[];
  typography: TypographyToken[];
  spacing: Record<string, string>;
  radii: Record<string, string>;
  shadows: Record<string, string>;
  generatedCss: string;
  changedSelectors: string[];
  /** UI-only. Stripped before export. */
  elements?: DetectedElementRole[];
}

/** Exactly the fields `docs/openapi.yaml` accepts for a snapshot. */
export interface ApiDesignSnapshot {
  id: string;
  name: string;
  sourceUrl: string;
  capturedAt: string;
  colors: Array<Pick<ColorToken, 'name' | 'value' | 'role'>>;
  typography: Array<
    Pick<TypographyToken, 'role' | 'fontFamily' | 'fontSize' | 'fontWeight' | 'lineHeight'>
  >;
  spacing: Record<string, string>;
  radii: Record<string, string>;
  shadows: Record<string, string>;
  generatedCss: string;
  changedSelectors: string[];
}

export interface SelectedElement {
  selector: string;
  tag: string;
  role: string;
  summary: string;
  styles: Record<string, string>;
}

export type StyleChangeKind = 'color' | 'typography' | 'global' | 'element' | 'css' | 'meta';

export interface StyleChange {
  kind: StyleChangeKind;
  /** Color name, typography role, global style key, element selector, … */
  target: string;
  property: string;
  value: string;
  previousValue: string;
}

/** One undoable user intent, e.g. "Changed primary color". */
export interface StylePatch {
  id: string;
  label: string;
  changes: StyleChange[];
}

/**
 * Abstraction over the (future) content-script core. The UI must only talk to
 * this interface; the mock implementation lives in `src/core/mock-core.ts`.
 */
export interface StyleStudioCore {
  analyzePage(): Promise<DesignSnapshot>;
  selectElement(): Promise<SelectedElement>;
  applyPatch(patch: StylePatch): Promise<void>;
  resetSession(): Promise<void>;
  undo(): Promise<void>;
  redo(): Promise<void>;
}

// ---------------------------------------------------------------------------
// API contract types (mirroring docs/openapi.yaml and the backend responses)
// ---------------------------------------------------------------------------

export interface Capabilities {
  targets: ExportTarget[];
  frameworks: Framework[];
  styling: Styling[];
}

export interface Entitlements {
  savedProjects: number | 'unlimited';
  versionsPerProject: number | 'unlimited';
  responsiveEditing: boolean;
  stateEditing: boolean;
  cloudBackup: boolean;
  professionalExports: boolean;
  exportTargets: ExportTarget[];
}

export interface EntitlementsResponse {
  plan: Plan;
  entitlements: Entitlements;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
}

export interface ExportRequest {
  plan: Plan;
  target: ExportTarget;
  framework: Framework;
  styling: Styling;
  mode: ExportMode;
  snapshot: ApiDesignSnapshot;
  instructions?: string;
  includeReferenceImage?: boolean;
}

export interface AgentPack {
  target: ExportTarget;
  files: Record<string, string>;
  handoffUrl?: string;
}

// ---------------------------------------------------------------------------
// API result envelope used by the typed client
// ---------------------------------------------------------------------------

export type ApiErrorKind =
  | 'invalid-request'
  | 'upgrade-required'
  | 'http-error'
  | 'network'
  | 'timeout';

export interface ApiError {
  kind: ApiErrorKind;
  message: string;
  status?: number;
  requiredPlan?: Plan;
  issues?: unknown;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export interface StyleStudioApi {
  health(): Promise<ApiResult<HealthResponse>>;
  capabilities(): Promise<ApiResult<Capabilities>>;
  entitlements(plan: Plan): Promise<ApiResult<EntitlementsResponse>>;
  exportPreview(request: ExportRequest): Promise<ApiResult<AgentPack>>;
}
