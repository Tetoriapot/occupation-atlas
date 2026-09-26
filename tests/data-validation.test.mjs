import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  ambiguousOccupationAliases,
  loadCategories,
  loadOccupationFiles,
  normalizeOccupationLabel,
  requiredAptitudeReasonKeys,
  searchFacetIdsByKey,
  sourceSupports,
  sourceTypes,
  validateOccupation,
  validateDataset,
} from "../scripts/data-tools.mjs";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const expectedCategoryNames = [
  "医療",
  "法律",
  "教育",
  "警察",
  "自衛隊",
  "公務員",
  "IT",
  "建築",
  "研究",
  "芸術",
  "スポーツ",
  "メディア・広告",
  "接客",
  "運送",
  "製造",
  "農林水産",
  "宗教",
  "学生",
  "フリーランス",
  "その他",
];

const [categories, records] = await Promise.all([
  loadCategories(repositoryRoot),
  loadOccupationFiles(repositoryRoot),
]);
const inventoryAudit = await readFile(
  new URL("../docs/occupation-inventory-audit.md", import.meta.url),
  "utf8",
);
const rankingAudit = await readFile(
  new URL("../docs/ranking-intake-audit.md", import.meta.url),
  "utf8",
);

const aptitudeKeys = [
  "investigation",
  "negotiation",
  "combat",
  "infiltration",
  "support",
  "knowledge",
  "beginnerFriendly",
];

