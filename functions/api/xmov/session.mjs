import { forwardXmovRequest, jsonResponse } from "../../_lib/xmov.mjs";

export function onRequest(context) {
  if (!["POST", "DELETE"].includes(context.request.method)) {
    return jsonResponse({ error: "method_not_allowed" }, 405, { Allow: "POST, DELETE" });
  }
  return forwardXmovRequest(context);
}
