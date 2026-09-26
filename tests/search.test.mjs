import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { gzipSync } from "node:zlib";
import { loadOccupationFiles } from "../scripts/data-tools.mjs";
import {
  aptitudeKeys,
  createOccupationSearchBaseRecords,
  createOccupationSearchIndex,
  createOccupationSearchRecord,
  createOccupationSearchRecords,
  defaultFilters,
  filtersFromSearchParams,
  filtersToSearchParams,
  getIncomingFilterSyncAction,
  getSearchMatchReasons,
  hydrateOccupationSearchRecords,
  mergeFiltersWithQueryDraft,
  normalizeSearchText,
  SEARCH_INPUT_DEBOUNCE_MS,
  searchOccupations,
  tokenizeSearchQuery,
} from "../app/lib/search.ts";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const fullOccupations = (await loadOccupationFiles(repositoryRoot)).map(({ value }) => value);
const occupations = createOccupationSearchRecords(fullOccupations);

function search(overrides = {}) {
  return searchOccupations([...occupations], { ...defaultFilters, ...overrides });
}

function slugs(results) {
  return results.map(({ slug }) => slug);
}

test("検索文字列の全角・半角、大文字・小文字、空白を正規化する", () => {
  assert.equal(normalizeSearchText(" Ｗｅｂ　ＡＰＰ "), "webapp");
  assert.equal(normalizeSearchText("ド ク　ター"), "ドクター");
  assert.equal(normalizeSearchText("ＵＩ／ＵＸ、設計。"), "uiux設計");
  assert.deepEqual(tokenizeSearchQuery("　Ｗｅｂ　 APP web　"), ["web", "app"]);
});

test("検索専用レコードは詳細構造を除外し、全文を一致箇所別の正規化文字列へ集約する", () => {
  const doctor = occupations.find(({ slug }) => slug === "doctor");
  assert.ok(doctor);
  assert.equal(typeof doctor.searchSections, "object");
  assert.ok(Object.values(doctor.searchSections).join("").includes(normalizeSearchText("診療録")));
  assert.equal(typeof doctor.roleplayTip, "string");
  assert.ok(!("overview" in doctor));
  assert.ok(!("creative" in doctor));
  assert.ok(!("sources" in doctor));
  assert.ok(!("relatedOccupationSlugs" in doctor));
  assert.ok(JSON.stringify(occupations).length < JSON.stringify(fullOccupations).length);
});

test("初期検索ペイロードをraw・gzipとも詳細データの15%以下に収める", () => {
  const fullJson = JSON.stringify(fullOccupations);
  const initialRecords = createOccupationSearchBaseRecords(fullOccupations);
  const initialJson = JSON.stringify(initialRecords);
  const rawRatio = Buffer.byteLength(initialJson) / Buffer.byteLength(fullJson);
  const gzipRatio = gzipSync(initialJson).byteLength / gzipSync(fullJson).byteLength;

  assert.ok(rawRatio <= 0.15, `raw比率 ${(rawRatio * 100).toFixed(1)}% が15%を超えています`);
  assert.ok(gzipRatio <= 0.15, `gzip比率 ${(gzipRatio * 100).toFixed(1)}% が15%を超えています`);
  assert.ok(initialRecords.every((record) => !("searchSections" in record)));
  assert.ok(initialRecords.every((record) => !("searchPreviews" in record)));
});

test("遅延全文索引を合成すると従来の検索レコードと同じ結果になる", () => {
  const initialRecords = createOccupationSearchBaseRecords(fullOccupations);
  const searchIndex = createOccupationSearchIndex(fullOccupations);
  const hydratedRecords = hydrateOccupationSearchRecords(initialRecords, searchIndex);

  assert.equal(Object.keys(searchIndex).length, fullOccupations.length);
  assert.deepEqual(hydratedRecords, occupations);

  for (const filters of [
    { ...defaultFilters, query: "診療録" },
    { ...defaultFilters, query: "失踪 豪華客船" },
    {
      ...defaultFilters,
      query: "交渉",
      category: "legal",
      aptitudes: ["negotiation"],
    },
  ]) {
    assert.deepEqual(
      searchOccupations(hydratedRecords, filters).map(({ slug }) => slug),
      searchOccupations(occupations, filters).map(({ slug }) => slug),
    );
  }
});

