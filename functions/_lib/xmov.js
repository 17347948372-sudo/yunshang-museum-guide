import md5 from "js-md5";

const defaultGateway = "https://nebula-agent.xingyun3d.com/user/v1/ttsa_v2/session";

function compareUnicodeCodePoints(left, right) {
  const a = Array.from(left, (value) => value.codePointAt(0));
  const b = Array.from(right, (value) => value.codePointAt(0));
  const length = Math.min(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return a.length - b.length;
}

function deepSort(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(deepSort);
  if (typeof value !== "object") return value;
  return Object.keys(value)
    .sort(compareUnicodeCodePoints)
    .reduce((result, key) => {
      result[key] = deepSort(value[key]);
      return result;
    }, {});
}

function compatibleJson(value) {
  return JSON.stringify(deepSort(value))
    .replace(/[^\u0000-\u007E]/g, (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`)
    .replace(/ /g, "");
}

function securityHeaders(extra = {}) {
  return {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    ...extra,
  };
}

export function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: securityHeaders(extraHeaders),
  });
}

export function hasServerConfig(env) {
  return Boolean(env.XMOV_APP_ID && env.XMOV_APP_SECRET);
}

export function requestComesFromThisSite(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return false;
  if (env.PUBLIC_ORIGIN) return origin === env.PUBLIC_ORIGIN.replace(/\/$/, "");
  return origin === new URL(request.url).origin;
}

function createSignature({ env, method, gatewayUrl, payload }) {
  const timestamp = Math.floor(Date.now() / 1000);
  const url = new URL(gatewayUrl);
  const body = deepSort(payload);
  const source = `${url.pathname}${url.search}`.toLowerCase()
    + method.toLowerCase()
    + compatibleJson(body)
    + env.XMOV_APP_SECRET
    + timestamp;
  return {
    body,
    headers: {
      "X-APP-ID": env.XMOV_APP_ID,
      "X-TOKEN": md5(source),
      "X-TIMESTAMP": String(timestamp),
    },
  };
}

export async function forwardXmovRequest(context) {
  const { request, env } = context;
  if (!hasServerConfig(env)) return jsonResponse({ error: "server_not_configured" }, 503);
  if (!requestComesFromThisSite(request, env)) return jsonResponse({ error: "origin_not_allowed" }, 403);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  const gatewayUrl = env.XMOV_GATEWAY || defaultGateway;
  const signed = createSignature({ env, method: request.method, gatewayUrl, payload });
  try {
    const upstream = await fetch(gatewayUrl, {
      method: request.method,
      headers: {
        ...signed.headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(signed.body),
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: securityHeaders({
        "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
      }),
    });
  } catch (error) {
    console.error("Xmov gateway request failed", error instanceof Error ? error.message : error);
    return jsonResponse({ error: "xmov_gateway_unavailable" }, 502);
  }
}
