import { jsonResponse } from "../_lib/xmov.js";

export function onRequest({ request }) {
  if (request.method !== "GET") {
    return jsonResponse({ error: "method_not_allowed" }, 405, { Allow: "GET" });
  }
  return jsonResponse({ status: "ok" });
}