test("カード表示文字列は検索セクションへ重複格納せず、ブラウザー側の結合後も検索できる", () => {
  const doctor = fullOccupations.find(({ slug }) => slug === "doctor");
  assert.ok(doctor);
  const visibleMarkers = [
    "表示専用職業名",
    "表示専用キャッチフレーズ",
    "表示専用説明文",
    "表示専用技能",
    "表示専用RPヒント",
  ];
  const record = createOccupationSearchRecord({
    ...doctor,
    name: visibleMarkers[0],
    catchphrase: visibleMarkers[1],
    shortDescription: visibleMarkers[2],
    skillImages: [visibleMarkers[3]],
    keywords: ["重複語", "長い文章に重複語を含む"],
    creative: {
      ...doctor.creative,
      roleplayTips: [visibleMarkers[4], ...doctor.creative.roleplayTips.slice(1)],
    },
  });

  for (const query of visibleMarkers) {
    assert.ok(
      !Object.values(record.searchSections).join("").includes(normalizeSearchText(query)),
      `${query}が重複しています`,
    );
    assert.equal(searchOccupations([record], { ...defaultFilters, query }).length, 1, query);
  }
  assert.equal(Object.values(record.searchSections).join("").match(/重複語/g)?.length, 1);
  assert.equal(searchOccupations([record], { ...defaultFilters, query: "重複語" }).length, 1);
});

test("時代・地域・創作案・おすすめシチュエーションを検索文書へ取り込める", () => {
  const doctor = fullOccupations.find(({ slug }) => slug === "doctor");
  assert.ok(doctor);
  const record = createOccupationSearchRecord({
    ...doctor,
    setting: { eras: ["大正時代"], regions: ["山間部"], note: "時代と地域を置き換える例" },
    creativeIdeas: [
      { era: "昭和初期", region: "港町", title: "夜間往診", summary: "失踪船員を診察する" },
    ],
    scenarioSituations: [
      { title: "海上の隔離病棟", reason: "船内で発生した原因不明の症状を診察し、限られた設備で感染経路を追う。" },
    ],
  });

  for (const query of [
    "大正時代",
    "山間部",
    "時代と地域を置き換える例",
    "昭和初期",
    "港町",
    "夜間往診",
    "失踪船員",
    "海上の隔離病棟",
    "感染経路",
  ]) {
    assert.equal(searchOccupations([record], { ...defaultFilters, query }).length, 1, query);
  }
});

test("検索入力のデバウンス間隔は250〜300msの範囲に収める", () => {
  assert.ok(SEARCH_INPUT_DEBOUNCE_MS >= 250);
  assert.ok(SEARCH_INPUT_DEBOUNCE_MS <= 300);
});

test("デバウンス待機中の検索語をフィルター操作へ引き継ぎ、古い語を戻さない", () => {
  const current = {
    ...defaultFilters,
    query: "医師",
    skills: ["医学知識"],
    aptitudes: ["knowledge"],
  };
  const next = mergeFiltersWithQueryDraft(current, "看護師", { category: "medical" });
  const params = filtersToSearchParams(next);

  assert.equal(next.query, "看護師");
  assert.equal(next.category, "medical");
  assert.deepEqual(next.skills, ["医学知識"]);
  assert.deepEqual(next.aptitudes, ["knowledge"]);
  assert.equal(params.get("q"), "看護師");
  assert.ok(!params.toString().includes(encodeURIComponent("医師")));
});

test("空の検索欄へ入力した時だけ自動で関連度順へ切り替える", () => {
  const started = mergeFiltersWithQueryDraft(defaultFilters, "病院", {});
  const explicitlySorted = mergeFiltersWithQueryDraft(
    { ...defaultFilters, sort: "name" },
    "病院",
    {},
  );

  assert.equal(started.sort, "relevance");
  assert.equal(explicitlySorted.sort, "name");
});

test("検索語を消した直後のフィルター操作と明示クリアは空文字を優先する", () => {
  const current = { ...defaultFilters, query: "医師" };
  const aptitudeChanged = mergeFiltersWithQueryDraft(current, "", {
    aptitudes: ["investigation"],
  });
  const explicitlyCleared = mergeFiltersWithQueryDraft(current, "看護師", { query: "" });

  assert.equal(aptitudeChanged.query, "");
  assert.equal(aptitudeChanged.sort, "recommended");
  assert.deepEqual(aptitudeChanged.aptitudes, ["investigation"]);
  assert.equal(filtersToSearchParams(aptitudeChanged).has("q"), false);
  assert.equal(explicitlyCleared.query, "");
});

