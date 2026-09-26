import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { loadOccupationFiles } from "../scripts/data-tools.mjs";
import {
  createOccupationSearchRecords,
  defaultFilters,
  searchOccupations,
} from "../app/lib/search.ts";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const occupations = (await loadOccupationFiles(repositoryRoot)).map(({ value }) => value);
const searchRecords = createOccupationSearchRecords(occupations);

function search(overrides = {}) {
  return searchOccupations(searchRecords, { ...defaultFilters, ...overrides });
}

const expected = [
  ["occ-241", "certified-care-worker", "介護福祉士", "other"],
  ["occ-242", "registered-dietitian", "管理栄養士", "medical"],
  ["occ-243", "bank-employee", "銀行員", "other"],
  ["occ-244", "real-estate-sales-agent", "不動産営業職", "other"],
  ["occ-245", "postal-delivery-worker", "郵便配達員", "transport"],
  ["occ-246", "aircraft-maintenance-engineer", "航空整備士", "transport"],
  ["occ-247", "automotive-mechanic", "自動車整備士", "transport"],
  ["occ-248", "electrician", "電気工事士", "architecture"],
  ["occ-249", "civil-air-traffic-controller", "航空管制官", "government"],
  ["occ-250", "building-cleaner", "ビル清掃員", "other"],
];

test("2026年8月の拡充10職を重複なく収録する", () => {
  assert.ok(occupations.length >= 250);
  for (const [id, slug, name, categoryId] of expected) {
    const occupation = occupations.find((item) => item.slug === slug);
    assert.ok(occupation, `${name}がありません`);
    assert.equal(occupation.id, id);
    assert.equal(occupation.name, name);
    assert.equal(occupation.categoryId, categoryId);
    assert.equal(occupation.publishedAt, "2026-08-23");
    assert.equal(occupation.updatedAt, "2026-08-23");
    assert.equal(occupation.lastReviewedAt, "2026-08-23");
    assert.ok(occupation.sources.length >= 2);
    assert.ok(occupation.scenarioSituations.length >= 3);
    assert.ok(occupation.creativeIdeas.length >= 2);
  }
});

test("介護福祉士は2026年時点の試験制度と経過措置を明記する", () => {
  const occupation = occupations.find(({ slug }) => slug === "certified-care-worker");
  assert.ok(occupation);
  const qualificationText = [
    ...occupation.overview.qualifications,
    ...occupation.overview.education,
  ].join(" ");
  assert.match(qualificationText, /パート合格/);
  assert.match(qualificationText, /翌年・翌々年/);
  assert.match(qualificationText, /経過措置/);
  assert.match(qualificationText, /資格取得完了ではない/);
  assert.ok(
    occupation.sources.some(({ url }) => url.includes("newpage_71070")),
  );
  assert.ok(
    occupation.sources.some(({ url }) => url.endsWith("001580746.pdf")),
  );
});

test("一般清掃と特殊清掃、民間管制と自衛隊管制を別職として説明する", () => {
  const cleaner = occupations.find(({ slug }) => slug === "building-cleaner");
  const controller = occupations.find(({ slug }) => slug === "civil-air-traffic-controller");
  assert.ok(cleaner && controller);
  assert.ok(cleaner.relatedOccupationSlugs.includes("special-cleaning-worker"));
  assert.match(cleaner.shortDescription, /特殊清掃/);
  assert.ok(controller.relatedOccupationSlugs.includes("self-defense-force-air-traffic-controller"));
  assert.match(controller.setting.note, /自衛隊航空管制員とは/);
});

test("追加10職は別名・制度語・分類条件から検索できる", () => {
  assert.ok(search({ query: "郵便集配員" }).some(({ slug }) => slug === "postal-delivery-worker"));
  assert.ok(search({ query: "宅地建物取引士" }).some(({ slug }) => slug === "real-estate-sales-agent"));
  assert.ok(search({ query: "パート合格" }).some(({ slug }) => slug === "certified-care-worker"));
  assert.ok(search({
    category: "architecture",
    skills: ["電気知識"],
  }).some(({ slug }) => slug === "electrician"));
  assert.ok(search({
    regions: ["space"],
    category: "transport",
  }).some(({ slug }) => slug === "postal-delivery-worker"));
  assert.ok(search({
    situations: ["museum"],
    category: "other",
  }).some(({ slug }) => slug === "building-cleaner"));
});

test("追加10職の時代・舞台facetは掲載中の代替創作案と一致する", () => {
  const expectedRegions = new Map([
    ["certified-care-worker", ["urban", "fictional"]],
    ["registered-dietitian", ["urban", "maritime", "fictional"]],
    ["bank-employee", ["urban", "fictional"]],
    ["real-estate-sales-agent", ["space", "fictional"]],
    ["postal-delivery-worker", ["space", "fictional"]],
    ["aircraft-maintenance-engineer", ["maritime", "space", "fictional"]],
    ["automotive-mechanic", ["urban", "fictional"]],
    ["electrician", ["urban", "fictional"]],
    ["civil-air-traffic-controller", ["space", "fictional"]],
    ["building-cleaner", ["space", "fictional"]],
  ]);

  for (const [slug, regions] of expectedRegions) {
    const occupation = occupations.find((item) => item.slug === slug);
    assert.ok(occupation);
    assert.deepEqual(occupation.searchFacets.eras, ["near-future"]);
    assert.deepEqual(occupation.searchFacets.regions, regions);
  }

  const cleaner = occupations.find(({ slug }) => slug === "building-cleaner");
  const electrician = occupations.find(({ slug }) => slug === "electrician");
  assert.ok(cleaner?.searchFacets.situations.includes("museum"));
  assert.ok(electrician?.searchFacets.situations.includes("mansion"));
});
