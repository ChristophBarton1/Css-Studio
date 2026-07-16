import { Hono } from "hono";
import { cors } from "hono/cors";
import { getEntitlements } from "./billing/entitlements.js";
import {
  exportRequestSchema,
  exportTargetSchema,
  frameworkSchema,
  planSchema,
  stylingSchema,
} from "./contracts/export.js";
import { ExportNotAllowedError, generateAgentPack } from "./exports/generate-agent-pack.js";

export const app = new Hono();

app.use(
  "/v1/*",
  cors({
    origin: (origin) => origin || "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.get("/health", (context) =>
  context.json({ status: "ok", service: "style-studio-backend", version: "0.1.0" }),
);

app.get("/v1/capabilities", (context) =>
  context.json({
    targets: exportTargetSchema.options,
    frameworks: frameworkSchema.options,
    styling: stylingSchema.options,
  }),
);

app.get("/v1/entitlements/:plan", (context) => {
  const parsed = planSchema.safeParse(context.req.param("plan"));
  if (!parsed.success) {
    return context.json({ error: "invalid_plan" }, 400);
  }
  return context.json({ plan: parsed.data, entitlements: getEntitlements(parsed.data) });
});

app.post("/v1/exports/preview", async (context) => {
  const body: unknown = await context.req.json().catch(() => null);
  const parsed = exportRequestSchema.safeParse(body);

  if (!parsed.success) {
    return context.json({ error: "invalid_request", issues: parsed.error.issues }, 400);
  }

  try {
    return context.json(generateAgentPack(parsed.data));
  } catch (error) {
    if (error instanceof ExportNotAllowedError) {
      return context.json(
        { error: "upgrade_required", message: error.message, requiredPlan: "pro" },
        402,
      );
    }
    throw error;
  }
});
