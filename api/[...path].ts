import type { IncomingMessage, ServerResponse } from "node:http";
import { appPromise } from "../server";

/** Vercel Node.js Function entry point for the Express API. */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const app = await appPromise;
    app(req, res);
  } catch (error) {
    console.error("Vercel API initialization failed:", error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
    }
    res.end(JSON.stringify({ success: false, error: "API initialization failed" }));
  }
}
