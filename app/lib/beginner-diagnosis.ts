import type { OccupationSearchRecord } from "@/app/types/occupation-search";

export type BeginnerRoleAnswer =
  | "investigate"
  | "communicate"
  | "take-action"
  | "support";
export type BeginnerPreparationAnswer = "minimal" | "some" | "deep-dive";
export type BeginnerRiskAnswer = "everyday" | "danger" | "stealth";

export type BeginnerDiagnosisAnswers = {
  role: BeginnerRoleAnswer;
  preparation: BeginnerPreparationAnswer;
  risk: BeginnerRiskAnswer;
};

export type BeginnerDiagnosisAnswerKey = keyof BeginnerDiagnosisAnswers;

export type BeginnerDiagnosisOption<Value extends string = string> = {
  value: Value;
  label: string;
  description: string;
};

export type BeginnerDiagnosisQuestion = {
  key: BeginnerDiagnosisAnswerKey;
  param: "quizRole" | "quizPrep" | "quizRisk";
  legend: string;
  options: readonly BeginnerDiagnosisOption[];
};

export const beginnerRoleOptions = [
  {
    value: "investigate",
    label: "手がかりを見つけたい",
    description: "観察や知識を使って謎を整理する役を好む",
  },
  {
    value: "communicate",
    label: "人と話して進めたい",
    description: "聞き込みや説得で人間関係を動かす役を好む",
  },
  {
    value: "take-action",
    label: "現場で行動したい",
    description: "危険な場所へ入り、身体を動かす役を好む",
  },
  {
    value: "support",
    label: "仲間を支えたい",
    description: "手当てや専門知識でチームを助ける役を好む",
  },
] as const satisfies readonly BeginnerDiagnosisOption<BeginnerRoleAnswer>[];

export const beginnerPreparationOptions = [
  {
    value: "minimal",
    label: "下調べなしで始めたい",
    description: "普段の言葉と身近な職業像からRPを組み立てたい",
  },
  {
    value: "some",
    label: "少しなら調べられる",
    description: "要点だけ確認し、遊びながら役をつかみたい",
  },
  {
    value: "deep-dive",
    label: "専門分野も掘り下げたい",
    description: "用語や仕事の背景を調べて設定に生かしたい",
  },
] as const satisfies readonly BeginnerDiagnosisOption<BeginnerPreparationAnswer>[];

export const beginnerRiskOptions = [
  {
    value: "everyday",
    label: "日常から始まる事件",
    description: "身近な場所で調査や会話を重ねたい",
  },
  {
    value: "danger",
    label: "危険な現場",
    description: "災害や事件の現場で即座に動きたい",
  },
  {
    value: "stealth",
    label: "秘密と潜入",
    description: "気づかれないように情報や場所へ近づきたい",
  },
] as const satisfies readonly BeginnerDiagnosisOption<BeginnerRiskAnswer>[];

export const beginnerDiagnosisQuestions = [
  {
    key: "role",
    param: "quizRole",
    legend: "卓でどんな役を担当したい？",
    options: beginnerRoleOptions,
  },
  {
    key: "preparation",
    param: "quizPrep",
    legend: "職業の下調べはどのくらい楽しめそう？",
    options: beginnerPreparationOptions,
  },
  {
    key: "risk",
    param: "quizRisk",
    legend: "惹かれるシナリオの雰囲気は？",
    options: beginnerRiskOptions,
  },
] as const satisfies readonly BeginnerDiagnosisQuestion[];

type SearchParamsReader = Pick<URLSearchParams, "get">;

const answerValues = {
  role: new Set<BeginnerRoleAnswer>(beginnerRoleOptions.map(({ value }) => value)),
  preparation: new Set<BeginnerPreparationAnswer>(
    beginnerPreparationOptions.map(({ value }) => value),
  ),
  risk: new Set<BeginnerRiskAnswer>(beginnerRiskOptions.map(({ value }) => value)),
};

