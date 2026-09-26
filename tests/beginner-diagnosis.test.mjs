import assert from "node:assert/strict";
import test from "node:test";
import {
  beginnerDiagnosisQuestions,
  getBeginnerDiagnosisMatchReasons,
  getBeginnerEvaluationReason,
  isCompleteBeginnerDiagnosis,
  parseBeginnerDiagnosisParams,
  rankBeginnerOccupations,
  setBeginnerDiagnosisParams,
} from "../app/lib/beginner-diagnosis.ts";

function occupation(overrides) {
  return {
    id: overrides.slug,
    slug: overrides.slug,
    name: overrides.name,
    categoryId: "other",
    catchphrase: "テスト用",
    shortDescription: "診断テスト用の職業です。",
    aptitude: {
      investigation: 3,
      negotiation: 3,
      combat: 2,
      infiltration: 2,
      support: 3,
      knowledge: 3,
      beginnerFriendly: 3,
      ...overrides.aptitude,
    },
    skillImages: overrides.skillImages ?? ["観察", "会話"],
    publishedAt: "2026-01-01",
    searchSections: {
      identity: "",
      overview: "",
      creative: "",
      settingAndScenarios: "",
    },
    searchPreviews: {
      identity: [],
      overview: [],
      creative: [],
      settingAndScenarios: [],
    },
    roleplayTip: overrides.roleplayTip ?? "身近な言葉で状況を確認する。",
    ...(overrides.recommendedRank === undefined
      ? {}
      : { recommendedRank: overrides.recommendedRank }),
  };
}

test("初心者診断は3問と安定したURLパラメーター名を公開する", () => {
  assert.equal(beginnerDiagnosisQuestions.length, 3);
  assert.deepEqual(
    beginnerDiagnosisQuestions.map(({ key, param }) => [key, param]),
    [
      ["role", "quizRole"],
      ["preparation", "quizPrep"],
      ["risk", "quizRisk"],
    ],
  );
  assert.ok(beginnerDiagnosisQuestions.every(({ options }) => options.length >= 3));
});

test("診断回答をURLから復元し、不正値だけを無視する", () => {
  const parsed = parseBeginnerDiagnosisParams(
    new URLSearchParams(
      "q=医療&quizRole=investigate&quizPrep=invalid&quizRisk=stealth",
    ),
  );

  assert.deepEqual(parsed, { role: "investigate", risk: "stealth" });
  assert.equal(isCompleteBeginnerDiagnosis(parsed), false);
  assert.equal(
    isCompleteBeginnerDiagnosis({
      role: "investigate",
      preparation: "minimal",
      risk: "everyday",
    }),
    true,
  );
});

test("診断回答を既存の検索条件を保ったままURLへ書き込める", () => {
  const params = new URLSearchParams("q=医療&quizPrep=deep-dive");
  const returned = setBeginnerDiagnosisParams(params, {
    role: "support",
    preparation: "some",
    risk: "danger",
  });

  assert.equal(returned, params);
  assert.equal(params.get("q"), "医療");
  assert.equal(params.get("quizRole"), "support");
  assert.equal(params.get("quizPrep"), "some");
  assert.equal(params.get("quizRisk"), "danger");

  setBeginnerDiagnosisParams(params, {});
  assert.equal(params.has("quizRole"), false);
  assert.equal(params.has("quizPrep"), false);
  assert.equal(params.has("quizRisk"), false);
  assert.equal(params.get("q"), "医療");
});

