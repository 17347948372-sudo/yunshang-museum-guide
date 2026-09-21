import compression from "compression";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createXmovSignature } from "./server/xmov-sign.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist");
const port = Number(process.env.PORT || 3000);
const appId = process.env.XMOV_APP_ID || process.env.VITE_XMOV_APP_ID;
const appSecret = process.env.XMOV_APP_SECRET || process.env.VITE_XMOV_APP_SECRET;
const gatewayUrl = process.env.XMOV_GATEWAY || process.env.VITE_XMOV_GATEWAY || "https://nebula-agent.xingyun3d.com/user/v1/ttsa_v2/session";
const publicOrigin = process.env.PUBLIC_ORIGIN?.replace(/\/$/, "") || "";

if (!appId || !appSecret) {
  throw new Error("Missing XMOV_APP_ID or XMOV_APP_SECRET");
}
if (new URL(gatewayUrl).protocol !== "https:") {
  throw new Error("XMOV_GATEWAY must use HTTPS");
}

const app = express();
const sessionStarts = new Map();
const rateWindowMs = 10 * 60 * 1000;
const maxStartsPerWindow = Number(process.env.SESSION_RATE_LIMIT || 12);

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(compression());
app.use(express.json({ limit: "128kb" }));
app.use((request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "SAMEORIGIN");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("Permissions-Policy", "camera=(), geolocation=(), microphone=(self)");
  if (request.get("x-forwarded-proto") === "https" || request.secure) {
    response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

function requestComesFromThisSite(request) {
  const origin = request.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  if (publicOrigin) return origin === publicOrigin;
  try {
    return new URL(origin).host === request.get("host");
  } catch {
    return false;
  }
}

function allowSessionStart(ip) {
  const now = Date.now();
  const active = (sessionStarts.get(ip) || []).filter((timestamp) => now - timestamp < rateWindowMs);
  if (active.length >= maxStartsPerWindow) return false;
  active.push(now);
  sessionStarts.set(ip, active);
  return true;
}

async function forwardXmovRequest(request, response) {
  if (!requestComesFromThisSite(request)) {
    return response.status(403).json({ error: "origin_not_allowed" });
  }
  if (request.method === "POST" && !allowSessionStart(request.ip)) {
    response.setHeader("Retry-After", "600");
    return response.status(429).json({ error: "session_rate_limit" });
  }

  const signed = createXmovSignature({
    appId,
    appSecret,
    method: request.method,
    gatewayUrl,
    payload: request.body || {},
  });

  try {
    const upstream = await fetch(gatewayUrl, {
      method: request.method,
      headers: {
        ...signed.headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(signed.body),
      signal: AbortSignal.timeout(30_000),
    });
    const body = Buffer.from(await upstream.arrayBuffer());
    response.status(upstream.status);
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json; charset=utf-8");
    return response.send(body);
  } catch (error) {
    console.error("Xmov gateway request failed", error instanceof Error ? error.message : error);
    return response.status(502).json({ error: "xmov_gateway_unavailable" });
  }
}

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});
app.get("/api/config", (_request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.json({ appId, gatewayServer: "/api/xmov/session" });
});
app.post("/api/xmov/session", forwardXmovRequest);
app.delete("/api/xmov/session", forwardXmovRequest);

app.use(express.static(dist, {
  etag: true,
  maxAge: 0,
  setHeaders(response, filename) {
    if (filename.includes(`${path.sep}assets${path.sep}`)) {
      response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    } else if (filename.endsWith("index.html")) {
      response.setHeader("Cache-Control", "no-cache");
    }
  },
}));
app.use((request, response, next) => {
  if (request.method !== "GET" || !request.accepts("html")) return next();
  response.setHeader("Cache-Control", "no-cache");
  return response.sendFile(path.join(dist, "index.html"));
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Museum guide server listening on http://0.0.0.0:${port}`);
});
