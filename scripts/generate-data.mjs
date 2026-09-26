import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { createOccupationSearchIndex } from "../app/lib/search.ts";
import { loadCategories, loadOccupationFiles, validateDataset } from "./data-tools.mjs";

const root = process.cwd();
const [categories, records] = await Promise.all([
  loadCategories(root),
  loadOccupationFiles(root),
]);
const errors = validateDataset(records, categories);

if (errors.length > 0) {
  console.error(`職業データの検証に失敗しました（${errors.length}件）`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  const occupations = records.map(({ value }) => value).sort((a, b) => a.id.localeCompare(b.id));
  await writeFile(
    join(root, "data", "occupations.generated.json"),
    `${JSON.stringify(occupations, null, 2)}\n`,
    "utf8",
  );
  const generatedPublicDirectory = join(root, "public");
  await mkdir(generatedPublicDirectory, { recursive: true });
  const occupationSearchIndexJson = JSON.stringify(
    createOccupationSearchIndex(occupations),
  );
  await writeFile(
    join(root, "public", "occupation-search-index.json"),
    occupationSearchIndexJson,
    "utf8",
  );
  await writeFile(
    join(root, "public", "occupation-search-index.compressed.json"),
    gzipSync(occupationSearchIndexJson, { level: 9 }),
  );
  const searchIndexVersion = createHash("sha256")
    .update(occupationSearchIndexJson)
    .digest("hex")
    .slice(0, 12);
  await writeFile(
    join(root, "data", "occupation-search-index-version.generated.json"),
    `${JSON.stringify({ version: searchIndexVersion }, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `職業データ ${occupations.length}件を検証し、一覧データと遅延読込用の全文検索索引を生成しました。`,
  );
}
