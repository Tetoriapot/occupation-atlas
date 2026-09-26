import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { loadOccupationFiles } from "../scripts/data-tools.mjs";
import { createOccupationSearchRecords, defaultFilters, searchOccupations } from "../app/lib/search.ts";

const records = (await loadOccupationFiles(fileURLToPath(new URL("../", import.meta.url)))).map(({ value }) => value);
const index = createOccupationSearchRecords(records);
const additions = records.filter(({ id }) => Number(id.slice(4)) >= 251 && Number(id.slice(4)) <= 260);
const search = (filters) => searchOccupations(index, { ...defaultFilters, ...filters }).map(({ slug }) => slug);

test("9月の10職を既存職と異なる名前・IDで追加する", () => {
  assert.equal(additions.length, 10);
  assert.ok(records.length >= 260);
  assert.deepEqual(new Set(additions.map(({ name }) => name)), new Set([
    "医療事務員", "歯科技工士", "臨床工学技士", "ケアマネジャー", "学習塾講師",
    "造園工", "通関士", "倉庫作業員", "バスガイド", "舞台照明スタッフ",
  ]));
  for (const occupation of additions) {
    assert.equal(occupation.publishedAt, "2026-09-25");
    assert.equal(occupation.lastReviewedAt, "2026-09-25");
    assert.ok(occupation.sources.length >= 2);
    assert.equal(occupation.scenarioSituations.length, 3);
    assert.equal(occupation.creativeIdeas.length, 2);
    assert.ok(search({ query: occupation.name }).includes(occupation.slug));
  }
});

test("新規職を別名・複数語・カテゴリー・技能の組合せで検索できる", () => {
  assert.ok(search({ query: "介護支援専門員" }).includes("care-manager"));
  assert.ok(search({ query: "庭師" }).includes("landscape-gardener"));
  assert.ok(search({ query: "マイナ保険証 資格確認書", category: "medical" }).includes("medical-office-clerk"));
  assert.ok(search({ query: "全灯 影", category: "media", skills: ["照明"] }).includes("stage-lighting-technician"));
  assert.ok(!search({ query: "マイナ保険証 資格確認書", category: "transport" }).includes("medical-office-clerk"));
});

test("時代・地域の検索条件は具体的に書いた代替創作案に対応する", () => {
  assert.ok(search({ eras: ["showa"], category: "education" }).includes("cram-school-teacher"));
  assert.ok(search({ eras: ["far-future"], regions: ["space"] }).includes("clinical-engineer"));
  assert.ok(search({ eras: ["taisho-1920s"], situations: ["event"] }).includes("stage-lighting-technician"));
  assert.ok(!search({ eras: ["taisho-1920s"] }).includes("medical-office-clerk"));
});

test("資格職と周辺職の権限を混同させない", () => {
  const bySlug = new Map(additions.map((occupation) => [occupation.slug, occupation]));
  assert.match(bySlug.get("customs-specialist").overview.qualifications.join(""), /財務大臣の確認/);
  assert.match(bySlug.get("medical-office-clerk").overview.qualifications.join(""), /一律の国家資格は求められない/);
  assert.match(bySlug.get("warehouse-worker").overview.qualifications.join(""), /1トン以上では技能講習、1トン未満では特別教育/);
  assert.match(bySlug.get("care-manager").shortDescription, /介護福祉士.*役割が異なる/);
  assert.match(bySlug.get("bus-guide").shortDescription, /添乗員.*担当の中心が異なる/);
});
