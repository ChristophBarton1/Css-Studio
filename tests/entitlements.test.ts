import { describe, expect, it } from "vitest";
import { canExportTo, getEntitlements } from "../src/billing/entitlements.js";

describe("plan entitlements", () => {
  it("keeps the universal handoff available on free", () => {
    expect(canExportTo("free", "universal")).toBe(true);
    expect(canExportTo("free", "codex")).toBe(false);
    expect(getEntitlements("free").savedProjects).toBe(2);
  });

  it("unlocks professional handoffs on pro", () => {
    expect(canExportTo("pro", "codex")).toBe(true);
    expect(canExportTo("pro", "lovable")).toBe(true);
    expect(getEntitlements("pro").responsiveEditing).toBe(true);
  });
});