test("診断ランキングは回答を反映し、同じ入力で決定的かつ非空の候補を返す", () => {
  const candidates = [
    occupation({
      slug: "field-reporter",
      name: "現場記者",
      aptitude: { investigation: 5, negotiation: 4, beginnerFriendly: 5 },
    }),
    occupation({
      slug: "specialist",
      name: "専門研究員",
      aptitude: { investigation: 5, knowledge: 5, beginnerFriendly: 2 },
    }),
    occupation({
      slug: "guard",
      name: "警備員",
      aptitude: { combat: 5, support: 4, beginnerFriendly: 4 },
    }),
  ];
  const answers = {
    role: "investigate",
    preparation: "minimal",
    risk: "everyday",
  };

  const first = rankBeginnerOccupations(candidates, answers, 2);
  const second = rankBeginnerOccupations(candidates, answers, 2);

  assert.equal(first.length, 2);
  assert.equal(first[0].occupation.slug, "field-reporter");
  assert.deepEqual(
    first.map(({ occupation: item, score }) => [item.slug, score]),
    second.map(({ occupation: item, score }) => [item.slug, score]),
  );
  assert.ok(first[0].score >= first[1].score);
});

test("同点時はおすすめ順位、職業名、slugの順で安定して並ぶ", () => {
  const answers = { role: "support", preparation: "some", risk: "danger" };
  const ranked = rankBeginnerOccupations(
    [
      occupation({ slug: "zeta", name: "同名", recommendedRank: 2 }),
      occupation({ slug: "alpha", name: "同名", recommendedRank: 2 }),
      occupation({ slug: "recommended", name: "後の名前", recommendedRank: 1 }),
    ],
    answers,
    10,
  );

  assert.deepEqual(
    ranked.map(({ occupation: item }) => item.slug),
    ["recommended", "alpha", "zeta"],
  );
});

test("初心者評価理由は職業名、評価、技能、固有のRPヒントを含む", () => {
  const reason = getBeginnerEvaluationReason(
    occupation({
      slug: "librarian",
      name: "司書",
      aptitude: { beginnerFriendly: 4 },
      skillImages: ["資料検索", "情報整理"],
      roleplayTip: "利用者の質問を言い換え、必要な資料を一緒に絞り込む。",
    }),
  );

  assert.match(reason, /司書は初心者おすすめ4\/5/);
  assert.match(reason, /資料検索・情報整理/);
  assert.match(reason, /利用者の質問を言い換え/);
});

test("診断候補は三つの回答それぞれと職業適性を結び付けて説明する", () => {
  const candidate = occupation({
    slug: "field-reporter",
    name: "現場記者",
    aptitude: {
      investigation: 5,
      negotiation: 4,
      combat: 4,
      support: 3,
      beginnerFriendly: 4,
    },
    skillImages: ["取材", "聞き込み"],
  });
  const answers = {
    role: "investigate",
    preparation: "minimal",
    risk: "danger",
  };
  const reasons = getBeginnerDiagnosisMatchReasons(candidate, answers);

  assert.deepEqual(
    reasons.map(({ label }) => label),
    ["遊びたい役割", "準備量", "シナリオ"],
  );
  assert.match(reasons[0].text, /手がかりを見つけたい/);
  assert.match(reasons[0].text, /調査 5\/5/);
  assert.match(reasons[1].text, /下調べなしで始めたい/);
  assert.match(reasons[1].text, /初心者おすすめ 4\/5/);
  assert.match(reasons[2].text, /危険な現場/);
  assert.match(reasons[2].text, /戦闘 4\/5/);

  const communicationReasons = getBeginnerDiagnosisMatchReasons(candidate, {
    ...answers,
    role: "communicate",
  });
  assert.match(communicationReasons[0].text, /人と話して進めたい/);
  assert.match(communicationReasons[0].text, /交渉 4\/5/);

  const lowCombatReasons = getBeginnerDiagnosisMatchReasons(
    occupation({
      slug: "doctor",
      name: "医師",
      aptitude: {
        investigation: 4,
        combat: 1,
        support: 5,
        knowledge: 5,
      },
    }),
    answers,
  );
  assert.match(lowCombatReasons[2].text, /戦闘 1\/5は控えめ/);
  assert.match(lowCombatReasons[2].text, /サポート 5\/5を活かす/);
});
