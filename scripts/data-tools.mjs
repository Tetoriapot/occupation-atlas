import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const occupationLabelSeparators = /[\p{White_Space}\p{Punctuation}\p{Symbol}]/gu;

export const searchFacetIdsByKey = Object.freeze({
  eras: Object.freeze([
    "modern",
    "taisho-1920s",
    "meiji-19c",
    "showa",
    "premodern",
    "near-future",
    "far-future",
    "fictional-era",
  ]),
  regions: Object.freeze([
    "japan",
    "overseas",
    "urban",
    "rural",
    "mountain",
    "island",
    "maritime",
    "polar",
    "space",
    "fictional",
  ]),
  situations: Object.freeze([
    "closed",
    "school",
    "hospital",
    "museum",
    "hotel",
    "mansion",
    "ruins",
    "outdoors",
    "urban",
    "disaster",
    "criminal-case",
    "courtroom",
    "maritime",
    "aviation",
    "space",
    "research-facility",
    "factory",
    "religious-site",
    "transport",
    "event",
    "office",
    "residential",
    "everyday",
  ]),
});

export const aptitudeKeys = Object.freeze([
  "investigation",
  "negotiation",
  "combat",
  "infiltration",
  "support",
  "knowledge",
  "beginnerFriendly",
]);

export const sourceTypes = Object.freeze([
  "government",
  "education-research",
  "professional-organization",
  "public-information",
]);

export const sourceSupports = Object.freeze([
  "responsibilities",
  "qualifications",
  "education",
  "workStyle",
  "annualIncome",
]);

export const ambiguousOccupationAliases = Object.freeze([
  "エンジニア",
  "クリエイター",
  "コーチ",
  "スタッフ",
  "デザイナー",
  "パイロット",
  "公務員",
  "作家",
  "作業員",
  "先生",
  "学生",
  "店員",
  "技術者",
  "担当者",
  "教師",
  "教員",
  "監督",
  "研究者",
  "職員",
  "警察官",
  "調査員",
  "選手",
]);

/**
 * 表示上の揺れだけが異なる職業名・別名を同一視するための正規化です。
 * NFKCで全角英数などを揃え、大小文字、空白、区切り記号の差を除きます。
 */
export function normalizeOccupationLabel(value) {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ja-JP")
    .replace(occupationLabelSeparators, "");
}

const ambiguousOccupationAliasKeys = new Set(
  ambiguousOccupationAliases.map(normalizeOccupationLabel),
);

