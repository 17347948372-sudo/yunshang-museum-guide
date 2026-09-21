import { jsonResponse } from "../_lib/xmov.mjs";

export function onRequestGet() {
  return jsonResponse({ status: "ok" });
}
