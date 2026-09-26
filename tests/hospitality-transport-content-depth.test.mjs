import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { loadOccupationFiles } from "../scripts/data-tools.mjs";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const records = await loadOccupationFiles(repositoryRoot);
const occupations = records.map(({ value }) => value);

const expandedSlugs = new Set([
  "airline-pilot",
  "bartender",
  "bridal-coordinator",
  "bus-driver",
  "cabin-attendant",
  "hairdresser",
  "hotel-staff",
  "logistics-dispatcher",
  "marine-engineer",
  "railway-station-staff",
  "restaurant-staff",
  "retail-sales-associate",
  "ship-deck-officer",
  "taxi-driver",
  "theme-park-operations-staff",
  "tour-conductor",
  "train-conductor",
  "train-driver",
  "travel-consultant",
  "truck-driver",
]);

const creativeKeys = [
  "investigatorFeatures",
  "likelyKnowledge",
  "roleplayTips",
  "personalityExamples",
  "everydayEvents",
  "scenarioHooks",
  "commonCharacterSettings",
];

function textLength(value) {
  if (typeof value === "string") return [...value].length;
  if (Array.isArray(value)) {
    return value.reduce((total, item) => total + textLength(item), 0);
  }
  if (value && typeof value === "object") {
    return Object.values(value).reduce(
      (total, item) => total + textLength(item),
      0,
    );
  }
  return 0;
}

function collectOriginalParagraphs(occupation) {
  return [
    ...occupation.overview.responsibilities,
    ...creativeKeys.flatMap((key) => occupation.creative[key]),
    ...occupation.creativeIdeas.map(({ summary }) => summary),
    ...occupation.scenarioSituations.map(({ reason }) => reason),
  ];
}

test("接客・運送カテゴリーは概要・創作・シナリオの各層で最低限の情報量を保つ", () => {
  const categoryOccupations = occupations.filter(({ categoryId }) =>
    ["hospitality", "transport"].includes(categoryId),
  );

  assert.ok(categoryOccupations.length >= 20);
  for (const occupation of categoryOccupations) {
    const overviewLength = textLength(occupation.overview);
    const creativeLength = textLength(occupation.creative);
    const ideaLength = textLength(occupation.creativeIdeas);
    const situationLength = textLength(occupation.scenarioSituations);
    const coreLength =
      overviewLength + creativeLength + ideaLength + situationLength;

    assert.ok(
      overviewLength >= 650,
      `${occupation.slug}: overviewが短すぎます（${overviewLength}字）`,
    );
    assert.ok(
      creativeLength >= 450,
      `${occupation.slug}: creativeが短すぎます（${creativeLength}字）`,
    );
    assert.ok(
      ideaLength >= 145,
      `${occupation.slug}: creativeIdeasが短すぎます（${ideaLength}字）`,
    );
    assert.ok(
      situationLength >= 145,
      `${occupation.slug}: scenarioSituationsが短すぎます（${situationLength}字）`,
    );
    assert.ok(
      coreLength >= 1400,
      `${occupation.slug}: 主要本文の合計が短すぎます（${coreLength}字）`,
    );
  }
});

test("P2深掘り対象20職は職務・創作・導入を均等に詳述する", () => {
  const expandedOccupations = occupations.filter(({ slug }) =>
    expandedSlugs.has(slug),
  );

  assert.equal(
    expandedOccupations.length,
    expandedSlugs.size,
    "P2深掘り対象のJSONが不足しています",
  );

  for (const occupation of expandedOccupations) {
    const overviewLength = textLength(occupation.overview);
    const creativeLength = textLength(occupation.creative);
    const ideaLength = textLength(occupation.creativeIdeas);
    const situationLength = textLength(occupation.scenarioSituations);

    assert.ok(
      overviewLength >= 730,
      `${occupation.slug}: P2 overviewが短すぎます（${overviewLength}字）`,
    );
    assert.ok(
      creativeLength >= 600,
      `${occupation.slug}: P2 creativeが短すぎます（${creativeLength}字）`,
    );
    assert.ok(
      ideaLength >= 170,
      `${occupation.slug}: P2 creativeIdeasが短すぎます（${ideaLength}字）`,
    );
    assert.ok(
      situationLength >= 170,
      `${occupation.slug}: P2 scenarioSituationsが短すぎます（${situationLength}字）`,
    );

    assert.ok(occupation.overview.responsibilities.length >= 4);
    assert.ok(occupation.overview.typicalPeople.length >= 2);
    assert.ok(occupation.overview.dailySchedule.length >= 4);
    assert.ok(occupation.overview.suitableFor.length >= 3);
    for (const key of creativeKeys) {
      assert.ok(
        occupation.creative[key].length >= 3,
        `${occupation.slug}: creative.${key}は3項目以上必要です`,
      );
    }
    assert.ok(occupation.creativeIdeas.length >= 2);
    assert.ok(occupation.scenarioSituations.length >= 3);
  }
});

test("P2深掘り対象の主要段落は職業間で使い回さない", () => {
  const seen = new Map();
  for (const occupation of occupations.filter(({ slug }) =>
    expandedSlugs.has(slug),
  )) {
    for (const paragraph of collectOriginalParagraphs(occupation)) {
      const existingSlug = seen.get(paragraph);
      assert.equal(
        existingSlug,
        undefined,
        `${occupation.slug}と${existingSlug}で同じ段落が使われています: ${paragraph}`,
      );
      seen.set(paragraph, occupation.slug);
    }
  }
});
