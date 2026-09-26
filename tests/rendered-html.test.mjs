import assert from "node:assert/strict";
import { access, readdir } from "node:fs/promises";
import test from "node:test";

const workerFile = new URL("../dist/server/index.js", import.meta.url);
const buildAvailable = await access(workerFile).then(
  () => true,
  () => false,
);
const renderedTest = buildAvailable ? test : test.skip;
const canonicalBaseUrl = "https://tansakusha-occupation-atlas.tetoriapot.chatgpt.site";
const occupationSlugs = (await readdir(new URL("../data/occupations/", import.meta.url)))
  .filter((file) => file.endsWith(".json"))
  .map((file) => file.slice(0, -5));
const occupationCount = occupationSlugs.length;

let workerPromise;

function getWorker() {
  workerPromise ??= import(workerFile.href).then(({ default: worker }) => worker);
  return workerPromise;
}

async function render(pathname) {
  const worker = await getWorker();
  return worker.fetch(
    new Request(new URL(pathname, "http://localhost:3000"), {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

async function htmlFor(pathname, expectedStatus = 200) {
  const response = await render(pathname);
  assert.equal(response.status, expectedStatus, pathname);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i, pathname);
  return response.text();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function assertTitle(html, title) {
  assert.match(html, new RegExp(`<title>${escapeRegExp(title)}<\\/title>`, "i"));
}

function assertCanonical(html, pathname) {
  const href = escapeRegExp(new URL(pathname, canonicalBaseUrl).href);
  assert.match(
    html,
    new RegExp(`<link(?=[^>]*\\brel=["']canonical["'])(?=[^>]*\\bhref=["']${href}["'])[^>]*>`, "i"),
  );
}

function assertOgImage(html) {
  const imageUrl = escapeRegExp(new URL("/og.jpg", canonicalBaseUrl).href);
  assert.match(
    html,
    new RegExp(`<meta(?=[^>]*\\bproperty=["']og:image["'])(?=[^>]*\\bcontent=["']${imageUrl}["'])[^>]*>`, "i"),
  );
  assert.match(
    html,
    /<meta(?=[^>]*\bproperty=["']og:image:width["'])(?=[^>]*\bcontent=["']1200["'])[^>]*>/i,
  );
  assert.match(
    html,
    /<meta(?=[^>]*\bproperty=["']og:image:height["'])(?=[^>]*\bcontent=["']675["'])[^>]*>/i,
  );
}

function assertCategoryCountAtLeast(html, minimum) {
  const normalized = html.replaceAll("<!-- -->", "");
  const match = normalized.match(/収録\s*(\d+)\s*件/);
  assert.ok(match, "カテゴリーの収録件数表示が必要です");
  assert.ok(Number(match[1]) >= minimum, `収録件数は${minimum}件以上必要です（現在 ${match[1]}件）`);
}

renderedTest("全職業の詳細ページが200で表示され、canonicalと主要項目を持つ", async () => {
  for (const slug of occupationSlugs) {
    const pathname = `/occupations/${slug}`;
    const html = await htmlFor(pathname);
    assertCanonical(html, pathname);
    assert.match(html, /<h1\b/);
    assert.match(html, /おすすめシナリオシチュエーション/);
    assert.match(html, /参考資料/);
  }
});

renderedTest("主要な静的ページをHTML・metadata付きでサーバーレンダリングする", async () => {
  const [home, occupations, categories, category, about] = await Promise.all([
    htmlFor("/"),
    htmlFor("/occupations"),
    htmlFor("/categories"),
    htmlFor("/categories/medical"),
    htmlFor("/about"),
  ]);

  assertTitle(home, "探索者職業図鑑");
  assertCanonical(home, "/");
  assert.match(home, /<html[^>]*\blang=["']ja["']/i);
  assert.match(home, /現実の仕事から、/);
  assert.match(home, new RegExp(`${occupationCount}<\\/strong><span>職業`));
  assert.match(home, /"@type":"WebSite"/);
  assert.match(home, /本日の一職/);
  assert.match(home, /編集部の順位やアクセス数による選定ではなく/);
  assertOgImage(home);
  const homeCategorySection = home.match(
    /<section(?=[^>]*\bclass=["'][^"']*\bcategory-index\b[^"']*["'])[^>]*>[\s\S]*?<\/section>/i,
  )?.[0];
  assert.ok(homeCategorySection, "トップにカテゴリー抜粋が必要です");
  const normalizedHomeCategorySection = homeCategorySection.replaceAll("<!-- -->", "");
  assert.match(normalizedHomeCategorySection, /8 PICKUP \/ 20 FIELDS/);
  assert.match(normalizedHomeCategorySection, /探索や人物づくりの入口になりやすい8分野を抜粋/);
  assert.match(normalizedHomeCategorySection, /全20カテゴリーを見る/);

  assertTitle(occupations, "職業を探す｜探索者職業図鑑");
  assertCanonical(occupations, "/occupations");
  assert.match(occupations, /物語に合う職業を探す/);
  assert.match(occupations, /職業名・キーワード/);
  assert.match(occupations, /初心者向け・3問職業診断/);
  assert.match(occupations, /name=["']beginner-role["']/);
  assert.doesNotMatch(
    occupations,
    /name=["']beginner-(?:preparation|risk)["']/,
    "初期表示では最初の1問だけを描画します",
  );
  assert.match(occupations, /あと(?:<!-- -->)?3(?:<!-- -->)?問で候補を表示します/);
  assert.match(occupations, /創作案の時代/);
  assert.match(occupations, /創作案の舞台/);
  assert.match(occupations, /活躍シチュエーション/);
  assert.match(occupations, /大正・1920年代/);
  assert.equal(
    (occupations.match(/<article[^>]*class=["']occupation-card["']/g) ?? []).length,
    24,
    "初期表示は24職に抑えます",
  );
  assert.match(occupations.replaceAll("<!-- -->", ""), new RegExp(`もっと見る（残り${occupationCount - 24}件）`));
  assert.match(occupations, /aria-controls=["']occupation-search-results["']/);
  assert.doesNotMatch(
    occupations,
    /searchSections|searchPreviews/,
    "初期HTMLへ全文検索索引を埋め込まないでください",
  );
  assertOgImage(occupations);

  assertTitle(categories, "カテゴリーから職業を探す｜探索者職業図鑑");
  assertCanonical(categories, "/categories");
  assert.match(categories, /仕事の分野から探す/);
  assert.match(categories, /20(?:<!-- -->)?分野/);
  assert.match(categories, /"@type":"ItemList"/);
  assertOgImage(categories);

  assertTitle(category, "医療の職業一覧｜探索者職業図鑑");
  assertCanonical(category, "/categories/medical");
  assert.match(category, /医療の職業/);
  assert.match(category, /医師/);
  assert.match(category, /医師の候補操作/);
  assert.match(category, /候補に保存/);
  assert.match(category, /比較に追加/);
  assertOgImage(category);

  assertTitle(about, "このサイトについて｜探索者職業図鑑");
  assertCanonical(about, "/about");
  assert.match(about, /公式ルールの転載は行いません/);
  assert.match(about, /ゲーム上の強さではありません/);
  assertOgImage(about);
});

renderedTest("更新情報ページに履歴・metadata・新着職業への導線がある", async () => {
  const html = await htmlFor("/updates");

  assertTitle(html, "更新情報｜探索者職業図鑑");
  assert.match(html, /職業10件の追加とサイト全体点検/);
  assert.match(html, /今後の更新も/);
  assert.match(html, /dateTime=["']2026-08-23["']/i);
  assert.match(html, /href=["']\/occupations\?sort=newest["']/i);
  assert.match(html, /application\/ld\+json/);
});

renderedTest("代表職業ページに固有metadata・構造化データ・主要セクションがある", async () => {
  const html = await htmlFor("/occupations/doctor");

  assertTitle(html, "医師の仕事内容・創作設定｜探索者職業図鑑");
  assertCanonical(html, "/occupations/doctor");
  assert.match(html, /<meta[^>]+name=["']description["'][^>]+仕事内容、資格、一日の流れ/i);
  assertOgImage(html);
  assert.match(html, /図鑑番号\s*(?:<!-- -->)?\s*occ-001/);
  assert.match(html, /<h1>医師<\/h1>/);
  assert.match(html, /職業概要/);
  assert.match(html, /創作向け情報/);
  assert.match(html, /探索者適性/);
  assert.match(html, /初心者おすすめの評価理由/);
  assert.match(html, /医師は初心者おすすめ3\/5/);
  assert.match(html, /技能イメージ/);
  assert.match(html, /関連職業/);
  assert.match(html, /参考資料・更新情報/);
  assert.match(html, /30秒でわかる探索者像/);
  assert.match(html, /基準：(?:<!-- -->)?時代 現代／地域 日本/);
  assert.match(html, /時代・地域と創作案/);
  assert.match(html, /おすすめシナリオシチュエーション/);
  assert.match(html, /\bid=["']scenario-situations["']/i);
  assert.match(html, /href=["']#scenario-situations["']/i);
  assert.match(html, /現実職業解説の基準/);
  assert.match(html, /<span>時代<\/span>(?:<!-- -->)?現代/);
  assert.match(html, /<span>地域<\/span>(?:<!-- -->)?日本/);
  assert.match(html, /診療録にない場所/);
  assert.match(html, /孤島診療所の集団症状/);
  assert.match(html, /実在する制度、地域、人物、史実を再現するものではありません/);
  assert.match(html, /href=["']#setting-and-ideas["']/);
  assert.match(html, /この職業を共有/);
  assert.match(html, /30秒要約をコピー/);
  assert.match(html, /キャラ案をコピー/);
  assert.match(html, /医師の候補操作/);
  assert.match(html, /候補に保存/);
  assert.match(html, /比較に追加/);
  assert.match(html, /\boccupation-detail__toc--sticky\b/);
  for (const id of [
    "investigator-features",
    "likely-knowledge",
    "roleplay-tips",
    "personality-examples",
    "everyday-events",
    "scenario-hooks",
    "common-character-settings",
  ]) {
    assert.match(html, new RegExp(`\\bid=["']${id}["']`, "i"));
  }
  assert.match(html, /厚生労働省：医師国家試験の施行について/);
  assert.doesNotMatch(html, /参考資料：要確認/);
  assert.match(html, /"@type":"BreadcrumbList"/);
  assert.match(html, /"@type":"Article"/);
  assert.match(html, /"@type":"Occupation"/);
  assert.doesNotMatch(html, /"@type":"JobPosting"/);
});

renderedTest("第1拡充バッチの医療職がカテゴリーと固有詳細ページへ反映される", async () => {
  const [category, dentist] = await Promise.all([
    htmlFor("/categories/medical"),
    htmlFor("/occupations/dentist"),
  ]);

  assert.match(category, /歯科医師/);
  assert.match(category, /保健師/);
  assertTitle(dentist, "歯科医師の仕事内容・創作設定｜探索者職業図鑑");
  assertCanonical(dentist, "/occupations/dentist");
  assert.match(dentist, /閉鎖歯科診療所/);
  assert.match(dentist, /なぜその場で活躍しやすいのか/);
  assert.match(dentist, /職業情報提供サイト（job tag）：歯科医師/);
});

renderedTest("教育・法律・警察の拡充職がカテゴリーと固有詳細ページへ反映される", async () => {
  const [education, legal, police, counselor, judge, crimeScene] = await Promise.all([
    htmlFor("/categories/education"),
    htmlFor("/categories/legal"),
    htmlFor("/categories/police"),
    htmlFor("/occupations/school-counselor"),
    htmlFor("/occupations/judge"),
    htmlFor("/occupations/crime-scene-investigator"),
  ]);

  assert.match(education, /中学校教員/);
  assert.match(education, /スクールカウンセラー/);
  assert.match(legal, /裁判官/);
  assert.match(legal, /土地家屋調査士/);
  assert.match(police, /サイバー犯罪捜査官/);
  assert.match(police, /鑑識員/);
  assertTitle(counselor, "スクールカウンセラーの仕事内容・創作設定｜探索者職業図鑑");
  assertTitle(judge, "裁判官の仕事内容・創作設定｜探索者職業図鑑");
  assertTitle(crimeScene, "鑑識員の仕事内容・創作設定｜探索者職業図鑑");
  assert.match(counselor, /おすすめシナリオシチュエーション/);
  assert.match(judge, /おすすめシナリオシチュエーション/);
  assert.match(crimeScene, /おすすめシナリオシチュエーション/);
});

renderedTest("消防を統合した公務員20職以上が一覧と固有詳細ページへ反映される", async () => {
  const [government, firefighter, immigration, disasterManagement] = await Promise.all([
    htmlFor("/categories/government"),
    htmlFor("/occupations/firefighter"),
    htmlFor("/occupations/immigration-inspector"),
    htmlFor("/occupations/local-government-disaster-management-officer"),
  ]);

  assertCategoryCountAtLeast(government, 20);
  assert.match(government, /消防士/);
  assert.match(government, /火災調査員/);
  assert.match(government, /入国審査官/);
  assert.match(government, /文化財専門職員/);
  assertTitle(firefighter, "消防士の仕事内容・創作設定｜探索者職業図鑑");
  assertTitle(immigration, "入国審査官の仕事内容・創作設定｜探索者職業図鑑");
  assertTitle(disasterManagement, "自治体防災担当職員の仕事内容・創作設定｜探索者職業図鑑");
  assert.match(firefighter, /公務員/);
  assert.match(immigration, /おすすめシナリオシチュエーション/);
  assert.match(disasterManagement, /おすすめシナリオシチュエーション/);
});

renderedTest("ランキング受け入れ3バッチの追加職がカテゴリー・metadata・詳細へ反映される", async () => {
  const [medical, arts, architecture, other, government, psychologist, creator, ranger] =
    await Promise.all([
      htmlFor("/categories/medical"),
      htmlFor("/categories/arts"),
      htmlFor("/categories/architecture"),
      htmlFor("/categories/other"),
      htmlFor("/categories/government"),
      htmlFor("/occupations/clinical-psychologist"),
      htmlFor("/occupations/video-content-creator"),
      htmlFor("/occupations/park-ranger"),
    ]);

  assertCategoryCountAtLeast(medical, 16);
  assertCategoryCountAtLeast(arts, 20);
  assertCategoryCountAtLeast(architecture, 13);
  assertCategoryCountAtLeast(other, 14);
  assertCategoryCountAtLeast(government, 21);
  assert.match(medical, /愛玩動物看護師/);
  assert.match(arts, /CGクリエイター/);
  assert.match(architecture, /建設コンサルタント/);
  assert.match(other, /ペットブリーダー/);
  assert.match(government, /自然保護官（レンジャー）/);

  for (const [html, slug, name] of [
    [psychologist, "clinical-psychologist", "臨床心理職"],
    [creator, "video-content-creator", "動画配信者"],
    [ranger, "park-ranger", "自然保護官（レンジャー）"],
  ]) {
    assertTitle(html, `${name}の仕事内容・創作設定｜探索者職業図鑑`);
    assertCanonical(html, `/occupations/${slug}`);
    assert.match(html, /おすすめシナリオシチュエーション/);
    assert.match(html, /時代 現代／地域 日本/);
    assert.match(html, /"@type":"Occupation"/);
  }
});

renderedTest("ランキング補完2職がその他カテゴリー・metadata・主要セクションへ反映される", async () => {
  const [other, supportStaff, politician] = await Promise.all([
    htmlFor("/categories/other"),
    htmlFor("/occupations/handyman-service-worker"),
    htmlFor("/occupations/politician"),
  ]);

  assertCategoryCountAtLeast(other, 16);
  assert.match(other, /生活支援サービススタッフ/);
  assert.match(other, /政治家/);

  for (const [html, slug, name] of [
    [supportStaff, "handyman-service-worker", "生活支援サービススタッフ"],
    [politician, "politician", "政治家"],
  ]) {
    assertTitle(html, `${name}の仕事内容・創作設定｜探索者職業図鑑`);
    assertCanonical(html, `/occupations/${slug}`);
    assert.match(html, /<meta[^>]+name=["']description["'][^>]+仕事内容、資格、一日の流れ/i);
    assert.match(html, /職業概要/);
    assert.match(html, /創作向け情報/);
    assert.match(html, /探索者適性/);
    assert.match(html, /技能イメージ/);
    assert.match(html, /関連職業/);
    assert.match(html, /おすすめシナリオシチュエーション/);
    assert.match(html, /参考資料・更新情報/);
    assert.match(html, /時代 現代／地域 日本/);
    assert.match(html, /"@type":"Occupation"/);
  }
});

renderedTest("第6拡充バッチの7カテゴリーが各10職と固有詳細ページへ反映される", async () => {
  const [
    defense,
    it,
    architecture,
    research,
    arts,
    sports,
    media,
    airSelfDefense,
    aiEngineer,
    landSurveyor,
    astronomer,
    animator,
    mountainGuide,
    factChecker,
  ] = await Promise.all([
    htmlFor("/categories/defense"),
    htmlFor("/categories/it"),
    htmlFor("/categories/architecture"),
    htmlFor("/categories/research"),
    htmlFor("/categories/arts"),
    htmlFor("/categories/sports"),
    htmlFor("/categories/media"),
    htmlFor("/occupations/air-self-defense-force-member"),
    htmlFor("/occupations/ai-engineer"),
    htmlFor("/occupations/land-surveyor"),
    htmlFor("/occupations/astronomer"),
    htmlFor("/occupations/animator"),
    htmlFor("/occupations/mountain-guide"),
    htmlFor("/occupations/fact-checker"),
  ]);

  for (const categoryHtml of [defense, it, architecture, research, arts, sports, media]) {
    assertCategoryCountAtLeast(categoryHtml, 10);
  }

  assert.match(defense, /航空自衛官/);
  assert.match(it, /AIエンジニア/);
  assert.match(architecture, /測量士/);
  assert.match(research, /天文学者/);
  assert.match(arts, /アニメーター/);
  assert.match(sports, /山岳ガイド/);
  assert.match(media, /ファクトチェッカー/);

  assertTitle(airSelfDefense, "航空自衛官の仕事内容・創作設定｜探索者職業図鑑");
  assertTitle(aiEngineer, "AIエンジニアの仕事内容・創作設定｜探索者職業図鑑");
  assertTitle(landSurveyor, "測量士の仕事内容・創作設定｜探索者職業図鑑");
  assertTitle(astronomer, "天文学者の仕事内容・創作設定｜探索者職業図鑑");
  assertTitle(animator, "アニメーターの仕事内容・創作設定｜探索者職業図鑑");
  assertTitle(mountainGuide, "山岳ガイドの仕事内容・創作設定｜探索者職業図鑑");
  assertTitle(factChecker, "ファクトチェッカーの仕事内容・創作設定｜探索者職業図鑑");

  for (const detailHtml of [
    airSelfDefense,
    aiEngineer,
    landSurveyor,
    astronomer,
    animator,
    mountainGuide,
    factChecker,
  ]) {
    assert.match(detailHtml, /おすすめシナリオシチュエーション/);
  }
});

renderedTest("第7拡充バッチの8カテゴリーと固有詳細ページが反映される", async () => {
  const categoryExpectations = [
    ["hospitality", 10, "客室乗務員"],
    ["transport", 10, "鉄道運転士"],
    ["manufacturing", 10, "半導体プロセス技術者"],
    ["agriculture", 9, "養蜂家"],
    ["religion", 6, "神職"],
    ["student", 6, "高等専門学校生"],
    ["freelance", 2, "フリーライター"],
    ["other", 10, "アーキビスト"],
  ];
  const categoryPages = await Promise.all(
    categoryExpectations.map(([slug]) => htmlFor(`/categories/${slug}`)),
  );

  for (const [index, [, count, occupationName]] of categoryExpectations.entries()) {
    assertCategoryCountAtLeast(categoryPages[index], count);
    assert.match(categoryPages[index], new RegExp(occupationName));
  }

  const detailExpectations = [
    ["cabin-attendant", "客室乗務員"],
    ["train-driver", "鉄道運転士"],
    ["semiconductor-process-engineer", "半導体プロセス技術者"],
    ["beekeeper", "養蜂家"],
    ["shinto-priest", "神職"],
    ["technical-college-student", "高等専門学校生"],
    ["translator", "翻訳者"],
    ["archivist", "アーキビスト"],
  ];
  const detailPages = await Promise.all(
    detailExpectations.map(([slug]) => htmlFor(`/occupations/${slug}`)),
  );

  for (const [index, [, occupationName]] of detailExpectations.entries()) {
    assertTitle(detailPages[index], `${occupationName}の仕事内容・創作設定｜探索者職業図鑑`);
    assert.match(detailPages[index], /おすすめシナリオシチュエーション/);
    assert.match(detailPages[index], /現代/);
    assert.match(detailPages[index], /日本/);
  }
});

renderedTest("旧消防カテゴリーは公務員カテゴリーへ転送する", async () => {
  const response = await render("/categories/fire");

  assert.match(String(response.status), /^30[78]$/);
  assert.equal(
    new URL(response.headers.get("location"), "http://localhost:3000").pathname,
    "/categories/government",
  );
});

renderedTest("2026年8月追加の10職が固有metadataと詳細内容で表示される", async () => {
  const expected = [
    ["certified-care-worker", "介護福祉士"],
    ["registered-dietitian", "管理栄養士"],
    ["bank-employee", "銀行員"],
    ["real-estate-sales-agent", "不動産営業職"],
    ["postal-delivery-worker", "郵便配達員"],
    ["aircraft-maintenance-engineer", "航空整備士"],
    ["automotive-mechanic", "自動車整備士"],
    ["electrician", "電気工事士"],
    ["civil-air-traffic-controller", "航空管制官"],
    ["building-cleaner", "ビル清掃員"],
  ];

  for (const [slug, name] of expected) {
    const html = await htmlFor(`/occupations/${slug}`);
    assertTitle(html, `${name}の仕事内容・創作設定｜探索者職業図鑑`);
    assert.match(html, new RegExp(`<h1>${name}</h1>`));
    assert.match(html, /おすすめシナリオシチュエーション/);
    assert.match(html, /参考資料・更新情報/);
    assert.match(html, /2026-08-23/);
  }
});

renderedTest("2026年9月の新規10職を固有metadataと関連リンク付きで表示する", async () => {
  const expected = [
    ["medical-office-clerk", "医療事務員"], ["dental-technician", "歯科技工士"],
    ["clinical-engineer", "臨床工学技士"], ["care-manager", "ケアマネジャー"],
    ["cram-school-teacher", "学習塾講師"], ["landscape-gardener", "造園工"],
    ["customs-specialist", "通関士"], ["warehouse-worker", "倉庫作業員"],
    ["bus-guide", "バスガイド"], ["stage-lighting-technician", "舞台照明スタッフ"],
  ];
  for (const [slug, name] of expected) {
    const html = await htmlFor(`/occupations/${slug}`);
    assertTitle(html, `${name}の仕事内容・創作設定｜探索者職業図鑑`);
    assertCanonical(html, `/occupations/${slug}`);
    assert.match(html, /おすすめシナリオシチュエーション/);
    assert.match(html, /参考資料・更新情報/);
    assert.match(html, /2026-09-25/);
    assert.match(html, /href=["']\/occupations\//);
  }
  const updates = await htmlFor("/updates");
  assert.match(updates, /職業データを260件へ拡充/);
  assert.match(updates, /2026-09-25/);
});

renderedTest("検索フィルターは閉状態のネイティブdialogとPC用asideを分離する", async () => {
  const html = await htmlFor("/occupations");
  const trigger = html.match(
    /<button(?=[^>]*\bclass=["'][^"']*\bfilter-open\b[^"']*["'])[^>]*>/i,
  )?.[0];
  const dialog = html.match(
    /<dialog(?=[^>]*\bid=["']occupation-filter-dialog["'])[^>]*>/i,
  )?.[0];

  assert.ok(trigger, "モバイルフィルターを開くボタンが必要です");
  assert.match(trigger, /\baria-haspopup=["']dialog["']/i);
  assert.match(trigger, /\baria-controls=["']occupation-filter-dialog["']/i);
  assert.match(trigger, /\baria-expanded=["']false["']/i);

  assert.ok(dialog, "モバイルフィルターにはネイティブdialogが必要です");
  assert.match(dialog, /\baria-modal=["']true["']/i);
  assert.match(dialog, /\baria-labelledby=["']occupation-filter-dialog-title["']/i);
  assert.doesNotMatch(dialog, /\sopen(?:\s|=|>)/i);

  assert.match(
    html,
    /<aside(?=[^>]*\bclass=["'][^"']*\bfilter-panel-desktop\b[^"']*["'])(?=[^>]*\baria-labelledby=["']occupation-filter-sidebar-title["'])[^>]*>/i,
  );
  assert.match(html, /\bid=["']desktop-category-filter["']/i);
  assert.match(html, /\bid=["']desktop-skill-filter["']/i);
  assert.match(html, /\bid=["']mobile-category-filter["']/i);
  assert.match(html, /\bid=["']mobile-skill-filter["']/i);
  assert.match(html, /\baria-label=["']絞り込みを閉じる["']/i);
  assert.match(html, /\bclass=["']filter-dialog__footer["']/i);
  assert.match(html.replaceAll("<!-- -->", ""), new RegExp(`現在\\s*<strong>${occupationCount}<\\/strong>件`));
  assert.match(html, /結果を見る/);
  assert.match(html, /複数選ぶと、すべての技能を持つ職業に絞ります/);
  assert.match(html, /候補に保存/);
  assert.match(html, /比較に追加/);
  assert.match(html, /探索者適性の上位3項目/);
  assert.equal(
    (html.match(/\baria-live=["']polite["']/gi) ?? []).length,
    4,
    "結果件数・モバイル絞り込み件数・初心者診断完了・比較候補数を個別に通知します",
  );
});

renderedTest("存在しないルートはnoindex付きの404ページを返す", async () => {
  const html = await htmlFor("/occupations/not-a-real-occupation", 404);

  assertTitle(html, "探索者職業図鑑");
  assert.match(html, /その記録は見つかりませんでした/);
  assert.match(
    html,
    /<meta(?=[^>]*\bname=["']robots["'])(?=[^>]*\bcontent=["'][^"']*noindex[^"']*["'])[^>]*>/i,
  );
});

if (!buildAvailable) {
  test("rendered HTML tests require a production build", { skip: "先に production build を実行してください" }, () => {});
}
