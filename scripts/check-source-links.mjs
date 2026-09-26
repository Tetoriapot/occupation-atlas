import { pathToFileURL } from "node:url";
import { loadOccupationFiles } from "./data-tools.mjs";

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_CONCURRENCY = 8;
const warningStatuses = new Set([401, 403, 405, 408, 425, 429]);

function result(url, status, detail, httpStatus) {
  return {
    url,
    status,
    detail,
    ...(httpStatus === undefined ? {} : { httpStatus }),
  };
}

async function requestWithTimeout(fetchImpl, url, init, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, {
      redirect: "follow",
      signal: controller.signal,
      ...init,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function classifyResponse(url, response) {
  if (response.status >= 200 && response.status < 400) {
    return result(url, "ok", `HTTP ${response.status}`, response.status);
  }
  if (warningStatuses.has(response.status)) {
    return result(
      url,
      "warning",
      `HTTP ${response.status}。アクセス制限または一時応答のため手動確認が必要です`,
      response.status,
    );
  }
  if (response.status === 404 || response.status === 410) {
    return result(url, "failed", `HTTP ${response.status}。参照先が見つかりません`, response.status);
  }
  return result(url, "failed", `HTTP ${response.status}`, response.status);
}

/**
 * まずHEADを試し、HEAD非対応・失敗時だけ小さなGETへ切り替えます。
 * 403や429はリンク切れと断定せず、手動確認として扱います。
 */
export async function checkSourceUrl(
  url,
  {
    fetchImpl = globalThis.fetch,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = {},
) {
  if (typeof fetchImpl !== "function") {
    throw new TypeError("fetchImpl は関数である必要があります");
  }

  try {
    const head = await requestWithTimeout(
      fetchImpl,
      url,
      { method: "HEAD", headers: { "user-agent": "tansakusha-occupation-atlas-link-check/1.0" } },
      timeoutMs,
    );
    if (head.status !== 405 && head.status !== 501) {
      return classifyResponse(url, head);
    }
  } catch {
    // HEADを拒否するサイトがあるため、GETを一度だけ試す。
  }

  try {
    const get = await requestWithTimeout(
      fetchImpl,
      url,
      {
        method: "GET",
        headers: {
          range: "bytes=0-1023",
          "user-agent": "tansakusha-occupation-atlas-link-check/1.0",
        },
      },
      timeoutMs,
    );
    return classifyResponse(url, get);
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return result(
      url,
      "warning",
      timedOut
        ? `接続が${timeoutMs.toLocaleString("ja-JP")}msでタイムアウトしました`
        : "ネットワーク応答を確認できませんでした",
    );
  }
}

export async function checkSourceUrls(
  urls,
  {
    fetchImpl = globalThis.fetch,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    concurrency = DEFAULT_CONCURRENCY,
    onResult,
  } = {},
) {
  const uniqueUrls = [...new Set(urls)];
  const results = new Array(uniqueUrls.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < uniqueUrls.length) {
      const index = nextIndex;
      nextIndex += 1;
      const checked = await checkSourceUrl(uniqueUrls[index], { fetchImpl, timeoutMs });
      results[index] = checked;
      onResult?.(checked, index, uniqueUrls.length);
    }
  }

  const workerCount = Math.max(
    1,
    Math.min(uniqueUrls.length || 1, Math.floor(concurrency) || DEFAULT_CONCURRENCY),
  );
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

async function main() {
  const verbose = process.argv.includes("--verbose");
  const configuredTimeout = Number(process.env.SOURCE_CHECK_TIMEOUT_MS);
  const configuredConcurrency = Number(process.env.SOURCE_CHECK_CONCURRENCY);
  const timeoutMs =
    Number.isFinite(configuredTimeout) && configuredTimeout > 0
      ? configuredTimeout
      : DEFAULT_TIMEOUT_MS;
  const concurrency =
    Number.isFinite(configuredConcurrency) && configuredConcurrency > 0
      ? configuredConcurrency
      : DEFAULT_CONCURRENCY;
  const records = await loadOccupationFiles(process.cwd());
  const urls = records.flatMap(({ value }) =>
    Array.isArray(value.sources) ? value.sources.map(({ url }) => url) : [],
  );
  let completed = 0;
  let reportedNonOk = 0;
  let reportedSuppression = false;
  const results = await checkSourceUrls(urls, {
    timeoutMs,
    concurrency,
    onResult(checked, _index, total) {
      completed += 1;
      const mark =
        checked.status === "ok" ? "OK" : checked.status === "warning" ? "要確認" : "失敗";
      if (verbose || (checked.status !== "ok" && reportedNonOk < 25)) {
        console.log(`[${completed}/${total}] ${mark} ${checked.url} — ${checked.detail}`);
        if (checked.status !== "ok") reportedNonOk += 1;
      } else if (checked.status !== "ok" && !reportedSuppression) {
        console.log("要確認・失敗URLの個別表示は先頭25件までです。");
        reportedSuppression = true;
      } else if (completed % 25 === 0 || completed === total) {
        console.log(`[${completed}/${total}] 確認中`);
      }
    },
  });

  const counts = {
    ok: results.filter(({ status }) => status === "ok").length,
    warning: results.filter(({ status }) => status === "warning").length,
    failed: results.filter(({ status }) => status === "failed").length,
  };
  console.log(
    `参照URL ${results.length}件: 正常 ${counts.ok} / 要確認 ${counts.warning} / 失敗 ${counts.failed}`,
  );
  if (counts.failed > 0) process.exitCode = 1;
}

const entryUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (entryUrl === import.meta.url) {
  await main();
}
