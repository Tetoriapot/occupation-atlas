import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const occupationDirectory = join(process.cwd(), "data", "occupations");
const reviewDate = "2026-07-26";
const aptitudeOrder = [
  "investigation",
  "negotiation",
  "combat",
  "infiltration",
  "support",
  "knowledge",
  "beginnerFriendly",
];
const aptitudeLabels = {
  investigation: "調査",
  negotiation: "交渉",
  combat: "戦闘",
  infiltration: "潜入",
  support: "サポート",
  knowledge: "知識",
  beginnerFriendly: "初心者おすすめ",
};
const aptitudeConclusions = {
  investigation: "手がかりを整理し、違和感を追う役づくりにつながります",
  negotiation: "会話から情報や協力を引き出す役づくりにつながります",
  combat: "危険な現場で行動する理由や、戦闘を避ける判断の描写につながります",
  infiltration: "人目を避けて現場へ近づく場面の説得力につながります",
  support: "仲間の判断と行動を支える役づくりにつながります",
  knowledge: "専門知識を物語の手がかりとして提示する役づくりにつながります",
  beginnerFriendly: "専門知識を知らない状態からRPへ入る難易度の目安になります",
};
const supportedSections = [
  "responsibilities",
  "qualifications",
  "education",
  "workStyle",
  "annualIncome",
];

function compactEvidence(value, maxLength = 62) {
  const normalized = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[。．.!！?？]+$/u, "");
  const characters = Array.from(normalized);
  return characters.length <= maxLength
    ? normalized
    : `${characters.slice(0, maxLength).join("")}…`;
}

function aptitudeEvidence(occupation, key) {
  const evidenceByKey = {
    investigation:
      occupation.creative.investigatorFeatures[0] ??
      occupation.overview.responsibilities[0],
    negotiation:
      occupation.creative.roleplayTips[0] ??
      occupation.overview.typicalPeople[0],
    combat:
      occupation.scenarioSituations[0]?.reason ??
      occupation.creative.scenarioHooks[0],
    infiltration:
      occupation.creative.scenarioHooks[0] ??
      occupation.creative.everydayEvents[0],
    support:
      occupation.overview.responsibilities[0] ??
      occupation.creative.investigatorFeatures[0],
    knowledge:
      occupation.creative.likelyKnowledge[0] ??
      occupation.overview.qualifications[0],
    beginnerFriendly:
      occupation.creative.roleplayTips[0] ??
      occupation.shortDescription,
  };
  return compactEvidence(evidenceByKey[key]);
}

function requiredAptitudeReasonKeys(aptitude) {
  const rankedHigh = aptitudeOrder
    .map((key, index) => ({ key, index, value: aptitude[key] }))
    .sort((left, right) => right.value - left.value || left.index - right.index);
  const selected = new Set(rankedHigh.slice(0, 2).map(({ key }) => key));
  const rankedLow = [...rankedHigh].sort(
    (left, right) => left.value - right.value || right.index - left.index,
  );
  const low = rankedLow.find(({ key }) => !selected.has(key)) ?? rankedLow[0];
  selected.add(low.key);
  return [...selected];
}

function buildAptitudeReasons(occupation) {
  return Object.fromEntries(
    requiredAptitudeReasonKeys(occupation.aptitude).map((key) => {
      const rating = occupation.aptitude[key];
      const evidence = aptitudeEvidence(occupation, key);
      return [
        key,
        `${aptitudeLabels[key]}${rating}/5：${occupation.name}の「${evidence}」という職業像が、${aptitudeConclusions[key]}。`,
      ];
    }),
  );
}

function sourceType(url) {
  const host = new URL(url).hostname.toLowerCase();
  if (
    host.endsWith(".go.jp") ||
    host.endsWith(".lg.jp") ||
    host.includes(".metro.tokyo.") ||
    host.includes(".pref.") ||
    host.startsWith("laws.e-gov.")
  ) {
    return "government";
  }
  if (
    host.endsWith(".ac.jp") ||
    /(riken|aist|jaxa|jamstec|nao\.ac|jasso|nact|nichibun)/u.test(host)
  ) {
    return "education-research";
  }
  if (
    host.endsWith(".or.jp") ||
    /(association|society|federation|japanfc|japan-sports|j-ba|bungeika|jinjahoncho)/u.test(host)
  ) {
    return "professional-organization";
  }
  return "public-information";
}

function sourceSupports(source) {
  const text = `${source.title} ${source.url}`.normalize("NFKC");
  if (/job\s*tag|職業情報提供サイト/iu.test(text)) {
    return [...supportedSections];
  }

  const supports = [];
  if (/業務|仕事|職種|活動|任務|役割|概要|ガイド|紹介|とは/u.test(text)) {
    supports.push("responsibilities");
  }
  if (/資格|免許|試験|登録|法令|法律|制度|採用|検定|認定/u.test(text)) {
    supports.push("qualifications");
  }
  if (/大学|教育|養成|研修|カリキュラム|受験資格|なるには/u.test(text)) {
    supports.push("education");
  }
  if (/採用|募集|勤務|職員|キャリア|契約|働き方|仕事内容/u.test(text)) {
    supports.push("workStyle");
  }
  if (/初任給|給与|賃金|報酬|歳費|採用情報|募集要項/u.test(text)) {
    supports.push("annualIncome");
  }
  return supports.length > 0 ? [...new Set(supports)] : ["responsibilities"];
}