test("消防を統合した20カテゴリーを、重複のない有効な索引として保持する", () => {
  assert.equal(categories.length, expectedCategoryNames.length);
  assert.deepEqual(
    categories.map((category) => category.name),
    expectedCategoryNames,
  );

  for (const [index, category] of categories.entries()) {
    assert.equal(typeof category, "object", `categories[${index}]`);
    for (const key of ["id", "slug", "name", "symbol", "description"]) {
      assert.equal(
        typeof category[key],
        "string",
        `categories[${index}].${key} は文字列である必要があります`,
      );
      assert.notEqual(
        category[key].trim(),
        "",
        `categories[${index}].${key} は空にできません`,
      );
    }
    assert.match(category.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  }

  assert.equal(new Set(categories.map(({ id }) => id)).size, categories.length);
  assert.equal(new Set(categories.map(({ slug }) => slug)).size, categories.length);
});

test("追加前200職の監査台帳が全件を分類し、現行名称・カテゴリーと同期している", () => {
  const decisionPattern =
    /^\| (.+?) \| `([^`]+)` \| ([^| ]+) \| (維持|改名|別名整理|統合|カテゴリー再検討|掲載保留) \|/gm;
  const entries = [...inventoryAudit.matchAll(decisionPattern)].map(
    ([, name, slug, categoryId, decision]) => ({ name, slug, categoryId, decision }),
  );
  assert.equal(entries.length, 200, "監査台帳は追加前200職を1行ずつ分類する必要があります");
  assert.equal(new Set(entries.map(({ slug }) => slug)).size, 200, "監査台帳のslugに重複があります");

  const auditedRecords = new Map(
    records
      .filter(({ value }) => Number(value.id.slice(4)) <= 200)
      .map(({ value }) => [value.slug, value]),
  );
  assert.equal(auditedRecords.size, 200, "occ-001〜occ-200の監査対象が必要です");
  for (const entry of entries) {
    const occupation = auditedRecords.get(entry.slug);
    assert.ok(occupation, `${entry.slug}: 監査対象の職業JSONがありません`);
    assert.equal(entry.name, occupation.name, `${entry.slug}: 監査台帳の名称が現行データと不一致です`);
    assert.equal(
      entry.categoryId,
      occupation.categoryId,
      `${entry.slug}: 監査台帳のカテゴリーが現行データと不一致です`,
    );
  }

  const decisionCounts = Object.fromEntries(
    ["維持", "改名", "別名整理", "統合", "カテゴリー再検討", "掲載保留"].map((decision) => [
      decision,
      entries.filter((entry) => entry.decision === decision).length,
    ]),
  );
  assert.deepEqual(decisionCounts, {
    維持: 144,
    改名: 10,
    別名整理: 32,
    統合: 0,
    カテゴリー再検討: 10,
    掲載保留: 4,
  });
});

test("ランキング100項目の判断記録と40件の段階追加が現行データへ反映されている", () => {
  const rankingPattern =
    /^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/gm;
  const entries = [...rankingAudit.matchAll(rankingPattern)].map(
    ([, rank, originalName, decision, acceptedName, categoryId, reason, batch]) => ({
      rank: Number(rank),
      originalName: originalName.trim(),
      decision: decision.trim(),
      acceptedName: acceptedName.trim(),
      categoryId: categoryId.trim(),
      reason: reason.trim(),
      batch: batch.trim(),
    }),
  );
  assert.equal(entries.length, 100, "参照ランキング100項目の判断記録が必要です");
  assert.deepEqual(
    entries.map(({ rank }) => rank),
    Array.from({ length: 100 }, (_, index) => index + 1),
    "ランキング順位は1〜100を欠落なく保持してください",
  );

  assert.deepEqual(
    Object.fromEntries(
      ["既存", "別名・キーワード", "新規追加", "保留", "掲載しない"].map((decision) => [
        decision,
        entries.filter((entry) => entry.decision === decision).length,
      ]),
    ),
    {
      既存: 30,
      "別名・キーワード": 19,
      新規追加: 40,
      保留: 3,
      掲載しない: 8,
    },
  );

  const additions = entries.filter(({ decision }) => decision === "新規追加");
  assert.equal(additions.length, 40, "新規追加の採用判断は40件です");
  const currentNames = new Set(records.map(({ value }) => value.name));
  for (const entry of additions) {
    assert.ok(
      currentNames.has(entry.acceptedName),
      `${entry.rank}位「${entry.originalName}」の採用先「${entry.acceptedName}」が現行データにありません`,
    );
  }
  assert.deepEqual(
    Object.fromEntries(
      ["1", "2", "3", "補完"].map((batch) => [
        batch,
        additions.filter((entry) => entry.batch === batch).length,
      ]),
    ),
    { 1: 14, 2: 12, 3: 12, 補完: 2 },
  );
});

test("監査済み200件とランキング追加バッチを保持し、各カテゴリーが合意した件数を満たす", () => {
  assert.ok(records.length >= 250, `職業JSONは250件以上必要です（現在 ${records.length}件）`);
  const minimumCounts = {
    medical: 10,
    education: 10,
    legal: 10,
    police: 10,
    defense: 10,
    it: 10,
    architecture: 10,
    research: 10,
    arts: 10,
    sports: 10,
    media: 10,
    hospitality: 10,
    transport: 10,
    manufacturing: 10,
    agriculture: 9,
    religion: 6,
    student: 6,
    freelance: 2,
    other: 10,
  };
  for (const [categoryId, minimumCount] of Object.entries(minimumCounts)) {
    assert.ok(
      records.filter(({ value }) => value.categoryId === categoryId).length >= minimumCount,
      `${categoryId}カテゴリーは${minimumCount}件以上必要です`,
    );
  }

  assert.ok(
    records.filter(({ value }) => value.categoryId === "government").length >= 20,
    "消防職を含む公務員カテゴリーは20件以上必要です",
  );
  assert.equal(
    records.filter(({ value }) => value.categoryId === "fire").length,
    0,
    "消防カテゴリーは公務員へ統合済みである必要があります",
  );

  const errors = validateDataset(records, categories);
  assert.deepEqual(errors, [], errors.join("\n"));
});

test("探索者適性は1〜5を使い分け、評価4以上へ過度に偏らない", () => {
  for (const key of aptitudeKeys) {
    const distribution = new Map([1, 2, 3, 4, 5].map((rating) => [rating, 0]));
    for (const { value } of records) {
      distribution.set(value.aptitude[key], distribution.get(value.aptitude[key]) + 1);
    }

    assert.deepEqual(
      [...distribution.values()].map((count) => count > 0),
      [true, true, true, true, true],
      `${key}: 1〜5のすべてを実例に応じて使い分けてください`,
    );
    const highRatings = distribution.get(4) + distribution.get(5);
    assert.ok(
      highRatings <= records.length * 0.6,
      `${key}: 評価4以上が${highRatings}/${records.length}件あり、絞り込みとして広すぎます`,
    );
  }
});

test("初心者おすすめは知名度・一般認知・専門知識なしのRPしやすさに限定する", () => {
  const valuesBySlug = new Map(records.map(({ value }) => [value.slug, value.aptitude.beginnerFriendly]));
  const recommended = records.filter(({ value }) => value.aptitude.beginnerFriendly >= 4);
  const strongest = records.filter(({ value }) => value.aptitude.beginnerFriendly === 5);

  assert.ok(recommended.length <= records.length * 0.25, `初心者おすすめが${recommended.length}件あり広すぎます`);
  assert.ok(strongest.length <= records.length * 0.05, `初心者おすすめ5が${strongest.length}件あり多すぎます`);

  for (const slug of [
    "junior-high-school-student",
    "high-school-student",
    "elementary-school-teacher",
    "restaurant-staff",
    "retail-sales-associate",
  ]) {
    assert.equal(valuesBySlug.get(slug), 5, `${slug}: 身近な実体験からRPしやすい代表例です`);
  }

  for (const slug of ["doctor", "lawyer", "detective", "airline-pilot", "security-engineer"]) {
    assert.ok(valuesBySlug.get(slug) <= 3, `${slug}: 知名度ではなく専門的なRP準備を考慮してください`);
  }
});

test("今回までに扱ったカテゴリーは既存職業を含めて深掘り基準を満たす", () => {
  const targetCategoryIds = new Set([
    "medical",
    "education",
    "legal",
    "police",
    "government",
    "defense",
    "it",
    "architecture",
    "research",
    "arts",
    "sports",
    "media",
    "hospitality",
    "transport",
    "manufacturing",
    "agriculture",
    "religion",
    "student",
    "freelance",
    "other",
  ]);
  const authoredTexts = new Map();

  for (const { file, value } of records.filter(({ value }) => targetCategoryIds.has(value.categoryId))) {
    assert.equal(value.overview.dailySchedule.length, 4, `${file}: 一日の流れは4件必要です`);
    assert.ok(value.skillImages.length >= 6, `${file}: 技能イメージは6件以上必要です`);
    assert.ok(value.sources.length >= 2, `${file}: 公式一次資料は2件以上必要です`);
    for (const [key, items] of Object.entries(value.creative)) {
      assert.ok(items.length >= 2, `${file}: creative.${key}は2件以上必要です`);
    }

    const occupationTexts = [
      ...value.overview.responsibilities,
      ...value.overview.dailySchedule.map(({ description }) => description),
      ...Object.values(value.creative).flat(),
      ...value.scenarioSituations.map(({ reason }) => reason),
    ];
    for (const text of occupationTexts.filter((item) => item.trim().length >= 12)) {
      const normalized = text.trim();
      assert.ok(
        !authoredTexts.has(normalized),
        `${file}: ${authoredTexts.get(normalized)}と12文字以上の文章が完全一致しています`,
      );
      authoredTexts.set(normalized, file);
    }
  }
});

test("職業概要・創作情報・技能・関連職業の情報量が品質基準内に揃っている", () => {
  const assertLengthInRange = (items, min, max, label) => {
    assert.ok(Array.isArray(items), `${label}が配列ではありません`);
    assert.ok(items.length >= min && items.length <= max, `${label}は${min}〜${max}件にしてください`);
  };

  for (const { file, value } of records) {
    assertLengthInRange(value.overview.responsibilities, 2, 4, `${file}: 仕事内容`);
    assertLengthInRange(value.overview.typicalPeople, 1, 3, `${file}: どんな人がなるか`);
    assertLengthInRange(value.overview.dailySchedule, 3, 5, `${file}: 一日の流れ`);
    assertLengthInRange(value.overview.qualifications, 1, 3, `${file}: 必要資格`);
    assertLengthInRange(value.overview.education, 1, 3, `${file}: 必要学歴`);
    assertLengthInRange(value.overview.workStyle, 1, 3, `${file}: 勤務形態`);
    assertLengthInRange(value.overview.suitableFor, 2, 4, `${file}: 向いている人物像`);

    for (const [key, items] of Object.entries(value.creative)) {
      const min = key === "personalityExamples" ? 2 : 1;
      assertLengthInRange(items, min, 4, `${file}: creative.${key}`);
    }
    assertLengthInRange(value.skillImages, 5, 8, `${file}: 技能イメージ`);
    assertLengthInRange(value.relatedOccupationSlugs, 2, 5, `${file}: 関連職業`);
  }
});

test("全職業に理由付きのおすすめシナリオシチュエーションが3件以上ある", () => {
  const allReasons = [];

  for (const { file, value } of records) {
    assert.ok(
      value.scenarioSituations.length >= 3 && value.scenarioSituations.length <= 5,
      `${file}: scenarioSituationsは3〜5件にしてください`,
    );
    assert.equal(
      new Set(value.scenarioSituations.map(({ title }) => title)).size,
      value.scenarioSituations.length,
      `${file}: scenarioSituationsのtitleに重複があります`,
    );

    for (const [index, situation] of value.scenarioSituations.entries()) {
      assert.notEqual(situation.title.trim(), "", `${file}: scenarioSituations[${index}].titleが空です`);
      assert.ok(
        situation.reason.trim().length >= 20,
        `${file}: scenarioSituations[${index}].reasonは20文字以上必要です`,
      );
      allReasons.push(situation.reason.trim());
    }
  }

  assert.equal(new Set(allReasons).size, allReasons.length, "scenarioSituationsのreasonに使い回しがあります");
});

test("職業のidとslugは一意で、ファイル名はslugと一致する", () => {
  const ids = records.map(({ value }) => value.id);
  const slugs = records.map(({ value }) => value.slug);

  assert.equal(new Set(ids).size, records.length, "重複したidがあります");
  assert.equal(new Set(slugs).size, records.length, "重複したslugがあります");

  for (const { file, value } of records) {
    assert.equal(file, `${value.slug}.json`, `${file} とslugが一致しません`);
  }
});

test("職業名と別名は表記正規化後も別職業と衝突しない", () => {
  const registeredNames = new Map();

  for (const { file, value } of records) {
    for (const [field, label] of [
      ["name", value.name],
      ...value.aliases.map((alias, index) => [`aliases[${index}]`, alias]),
    ]) {
      const normalized = normalizeOccupationLabel(label);
      const existing = registeredNames.get(normalized);
      assert.ok(
        !existing,
        `${file}.${field}: ${label} は ${existing?.file}.${existing?.field} の ${existing?.label} と重複しています`,
      );
      registeredNames.set(normalized, { file, field, label });
    }
  }
});

test("本文の送り仮名を編集ガイドの標準へ統一する", () => {
  const deprecatedSpellings = /立入り|引継ぎ|取扱い|打合せ|手掛かり/;
  for (const { file, value } of records) {
    assert.doesNotMatch(
      JSON.stringify(value),
      deprecatedSpellings,
      `${file}: 一般本文の送り仮名を編集ガイドに合わせてください`,
    );
  }
});

test("職業名の正規化はNFKC・大小文字・空白・区切り記号の表記揺れを吸収する", () => {
  assert.equal(normalizeOccupationLabel(" ＵＩ／ＵＸ・Ｄｅｓｉｇｎｅｒ "), "uiuxdesigner");
  assert.equal(
    normalizeOccupationLabel("Ｓ＆Ｃコーチ"),
    normalizeOccupationLabel("s & c コーチ"),
  );
});

test("同一職業内と別職業間の正規化後ラベル衝突をデータ検証で拒否する", () => {
  const sameOccupationErrors = validateOccupation(
    {
      name: "UI／UXデザイナー",
      aliases: ["ui / ux デザイナー", "別・名", "別 名"],
      keywords: ["ui／ux デザイナー", "検索・語", "検索 語"],
    },
    "same.json",
  );
  assert.ok(
    sameOccupationErrors.some((error) => error.includes("職業名") && error.includes("表記正規化後に重複")),
  );
  assert.ok(
    sameOccupationErrors.some((error) => error.includes("aliases[1]") && error.includes("表記正規化後に重複")),
  );
  assert.ok(
    sameOccupationErrors.some((error) => error.includes("keywords[0]") && error.includes("職業名")),
  );
  assert.ok(
    sameOccupationErrors.some((error) => error.includes("keywords[2]") && error.includes("keywords[1]")),
  );

  const excessiveAliasErrors = validateOccupation(
    {
      name: "別名上限テスト",
      aliases: ["別名一", "別名二", "別名三", "別名四"],
      keywords: ["検索語"],
    },
    "too-many-aliases.json",
  );
  assert.ok(excessiveAliasErrors.some((error) => error.includes("aliases は3件以内")));

  const crossOccupationErrors = validateDataset(
    [
      {
        file: "alpha.json",
        value: {
          id: "alpha",
          slug: "alpha",
          name: "Ａ・Ｂ分析官",
          aliases: [],
          categoryId: "test",
        },
      },
      {
        file: "beta.json",
        value: {
          id: "beta",
          slug: "beta",
          name: "別の職業",
          aliases: ["a / b 分析官"],
          categoryId: "test",
        },
      },
    ],
    [{ id: "test" }],
  );
  assert.ok(
    crossOccupationErrors.some((error) => error.includes("alpha.json.name") && error.includes("表記正規化後に衝突")),
  );
});

test("複数職業を指し得る汎用語は別名ではなく検索キーワードとして扱う", () => {
  const ambiguousKeys = new Set(ambiguousOccupationAliases.map(normalizeOccupationLabel));

  for (const { file, value } of records) {
    for (const alias of value.aliases) {
      assert.ok(
        !ambiguousKeys.has(normalizeOccupationLabel(alias)),
        `${file}: 汎用別名「${alias}」はkeywordsへ移してください`,
      );
    }
  }

  const errors = validateOccupation(
    { name: "小学校教員", aliases: ["先 生"] },
    "generic-alias.json",
  );
  assert.ok(errors.some((error) => error.includes("複数職業を指し得る汎用語")));
});

test("全職業が登録済みカテゴリーと実在する別の関連職業だけを参照する", () => {
  const categoryIds = new Set(categories.map(({ id }) => id));
  const slugs = new Set(records.map(({ value }) => value.slug));

  for (const { file, value } of records) {
    assert.ok(categoryIds.has(value.categoryId), `${file}: 未登録カテゴリー ${value.categoryId}`);
    assert.ok(value.relatedOccupationSlugs.length > 0, `${file}: 関連職業がありません`);

    for (const relatedSlug of value.relatedOccupationSlugs) {
      assert.ok(slugs.has(relatedSlug), `${file}: 関連職業 ${relatedSlug} が存在しません`);
      assert.notEqual(relatedSlug, value.slug, `${file}: 自分自身を参照しています`);
    }
  }
});

test("全職業に一次資料と矛盾のない公開・更新・確認日が登録されている", () => {
  for (const { file, value } of records) {
    assert.ok(value.sources.length > 0, `${file}: 一次資料がありません`);
    assert.ok(value.publishedAt <= value.updatedAt, `${file}: 更新日が公開日より前です`);
    assert.ok(value.updatedAt <= value.lastReviewedAt, `${file}: 最終確認日が更新日より前です`);

    for (const source of value.sources) {
      const url = new URL(source.url);
      assert.match(url.protocol, /^https?:$/, `${file}: HTTP(S)以外の資料URLです`);
      assert.match(source.title, /[:：｜]/, `${file}: 出典名に発行主体を明記してください`);
      assert.ok(sourceTypes.includes(source.type), `${file}: 未登録の資料種別です`);
      assert.ok(source.supports.length > 0, `${file}: 資料の対応項目がありません`);
      assert.equal(
        new Set(source.supports).size,
        source.supports.length,
        `${file}: 資料の対応項目が重複しています`,
      );
      assert.ok(
        source.supports.every((support) => sourceSupports.includes(support)),
        `${file}: 未登録の資料対応項目があります`,
      );
    }

    if (/\d[\d,.]*(?:万)?円/u.test(value.overview.annualIncome.summary)) {
      assert.ok(
        value.sources.some(({ supports }) => supports.includes("annualIncome")),
        `${file}: 具体的な年収・給与額に対応資料がありません`,
      );
    }
  }
});

test("全職業の上位2適性と相対的に低い1適性に、固有の評価理由がある", () => {
  const reasons = [];

  for (const { file, value } of records) {
    const requiredKeys = requiredAptitudeReasonKeys(value.aptitude);
    assert.equal(requiredKeys.length, 3, `${file}: 評価理由の対象適性は3件必要です`);
    for (const key of requiredKeys) {
      const reason = value.aptitudeReasons[key];
      assert.equal(typeof reason, "string", `${file}: aptitudeReasons.${key}がありません`);
      assert.ok(reason.trim().length >= 20, `${file}: aptitudeReasons.${key}が短すぎます`);
      reasons.push(reason.trim());
    }
  }

  assert.equal(new Set(reasons).size, reasons.length, "適性理由に完全な使い回しがあります");
});

test("適性理由・資料種別・資料対応項目・年収根拠の不正を拒否する", () => {
  const doctor = records.find(({ value }) => value.slug === "doctor")?.value;
  const airlinePilot = records.find(({ value }) => value.slug === "airline-pilot")?.value;
  assert.ok(doctor && airlinePilot);

  const invalidReason = structuredClone(doctor);
  const requiredKey = requiredAptitudeReasonKeys(invalidReason.aptitude)[0];
  delete invalidReason.aptitudeReasons[requiredKey];
  assert.ok(
    validateOccupation(invalidReason, "invalid-reason.json").some((error) =>
      error.includes(`aptitudeReasons.${requiredKey}`),
    ),
  );

  const invalidSource = structuredClone(doctor);
  invalidSource.sources[0].type = "unknown-type";
  invalidSource.sources[0].supports = ["unknown-support"];
  const sourceErrors = validateOccupation(invalidSource, "invalid-source.json");
  assert.ok(sourceErrors.some((error) => error.includes("資料種別")));
  assert.ok(sourceErrors.some((error) => error.includes("対応項目")));

  const unsupportedIncome = structuredClone(airlinePilot);
  unsupportedIncome.sources.forEach((source) => {
    source.supports = source.supports.filter((support) => support !== "annualIncome");
  });
  assert.ok(
    validateOccupation(unsupportedIncome, "unsupported-income.json").some((error) =>
      error.includes("具体額にはannualIncomeを裏付ける資料"),
    ),
  );
});

test("全職業に現代日本を基準とする時代・地域データが登録されている", () => {
  for (const { file, value } of records) {
    assert.ok(value.setting, `${file}: settingがありません`);
    assert.ok(value.setting.eras.includes("現代"), `${file}: setting.erasに現代がありません`);
    assert.ok(value.setting.regions.includes("日本"), `${file}: setting.regionsに日本がありません`);
    assert.equal(
      new Set(value.setting.eras).size,
      value.setting.eras.length,
      `${file}: setting.erasに重複があります`,
    );
    assert.equal(
      new Set(value.setting.regions).size,
      value.setting.regions.length,
      `${file}: setting.regionsに重複があります`,
    );
    assert.notEqual(value.setting.note.trim(), "", `${file}: setting.noteが空です`);
  }
});

test("全職業の検索facetは明示され、登録済みIDだけを重複なく持つ", () => {
  for (const { file, value } of records) {
    assert.ok(value.searchFacets, `${file}: searchFacetsがありません`);
    for (const [key, allowedIds] of Object.entries(searchFacetIdsByKey)) {
      const values = value.searchFacets[key];
      assert.ok(Array.isArray(values) && values.length > 0, `${file}: searchFacets.${key}が空です`);
      assert.equal(
        new Set(values).size,
        values.length,
        `${file}: searchFacets.${key}に重複があります`,
      );
      assert.ok(
        values.every((id) => allowedIds.includes(id)),
        `${file}: searchFacets.${key}に未知IDがあります`,
      );
    }
  }
});

test("検索facetの空配列・重複・未知IDをデータ検証で拒否する", () => {
  const doctor = records.find(({ value }) => value.slug === "doctor")?.value;
  assert.ok(doctor, "doctor fixtureが必要です");
  const invalid = structuredClone(doctor);
  invalid.searchFacets.eras = [];
  invalid.searchFacets.regions = ["island", "island"];
  invalid.searchFacets.situations = ["unknown-situation"];

  const errors = validateOccupation(invalid, "invalid-search-facets.json");
  assert.ok(errors.some((error) => error.includes("searchFacets.eras")));
  assert.ok(
    errors.some((error) =>
      error.includes("searchFacets.regions") && error.includes("重複")),
  );
  assert.ok(
    errors.some((error) =>
      error.includes("searchFacets.situations") && error.includes("登録済みのID")),
  );
});

test("実在しない暦日はISO形式に見えても拒否する", () => {
  const doctor = records.find(({ value }) => value.slug === "doctor")?.value;
  assert.ok(doctor, "doctor fixtureが必要です");
  const invalid = structuredClone(doctor);
  invalid.updatedAt = "2026-02-30";

  assert.ok(
    validateOccupation(invalid, "invalid-date.json").some((error) =>
      error.includes("updatedAt はYYYY-MM-DD形式の有効な日付"),
    ),
  );
});

test("データ検証はカテゴリー・関連職業・日付順・資料URLの不正を個別に報告する", () => {
  const doctorRecord = records.find(({ value }) => value.slug === "doctor");
  assert.ok(doctorRecord, "doctor fixtureが必要です");

  const invalidOccupation = structuredClone(doctorRecord.value);
  invalidOccupation.publishedAt = "2026-07-02";
  invalidOccupation.updatedAt = "2026-07-01";
  invalidOccupation.lastReviewedAt = "2026-06-30";
  invalidOccupation.sources = [
    { title: "不正なプロトコル", url: "ftp://example.com/source" },
    { title: "重複URL 1", url: "https://example.com/duplicate-source" },
    { title: "重複URL 2", url: "https://example.com/duplicate-source" },
  ];
  invalidOccupation.relatedOccupationSlugs.push(invalidOccupation.relatedOccupationSlugs[0]);

  const occupationErrors = validateOccupation(invalidOccupation, doctorRecord.file);
  assert.ok(occupationErrors.some((error) => error.includes("relatedOccupationSlugs に重複")));
  assert.ok(occupationErrors.some((error) => error.includes("有効なHTTP(S) URL")));
  assert.ok(occupationErrors.some((error) => error.includes("sources[1].urlと重複")));
  assert.ok(occupationErrors.some((error) => error.includes("updatedAt はpublishedAt以後")));
  assert.ok(occupationErrors.some((error) => error.includes("lastReviewedAt はupdatedAt以後")));

  const invalidDataset = records.map(({ file, value }) => ({ file, value: structuredClone(value) }));
  const invalidDoctor = invalidDataset.find(({ value }) => value.slug === "doctor");
  invalidDoctor.value.categoryId = "missing-category";
  invalidDoctor.value.relatedOccupationSlugs = ["doctor", "missing-occupation"];
  const datasetErrors = validateDataset(invalidDataset, categories);
  assert.ok(datasetErrors.some((error) => error.includes("categoryId「missing-category」が存在しません")));
  assert.ok(datasetErrors.some((error) => error.includes("関連職業「missing-occupation」が存在しません")));
  assert.ok(datasetErrors.some((error) => error.includes("自分自身を関連職業には指定できません")));
});

test("全職業に現代日本と別設定の創作案が2件以上登録されている", () => {
  const allTitles = [];
  const allSummaries = [];
  for (const { file, value } of records) {
    assert.ok(value.creativeIdeas.length >= 2, `${file}: creativeIdeasが2件未満です`);
    assert.ok(
      value.creativeIdeas.some((idea) => idea.era === "現代" && idea.region === "日本"),
      `${file}: 現代日本の創作案がありません`,
    );
    assert.ok(
      value.creativeIdeas.some((idea) => idea.era !== "現代" || idea.region !== "日本"),
      `${file}: 現代日本以外の創作案がありません`,
    );
    assert.equal(
      new Set(value.creativeIdeas.map(({ title }) => title)).size,
      value.creativeIdeas.length,
      `${file}: creativeIdeasのtitleに重複があります`,
    );
    for (const [index, idea] of value.creativeIdeas.entries()) {
      allTitles.push(idea.title);
      allSummaries.push(idea.summary);
      for (const key of ["title", "summary", "era", "region"]) {
        assert.equal(typeof idea[key], "string", `${file}: creativeIdeas[${index}].${key}`);
        assert.notEqual(idea[key].trim(), "", `${file}: creativeIdeas[${index}].${key}が空です`);
      }
      assert.doesNotMatch(
        idea.title,
        /の日常から始まる事件/,
        `${file}: creativeIdeas[${index}]のtitleが定型文のままです`,
      );
      assert.doesNotMatch(
        idea.summary,
        /実在する制度や史実を再現するものではない創作案/,
        `${file}: 共通免責はUI側に集約してください`,
      );
    }
  }
  assert.equal(new Set(allTitles).size, allTitles.length, "creativeIdeasのtitleは全職業で一意にしてください");
  assert.equal(new Set(allSummaries).size, allSummaries.length, "creativeIdeasのsummaryに重複があります");
});