test("検索結果へフリーワード・カテゴリー・技能・適性の一致箇所を返す", () => {
  const doctor = occupations.find(({ slug }) => slug === "doctor");
  assert.ok(doctor);
  const filters = {
    ...defaultFilters,
    query: "診療録 感染症",
    category: "medical",
    skills: ["医学知識"],
    aptitudes: ["knowledge"],
  };
  const reasons = getSearchMatchReasons(doctor, filters, "医療");

  assert.ok(
    reasons.some(
      ({ label, value }) =>
        ["職業概要", "創作向け情報", "時代・地域・シチュエーション"].includes(label) &&
        value === "「診療録」",
    ),
  );
  assert.ok(reasons.some(({ label, value }) => label === "創作向け情報" && value === "「感染症」"));
  assert.ok(reasons.some(({ label, value }) => label === "カテゴリー" && value === "医療"));
  assert.ok(reasons.some(({ label, value }) => label === "技能イメージ" && value === "医学知識"));
  assert.ok(reasons.some(({ label, value }) => label === "探索者適性" && value === "知識 5/5"));
  assert.ok(
    reasons.some(
      ({ value, snippet }) =>
        value === "「診療録」"
        && typeof snippet === "string"
        && snippet.includes("診療録にない場所"),
    ),
    "一致した創作文を読めるスニペットとして返します",
  );
});

test("URL更新の途中状態を無視し、最新の要求だけを同期完了として扱う", () => {
  const pending = "q=%E7%9C%8B%E8%AD%B7%E5%B8%AB&category=medical";
  const superseded = new Set(["q=%E5%8C%BB%E5%B8%AB"]);

  assert.equal(
    getIncomingFilterSyncAction(pending, "q=%E5%8C%BB%E5%B8%AB", superseded),
    "ignore",
  );
  assert.equal(getIncomingFilterSyncAction(pending, pending), "acknowledge");
  assert.equal(
    getIncomingFilterSyncAction(pending, pending, new Set([pending])),
    "acknowledge",
    "以前破棄した条件を最新ターゲットとして再選択できる",
  );
  assert.equal(
    getIncomingFilterSyncAction(null, "q=%E5%8C%BB%E5%B8%AB", superseded),
    "ignore",
    "最新URLの到着後に古い遷移が完了しても巻き戻さない",
  );
  assert.equal(getIncomingFilterSyncAction(null, "q=%E5%8C%BB%E5%B8%AB"), "apply");
});

test("職業名、別名、キーワードをフリーワード検索できる", () => {
  assert.ok(slugs(search({ query: "ソフトウェア エンジニア" })).includes("software-engineer"));
  assert.ok(slugs(search({ query: "ド ク ター" })).includes("doctor"));
  assert.ok(slugs(search({ query: "デバッグ" })).includes("software-engineer"));
});

test("ランキング補完追加の原表記から新しい職業ページを検索できる", () => {
  assert.ok(slugs(search({ query: "便利屋" })).includes("handyman-service-worker"));
  assert.ok(slugs(search({ query: "政治家" })).includes("politician"));
});

test("追加・改名した全職業の職業名、別名、キーワードを検索索引から漏らさない", () => {
  const searchRecordsBySlug = new Map(occupations.map((occupation) => [occupation.slug, occupation]));

  for (const occupation of fullOccupations) {
    const searchRecord = searchRecordsBySlug.get(occupation.slug);
    assert.ok(searchRecord, `${occupation.slug}: 検索用レコードがありません`);

    for (const [field, labels] of [
      ["name", [occupation.name]],
      ["aliases", occupation.aliases],
      ["keywords", occupation.keywords],
    ]) {
      for (const label of labels) {
        const results = searchOccupations(
          [searchRecord],
          { ...defaultFilters, query: label },
        );
        assert.equal(
          results[0]?.slug,
          occupation.slug,
          `${occupation.slug}.${field}: 「${label}」で自身を検索できません`,
        );
      }
    }
  }
});

test("空白区切りの複数語は、すべての語を含む職業だけを返す", () => {
  assert.ok(slugs(search({ query: "身体所見 診療録" })).includes("doctor"));
  assert.deepEqual(search({ query: "身体所見 デバッグ" }), []);
});

test("職業概要の全項目を全文検索できる", () => {
  const overviewTerms = [
    "診療方針",
    "不確実",
    "引き継ぎ",
    "医師免許",
    "臨床研修",
    "緊急呼び出し",
    "単一の金額",
    "論理的判断",
  ];

  for (const query of overviewTerms) {
    assert.ok(slugs(search({ query })).includes("doctor"), `概要の「${query}」で医師が見つかりません`);
  }
});