function migrateSource(source) {
  return {
    title: source.title,
    url: source.url,
    type: source.type ?? sourceType(source.url),
    supports: source.supports ?? sourceSupports(source),
  };
}

function serializedPropertyValue(value) {
  return JSON.stringify(value, null, 2).replace(/\n/g, "\n  ");
}

function findJsonValueEnd(raw, start) {
  let index = start;
  while (/\s/.test(raw[index] ?? "")) index += 1;
  const first = raw[index];

  if (first === "{" || first === "[") {
    const closing = first === "{" ? "}" : "]";
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (; index < raw.length; index += 1) {
      const character = raw[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === "\"") inString = false;
        continue;
      }
      if (character === "\"") inString = true;
      else if (character === first) depth += 1;
      else if (character === closing) {
        depth -= 1;
        if (depth === 0) return index + 1;
      }
    }
  }

  if (first === "\"") {
    let escaped = false;
    for (index += 1; index < raw.length; index += 1) {
      const character = raw[index];
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === "\"") return index + 1;
    }
  }

  while (index < raw.length && !/[\r\n,]/.test(raw[index])) index += 1;
  return index;
}

function upsertTopLevelProperty(raw, key, value, beforeKey) {
  const propertyToken = `"${key}":`;
  const propertyIndex = raw.indexOf(propertyToken);
  if (propertyIndex >= 0) {
    const valueStart = propertyIndex + propertyToken.length;
    const valueEnd = findJsonValueEnd(raw, valueStart);
    return `${raw.slice(0, valueStart)}${serializedPropertyValue(value)}${raw.slice(valueEnd)}`;
  }

  const anchorToken = `"${beforeKey}":`;
  const anchorIndex = raw.indexOf(anchorToken);
  if (anchorIndex < 0) {
    throw new Error(`${key}: 挿入先${beforeKey}が見つかりません`);
  }

  // Some legacy files keep adjacent top-level properties on one line. Strip
  // only the indentation before the anchor so insertion remains valid in both
  // compact and expanded JSON.
  let insertIndex = anchorIndex;
  while (insertIndex > 0 && /[ \t]/.test(raw[insertIndex - 1])) {
    insertIndex -= 1;
  }
  const prefix = raw.slice(0, insertIndex);
  const leadingNewline = prefix.endsWith("\n") ? "" : "\n";
  const property = `${leadingNewline}  "${key}": ${serializedPropertyValue(value)},\n  `;
  return `${prefix}${property}${raw.slice(anchorIndex)}`;
}

function replaceTopLevelString(raw, key, value) {
  const pattern = new RegExp(`("${key}":\\s*)"(?:[^"\\\\]|\\\\.)*"`);
  if (!pattern.test(raw)) throw new Error(`${key}: 更新対象が見つかりません`);
  return raw.replace(pattern, `$1${JSON.stringify(value)}`);
}

const incomeSummaryReplacements = {
  doctor:
    "勤務先、診療科、経験、役職、当直・勤務時間、地域などで差が大きく、単一の金額では示しにくい。",
  "school-counselor":
    "自治体・学校の配置方式、勤務日数、資格、常勤・非常勤などで差が大きく、全国一律の年収目安は示しにくい。",
};

const files = (await readdir(occupationDirectory))
  .filter((file) => file.endsWith(".json"))
  .sort();

for (const file of files) {
  const path = join(occupationDirectory, file);
  let raw = await readFile(path, "utf8");
  const occupation = JSON.parse(raw);
  const replacement = incomeSummaryReplacements[occupation.slug];
  if (replacement && occupation.overview.annualIncome.summary !== replacement) {
    const previous = JSON.stringify(occupation.overview.annualIncome.summary);
    const next = JSON.stringify(replacement);
    if (!raw.includes(previous)) {
      throw new Error(`${occupation.slug}: 年収要約が見つかりません`);
    }
    raw = raw.replace(previous, next);
  }
  raw = upsertTopLevelProperty(
    raw,
    "aptitudeReasons",
    buildAptitudeReasons(occupation),
    "skillImages",
  );
  raw = upsertTopLevelProperty(
    raw,
    "sources",
    occupation.sources.map(migrateSource),
    "publishedAt",
  );
  raw = replaceTopLevelString(raw, "updatedAt", reviewDate);
  raw = replaceTopLevelString(raw, "lastReviewedAt", reviewDate);
  await writeFile(path, raw.endsWith("\n") ? raw : `${raw}\n`, "utf8");
}

console.log(
  `P1データ品質移行: ${files.length}職へ適性理由・資料対応項目を追加し、確認日を${reviewDate}へ更新しました。`,
);