export function parseBeginnerDiagnosisParams(
  params: SearchParamsReader,
): Partial<BeginnerDiagnosisAnswers> {
  const role = params.get("quizRole");
  const preparation = params.get("quizPrep");
  const risk = params.get("quizRisk");

  return {
    ...(role && answerValues.role.has(role as BeginnerRoleAnswer)
      ? { role: role as BeginnerRoleAnswer }
      : {}),
    ...(preparation &&
    answerValues.preparation.has(preparation as BeginnerPreparationAnswer)
      ? { preparation: preparation as BeginnerPreparationAnswer }
      : {}),
    ...(risk && answerValues.risk.has(risk as BeginnerRiskAnswer)
      ? { risk: risk as BeginnerRiskAnswer }
      : {}),
  };
}

export function setBeginnerDiagnosisParams(
  params: URLSearchParams,
  answers: Partial<BeginnerDiagnosisAnswers>,
): URLSearchParams {
  const values: Array<{
    param: BeginnerDiagnosisQuestion["param"];
    value: string | undefined;
    validValues: ReadonlySet<string>;
  }> = [
    { param: "quizRole", value: answers.role, validValues: answerValues.role },
    {
      param: "quizPrep",
      value: answers.preparation,
      validValues: answerValues.preparation,
    },
    { param: "quizRisk", value: answers.risk, validValues: answerValues.risk },
  ];

  for (const { param, value, validValues } of values) {
    if (value && validValues.has(value)) {
      params.set(param, value);
    } else {
      params.delete(param);
    }
  }

  return params;
}

export function isCompleteBeginnerDiagnosis(
  answers: Partial<BeginnerDiagnosisAnswers>,
): answers is BeginnerDiagnosisAnswers {
  return (
    answerValues.role.has(answers.role as BeginnerRoleAnswer) &&
    answerValues.preparation.has(
      answers.preparation as BeginnerPreparationAnswer,
    ) &&
    answerValues.risk.has(answers.risk as BeginnerRiskAnswer)
  );
}

const roleWeights: Record<
  BeginnerRoleAnswer,
  Partial<Record<keyof OccupationSearchRecord["aptitude"], number>>
> = {
  investigate: { investigation: 6, knowledge: 3, negotiation: 1 },
  communicate: { negotiation: 6, support: 2, investigation: 1 },
  "take-action": { combat: 5, infiltration: 3, investigation: 2 },
  support: { support: 6, knowledge: 3, negotiation: 1 },
};

const riskWeights: Record<
  BeginnerRiskAnswer,
  Partial<Record<keyof OccupationSearchRecord["aptitude"], number>>
> = {
  everyday: { investigation: 3, negotiation: 3, support: 2 },
  danger: { combat: 5, support: 3, investigation: 2 },
  stealth: { infiltration: 5, investigation: 3, knowledge: 1 },
};

function weightedAptitudeScore(
  occupation: OccupationSearchRecord,
  weights: Partial<Record<keyof OccupationSearchRecord["aptitude"], number>>,
): number {
  return Object.entries(weights).reduce((score, [key, weight]) => {
    const aptitudeKey = key as keyof OccupationSearchRecord["aptitude"];
    return score + occupation.aptitude[aptitudeKey] * (weight ?? 0);
  }, 0);
}

function preparationScore(
  occupation: OccupationSearchRecord,
  preparation: BeginnerPreparationAnswer,
): number {
  const { aptitude } = occupation;

  if (preparation === "minimal") {
    return (
      aptitude.beginnerFriendly * 8 +
      (6 - aptitude.knowledge) * 2 +
      (6 - aptitude.infiltration)
    );
  }

  if (preparation === "deep-dive") {
    return aptitude.knowledge * 6 + aptitude.beginnerFriendly * 2;
  }

  return aptitude.beginnerFriendly * 5 + aptitude.knowledge * 2;
}

