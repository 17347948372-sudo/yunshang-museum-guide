import { onRequest } from "../../functions/api/xmov/session.js";
import { getRuntimeEnv } from "./_env.mjs";

export default function handler(request) {
  return onRequest({ request, env: getRuntimeEnv() });
}
