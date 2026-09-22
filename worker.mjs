import { forwardXmovRequest, hasServerConfig, jsonResponse } from "./functions/_lib/xmov.js";

function withSecurityHeaders(response, pathname) {
  const secured = new Response(response.body, response);
  secured.headers.set("X-Content-Type-Options", "nosniff");
  secured.headers.set("X-Frame-Options", "SAMEORIGIN");
  secured.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  secured.headers.set("Permissions-Policy", "camera=(), geolocation=(), microphone=(self)");
  if (pathname.startsWith("/assets/")) {
    secured.headers.set("Cache-Control", "public, max-age=31536000, immutable");
  }
  return secured;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health" && request.method === "GET") {
      return jsonResponse({ status: "ok" });
    }

    if (url.pathname === "/api/config" && request.method === "GET") {
      if (!hasServerConfig(env)) return jsonResponse({ error: "server_not_configured" }, 503);
      return jsonResponse({
        appId: env.XMOV_APP_ID,
        gatewayServer: "/api/xmov/session",
      });
    }

    if (url.pathname === "/api/xmov/session") {
      if (!["POST", "DELETE"].includes(request.method)) {
        return jsonResponse({ error: "method_not_allowed" }, 405, { Allow: "POST, DELETE" });
      }
      return forwardXmovRequest({ request, env });
    }

    const assetResponse = await env.ASSETS.fetch(request);
    return withSecurityHeaders(assetResponse, url.pathname);
  },
};
