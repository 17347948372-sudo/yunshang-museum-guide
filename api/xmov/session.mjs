import { forwardXmovRequest } from "../_shared.mjs";

export default async function handler(request, response) {
  if (!new Set(["POST", "DELETE"]).has(request.method)) {
    response.setHeader("Allow", "POST, DELETE");
    return response.status(405).json({ error: "method_not_allowed" });
  }
  return forwardXmovRequest(request, response);
}
