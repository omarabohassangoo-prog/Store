/**
 * server.ts
 * خادم Express الموحد لمنصة سوق الكل (Souq Al-Kul)
 */

import "dotenv/config";
import express from "express";
import path from "node:path";
import type { HttpMethod } from "./src/api/api";
import { FileDatabaseAdapter } from "./src/api/classes/FileDatabaseAdapter";
import { HttpChannelDispatcherAdapter } from "./src/api/classes/Adapters";
import { Init } from "./src/api/classes/Init";
import { seedInitialData } from "./src/api/seed";

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.resolve(process.cwd(), "public");

function resolveHttpStatus(success: boolean, errorCode?: string | null): number {
  if (success) return 200;
  if (!errorCode) return 400;
  if (errorCode === "UNAUTHORIZED_SESSION" || errorCode === "UNAUTHORIZED" || errorCode === "INVALID_CREDENTIALS") {
    return 401;
  }
  if (errorCode === "FORBIDDEN_ROLE" || errorCode === "FORBIDDEN" || errorCode === "ACCOUNT_DISABLED") {
    return 403;
  }
  if (errorCode === "ROUTE_NOT_FOUND" || errorCode.endsWith("_NOT_FOUND")) {
    return 404;
  }
  if (errorCode === "EMAIL_TAKEN" || errorCode === "ADMIN_ALREADY_EXISTS") {
    return 409;
  }
  if (errorCode === "INTERNAL_ERROR") {
    return 500;
  }
  return 400;
}

function buildCookieString(name: string, value: string, maxAgeSeconds: number, isHttps: boolean): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (isHttps) {
    parts.push("Secure", "SameSite=None", "Partitioned");
  } else {
    parts.push("SameSite=Lax");
  }
  return parts.join("; ");
}

async function startServer() {
  const db = new FileDatabaseAdapter();
  await seedInitialData(db);

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

  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  app.use(express.json({ limit: "2mb" }));

  // Verify Origin or custom header on state-changing API requests
  app.use("/api/v1", (req, res, next) => {
    if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
      return next();
    }
    const origin = req.headers.origin;
    const host = (req.headers["x-forwarded-host"] || req.headers.host || "") as string;
    const hasCustomHeader = Boolean(req.headers["x-requested-with"] || req.headers["x-fingerprint"]);
    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host && !hasCustomHeader) {
          return res.status(403).json({
            success: false,
            data: null,
            error: { code: "CSRF_ORIGIN_MISMATCH", message: "Cross-origin mutation blocked" },
          });
        }
      } catch {
        return res.status(403).json({
          success: false,
          data: null,
          error: { code: "INVALID_ORIGIN", message: "Invalid origin header" },
        });
      }
    } else if (!hasCustomHeader && req.headers.cookie) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: "CSRF_HEADER_REQUIRED", message: "Missing security header" },
      });
    }
    return next();
  });

  // Unified JSON API Dispatcher
  app.all("/api/v1/*", async (req, res) => {
    const method = req.method.toUpperCase() as HttpMethod;
    const allowedMethods = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);
    if (!allowedMethods.has(method)) {
      return res.status(405).json({
        success: false,
        data: null,
        error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed" },
      });
    }

    const normalizedHeaders: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === "string") normalizedHeaders[k] = v;
      else if (Array.isArray(v) && v.length > 0) normalizedHeaders[k] = v[0];
    }

    const response = await system.router.dispatch({
      method,
      path: req.originalUrl,
      query: req.query as Record<string, unknown>,
      body: req.body,
      headers: normalizedHeaders,
    });

    const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
    const routePath = req.path;

    if (
      response.success &&
      (routePath === "/api/v1/auth/login" || routePath === "/api/v1/auth/bootstrap-admin") &&
      response.data &&
      typeof response.data === "object" &&
      "session_id" in response.data &&
      typeof (response.data as Record<string, unknown>).session_id === "string"
    ) {
      const sid = String((response.data as Record<string, unknown>).session_id);
      const cookiesToSet = [buildCookieString("sid", sid, 7 * 24 * 3600, isHttps)];
      const fp = normalizedHeaders["x-fingerprint"];
      if (fp) {
        cookiesToSet.push(buildCookieString("fp", fp, 365 * 24 * 3600, isHttps));
      }
      res.setHeader("Set-Cookie", cookiesToSet);
    }

    if (routePath === "/api/v1/auth/logout") {
      res.setHeader("Set-Cookie", [buildCookieString("sid", "", 0, isHttps)]);
    }

    const status = resolveHttpStatus(response.success, response.error?.code);
    return res.status(status).json(response);
  });

  // Serve public static assets
  app.use(express.static(PUBLIC_DIR, { index: false }));

  // Serve SPA entry point
  app.get("/", (_req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, "index.html"));
  });

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(PUBLIC_DIR, "index.html"));
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Souq Al-Kul server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