export type RankedBeginnerOccupation = {
  occupation: OccupationSearchRecord;
  score: number;
};

export type BeginnerDiagnosisMatchReason = {
  label: "遊びたい役割" | "準備量" | "シナリオ";
  text: string;
};

const aptitudeReasonLabels: Record<
  keyof OccupationSearchRecord["aptitude"],
  string
> = {
  investigation: "調査",
  negotiation: "交渉",
  combat: "戦闘",
  infiltration: "潜入",
  support: "サポート",
  knowledge: "知識",
  beginnerFriendly: "初心者おすすめ",
};

function optionLabel(
  key: BeginnerDiagnosisAnswerKey,
  value: string,
): string {
  return beginnerDiagnosisQuestions
    .find((question) => question.key === key)
    ?.options.find((option) => option.value === value)?.label ?? value;
}

function strongestAptitude(
  occupation: OccupationSearchRecord,
  keys: ReadonlyArray<keyof OccupationSearchRecord["aptitude"]>,
) {
  return keys
    .map((key) => ({
      key,
      label: aptitudeReasonLabels[key],
      value: occupation.aptitude[key],
    }))
    .sort((left, right) => right.value - left.value)[0];
}

/**
 * 診断で選んだ三つの回答それぞれについて、職業のどの評価と結び付いたかを説明する。
 * 推薦順位だけでは理由が分からない状態を避け、回答と候補の関係を読み返せるようにする。
 */
export function getBeginnerDiagnosisMatchReasons(
  occupation: OccupationSearchRecord,
  answers: BeginnerDiagnosisAnswers,
): BeginnerDiagnosisMatchReason[] {
  const roleAptitudeKeys: Record<
    BeginnerRoleAnswer,
    ReadonlyArray<keyof OccupationSearchRecord["aptitude"]>
  > = {
    investigate: ["investigation", "knowledge"],
    communicate: ["negotiation", "support"],
    "take-action": ["combat", "infiltration", "investigation"],
    support: ["support", "knowledge"],
  };
  const riskAptitudeKeys: Record<
    BeginnerRiskAnswer,
    ReadonlyArray<keyof OccupationSearchRecord["aptitude"]>
  > = {
    everyday: ["investigation", "negotiation", "support"],
    danger: ["combat"],
    stealth: ["infiltration"],
  };
  const roleAptitude = strongestAptitude(
    occupation,
    roleAptitudeKeys[answers.role],
  );
  const riskAptitude = strongestAptitude(
    occupation,
    riskAptitudeKeys[answers.risk],
  );
  const strongestOverallAptitude = strongestAptitude(occupation, [
    "investigation",
    "negotiation",
    "combat",
    "infiltration",
    "support",
    "knowledge",
  ]);
  const skills = occupation.skillImages.filter(Boolean).slice(0, 2);
  const skillText = skills.length > 0 ? skills.join("・") : "職業固有の知識";
  const preparationText =
    answers.preparation === "minimal"
      ? `初心者おすすめ ${occupation.aptitude.beginnerFriendly}/5。${skillText}を手がかりに、身近な言葉から人物像を始められます。`
      : answers.preparation === "deep-dive"
        ? `知識 ${occupation.aptitude.knowledge}/5。${skillText}を調べるほど、専門家らしい判断を設定へ足せます。`
        : `初心者おすすめ ${occupation.aptitude.beginnerFriendly}/5。${skillText}の要点を押さえれば、遊びながら役割をつかめます。`;
  const roleText =
    roleAptitude.value >= 4
      ? `${roleAptitude.label} ${roleAptitude.value}/5を強みとして活かせます。`
      : roleAptitude.value === 3
        ? `${roleAptitude.label} ${roleAptitude.value}/5を役割の軸にできます。`
        : `${roleAptitude.label} ${roleAptitude.value}/5は控えめです。主担当ではなく、仲間を補助する役にすると自然です。`;
  const riskText =
    riskAptitude.value >= 4
      ? `${riskAptitude.label} ${riskAptitude.value}/5を活躍の軸にできます。`
      : riskAptitude.value === 3
        ? `${riskAptitude.label} ${riskAptitude.value}/5を入口に、仲間との連携で役割を作れます。`
        : `${riskAptitude.label} ${riskAptitude.value}/5は控えめです。直接対処役ではなく、${strongestOverallAptitude.label} ${strongestOverallAptitude.value}/5を活かす立ち位置が自然です。`;

  return [
    {
      label: "遊びたい役割",
      text: `「${optionLabel("role", answers.role)}」に対し、${roleText}`,
    },
    {
      label: "準備量",
      text: `「${optionLabel("preparation", answers.preparation)}」との相性：${preparationText}`,
    },
    {
      label: "シナリオ",
      text: `「${optionLabel("risk", answers.risk)}」では、${riskText}`,
    },
  ];
}

