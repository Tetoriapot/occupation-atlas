import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  loadCategories,
  loadOccupationFiles,
} from "../scripts/data-tools.mjs";
import {
  createOccupationSearchRecords,
  defaultFilters,
  searchOccupations,
} from "../app/lib/search.ts";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const categories = await loadCategories(repositoryRoot);
const occupations = (await loadOccupationFiles(repositoryRoot)).map(({ value }) => value);
const occupationBySlug = new Map(occupations.map((occupation) => [
  occupation.slug,
  occupation,
]));
const searchRecords = createOccupationSearchRecords(occupations);

test("農林水産とメディア・広告はURL互換IDを保った包括名称で表示する", () => {
  const agriculture = categories.find(({ id }) => id === "agriculture");
  const media = categories.find(({ id }) => id === "media");

  assert.equal(agriculture?.slug, "agriculture");
  assert.equal(agriculture?.name, "農林水産");
  assert.match(agriculture?.description ?? "", /農業.*林業.*漁業/u);
  assert.equal(media?.slug, "media");
  assert.equal(media?.name, "メディア・広告");
  assert.match(media?.description ?? "", /報道.*広告.*配信/u);
});

test("働き方ではなく主たる仕事内容でフリーランス由来の職業を分類する", () => {
  const expectedCategories = {
    "event-planner": "hospitality",
    "food-coordinator": "media",
    "location-coordinator": "media",
    "video-editor": "media",
    proofreader: "media",
    interpreter: "other",
    translator: "other",
    "freelance-writer": "freelance",
    "independent-consultant": "freelance",
  };

  for (const [slug, expectedCategory] of Object.entries(expectedCategories)) {
    const occupation = occupationBySlug.get(slug);
    assert.ok(occupation, `${slug}が必要です`);
    assert.equal(occupation.categoryId, expectedCategory, slug);
    assert.ok(
      occupation.keywords.includes("フリーランス")
      || ["freelance-writer", "independent-consultant"].includes(slug),
      `${slug}は旧カテゴリーから検索できる補助語を維持します`,
    );
  }
});

test("包括カテゴリーの全職業を旧称・新称の両方で検索できる", () => {
  const agriculture = occupations.filter(({ categoryId }) => categoryId === "agriculture");
  const media = occupations.filter(({ categoryId }) => categoryId === "media");

  assert.equal(agriculture.length, 9);
  assert.ok(media.length >= 17);
  assert.ok(agriculture.every(({ keywords }) => keywords.includes("農林水産")));
  assert.ok(
    media.every(({ keywords }) =>
      keywords.includes("メディア") && keywords.includes("マスコミ")),
  );

  for (const query of ["メディア", "マスコミ"]) {
    const resultSlugs = new Set(
      searchOccupations(searchRecords, {
        ...defaultFilters,
        query,
      }).map(({ slug }) => slug),
    );
    assert.ok(
      media.every(({ slug }) => resultSlugs.has(slug)),
      `${query}検索からメディア・広告の全職業へ到達できる必要があります`,
    );
  }

  const agricultureResultSlugs = new Set(
    searchOccupations(searchRecords, {
      ...defaultFilters,
      query: "農林水産",
    }).map(({ slug }) => slug),
  );
  assert.ok(
    agriculture.every(({ slug }) => agricultureResultSlugs.has(slug)),
    "農林水産検索からカテゴリー全職業へ到達できる必要があります",
  );
});

test("明らかな語句衝突をシチュエーション分類へ残さない", () => {
  assert.ok(!occupationBySlug.get("event-planner")?.searchFacets.situations.includes("museum"));
  assert.ok(!occupationBySlug.get("animal-breeder")?.searchFacets.situations.includes("museum"));
  assert.ok(!occupationBySlug.get("interpreter")?.searchFacets.situations.includes("maritime"));
  assert.ok(!occupationBySlug.get("security-guard")?.searchFacets.situations.includes("event"));
  assert.ok(
    occupationBySlug
      .get("agricultural-machinery-mechanic")
      ?.searchFacets.situations.includes("disaster"),
  );
});

test("部分職種・説明語は別名ではなく検索補助語へ置く", () => {
  const movedTerms = {
    "event-planner": "催事企画者",
    "food-coordinator": "食の演出家",
    "location-coordinator": "ロケーションマネージャー",
    interpreter: "会議通訳者",
    translator: "実務翻訳者",
    "video-director": "映像監督",
    "special-cleaning-worker": "原状回復作業員",
    "zoo-keeper": "飼育スタッフ",
  };

  for (const [slug, term] of Object.entries(movedTerms)) {
    const occupation = occupationBySlug.get(slug);
    assert.ok(occupation, `${slug}が必要です`);
    assert.ok(!occupation.aliases.includes(term), `${term}を同義の職名として扱いません`);
    assert.ok(occupation.keywords.includes(term), `${term}の検索導線は維持します`);
  }

  assert.ok(
    !occupationBySlug.get("private-investigator")?.keywords.includes("調査員"),
    "複数職業を指す「調査員」だけで探偵を優先表示しません",
  );
});
