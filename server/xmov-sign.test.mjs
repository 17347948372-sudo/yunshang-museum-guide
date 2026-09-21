import assert from "node:assert/strict";
import test from "node:test";
import { deepSort, pythonCompatibleJson, createXmovSignature } from "./xmov-sign.mjs";

test("deepSort recursively orders request keys", () => {
  assert.deepEqual(deepSort({ z: 1, a: { y: 2, b: 3 }, list: [{ d: 4, c: 5 }] }), {
    a: { b: 3, y: 2 },
    list: [{ c: 5, d: 4 }],
    z: 1,
  });
});

test("pythonCompatibleJson matches the SDK unicode escaping", () => {
  assert.equal(pythonCompatibleJson({ text: "云 上" }), '{"text":"\\u4e91\\u4e0a"}');
});

test("signature is deterministic for a fixed timestamp", () => {
  const signed = createXmovSignature({
    appId: "app",
    appSecret: "secret",
    method: "POST",
    gatewayUrl: "https://example.com/user/v1/session?mode=test",
    payload: { b: 2, a: 1 },
    timestamp: 1_700_000_000,
  });
  assert.equal(signed.headers["X-TOKEN"], "b1760c37bc64875596fc4695aa6f072b");
});
