import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  createOccupationSearchBaseRecords,
  createOccupationSearchIndex,
} from "../app/lib/search.ts";
import {
  OCCUPATION_SEARCH_INDEX_GZIP_PATH,
  OCCUPATION_SEARCH_INDEX_PATH,
  loadOccupationSearchIndex,
  validateOccupationSearchIndex,
} from "../app/lib/search-index-client.ts";
import { loadOccupationFiles } from "../scripts/data-tools.mjs";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const occupations = (await loadOccupationFiles(repositoryRoot)).map(({ value }) => value);
const baseRecords = createOccupationSearchBaseRecords(occupations);
const index = createOccupationSearchIndex(occupations);

test("遅延全文検索索引は全職業の必須セクションを検証する", () => {
  assert.equal(validateOccupationSearchIndex(index, baseRecords), index);
  assert.throws(
    () => validateOccupationSearchIndex(
      Object.fromEntries(
        Object.entries(index).filter(([slug]) => slug !== baseRecords[0].slug),
      ),
      baseRecords,
    ),
    /全文検索索引/,
  );
});

test("遅延索引は公開静的アセットから取得する", () => {
  assert.equal(
    OCCUPATION_SEARCH_INDEX_PATH,
    "/occupation-search-index.json",
  );
  assert.equal(
    OCCUPATION_SEARCH_INDEX_GZIP_PATH,
    "/occupation-search-index.compressed.json",
  );
});

test("公開索引は内容ハッシュ付きの版でキャッシュ更新できる", async () => {
  const [publicIndexJson, compressedIndex, versionJson] = await Promise.all([
    readFile(
      new URL("../public/occupation-search-index.json", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../public/occupation-search-index.compressed.json", import.meta.url),
    ),
    readFile(
      new URL(
        "../data/occupation-search-index-version.generated.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);
  const expectedVersion = createHash("sha256")
    .update(publicIndexJson)
    .digest("hex")
    .slice(0, 12);

  assert.equal(JSON.parse(versionJson).version, expectedVersion);
  assert.equal(gunzipSync(compressedIndex).toString("utf8"), publicIndexJson);
  assert.equal(
    validateOccupationSearchIndex(JSON.parse(publicIndexJson), baseRecords)
      ? true
      : false,
    true,
  );
});

test("対応ブラウザーは圧縮索引を1回だけ取得して展開する", async () => {
  const compressedIndex = await readFile(
    new URL("../public/occupation-search-index.compressed.json", import.meta.url),
  );
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url) => {
    requests.push(String(url));
    return new Response(compressedIndex, { status: 200 });
  };

  try {
    const first = await loadOccupationSearchIndex(baseRecords, "compressed-test");
    const second = await loadOccupationSearchIndex(baseRecords, "compressed-test");
    assert.equal(first, second);
    assert.equal(requests.length, 1);
    assert.match(
      requests[0],
      /occupation-search-index\.compressed\.json\?v=compressed-test$/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("圧縮索引を展開できない場合は通常JSONへフォールバックする", async () => {
  const publicIndexJson = await readFile(
    new URL("../public/occupation-search-index.json", import.meta.url),
    "utf8",
  );
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url) => {
    requests.push(String(url));
    return requests.length === 1
      ? new Response("not-a-gzip-stream", { status: 200 })
      : new Response(publicIndexJson, {
          status: 200,
          headers: { "content-type": "application/json" },
        });
  };

  try {
    const loaded = await loadOccupationSearchIndex(baseRecords, "fallback-test");
    assert.equal(Object.keys(loaded).length, baseRecords.length);
    assert.deepEqual(
      requests.map((url) => new URL(url, "https://example.test").pathname),
      [
        "/occupation-search-index.compressed.json",
        "/occupation-search-index.json",
      ],
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
