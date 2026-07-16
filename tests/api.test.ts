import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";

describe("API", () => {
  it("reports capabilities for the Fable UI", async () => {
    const response = await app.request("/v1/capabilities");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.targets).toContain("codex");
    expect(body.frameworks).toContain("react");
  });

  it("returns free entitlements", async () => {
    const response = await app.request("/v1/entitlements/free");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.entitlements.savedProjects).toBe(2);
  });
});
