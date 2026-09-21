import { createHash } from "node:crypto";

export function compareUnicodeCodePoints(left, right) {
  const a = Array.from(left, (value) => value.codePointAt(0));
  const b = Array.from(right, (value) => value.codePointAt(0));
  const length = Math.min(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return a.length - b.length;
}

export function deepSort(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(deepSort);
  if (typeof value !== "object") return value;

  return Object.keys(value)
    .sort(compareUnicodeCodePoints)
    .reduce((result, key) => {
      result[key] = deepSort(value[key]);
      return result;
    }, {});
}

export function pythonCompatibleJson(value) {
  return JSON.stringify(deepSort(value))
    .replace(/[^\u0000-\u007E]/g, (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`)
    .replace(/ /g, "");
}

export function createXmovSignature({ appId, appSecret, method, gatewayUrl, payload, timestamp = Math.floor(Date.now() / 1000) }) {
  const url = new URL(gatewayUrl);
  const body = deepSort(payload);
  const source = `${url.pathname}${url.search}`.toLowerCase()
    + method.toLowerCase()
    + pythonCompatibleJson(body)
    + appSecret
    + timestamp;

  return {
    body,
    headers: {
      "X-APP-ID": appId,
      "X-TOKEN": createHash("md5").update(source).digest("hex"),
      "X-TIMESTAMP": String(timestamp),
    },
  };
}