/**
 * 3つの回答と初心者おすすめ評価を合わせて候補を並べる独自診断です。
 * 同点時の規則も固定し、同じ入力から常に同じ順序を返します。
 */
export function rankBeginnerOccupations(
  occupations: readonly OccupationSearchRecord[],
  answers: BeginnerDiagnosisAnswers,
  limit = 6,
): RankedBeginnerOccupation[] {
  if (occupations.length === 0 || !Number.isFinite(limit) || limit <= 0) return [];

  return occupations
    .map((occupation) => ({
      occupation,
      score:
        occupation.aptitude.beginnerFriendly * 12 +
        weightedAptitudeScore(occupation, roleWeights[answers.role]) +
        preparationScore(occupation, answers.preparation) +
        weightedAptitudeScore(occupation, riskWeights[answers.risk]),
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.occupation.aptitude.beginnerFriendly -
          left.occupation.aptitude.beginnerFriendly ||
        (left.occupation.recommendedRank ?? Number.MAX_SAFE_INTEGER) -
          (right.occupation.recommendedRank ?? Number.MAX_SAFE_INTEGER) ||
        left.occupation.name.localeCompare(right.occupation.name, "ja") ||
        left.occupation.slug.localeCompare(right.occupation.slug),
    )
    .slice(0, Math.max(1, Math.floor(limit)));
}

export type BeginnerEvaluationInput = Pick<
  OccupationSearchRecord,
  "name" | "aptitude" | "skillImages" | "roleplayTip"
>;

function compactRoleplayTip(value: string, maxLength = 46): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  const characters = Array.from(normalized);
  return characters.length <= maxLength
    ? normalized
    : `${characters.slice(0, maxLength).join("")}…`;
}

/** 職業固有の技能とRPヒントを使い、初心者おすすめ評価の読み方を説明します。 */
export function getBeginnerEvaluationReason(
  occupation: BeginnerEvaluationInput,
): string {
  const rating = occupation.aptitude.beginnerFriendly;
  const skills = occupation.skillImages.filter(Boolean).slice(0, 2);
  const skillPhrase =
    skills.length > 0 ? `${skills.join("・")}を役割の軸にでき` : "得意分野を役割の軸にでき";
  const tip = compactRoleplayTip(occupation.roleplayTip);

  const evaluation =
    rating === 5
      ? "専門知識がなくても職業像からRPを始めやすい"
      : rating === 4
        ? "基本的な役割像を押さえればRPを組み立てやすい"
        : rating === 3
          ? "仕事内容を少し下調べするとRPへ取り入れやすい"
          : rating === 2
            ? "専門用語や現場の手順を事前に確認すると扱いやすい"
            : "専門性や特殊な立場の再現に準備が必要なため、経験者向き";
  const tipPhrase = tip ? ` RPの出発点は「${tip}」。` : "";

  return `${occupation.name}は初心者おすすめ${rating}/5。${skillPhrase}、${evaluation}職業です。${tipPhrase}`.trim();
}
