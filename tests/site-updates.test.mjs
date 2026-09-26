import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { loadOccupationFiles } from "../scripts/data-tools.mjs";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const updates = JSON.parse(
  await readFile(new URL("../data/updates.json", import.meta.url), "utf8"),
);
const occupations = (await loadOccupationFiles(repositoryRoot)).map(({ value }) => value);

test("更新情報は新しい順で、変更内容を具体的に記録する", () => {
  assert.ok(updates.length >= 2);
  assert.deepEqual(
    updates.map(({ date }) => date),
    [...updates].map(({ date }) => date).sort((a, b) => b.localeCompare(a)),
  );

  const ids = new Set();
  for (const update of updates) {
    assert.match(update.id, /^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/);
    assert.ok(!ids.has(update.id), `${update.id}: idが重複しています`);
    ids.add(update.id);
    assert.match(update.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(update.title.trim().length >= 8);
    assert.ok(update.summary.trim().length >= 20);
    assert.ok(update.tags.length >= 1);
    assert.equal(new Set(update.tags).size, update.tags.length);
    assert.ok(update.changes.length >= 1);
    for (const change of update.changes) {
      assert.ok(change.title.trim().length >= 5);
      assert.ok(change.description.trim().length >= 20);
    }
  }
});

test("2026年9月25日の更新情報は10職追加を明記する", () => {
  const latest = updates.find(({ id }) => id === "2026-09-25-occupation-expansion");
  assert.ok(latest);
  assert.equal(latest.date, "2026-09-25");
  assert.match(JSON.stringify(latest), /職業データを260件へ拡充/);
  for (const name of [
    "医療事務員",
    "歯科技工士",
    "臨床工学技士",
    "ケアマネジャー",
    "学習塾講師",
    "造園工",
    "通関士",
    "倉庫作業員",
    "バスガイド",
    "舞台照明スタッフ",
  ]) {
    assert.match(JSON.stringify(latest), new RegExp(name));
  }
});

test("職業データの改稿日は更新情報へ置き去りにしない", () => {
  const latestOccupationUpdate = occupations
    .map(({ updatedAt }) => updatedAt)
    .sort((a, b) => b.localeCompare(a))[0];
  assert.ok(
    updates[0].date >= latestOccupationUpdate,
    `職業データの更新日 ${latestOccupationUpdate} を更新情報へ記録してください`,
  );
});
