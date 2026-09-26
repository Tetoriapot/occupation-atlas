import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const root = process.cwd();
const shouldAssert = process.argv.includes("--assert");
const manifestPath = join(root, "dist", "client", ".vite", "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const entryKey = "app/components/search/occupation-explorer.tsx";
const entry = manifest[entryKey];

if (!entry) {
  throw new Error(`${entryKey} がビルドmanifestにありません。先にproduction buildを実行してください。`);
}

function collectStaticImports(key, collected = new Set()) {
  if (collected.has(key)) return collected;
  const item = manifest[key];
  if (!item) return collected;
  collected.add(key);
  for (const importedKey of item.imports ?? []) {
    collectStaticImports(importedKey, collected);
  }
  return collected;
}

const staticEntryKeys = [...collectStaticImports(entryKey)];
const files = await Promise.all(
  staticEntryKeys.map(async (key) => {
    const file = manifest[key].file;
    const bytes = await readFile(join(root, "dist", "client", file));
    return {
      key,
      file,
      bytes: bytes.byteLength,
      gzipBytes: gzipSync(bytes).byteLength,
    };
  }),
);
const routeFile = files.find(({ key }) => key === entryKey);
const workspaceEntry = manifest["app/components/search/occupation-workspace.tsx"];
const indexBytes = await readFile(
  join(root, "dist", "client", "occupation-search-index.json"),
);
const compressedIndexBytes = await readFile(
  join(root, "dist", "client", "occupation-search-index.compressed.json"),
);

const result = {
  routeChunk: routeFile,
  initialClientGraph: {
    files: files.length,
    bytes: files.reduce((sum, item) => sum + item.bytes, 0),
    gzipBytes: files.reduce((sum, item) => sum + item.gzipBytes, 0),
  },
  lazyWorkspaceChunk: workspaceEntry
    ? {
        file: workspaceEntry.file,
        isDynamicEntry: workspaceEntry.isDynamicEntry === true,
      }
    : null,
  lazySearchIndex: {
    bytes: indexBytes.byteLength,
    gzipBytes: gzipSync(indexBytes).byteLength,
    shippedGzipBytes: compressedIndexBytes.byteLength,
  },
};

console.log(JSON.stringify(result, null, 2));

if (shouldAssert) {
  const failures = [];
  if (!routeFile || routeFile.gzipBytes > 24_000) {
    failures.push("検索画面固有JSのgzipサイズが24KBを超えています。");
  }
  if (result.initialClientGraph.gzipBytes > 160_000) {
    failures.push("検索画面の初期client graphがgzip 160KBを超えています。");
  }
  if (result.lazySearchIndex.gzipBytes > 450_000) {
    failures.push("遅延全文索引がgzip 450KBを超えています。");
  }
  if (result.lazySearchIndex.shippedGzipBytes > 450_000) {
    failures.push("配信用の圧縮全文索引が450KBを超えています。");
  }
  if (!workspaceEntry?.isDynamicEntry) {
    failures.push("保存・比較パネルが遅延チャンクへ分離されていません。");
  }
  if (failures.length > 0) {
    throw new Error(failures.join("\n"));
  }
}
