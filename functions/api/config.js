import { hasServerConfig, jsonResponse } from "../_lib/xmov.js";

export function onRequest({ request, env }) {
  if (request.method !== "GET") {
    return jsonResponse({ error: "method_not_allowed" }, 405, { Allow: "GET" });
  }
  if (!hasServerConfig(env)) return jsonResponse({ error: "server_not_configured" }, 503);
  return jsonResponse({
    appId: env.XMOV_APP_ID,
    gatewayServer: "/api/xmov/session",
  });
}
