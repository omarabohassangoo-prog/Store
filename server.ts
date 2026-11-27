import "dotenv/config";
import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import type { HttpMethod } from "./src/api/api";
import { HttpChannelDispatcherAdapter } from "./src/api/classes/Adapters";
import { Init } from "./src/api/classes/Init";
import { NeonDatabaseAdapter } from "./src/api/classes/NeonDatabaseAdapter";
import { seedInitialData } from "./src/api/seed";

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.resolve(process.cwd(), "public");
const DATA_FILE_PATH = process.env.DATA_FILE_PATH || (
  process.env.VERCEL === "1"
    ? "/tmp/souqalkul-db.json"
    : path.resolve(process.cwd(), "data", "souqalkul-db.json")
);

function resolveHttpStatus(success: boolean, errorCode?: string | null): number {
  if (success) return 200;
  if (!errorCode) return 400;
  if (["UNAUTHORIZED_SESSION", "UNAUTHORIZED", "INVALID_CREDENTIALS"].includes(errorCode)) return 401;
  if (["FORBIDDEN_ROLE", "FORBIDDEN", "ACCOUNT_DISABLED"].includes(errorCode)) return 403;
  if (errorCode === "ROUTE_NOT_FOUND" || errorCode.endsWith("_NOT_FOUND")) return 404;
  if (["EMAIL_TAKEN", "ADMIN_ALREADY_EXISTS"].includes(errorCode)) return 409;
  if (errorCode === "INTERNAL_ERROR") return 500;
  return 400;
}

function buildCookieString(name: string, value: string, maxAgeSeconds: number, isHttps: boolean): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", `Max-Age=${maxAgeSeconds}`];
  if (isHttps) parts.push("Secure", "SameSite=None", "Partitioned");
  else parts.push("SameSite=Lax");
  return parts.join("; ");
}

async function migrateLocalData(db: NeonDatabaseAdapter): Promise<void> {
  if (!(await db.isEmpty())) return;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(await fs.readFile(DATA_FILE_PATH, "utf8")) as Record<string, unknown>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw new Error("Could not read the legacy JSON database for migration.", { cause: error });
  }

  for (const [collection, records] of Object.entries(parsed)) {
    if (!Array.isArray(records)) continue;
    for (const record of records) {
      if (!record || typeof record !== "object" || Array.isArray(record)) continue;
      const value = record as Record<string, unknown>;
      if (value.id === undefined || value.id === null) continue;
      await db.insert(collection, value);
    }
  }
}

export async function createApp() {
  const db = new NeonDatabaseAdapter();
  await db.withInitializationLock(async () => {
    await migrateLocalData(db);
    // Demo records are useful locally, but must never appear in a production
    // database unless explicitly requested for a disposable demo environment.
    if (process.env.NODE_ENV !== "production" || process.env.SEED_DEMO_DATA === "true") {
      await seedInitialData(db);
    }
  });

  const channels = new HttpChannelDispatcherAdapter({
    emailUrl: process.env.EMAIL_WEBHOOK_URL,
    smsUrl: process.env.SMS_WEBHOOK_URL,
    whatsappUrl: process.env.WHATSAPP_WEBHOOK_URL,
    bearerToken: process.env.CHANNELS_BEARER_TOKEN,
  });
  const system = Init.bootstrap({ db, channels });
  const app = express();
  app.set("trust proxy", true);
  app.disable("x-powered-by");

  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (req.secure || req.headers["x-forwarded-proto"] === "https") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    next();
  });
  app.use(express.json({ limit: "2mb" }));

  app.use("/api/v1", (req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    const origin = req.headers.origin;
    const host = (req.headers["x-forwarded-host"] || req.headers.host || "") as string;
    const hasCustomHeader = Boolean(req.headers["x-requested-with"] || req.headers["x-fingerprint"]);
    if (origin && host) {
      try {
        if (new URL(origin).host !== host && !hasCustomHeader) {
          return res.status(403).json({ success: false, data: null, error: { code: "CSRF_ORIGIN_MISMATCH", message: "Cross-origin mutation blocked" } });
        }
      } catch {
        return res.status(403).json({ success: false, data: null, error: { code: "INVALID_ORIGIN", message: "Invalid origin header" } });
      }
    } else if (!hasCustomHeader && req.headers.cookie) {
      return res.status(403).json({ success: false, data: null, error: { code: "CSRF_HEADER_REQUIRED", message: "Missing security header" } });
    }
    return next();
  });

  app.all("/api/v1/*", async (req, res) => {
    try {
      const method = req.method.toUpperCase() as HttpMethod;
      if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) {
        return res.status(405).json({ success: false, data: null, error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed" } });
      }
      const normalizedHeaders: Record<string, string | undefined> = {};
      for (const [key, value] of Object.entries(req.headers)) {
        if (typeof value === "string") normalizedHeaders[key] = value;
        else if (Array.isArray(value) && value.length > 0) normalizedHeaders[key] = value[0];
      }
      const response = await system.router.dispatch({ method, path: req.originalUrl, query: req.query as Record<string, unknown>, body: req.body, headers: normalizedHeaders });
      const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
      const routePath = req.path;
      if (response.success && ["/api/v1/auth/login", "/api/v1/auth/bootstrap-admin"].includes(routePath) &&
        response.data && typeof response.data === "object" && "session_id" in response.data &&
        typeof (response.data as Record<string, unknown>).session_id === "string") {
        const sid = String((response.data as Record<string, unknown>).session_id);
        const cookies = [buildCookieString("sid", sid, 7 * 24 * 3600, isHttps)];
        const fingerprint = normalizedHeaders["x-fingerprint"];
        if (fingerprint) cookies.push(buildCookieString("fp", fingerprint, 365 * 24 * 3600, isHttps));
        res.setHeader("Set-Cookie", cookies);
      }
      if (routePath === "/api/v1/auth/logout") res.setHeader("Set-Cookie", [buildCookieString("sid", "", 0, isHttps)]);
      return res.status(resolveHttpStatus(response.success, response.error?.code)).json(response);
    } catch (error) {
      console.error("API request failed:", error);
      return res.status(500).json({ success: false, data: null, error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.use(express.static(PUBLIC_DIR, { index: false }));
  app.get("/", (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "index.html")));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    return res.sendFile(path.join(PUBLIC_DIR, "index.html"));
  });
  return app;
}

export const appPromise = createApp();

if (process.env.VERCEL !== "1") {
  appPromise.then((app) => {
    app.listen(PORT, "0.0.0.0", () => console.log(`Souq Al-Kul server running on http://0.0.0.0:${PORT}`));
  }).catch((error) => {
    console.error("Failed to start server:", error);
    process.exitCode = 1;
  });
}
