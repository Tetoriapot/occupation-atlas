import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  loadOccupationFiles,
  searchFacetIdsByKey,
} from "../scripts/data-tools.mjs";
import {
  encodeSearchFacets,
  getEncodedSearchFacetLabels,
  getOccupationSearchFacets,
  isSearchFacetId,
  matchesEncodedSearchFacets,
  searchFacetGroups,
} from "../app/lib/search-facets.ts";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const occupations = (await loadOccupationFiles(repositoryRoot)).map(({ value }) => value);

test("正規化ファセットは重複しないID・1文字コード・URLキーを持つ", () => {
  assert.deepEqual(searchFacetGroups.map(({ key }) => key), ["eras", "regions", "situations"]);
  assert.deepEqual(searchFacetGroups.map(({ urlKey }) => urlKey), ["era", "region", "situation"]);

  for (const group of searchFacetGroups) {
    assert.equal(new Set(group.options.map(({ id }) => id)).size, group.options.length);
    assert.equal(new Set(group.options.map(({ code }) => code)).size, group.options.length);
    assert.ok(group.options.every(({ code }) => Array.from(code).length === 1));
    assert.ok(group.options.every(({ id }) => isSearchFacetId(group.key, id)));
    assert.deepEqual(
      group.options.map(({ id }) => id),
      searchFacetIdsByKey[group.key],
      `${group.key}のUI taxonomyとデータ検証を同期してください`,
    );
  }
});

test("全職業が明示IDで時代・舞台・シチュエーションへ分類される", () => {
  const distributions = {
    eras: new Set(),
    regions: new Set(),
    situations: new Set(),
  };
  const missing = [];

  for (const occupation of occupations) {
    const facets = getOccupationSearchFacets(occupation);
    for (const key of ["eras", "regions", "situations"]) {
      if (facets[key].length === 0) missing.push(`${occupation.slug}:${key}`);
      assert.deepEqual(
        facets[key],
        occupation.searchFacets[key],
        `${occupation.slug}:${key}はtaxonomy順で明示してください`,
      );
      facets[key].forEach((id) => distributions[key].add(id));
    }
  }

  assert.deepEqual(missing, [], `未分類: ${missing.join("、")}`);

  assert.ok(distributions.eras.size >= 6);
  assert.ok(distributions.regions.size >= 8);
  assert.ok(distributions.situations.size >= 15);

  const modernCount = occupations.filter((occupation) =>
    getOccupationSearchFacets(occupation).eras.includes("modern"),
  ).length;
  const japanCount = occupations.filter((occupation) =>
    getOccupationSearchFacets(occupation).regions.includes("japan"),
  ).length;
  assert.ok(modernCount < occupations.length, "全件共通の現代基準を創作案フィルターへ混ぜません");
  assert.ok(japanCount < occupations.length, "全件共通の日本基準を創作案フィルターへ混ぜません");
});

test("意味IDを軽量コードへ変換し、同じ軸はORで照合できる", () => {
  const doctor = occupations.find(({ slug }) => slug === "doctor");
  assert.ok(doctor);
  const encoded = encodeSearchFacets(getOccupationSearchFacets(doctor));

  assert.equal(encoded.split("|").length, 3);
  assert.equal(matchesEncodedSearchFacets(encoded, "eras", ["taisho-1920s"]), true);
  assert.equal(matchesEncodedSearchFacets(encoded, "regions", ["island"]), true);
  assert.equal(matchesEncodedSearchFacets(encoded, "situations", ["hospital"]), true);
  assert.equal(
    matchesEncodedSearchFacets(encoded, "situations", ["courtroom", "hospital"]),
    true,
  );
  assert.ok(getEncodedSearchFacetLabels(encoded, "eras").includes("大正・1920年代"));
  assert.ok(getEncodedSearchFacetLabels(encoded, "regions").includes("島・群島"));
  assert.ok(
    getEncodedSearchFacetLabels(encoded, "situations").includes("病院・医療施設"),
  );
});

test("創作本文を変更しても、編集者が明示したfacetは変化しない", () => {
  const doctor = occupations.find(({ slug }) => slug === "doctor");
  assert.ok(doctor);
  const rewritten = structuredClone(doctor);
  rewritten.setting = {
    eras: ["本文だけを置き換えた時代"],
    regions: ["本文だけを置き換えた地域"],
    note: "検索分類へ影響させない本文",
  };
  rewritten.creativeIdeas = rewritten.creativeIdeas.map((idea, index) => ({
    ...idea,
    era: `未知時代${index}`,
    region: `未知地域${index}`,
    summary: "山、自然、橋渡しなどの偶然一致を含む文章。",
  }));
  rewritten.scenarioSituations = rewritten.scenarioSituations.map((situation) => ({
    ...situation,
    reason: "自然な役割として情報を橋渡しする。",
  }));

  assert.deepEqual(
    getOccupationSearchFacets(rewritten),
    getOccupationSearchFacets(doctor),
  );
});

test("文章の語句衝突でAIエンジニアを野外・交通へ誤分類しない", () => {
  const aiEngineer = occupations.find(({ slug }) => slug === "ai-engineer");
  assert.ok(aiEngineer);
  const facets = getOccupationSearchFacets(aiEngineer);

  assert.ok(!facets.situations.includes("outdoors"));
  assert.ok(!facets.situations.includes("transport"));
  assert.deepEqual(
    facets.situations,
    ["urban", "research-facility", "office"],
  );
});