test("創作向け情報の全7項目（日常イベント・導入例を含む）を全文検索できる", () => {
  const creativeTerms = [
    "身体所見",
    "感染症",
    "根拠",
    "現実主義者",
    "体調相談",
    "診療録",
    "救えなかった",
  ];

  for (const query of creativeTerms) {
    assert.ok(slugs(search({ query })).includes("doctor"), `創作情報の「${query}」で医師が見つかりません`);
  }
});

test("カテゴリーと複数の技能イメージをAND条件で絞り込める", () => {
  const medical = search({ category: "medical" });
  assert.ok(medical.length > 0);
  assert.ok(medical.every(({ categoryId }) => categoryId === "medical"));

  const results = search({ skills: ["応急 手当", "医学 知識"] });
  assert.ok(results.length > 0);
  assert.ok(slugs(results).includes("doctor"));
  assert.ok(
    results.every(({ skillImages }) => {
      const normalized = skillImages.map(normalizeSearchText);
      return ["応急手当", "医学知識"].every((skill) =>
        normalized.some((item) => item.includes(skill)),
      );
    }),
  );
});

test("各探索者適性は評価4以上だけを返す", () => {
  for (const aptitude of aptitudeKeys) {
    const results = search({ aptitudes: [aptitude] });
    assert.ok(results.length > 0, `${aptitude} の検索結果が空です`);
    assert.ok(
      results.every((occupation) => occupation.aptitude[aptitude] >= 4),
      `${aptitude} に評価3以下が含まれています`,
    );
  }
});

test("初心者おすすめは身近で専門知識なしにRPしやすい職業へ絞り込む", () => {
  const results = search({ aptitudes: ["beginnerFriendly"] });
  const resultSlugs = new Set(slugs(results));

  assert.ok(results.length <= occupations.length * 0.25);
  for (const slug of [
    "junior-high-school-student",
    "high-school-student",
    "elementary-school-teacher",
    "restaurant-staff",
    "retail-sales-associate",
  ]) {
    assert.ok(resultSlugs.has(slug), `${slug} が初心者おすすめ検索に含まれていません`);
  }
  for (const slug of ["doctor", "lawyer", "detective", "airline-pilot", "security-engineer"]) {
    assert.ok(!resultSlugs.has(slug), `${slug} は専門的なRP準備を要するため除外してください`);
  }
});

test("複数の探索者適性をAND条件で絞り込める", () => {
  const selected = ["investigation", "support", "knowledge"];
  const results = search({ aptitudes: selected });
  assert.ok(results.length > 0);
  assert.ok(slugs(results).includes("doctor"));
  assert.ok(
    results.every((occupation) => selected.every((key) => occupation.aptitude[key] >= 4)),
  );
});

test("フリーワード、カテゴリー、複数技能、複数適性を複合して絞り込める", () => {
  const results = search({
    query: "ドクター 診療録",
    category: "medical",
    skills: ["応急手当", "医学知識"],
    aptitudes: ["investigation", "knowledge"],
  });

  assert.deepEqual(slugs(results), ["doctor"]);
});

test("一致する職業がない場合は空配列を返す", () => {
  assert.deepEqual(search({ query: "__存在しない職業_9f36b2__" }), []);
  assert.deepEqual(search({ skills: ["応急手当", "存在しない技能"] }), []);
});

test("名前順、新着順、編集部おすすめ順に並べ替えられる", () => {
  const collator = new Intl.Collator("ja");
  const byName = search({ sort: "name" });
  for (let index = 1; index < byName.length; index += 1) {
    assert.ok(collator.compare(byName[index - 1].name, byName[index].name) <= 0);
  }

  const newest = search({ sort: "newest" });
  for (let index = 1; index < newest.length; index += 1) {
    assert.ok(newest[index - 1].publishedAt >= newest[index].publishedAt);
  }

  const recommended = search({ sort: "recommended" });
  assert.equal(recommended[0].slug, "nurse");
  for (let index = 1; index < recommended.length; index += 1) {
    const previousRank =
      recommended[index - 1].recommendedRank ??
      recommended[index - 1].popularRank ??
      999;
    const currentRank =
      recommended[index].recommendedRank ??
      recommended[index].popularRank ??
      999;
    assert.ok(previousRank <= currentRank);
  }
});

