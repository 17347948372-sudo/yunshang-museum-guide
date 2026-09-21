import { setSecurityHeaders } from "./_shared.mjs";

export default function handler(_request, response) {
  setSecurityHeaders(response);
  response.status(200).json({ status: "ok" });
}
