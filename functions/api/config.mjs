import { hasServerConfig, jsonResponse } from "../_lib/xmov.mjs";

export function onRequestGet({ env }) {
  if (!hasServerConfig(env)) return jsonResponse({ error: "server_not_configured" }, 503);
  return jsonResponse({
    appId: env.XMOV_APP_ID,
    gatewayServer: "/api/xmov/session",
  });
}
