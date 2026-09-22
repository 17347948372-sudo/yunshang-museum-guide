import { onRequest } from "../../functions/api/config.js";
import { getRuntimeEnv } from "./_env.mjs";

export default function handler(request) {
  return onRequest({ request, env: getRuntimeEnv() });
}