const requiredString = (value, path, errors) => {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${path} は空でない文字列である必要があります`);
  }
};

const stringArray = (value, path, errors, { allowEmpty = false, unique = false } = {}) => {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    errors.push(`${path} は${allowEmpty ? "" : "1件以上の"}配列である必要があります`);
    return;
  }
  value.forEach((item, index) => requiredString(item, `${path}[${index}]`, errors));
  if (unique) {
    const normalized = value
      .filter((item) => typeof item === "string")
      .map((item) => item.trim());
    if (new Set(normalized).size !== normalized.length) {
      errors.push(`${path} に重複した値は登録できません`);
    }
  }
};

const isIsoDate = (value) => {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

export function requiredAptitudeReasonKeys(aptitude) {
  if (!aptitude || typeof aptitude !== "object") return [];
  const rankedHigh = aptitudeKeys
    .map((key, index) => ({ key, index, value: aptitude[key] }))
    .filter(({ value }) => Number.isInteger(value))
    .sort((left, right) => right.value - left.value || left.index - right.index);
  if (rankedHigh.length !== aptitudeKeys.length) return [];

  const selected = new Set(rankedHigh.slice(0, 2).map(({ key }) => key));
  const rankedLow = [...rankedHigh].sort(
    (left, right) => left.value - right.value || right.index - left.index,
  );
  const low = rankedLow.find(({ key }) => !selected.has(key)) ?? rankedLow[0];
  selected.add(low.key);
  return [...selected];
}

export function validateOccupation(value, fileName = "unknown.json") {
  const errors = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [`${fileName}: ルートはオブジェクトである必要があります`];
  }

  for (const key of ["id", "slug", "name", "categoryId", "catchphrase", "shortDescription"]) {
    requiredString(value[key], `${fileName}.${key}`, errors);
  }
  if (typeof value.slug === "string" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug)) {
    errors.push(`${fileName}.slug は英小文字・数字・ハイフンだけを使用してください`);
  }

  stringArray(value.aliases, `${fileName}.aliases`, errors, { allowEmpty: true });
  if (Array.isArray(value.aliases)) {
    if (value.aliases.length > 3) {
      errors.push(`${fileName}.aliases は3件以内にしてください。広義語・資格名・担当分野はkeywordsへ登録してください`);
    }
    const nameKey = normalizeOccupationLabel(value.name);
    const registeredAliases = new Map();

    value.aliases.forEach((alias, index) => {
      if (typeof alias !== "string" || alias.trim() === "") return;
      const aliasKey = normalizeOccupationLabel(alias);
      if (aliasKey === nameKey) {
        errors.push(
          `${fileName}.aliases[${index}]「${alias}」は職業名「${value.name}」と表記正規化後に重複しています`,
        );
      }

      const previousIndex = registeredAliases.get(aliasKey);
      if (previousIndex !== undefined) {
        errors.push(
          `${fileName}.aliases[${index}]「${alias}」はaliases[${previousIndex}]と表記正規化後に重複しています`,
        );
      } else {
        registeredAliases.set(aliasKey, index);
      }

      if (ambiguousOccupationAliasKeys.has(aliasKey)) {
        errors.push(
          `${fileName}.aliases[${index}]「${alias}」は複数職業を指し得る汎用語です。検索語として必要な場合はkeywordsへ登録してください`,
        );
      }
    });
  }
  stringArray(value.keywords, `${fileName}.keywords`, errors);
  if (Array.isArray(value.keywords)) {
    const registeredLabels = new Map();
    if (typeof value.name === "string" && value.name.trim() !== "") {
      registeredLabels.set(normalizeOccupationLabel(value.name), `職業名「${value.name}」`);
    }
    if (Array.isArray(value.aliases)) {
      value.aliases.forEach((alias, index) => {
        if (typeof alias === "string" && alias.trim() !== "") {
          const aliasKey = normalizeOccupationLabel(alias);
          if (!registeredLabels.has(aliasKey)) {
            registeredLabels.set(aliasKey, `aliases[${index}]「${alias}」`);
          }
        }
      });
    }

    value.keywords.forEach((keyword, index) => {
      if (typeof keyword !== "string" || keyword.trim() === "") return;
      const keywordKey = normalizeOccupationLabel(keyword);
      const previous = registeredLabels.get(keywordKey);
      if (previous) {
        errors.push(
          `${fileName}.keywords[${index}]「${keyword}」は${previous}と表記正規化後に重複しています`,
        );
      } else {
        registeredLabels.set(keywordKey, `keywords[${index}]「${keyword}」`);
      }
    });
  }

  const searchFacets = value.searchFacets;
  if (!searchFacets || typeof searchFacets !== "object" || Array.isArray(searchFacets)) {
    errors.push(`${fileName}.searchFacets はオブジェクトである必要があります`);
  } else {
    for (const [key, allowedIds] of Object.entries(searchFacetIdsByKey)) {
      stringArray(searchFacets[key], `${fileName}.searchFacets.${key}`, errors, {
        unique: true,
      });
      if (Array.isArray(searchFacets[key])) {
        const allowed = new Set(allowedIds);
        searchFacets[key].forEach((id, index) => {
          if (typeof id === "string" && !allowed.has(id)) {
            errors.push(
              `${fileName}.searchFacets.${key}[${index}]「${id}」は登録済みのIDではありません`,
            );
          }
        });
      }
    }
  }

  const setting = value.setting;
  if (!setting || typeof setting !== "object" || Array.isArray(setting)) {
    errors.push(`${fileName}.setting はオブジェクトである必要があります`);
  } else {
    stringArray(setting.eras, `${fileName}.setting.eras`, errors, { unique: true });
    stringArray(setting.regions, `${fileName}.setting.regions`, errors, { unique: true });
    requiredString(setting.note, `${fileName}.setting.note`, errors);
    if (Array.isArray(setting.eras) && !setting.eras.includes("現代")) {
      errors.push(`${fileName}.setting.eras には「現代」が必要です`);
    }
    if (Array.isArray(setting.regions) && !setting.regions.includes("日本")) {
      errors.push(`${fileName}.setting.regions には「日本」が必要です`);
    }
  }

  const overview = value.overview;
  if (!overview || typeof overview !== "object") {
    errors.push(`${fileName}.overview が必要です`);
  } else {
    for (const key of ["responsibilities", "typicalPeople", "qualifications", "education", "workStyle", "suitableFor"]) {
      stringArray(overview[key], `${fileName}.overview.${key}`, errors);
    }
    if (Array.isArray(overview.responsibilities) && overview.responsibilities.length < 2) {
      errors.push(`${fileName}.overview.responsibilities は2件以上必要です`);
    }
    if (Array.isArray(overview.suitableFor) && overview.suitableFor.length < 2) {
      errors.push(`${fileName}.overview.suitableFor は2件以上必要です`);
    }
    if (!Array.isArray(overview.dailySchedule) || overview.dailySchedule.length < 3) {
      errors.push(`${fileName}.overview.dailySchedule は3件以上必要です`);
    } else {
      overview.dailySchedule.forEach((item, index) => {
        for (const key of ["time", "title", "description"]) {
          requiredString(item?.[key], `${fileName}.overview.dailySchedule[${index}].${key}`, errors);
        }
      });
    }
    requiredString(overview.annualIncome?.summary, `${fileName}.overview.annualIncome.summary`, errors);
    requiredString(overview.annualIncome?.note, `${fileName}.overview.annualIncome.note`, errors);
  }

  const creative = value.creative;
  if (!creative || typeof creative !== "object") {
    errors.push(`${fileName}.creative が必要です`);
  } else {
    for (const key of [
      "investigatorFeatures",
      "likelyKnowledge",
      "roleplayTips",
      "personalityExamples",
      "everydayEvents",
      "scenarioHooks",
      "commonCharacterSettings",
    ]) {
      stringArray(creative[key], `${fileName}.creative.${key}`, errors);
    }
  }

  if (!Array.isArray(value.creativeIdeas) || value.creativeIdeas.length < 2) {
    errors.push(`${fileName}.creativeIdeas は2件以上の配列である必要があります`);
  } else {
    const ideaTitles = [];
    value.creativeIdeas.forEach((idea, index) => {
      if (!idea || typeof idea !== "object" || Array.isArray(idea)) {
        errors.push(`${fileName}.creativeIdeas[${index}] はオブジェクトである必要があります`);
        return;
      }
      for (const key of ["title", "summary", "era", "region"]) {
        requiredString(idea[key], `${fileName}.creativeIdeas[${index}].${key}`, errors);
      }
      if (typeof idea.title === "string" && idea.title.trim() !== "") {
        ideaTitles.push(idea.title.trim());
      }
    });
    if (new Set(ideaTitles).size !== ideaTitles.length) {
      errors.push(`${fileName}.creativeIdeas のtitleに重複があります`);
    }
    if (!value.creativeIdeas.some((idea) => idea?.era === "現代" && idea?.region === "日本")) {
      errors.push(`${fileName}.creativeIdeas には現代日本の創作案が必要です`);
    }
    if (!value.creativeIdeas.some((idea) => idea?.era !== "現代" || idea?.region !== "日本")) {
      errors.push(`${fileName}.creativeIdeas には現代日本以外の創作案が必要です`);
    }
  }

  if (!Array.isArray(value.scenarioSituations) || value.scenarioSituations.length < 3) {
    errors.push(`${fileName}.scenarioSituations は3件以上の配列である必要があります`);
  } else {
    const situationTitles = [];
    value.scenarioSituations.forEach((situation, index) => {
      if (!situation || typeof situation !== "object" || Array.isArray(situation)) {
        errors.push(`${fileName}.scenarioSituations[${index}] はオブジェクトである必要があります`);
        return;
      }
      requiredString(situation.title, `${fileName}.scenarioSituations[${index}].title`, errors);
      requiredString(situation.reason, `${fileName}.scenarioSituations[${index}].reason`, errors);
      if (typeof situation.title === "string" && situation.title.trim() !== "") {
        situationTitles.push(situation.title.trim());
      }
      if (typeof situation.reason === "string" && situation.reason.trim().length < 20) {
        errors.push(`${fileName}.scenarioSituations[${index}].reason は活躍理由が分かる20文字以上の文章にしてください`);
      }
    });
    if (new Set(situationTitles).size !== situationTitles.length) {
      errors.push(`${fileName}.scenarioSituations のtitleに重複があります`);
    }
  }

  const aptitude = value.aptitude;
  if (!aptitude || typeof aptitude !== "object") {
    errors.push(`${fileName}.aptitude が必要です`);
  } else {
    for (const key of aptitudeKeys) {
      if (!Number.isInteger(aptitude[key]) || aptitude[key] < 1 || aptitude[key] > 5) {
        errors.push(`${fileName}.aptitude.${key} は1〜5の整数である必要があります`);
      }
    }
  }

  const aptitudeReasons = value.aptitudeReasons;
  if (
    !aptitudeReasons ||
    typeof aptitudeReasons !== "object" ||
    Array.isArray(aptitudeReasons)
  ) {
    errors.push(`${fileName}.aptitudeReasons はオブジェクトである必要があります`);
  } else {
    const registeredReasons = new Set();
    for (const [key, reason] of Object.entries(aptitudeReasons)) {
      if (!aptitudeKeys.includes(key)) {
        errors.push(`${fileName}.aptitudeReasons.${key} は登録済みの適性キーではありません`);
        continue;
      }
      requiredString(reason, `${fileName}.aptitudeReasons.${key}`, errors);
      if (typeof reason === "string" && reason.trim().length < 20) {
        errors.push(`${fileName}.aptitudeReasons.${key} は20文字以上の職業固有の理由にしてください`);
      }
      if (typeof reason === "string" && registeredReasons.has(reason.trim())) {
        errors.push(`${fileName}.aptitudeReasons 内で同じ理由を使い回さないでください`);
      }
      if (typeof reason === "string") registeredReasons.add(reason.trim());
    }
    for (const key of requiredAptitudeReasonKeys(aptitude)) {
      if (typeof aptitudeReasons[key] !== "string" || aptitudeReasons[key].trim() === "") {
        errors.push(
          `${fileName}.aptitudeReasons.${key} は上位2項目または相対的に低い項目のため必須です`,
        );
      }
    }
  }

  stringArray(value.skillImages, `${fileName}.skillImages`, errors);
  stringArray(value.relatedOccupationSlugs, `${fileName}.relatedOccupationSlugs`, errors, { unique: true });
  if (Array.isArray(value.skillImages) && value.skillImages.length < 5) {
    errors.push(`${fileName}.skillImages は5件以上必要です`);
  }
  if (Array.isArray(value.relatedOccupationSlugs) && value.relatedOccupationSlugs.length < 2) {
    errors.push(`${fileName}.relatedOccupationSlugs は2件以上必要です`);
  }

  if (!value.featured || typeof value.featured !== "object" || Array.isArray(value.featured)) {
    errors.push(`${fileName}.featured はオブジェクトである必要があります`);
  } else {
    for (const key of ["popularRank", "recommendedRank"]) {
      if (value.featured[key] !== undefined && (!Number.isInteger(value.featured[key]) || value.featured[key] < 1)) {
        errors.push(`${fileName}.featured.${key} は正の整数である必要があります`);
      }
    }
  }

  if (!Array.isArray(value.sources)) {
    errors.push(`${fileName}.sources は配列である必要があります`);
  } else {
    if (value.sources.length === 0) {
      errors.push(`${fileName}.sources には一次資料を1件以上登録してください`);
    }

    const sourceUrls = new Map();
    value.sources.forEach((source, index) => {
      requiredString(source?.title, `${fileName}.sources[${index}].title`, errors);
      requiredString(source?.url, `${fileName}.sources[${index}].url`, errors);
      if (!sourceTypes.includes(source?.type)) {
        errors.push(
          `${fileName}.sources[${index}].type は登録済みの資料種別である必要があります`,
        );
      }
      stringArray(
        source?.supports,
        `${fileName}.sources[${index}].supports`,
        errors,
        { unique: true },
      );
      if (Array.isArray(source?.supports)) {
        source.supports.forEach((support, supportIndex) => {
          if (!sourceSupports.includes(support)) {
            errors.push(
              `${fileName}.sources[${index}].supports[${supportIndex}]「${support}」は登録済みの対応項目ではありません`,
            );
          }
        });
      }
      try {
        const url = new URL(source?.url);
        if (!/^https?:$/.test(url.protocol)) throw new Error("protocol");
        const existingIndex = sourceUrls.get(url.href);
        if (existingIndex !== undefined) {
          errors.push(
            `${fileName}.sources[${index}].url はsources[${existingIndex}].urlと重複しています`,
          );
        } else {
          sourceUrls.set(url.href, index);
        }
      } catch {
        errors.push(`${fileName}.sources[${index}].url は有効なHTTP(S) URLである必要があります`);
      }
    });

    const incomeSummary = value.overview?.annualIncome?.summary;
    if (
      typeof incomeSummary === "string" &&
      /\d[\d,.]*(?:万)?円/u.test(incomeSummary) &&
      !value.sources.some(
        (source) =>
          Array.isArray(source?.supports) && source.supports.includes("annualIncome"),
      )
    ) {
      errors.push(
        `${fileName}.overview.annualIncome.summary の具体額にはannualIncomeを裏付ける資料が必要です`,
      );
    }
  }

  for (const key of ["publishedAt", "updatedAt", "lastReviewedAt"]) {
    if (!isIsoDate(value[key])) errors.push(`${fileName}.${key} はYYYY-MM-DD形式の有効な日付である必要があります`);
  }
  if (isIsoDate(value.publishedAt) && isIsoDate(value.updatedAt) && value.publishedAt > value.updatedAt) {
    errors.push(`${fileName}.updatedAt はpublishedAt以後の日付にしてください`);
  }
  if (isIsoDate(value.updatedAt) && isIsoDate(value.lastReviewedAt) && value.updatedAt > value.lastReviewedAt) {
    errors.push(`${fileName}.lastReviewedAt はupdatedAt以後の日付にしてください`);
  }

  return errors;
}

export async function loadCategories(root = process.cwd()) {
  const raw = await readFile(join(root, "data", "categories.json"), "utf8");
  const categories = JSON.parse(raw);
  if (!Array.isArray(categories)) throw new Error("categories.json は配列である必要があります");
  return categories;
}

export async function loadOccupationFiles(root = process.cwd()) {
  const directory = join(root, "data", "occupations");
  const files = (await readdir(directory)).filter((file) => file.endsWith(".json")).sort();
  return Promise.all(
    files.map(async (file) => ({
      file,
      value: JSON.parse(await readFile(join(directory, file), "utf8")),
    })),
  );
}

export function validateDataset(records, categories) {
  const errors = records.flatMap(({ file, value }) => validateOccupation(value, file));
  const categoryIds = new Set(categories.map((category) => category.id));
  const slugs = new Set();
  const ids = new Set();
  const creativeIdeaTitles = new Map();
  const creativeIdeaSummaries = new Map();
  const scenarioReasons = new Map();
  const occupationLabels = new Map();
  const authoredTexts = new Map();

  for (const { file, value } of records) {
    if (ids.has(value.id)) errors.push(`${file}: id「${value.id}」が重複しています`);
    if (slugs.has(value.slug)) errors.push(`${file}: slug「${value.slug}」が重複しています`);
    ids.add(value.id);
    slugs.add(value.slug);
    if (!categoryIds.has(value.categoryId)) errors.push(`${file}: categoryId「${value.categoryId}」が存在しません`);
    if (typeof value.slug === "string" && file !== `${value.slug}.json`) {
      errors.push(`${file}: ファイル名はslugに合わせて「${value.slug}.json」にしてください`);
    }

    const labels = [
      { field: "name", label: value.name },
      ...(Array.isArray(value.aliases)
        ? value.aliases.map((label, index) => ({ field: `aliases[${index}]`, label }))
        : []),
    ];
    for (const { field, label } of labels) {
      if (typeof label !== "string" || label.trim() === "") continue;
      const labelKey = normalizeOccupationLabel(label);
      const existing = occupationLabels.get(labelKey);
      if (existing && existing.file !== file) {
        errors.push(
          `${file}.${field}「${label}」は${existing.file}.${existing.field}「${existing.label}」と表記正規化後に衝突しています`,
        );
      } else if (!existing) {
        occupationLabels.set(labelKey, { file, field, label });
      }
    }

    for (const idea of value.creativeIdeas ?? []) {
      if (typeof idea?.title === "string" && idea.title.trim() !== "") {
        const title = idea.title.trim();
        const existingFile = creativeIdeaTitles.get(title);
        if (existingFile) {
          errors.push(`${file}: creativeIdeasのtitle「${title}」が${existingFile}と重複しています`);
        } else {
          creativeIdeaTitles.set(title, file);
        }
      }
      if (typeof idea?.summary === "string" && idea.summary.trim() !== "") {
        const summary = idea.summary.trim();
        const existingFile = creativeIdeaSummaries.get(summary);
        if (existingFile) {
          errors.push(`${file}: creativeIdeasのsummaryが${existingFile}と重複しています`);
        } else {
          creativeIdeaSummaries.set(summary, file);
        }
      }
    }

    for (const situation of value.scenarioSituations ?? []) {
      if (typeof situation?.reason !== "string" || situation.reason.trim() === "") continue;
      const reason = situation.reason.trim();
      const existingFile = scenarioReasons.get(reason);
      if (existingFile) {
        errors.push(`${file}: scenarioSituationsのreasonが${existingFile}と重複しています`);
      } else {
        scenarioReasons.set(reason, file);
      }
    }

    const occupationTexts = [
      ...(value.overview?.responsibilities ?? []),
      ...(value.overview?.dailySchedule ?? []).map(({ description }) => description),
      ...Object.values(value.creative ?? {}).flat(),
      ...(value.scenarioSituations ?? []).map(({ reason }) => reason),
    ];
    for (const text of occupationTexts) {
      if (typeof text !== "string" || text.trim().length < 12) continue;
      const normalized = text.trim();
      const existingFile = authoredTexts.get(normalized);
      if (existingFile && existingFile !== file) {
        errors.push(
          `${file}: 12文字以上の本文が${existingFile}と完全一致しています`,
        );
      } else if (!existingFile) {
        authoredTexts.set(normalized, file);
      }
    }
  }

  for (const { file, value } of records) {
    for (const relatedSlug of value.relatedOccupationSlugs ?? []) {
      if (!slugs.has(relatedSlug)) errors.push(`${file}: 関連職業「${relatedSlug}」が存在しません`);
      if (relatedSlug === value.slug) errors.push(`${file}: 自分自身を関連職業には指定できません`);
    }
  }

  return errors;
}
