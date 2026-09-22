import { onRequest } from "../../functions/api/health.js";

export default function handler(request) {
  return onRequest({ request });
}
