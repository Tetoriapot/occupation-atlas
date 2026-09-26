import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const occupationDirectory = join(process.cwd(), "data", "occupations");

const categoryMoves = {
  "event-planner": "hospitality",
  "food-coordinator": "media",
  "location-coordinator": "media",
  "video-editor": "media",
  proofreader: "media",
  interpreter: "other",
  translator: "other",
  "funeral-director": "hospitality",
};

const fieldKeywordAdditions = {
  "event-planner": ["催事企画者", "イベント制作", "接客", "フリーランス"],
  "food-coordinator": ["食の演出家", "フードビジネス", "広告制作", "フリーランス"],
  "location-coordinator": ["ロケーションマネージャー", "映像制作", "制作会社", "フリーランス"],
  "video-editor": ["映像制作", "制作会社", "フリーランス"],
  proofreader: ["出版", "出版社", "制作会社", "フリーランス"],
  interpreter: ["会議通訳者", "言語サービス", "国際業務", "企業内通訳", "フリーランス"],
  translator: ["実務翻訳者", "言語サービス", "翻訳会社", "企業内翻訳", "フリーランス"],
  "freelance-writer": ["独立就業", "個人事業", "出版", "メディア"],
  "independent-consultant": ["フリーランス", "独立就業", "個人事業"],
  "funeral-director": ["接客", "冠婚葬祭", "葬祭サービス"],
  "audio-engineer": ["音響制作"],
  "video-director": ["映像監督"],
  "news-photographer": ["報道撮影者"],
  "special-cleaning-worker": ["原状回復作業員"],
  "zoo-keeper": ["飼育スタッフ"],
  fisher: ["水産業", "沿岸漁業", "農林水産"],
  "aquaculture-worker": ["水産業", "漁業", "農林水産"],
  "forestry-worker": ["林産業", "森林管理", "農林水産"],
  farmer: ["耕種農業", "農林水産"],
  "livestock-farmer": ["農林水産"],
  "dairy-farmer": ["農林水産"],
  beekeeper: ["農林水産"],
  "agricultural-machinery-mechanic": ["農機整備", "農林水産"],
  "agricultural-extension-advisor": ["地方公務員", "農林水産"],
};

const aliasReplacements = {
  "event-planner": [],
  "food-coordinator": [],
  "location-coordinator": ["ロケコーディネーター"],
  interpreter: ["通訳"],
  translator: ["翻訳家"],
  "audio-engineer": ["音響エンジニア"],
  "video-director": [],
  "special-cleaning-worker": ["特殊清掃作業員"],
  "zoo-keeper": ["動物飼育員"],
};

const keywordRemovals = {
  "private-investigator": ["調査員"],
};

const relatedReplacements = {
  fisher: [
    "aquaculture-worker",
    "marine-biologist",
    "ship-deck-officer",
    "coast-guard-officer",
  ],
  "agricultural-extension-advisor": [
    "farmer",
    "life-science-researcher",
    "prefectural-government-official",
    "livestock-farmer",
  ],
  "forestry-worker": [
    "farmer",
    "carpenter",
    "mountain-guide",
    "park-ranger",
  ],
  interpreter: [
    "translator",
    "diplomat",
    "tour-conductor",
    "broadcaster-announcer",
  ],
  "animal-trainer": [
    "pet-groomer",
    "animal-breeder",
    "zoo-keeper",
    "veterinarian",
  ],
  "antique-dealer": [
    "museum-curator",
    "archivist",
    "private-investigator",
    "retail-sales-associate",
  ],
  "funeral-director": [
    "buddhist-priest",
    "religious-corporation-administrator",
    "event-planner",
    "special-cleaning-worker",
  ],
};

const searchFacetReplacements = {
  "event-planner": {
    eras: ["showa"],
    regions: ["fictional"],
    situations: ["closed", "hotel", "courtroom", "event", "everyday"],
  },
  interpreter: {
    eras: ["showa"],
    regions: ["mountain", "fictional"],
    situations: ["closed", "hospital", "aviation", "transport", "event"],
  },
  "animal-breeder": {
    eras: ["meiji-19c"],
    regions: ["overseas", "urban"],
    situations: ["closed", "hospital", "mansion", "outdoors", "event", "residential", "everyday"],
  },
  "security-guard": {
    eras: ["showa"],
    regions: ["urban", "fictional"],
    situations: ["closed", "museum", "disaster", "research-facility"],
  },
  "agricultural-machinery-mechanic": {
    eras: ["near-future"],
    regions: ["space", "fictional"],
    situations: ["outdoors", "disaster", "everyday"],
  },
  proofreader: {
    eras: ["taisho-1920s"],
    regions: ["japan", "urban"],
    situations: ["office", "everyday"],
  },
  editor: {
    eras: ["taisho-1920s"],
    regions: ["urban", "fictional"],
    situations: ["museum", "outdoors", "criminal-case", "office", "everyday"],
  },
  "broadcaster-announcer": {
    eras: ["taisho-1920s"],
    regions: ["mountain", "fictional"],
    situations: ["disaster", "event", "office"],
  },
};