test("検索語がある場合は関連度順を既定とし、名前一致を本文一致より優先する", () => {
  const doctor = fullOccupations.find(({ slug }) => slug === "doctor");
  assert.ok(doctor);
  const nameMatch = createOccupationSearchRecord({
    ...doctor,
    id: "test-name-match",
    slug: "test-name-match",
    name: "病院",
    featured: { recommendedRank: 99 },
  });
  const bodyMatch = createOccupationSearchRecord({
    ...doctor,
    id: "test-body-match",
    slug: "test-body-match",
    name: "医療相談員",
    featured: { recommendedRank: 1 },
  });
  const filters = filtersFromSearchParams(new URLSearchParams("q=病院"));

  assert.equal(filters.sort, "relevance");
  assert.equal(filtersToSearchParams(filters).get("sort"), null);
  assert.deepEqual(
    searchOccupations([bodyMatch, nameMatch], filters).map(({ slug }) => slug),
    ["test-name-match", "test-body-match"],
  );

  const editorial = { ...filters, sort: "recommended" };
  assert.equal(filtersToSearchParams(editorial).get("sort"), "recommended");
  assert.deepEqual(
    searchOccupations([bodyMatch, nameMatch], editorial).map(({ slug }) => slug),
    ["test-body-match", "test-name-match"],
  );
});

test("従来の単一skill・aptitude URLを配列として復元できる", () => {
  assert.deepEqual(
    filtersFromSearchParams(
      new URLSearchParams(
        "q=医師&category=medical&skill=応急手当&aptitude=investigation&sort=newest",
      ),
    ),
    {
      ...defaultFilters,
      query: "医師",
      category: "medical",
      skills: ["応急手当"],
      aptitudes: ["investigation"],
      sort: "newest",
    },
  );
});

test("旧消防カテゴリーのURL条件を公務員カテゴリーへ移行する", () => {
  assert.deepEqual(
    filtersFromSearchParams(new URLSearchParams("category=fire")),
    {
      ...defaultFilters,
      category: "government",
    },
  );
});

test("複数の技能・適性をURLクエリへ同期し、直接URLから復元できる", () => {
  const filters = {
    ...defaultFilters,
    query: "医師 診療録",
    category: "medical",
    skills: ["応急手当", "医学知識"],
    aptitudes: ["investigation", "knowledge"],
    sort: "newest",
  };
  const params = filtersToSearchParams(filters);

  assert.deepEqual(params.getAll("skill"), ["応急手当", "医学知識"]);
  assert.deepEqual(params.getAll("aptitude"), ["investigation", "knowledge"]);
  assert.deepEqual(filtersFromSearchParams(params), filters);
});

test("正規化した時代・舞台・シチュエーションを軸間AND・軸内ORで絞り込める", () => {
  const strictResults = search({
    eras: ["taisho-1920s"],
    regions: ["island"],
    situations: ["hospital"],
  });
  const orResults = search({
    eras: ["far-future", "taisho-1920s"],
    regions: ["island"],
    situations: ["courtroom", "hospital"],
  });

  assert.ok(slugs(strictResults).includes("doctor"));
  assert.ok(slugs(orResults).includes("doctor"));

  const doctor = strictResults.find(({ slug }) => slug === "doctor");
  assert.ok(doctor);
  const reasons = getSearchMatchReasons(doctor, {
    ...defaultFilters,
    eras: ["taisho-1920s"],
    regions: ["island"],
    situations: ["hospital"],
  });
  assert.ok(reasons.some(({ label, value }) => label === "創作案の時代" && value === "大正・1920年代"));
  assert.ok(reasons.some(({ label, value }) => label === "創作案の舞台" && value === "島・群島"));
  assert.ok(reasons.some(({ label, value }) => label === "活躍シチュエーション" && value === "病院・医療施設"));
});

test("正規化ファセットをURLへ往復し、不正IDを除外する", () => {
  const filters = {
    ...defaultFilters,
    eras: ["modern", "taisho-1920s"],
    regions: ["island"],
    situations: ["hospital", "closed"],
  };
  const params = filtersToSearchParams(filters);
  params.append("era", "invalid-era");
  params.append("region", "invalid-region");

  assert.deepEqual(params.getAll("era").slice(0, 2), ["modern", "taisho-1920s"]);
  assert.deepEqual(filtersFromSearchParams(params), filters);
});

test("URLクエリの重複条件を除去し、不正な適性・並び順は既定値へ戻す", () => {
  assert.deepEqual(
    filtersFromSearchParams(
      new URLSearchParams(
        "skill=応急手当&skill=応急　手当&aptitude=knowledge&aptitude=knowledge&aptitude=invalid&sort=invalid",
      ),
    ),
    {
      ...defaultFilters,
      skills: ["応急手当"],
      aptitudes: ["knowledge"],
    },
  );

  assert.deepEqual(
    filtersFromSearchParams(new URLSearchParams("aptitude=invalid&sort=invalid")),
    defaultFilters,
  );
});
