import { requireServerConfig, setSecurityHeaders } from "./_shared.mjs";

export default function handler(_request, response) {
  setSecurityHeaders(response);
  if (!requireServerConfig(response)) return;
  response.status(200).json({
    appId: process.env.XMOV_APP_ID,
    gatewayServer: "/api/xmov/session",
  });
}