const mediaSlugs = new Set([
  "audio-engineer",
  "broadcast-engineer",
  "broadcaster-announcer",
  "copywriter",
  "editor",
  "fact-checker",
  "journalist",
  "news-photographer",
  "radio-director",
  "talent-manager",
  "television-producer",
  "video-content-creator",
  "video-director",
  "location-coordinator",
  "video-editor",
  "proofreader",
  "food-coordinator",
]);

const agricultureSlugs = new Set([
  "agricultural-extension-advisor",
  "agricultural-machinery-mechanic",
  "aquaculture-worker",
  "beekeeper",
  "dairy-farmer",
  "farmer",
  "fisher",
  "forestry-worker",
  "livestock-farmer",
]);

function unique(values) {
  return [...new Set(values)];
}

function findJsonValueEnd(raw, start) {
  let index = start;
  while (/\s/u.test(raw[index] ?? "")) index += 1;
  const opening = raw[index];
  const closing = opening === "{" ? "}" : opening === "[" ? "]" : null;

  if (closing) {
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
      else if (character === opening) depth += 1;
      else if (character === closing) {
        depth -= 1;
        if (depth === 0) return index + 1;
      }
    }
  }

  if (opening === "\"") {
    let escaped = false;
    for (index += 1; index < raw.length; index += 1) {
      const character = raw[index];
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === "\"") return index + 1;
    }
  }

  throw new Error("JSON値の終端を特定できません");
}

function replaceTopLevelProperty(raw, key, value) {
  const propertyToken = `"${key}":`;
  const propertyIndex = raw.indexOf(propertyToken);
  if (propertyIndex < 0) throw new Error(`${key}: 更新対象が見つかりません`);
  const valueStart = propertyIndex + propertyToken.length;
  const valueEnd = findJsonValueEnd(raw, valueStart);
  const serialized = JSON.stringify(value);
  return `${raw.slice(0, valueStart)} ${serialized}${raw.slice(valueEnd)}`;
}

const targetSlugs = new Set([
  ...Object.keys(categoryMoves),
  ...Object.keys(fieldKeywordAdditions),
  ...Object.keys(aliasReplacements),
  ...Object.keys(keywordRemovals),
  ...Object.keys(relatedReplacements),
  ...Object.keys(searchFacetReplacements),
  ...mediaSlugs,
  ...agricultureSlugs,
]);

for (const slug of [...targetSlugs].sort()) {
  const path = join(occupationDirectory, `${slug}.json`);
  let raw = await readFile(path, "utf8");
  const occupation = JSON.parse(raw);

  const categoryId = categoryMoves[slug] ?? occupation.categoryId;
  const aliases = aliasReplacements[slug] ?? occupation.aliases;
  const additions = [
    ...(fieldKeywordAdditions[slug] ?? []),
    ...(mediaSlugs.has(slug) ? ["メディア", "マスコミ"] : []),
    ...(agricultureSlugs.has(slug) ? ["農林水産"] : []),
  ];
  const removals = new Set(keywordRemovals[slug] ?? []);
  const keywords = unique(
    [...occupation.keywords, ...additions]
      .filter((keyword) => !removals.has(keyword))
      .filter((keyword) => keyword !== occupation.name && !aliases.includes(keyword)),
  );
  const relatedOccupationSlugs =
    relatedReplacements[slug] ?? occupation.relatedOccupationSlugs;
  const searchFacets = searchFacetReplacements[slug] ?? occupation.searchFacets;

  if (categoryId !== occupation.categoryId) {
    raw = replaceTopLevelProperty(raw, "categoryId", categoryId);
  }
  if (JSON.stringify(aliases) !== JSON.stringify(occupation.aliases)) {
    raw = replaceTopLevelProperty(raw, "aliases", aliases);
  }
  if (JSON.stringify(keywords) !== JSON.stringify(occupation.keywords)) {
    raw = replaceTopLevelProperty(raw, "keywords", keywords);
  }
  if (
    JSON.stringify(relatedOccupationSlugs)
    !== JSON.stringify(occupation.relatedOccupationSlugs)
  ) {
    raw = replaceTopLevelProperty(
      raw,
      "relatedOccupationSlugs",
      relatedOccupationSlugs,
    );
  }
  if (JSON.stringify(searchFacets) !== JSON.stringify(occupation.searchFacets)) {
    raw = replaceTopLevelProperty(raw, "searchFacets", searchFacets);
  }

  await writeFile(path, raw.endsWith("\n") ? raw : `${raw}\n`, "utf8");
}

console.log(
  `P2カテゴリー監査: ${targetSlugs.size}職の分類・検索補助語・関連導線を更新しました。`,
);
