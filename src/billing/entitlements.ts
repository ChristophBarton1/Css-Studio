import type { ExportTarget, Plan } from "../contracts/export.js";

export interface Entitlements {
  savedProjects: number | "unlimited";
  versionsPerProject: number | "unlimited";
  responsiveEditing: boolean;
  stateEditing: boolean;
  cloudBackup: boolean;
  professionalExports: boolean;
  exportTargets: ExportTarget[];
}

const ALL_TARGETS: ExportTarget[] = [
  "universal",
  "codex",
  "claude-code",
  "lovable",
  "cursor",
  "windsurf",
];

const ENTITLEMENTS: Record<Plan, Entitlements> = {
  free: {
    savedProjects: 2,
    versionsPerProject: 1,
    responsiveEditing: false,
    stateEditing: false,
    cloudBackup: false,
    professionalExports: false,
    exportTargets: ["universal"],
  },
  pro: {
    savedProjects: "unlimited",
    versionsPerProject: "unlimited",
    responsiveEditing: true,
    stateEditing: true,
    cloudBackup: true,
    professionalExports: true,
    exportTargets: ALL_TARGETS,
  },
  team: {
    savedProjects: "unlimited",
    versionsPerProject: "unlimited",
    responsiveEditing: true,
    stateEditing: true,
    cloudBackup: true,
    professionalExports: true,
    exportTargets: ALL_TARGETS,
  },
};

export function getEntitlements(plan: Plan): Entitlements {
  return ENTITLEMENTS[plan];
}

export function canExportTo(plan: Plan, target: ExportTarget): boolean {
  return ENTITLEMENTS[plan].exportTargets.includes(target);
}
