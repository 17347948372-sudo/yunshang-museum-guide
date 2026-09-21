import { createXmovSignature } from "../server/xmov-sign.mjs";

const gatewayUrl = process.env.XMOV_GATEWAY || "https://nebula-agent.xingyun3d.com/user/v1/ttsa_v2/session";
const startsByIp = new Map();
const rateWindowMs = 10 * 60 * 1000;
const maxStartsPerWindow = Number(process.env.SESSION_RATE_LIMIT || 12);

export function setSecurityHeaders(response) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "SAMEORIGIN");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("Permissions-Policy", "camera=(), geolocation=(), microphone=(self)");
  response.setHeader("Cache-Control", "no-store");
}

export function requireServerConfig(response) {
  if (process.env.XMOV_APP_ID && process.env.XMOV_APP_SECRET) return true;
  response.status(503).json({ error: "server_not_configured" });
  return false;
}

export function requestComesFromThisSite(request) {
  const origin = request.headers.origin;
  if (!origin) return process.env.NODE_ENV !== "production";
  if (process.env.PUBLIC_ORIGIN) return origin === process.env.PUBLIC_ORIGIN.replace(/\/$/, "");
  try {
    const expectedHost = request.headers["x-forwarded-host"] || request.headers.host;
    return new URL(origin).host === expectedHost;
  } catch {
    return false;
  }
}

export function allowSessionStart(request) {
  const forwarded = request.headers["x-forwarded-for"];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0])?.trim()
    || request.socket?.remoteAddress
    || "unknown";
  const now = Date.now();
  const active = (startsByIp.get(ip) || []).filter((timestamp) => now - timestamp < rateWindowMs);
  if (active.length >= maxStartsPerWindow) return false;
  active.push(now);
  startsByIp.set(ip, active);
  return true;
}

export async function readJsonBody(request) {
  if (request.body && typeof request.body === "object") return request.body;
  if (typeof request.body === "string") return JSON.parse(request.body || "{}");
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

export async function forwardXmovRequest(request, response) {
  setSecurityHeaders(response);
  if (!requireServerConfig(response)) return;
  if (!requestComesFromThisSite(request)) return response.status(403).json({ error: "origin_not_allowed" });
  if (request.method === "POST" && !allowSessionStart(request)) {
    response.setHeader("Retry-After", "600");
    return response.status(429).json({ error: "session_rate_limit" });
  }

  let payload;
  try {
    payload = await readJsonBody(request);
  } catch {
    return response.status(400).json({ error: "invalid_json" });
  }

  const signed = createXmovSignature({
    appId: process.env.XMOV_APP_ID,
    appSecret: process.env.XMOV_APP_SECRET,
    method: request.method,
    gatewayUrl,
    payload,
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
    response.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json; charset=utf-8");
    return response.send(body);
  } catch (error) {
    console.error("Xmov gateway request failed", error instanceof Error ? error.message : error);
    return response.status(502).json({ error: "xmov_gateway_unavailable" });
  }
}
