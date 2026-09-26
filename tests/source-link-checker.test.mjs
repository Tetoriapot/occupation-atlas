import assert from "node:assert/strict";
import test from "node:test";
import {
  checkSourceUrl,
  checkSourceUrls,
} from "../scripts/check-source-links.mjs";

test("200〜399を正常、404/410をリンク切れとして分類する", async () => {
  for (const status of [200, 204, 301, 308]) {
    const checked = await checkSourceUrl(`https://example.com/${status}`, {
      fetchImpl: async () => new Response(null, { status }),
    });
    assert.equal(checked.status, "ok");
    assert.equal(checked.httpStatus, status);
  }

  for (const status of [404, 410]) {
    const checked = await checkSourceUrl(`https://example.com/${status}`, {
      fetchImpl: async () => new Response(null, { status }),
    });
    assert.equal(checked.status, "failed");
    assert.equal(checked.httpStatus, status);
  }
});

test("HEAD非対応時はRange付きGETへ切り替える", async () => {
  const calls = [];
  const checked = await checkSourceUrl("https://example.com/head-not-allowed", {
    fetchImpl: async (_url, init) => {
      calls.push(init);
      return init.method === "HEAD"
        ? new Response(null, { status: 405 })
        : new Response("ok", { status: 206 });
    },
  });

  assert.equal(checked.status, "ok");
  assert.deepEqual(calls.map(({ method }) => method), ["HEAD", "GET"]);
  assert.equal(calls[1].headers.range, "bytes=0-1023");
});

test("アクセス制限と通信失敗はリンク切れと断定せず要確認にする", async () => {
  const blocked = await checkSourceUrl("https://example.com/blocked", {
    fetchImpl: async () => new Response(null, { status: 403 }),
  });
  const networkFailure = await checkSourceUrl("https://example.com/network", {
    fetchImpl: async () => {
      throw new TypeError("network down");
    },
  });

  assert.equal(blocked.status, "warning");
  assert.equal(networkFailure.status, "warning");
});

test("重複URLを一度だけ、指定並列数以内で検査する", async () => {
  let active = 0;
  let maxActive = 0;
  let calls = 0;
  const urls = [
    "https://example.com/a",
    "https://example.com/b",
    "https://example.com/a",
    "https://example.com/c",
  ];
  const results = await checkSourceUrls(urls, {
    concurrency: 2,
    fetchImpl: async () => {
      calls += 1;
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return new Response(null, { status: 200 });
    },
  });

  assert.equal(results.length, 3);
  assert.equal(calls, 3);
  assert.ok(maxActive <= 2);
});
