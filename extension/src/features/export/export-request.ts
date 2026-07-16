import type {
  ApiDesignSnapshot,
  DesignSnapshot,
  ExportMode,
  ExportRequest,
  ExportTarget,
  Framework,
  Plan,
  Styling,
} from '../../types';
import { changedSelectors, generateCss } from '../../state/generate-css';
import type { ResolvedDesign } from '../../state/resolve-design';

export interface ExportFormState {
  target: ExportTarget;
  framework: Framework;
  styling: Styling;
  mode: ExportMode;
  instructions: string;
  includeReferenceImage: boolean;
}

export const DEFAULT_FORM: ExportFormState = {
  target: 'universal',
  framework: 'react',
  styling: 'css',
  mode: 'restyle-existing',
  instructions: '',
  includeReferenceImage: false,
};

const MAX_INSTRUCTIONS = 10_000;

export function validateExportForm(form: ExportFormState): string | null {
  if (!form.target) return 'Choose an export target.';
  if (!form.framework) return 'Choose a framework.';
  if (!form.styling) return 'Choose a styling system.';
  if (!form.mode) return 'Choose an implementation mode.';
  if (form.instructions.length > MAX_INSTRUCTIONS) {
    return `Instructions are limited to ${MAX_INSTRUCTIONS.toLocaleString()} characters.`;
  }
  return null;
}

/**
 * Converts the working design into the exact snapshot shape the API accepts.
 * UI-only metadata (occurrence counts, detected elements) is stripped here —
 * nothing beyond design tokens, generated CSS, and changed selectors leaves
 * the browser.
 */
export function toApiSnapshot(
  design: ResolvedDesign,
  snapshot: DesignSnapshot,
  name: string,
): ApiDesignSnapshot {
  return {
    id: snapshot.id,
    name,
    sourceUrl: snapshot.sourceUrl,
    capturedAt: snapshot.capturedAt,
    colors: design.colors.map(({ name: colorName, value, role }) => ({
      name: colorName,
      value,
      role,
    })),
    typography: design.typography.map(
      ({ role, fontFamily, fontSize, fontWeight, lineHeight }) => ({
        role,
        fontFamily,
        fontSize,
        fontWeight,
        lineHeight,
      }),
    ),
    spacing: { ...snapshot.spacing },
    radii: { ...snapshot.radii },
    shadows: { ...snapshot.shadows },
    generatedCss: generateCss(design, snapshot),
    changedSelectors: changedSelectors(design),
  };
}

export function buildExportRequest(
  plan: Plan,
  form: ExportFormState,
  design: ResolvedDesign,
  snapshot: DesignSnapshot,
): ExportRequest {
  const name = design.presetName ?? 'Custom design';
  return {
    plan,
    target: form.target,
    framework: form.framework,
    styling: form.styling,
    mode: form.mode,
    snapshot: toApiSnapshot(design, snapshot, name),
    instructions: form.instructions.trim(),
    includeReferenceImage: form.includeReferenceImage,
  };
}
