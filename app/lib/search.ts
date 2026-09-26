import type { AptitudeKey, Occupation } from "@/app/types/occupation";
import {
  encodeSearchFacets,
  getSearchFacetOption,
  getOccupationSearchFacets,
  isSearchFacetId,
  matchesEncodedSearchFacets,
  searchFacetGroups,
  type SearchFacetKey,
} from "./search-facets.ts";
import type {
  OccupationMatchReason,
  OccupationSearchBaseRecord,
  OccupationSearchIndex,
  OccupationSearchIndexEntry,
  OccupationSearchRecord,
  OccupationSearchSectionKey,
} from "@/app/types/occupation-search";

export type {
  OccupationSearchBaseRecord,
  OccupationSearchIndex,
  OccupationSearchIndexEntry,
  OccupationSearchRecord,
} from "@/app/types/occupation-search";

export type SortOption = "relevance" | "recommended" | "name" | "newest";

export const SEARCH_INPUT_DEBOUNCE_MS = 280;

export type OccupationFilters = {
  query: string;
  category: string;
  skills: string[];
  aptitudes: AptitudeKey[];
  eras: string[];
  regions: string[];
  situations: string[];
  sort: SortOption;
};

export const aptitudeKeys: AptitudeKey[] = [
  "investigation",
  "negotiation",
  "combat",
  "infiltration",
  "support",
  "knowledge",
  "beginnerFriendly",
];

const aptitudeFilterLabels: Record<AptitudeKey, string> = {
  investigation: "調査",
  negotiation: "交渉",
  combat: "戦闘",
  infiltration: "潜入",
  support: "サポート",
  knowledge: "知識",
  beginnerFriendly: "初心者おすすめ",
};

export const defaultFilters: OccupationFilters = {
  query: "",
  category: "",
  skills: [],
  aptitudes: [],
  eras: [],
  regions: [],
  situations: [],
  sort: "recommended",
};

/**
 * デバウンス待機中の検索語を、カテゴリーなどの明示操作と同時に確定する。
 * patch.query が指定された場合は、条件チップの削除など明示的な変更を優先する。
 */
export function mergeFiltersWithQueryDraft(
  current: OccupationFilters,
  queryDraft: string,
  patch: Partial<OccupationFilters>,
): OccupationFilters {
  const next = {
    ...current,
    query: queryDraft,
    ...patch,
  };
  const currentHasQuery = tokenizeSearchQuery(current.query).length > 0;
  const nextHasQuery = tokenizeSearchQuery(next.query).length > 0;

  if (patch.sort === undefined) {
    if (!currentHasQuery && nextHasQuery && current.sort === "recommended") {
      next.sort = "relevance";
    } else if (currentHasQuery && !nextHasQuery && current.sort === "relevance") {
      next.sort = "recommended";
    }
  }

  return next;
}

export type IncomingFilterSyncAction = "apply" | "acknowledge" | "ignore";

/**
 * 同一ページ内の router.replace が前後して届いても、最新のローカル操作を巻き戻さない。
 * 最新の要求URLが届くまでは中間状態を無視し、一致した時点で同期完了とみなす。
 */
export function getIncomingFilterSyncAction(
  pendingSearchParams: string | null,
  incomingSearchParams: string,
  supersededSearchParams: ReadonlySet<string> = new Set(),
): IncomingFilterSyncAction {
  if (pendingSearchParams !== null) {
    return pendingSearchParams === incomingSearchParams ? "acknowledge" : "ignore";
  }
  return supersededSearchParams.has(incomingSearchParams) ? "ignore" : "apply";
}

/**
 * 表記ゆれを吸収する比較用文字列を作る。
 * NFKCで全角英数などをそろえ、日本語ロケールで小文字化し、空白と句読点を除く。
 * 検索語側にも同じ処理を行うため、「UI/UX」「1,500万円」のような表記も照合できる。
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ja")
    .replace(/[\s\p{P}]+/gu, "");
}

/** 空白区切りの検索語を、表記ゆれを吸収した重複なしの語へ変換する。 */
export function tokenizeSearchQuery(value: string): string[] {
  const tokens = value
    .normalize("NFKC")
    .toLocaleLowerCase("ja")
    .trim()
    .split(/\s+/)
    .map(normalizeSearchText)
    .filter(Boolean);

  return [...new Set(tokens)];
}

type StructuredSearchFields = Pick<
  OccupationSearchRecord,
  "name" | "catchphrase" | "shortDescription" | "skillImages" | "roleplayTip"
>;

function structuredSearchText(occupation: StructuredSearchFields): string {
  return normalizeSearchText(
    [
      occupation.name,
      occupation.catchphrase,
      occupation.shortDescription,
      ...occupation.skillImages,
      occupation.roleplayTip,
    ].join(" "),
  );
}

const searchSectionLabels: Record<OccupationSearchSectionKey, string> = {
  identity: "別名・キーワード",
  overview: "職業概要",
  creative: "創作向け情報",
  settingAndScenarios: "時代・地域・シチュエーション",
};

function compactSearchSection(parts: string[], visibleText: string): string {
  const normalizedParts = parts
    .map(normalizeSearchText)
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);
  const uniqueHiddenParts: string[] = [];

  for (const part of normalizedParts) {
    if (visibleText.includes(part)) continue;
    if (uniqueHiddenParts.some((existing) => existing.includes(part))) continue;
    uniqueHiddenParts.push(part);
  }

  return uniqueHiddenParts.join("");
}

function compactSearchPreviews(
  parts: string[],
  visibleText: string,
  limit: number,
  maxLength = 76,
): string[] {
  const previews: Array<{ text: string; normalized: string }> = [];

  for (const rawPart of parts) {
    const fullText = rawPart.replace(/\s+/g, " ").trim();
    const normalized = normalizeSearchText(fullText);
    if (!normalized || visibleText.includes(normalized)) continue;
    if (
      previews.some(
        (existing) =>
          existing.normalized.includes(normalized)
          || normalized.includes(existing.normalized),
      )
    ) {
      continue;
    }
    const characters = Array.from(fullText);
    const text =
      characters.length <= maxLength
        ? fullText
        : `${characters.slice(0, maxLength).join("")}…`;
    previews.push({ text, normalized });
    if (previews.length >= limit) break;
  }

  return previews.map(({ text }) => text);
}

function searchableSections(
  occupation: Occupation,
): {
  searchSections: Record<OccupationSearchSectionKey, string>;
  searchPreviews: Record<OccupationSearchSectionKey, string[]>;
} {
  const dailySchedule = occupation.overview.dailySchedule.flatMap((item) => [
    item.time,
    item.title,
    item.description,
  ]);
  const creativeIdeas = occupation.creativeIdeas.flatMap((idea) => [
    idea.era,
    idea.region,
    idea.title,
    idea.summary,
  ]);
  const scenarioSituations = occupation.scenarioSituations.flatMap((situation) => [
    situation.title,
    situation.reason,
  ]);
  const roleplayTip = occupation.creative.roleplayTips[0] ?? "";
  const visibleText = structuredSearchText({ ...occupation, roleplayTip });
  const parts: Record<OccupationSearchSectionKey, string[]> = {
    identity: [...occupation.aliases, ...occupation.keywords],
    overview: [
      ...occupation.overview.responsibilities,
      ...occupation.overview.typicalPeople,
      ...dailySchedule,
      ...occupation.overview.qualifications,
      ...occupation.overview.education,
      ...occupation.overview.workStyle,
      occupation.overview.annualIncome.summary,
      occupation.overview.annualIncome.note,
      ...occupation.overview.suitableFor,
    ],
    creative: [
      ...occupation.creative.investigatorFeatures,
      ...occupation.creative.likelyKnowledge,
      ...occupation.creative.roleplayTips.slice(1),
      ...occupation.creative.personalityExamples,
      ...occupation.creative.everydayEvents,
      ...occupation.creative.scenarioHooks,
      ...occupation.creative.commonCharacterSettings,
    ],
    settingAndScenarios: [
      ...occupation.setting.eras,
      ...occupation.setting.regions,
      occupation.setting.note,
      ...creativeIdeas,
      ...scenarioSituations,
    ],
  };
  const previewParts: Record<OccupationSearchSectionKey, string[]> = {
    identity: [...occupation.aliases, ...occupation.keywords],
    overview: [
      occupation.overview.responsibilities[0] ?? "",
    ],
    creative: [
      occupation.creative.scenarioHooks[0] ?? "",
      occupation.creative.everydayEvents[0] ?? "",
    ],
    settingAndScenarios: [
      occupation.scenarioSituations[0]
        ? `${occupation.scenarioSituations[0].title}：${occupation.scenarioSituations[0].reason}`
        : "",
    ],
  };

  return {
    searchSections: Object.fromEntries(
      Object.entries(parts).map(([key, values]) => [
        key,
        compactSearchSection(values, visibleText),
      ]),
    ) as Record<OccupationSearchSectionKey, string>,
    searchPreviews: Object.fromEntries(
      Object.entries(previewParts).map(([key, values]) => [
        key,
        compactSearchPreviews(
          values,
          visibleText,
          key === "identity" ? 2 : key === "creative" ? 2 : 1,
        ),
      ]),
    ) as Record<OccupationSearchSectionKey, string[]>,
  };
}

/**
 * Server Component で完全な職業データを検索専用レコードへ変換する。
 * 全文は一度だけ正規化し、ブラウザーでは検索のたびに再構築しない。
 */
export function createOccupationSearchBaseRecord(
  occupation: Occupation,
): OccupationSearchBaseRecord {
  return {
    id: occupation.id,
    slug: occupation.slug,
    name: occupation.name,
    categoryId: occupation.categoryId,
    catchphrase: occupation.catchphrase,
    shortDescription: occupation.shortDescription,
    aptitude: occupation.aptitude,
    skillImages: occupation.skillImages,
    publishedAt: occupation.publishedAt,
    roleplayTip: occupation.creative.roleplayTips[0] ?? "",
    facetCodes: encodeSearchFacets(getOccupationSearchFacets(occupation)),
    ...(occupation.featured.popularRank === undefined
      ? {}
      : { popularRank: occupation.featured.popularRank }),
    ...(occupation.featured.recommendedRank === undefined
      ? {}
      : { recommendedRank: occupation.featured.recommendedRank }),
  };
}

export function createOccupationSearchRecord(
  occupation: Occupation,
): OccupationSearchRecord {
  return {
    ...createOccupationSearchBaseRecord(occupation),
    ...searchableSections(occupation),
  };
}

export function createOccupationSearchBaseRecords(
  occupations: Occupation[],
): OccupationSearchBaseRecord[] {
  return occupations.map(createOccupationSearchBaseRecord);
}

export function createOccupationSearchRecords(
  occupations: Occupation[],
): OccupationSearchRecord[] {
  return occupations.map(createOccupationSearchRecord);
}

export function createOccupationSearchIndex(
  occupations: Occupation[],
): OccupationSearchIndex {
  return Object.fromEntries(
    occupations.map((occupation) => [
      occupation.slug,
      searchableSections(occupation),
    ]),
  );
}

const emptySearchIndexEntry: OccupationSearchIndexEntry = {
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
};

/**
 * 軽量レコードに遅延取得した全文索引を合成する。
 * 索引取得前や失敗時は、カード上に見えている項目だけでも検索を継続できる。
 */
export function hydrateOccupationSearchRecords(
  occupations: OccupationSearchBaseRecord[],
  searchIndex: OccupationSearchIndex | null,
): OccupationSearchRecord[] {
  return occupations.map((occupation) => ({
    ...occupation,
    ...(searchIndex?.[occupation.slug] ?? emptySearchIndexEntry),
  }));
}

const normalizedSkillsCache = new WeakMap<OccupationSearchRecord, string[]>();
const cardSearchTextCache = new WeakMap<OccupationSearchRecord, string>();
const hiddenSearchTextCache = new WeakMap<OccupationSearchRecord, string>();
const normalizedSearchPreviewsCache = new WeakMap<
  OccupationSearchRecord,
  Record<OccupationSearchSectionKey, Array<{ raw: string; normalized: string }>>
>();

function getNormalizedSkills(occupation: OccupationSearchRecord): string[] {
  const cached = normalizedSkillsCache.get(occupation);
  if (cached) return cached;

  const normalized = occupation.skillImages.map(normalizeSearchText);
  normalizedSkillsCache.set(occupation, normalized);
  return normalized;
}

function getCardSearchText(occupation: OccupationSearchRecord): string {
  const cached = cardSearchTextCache.get(occupation);
  if (cached) return cached;

  const normalized = structuredSearchText(occupation);
  cardSearchTextCache.set(occupation, normalized);
  return normalized;
}

function getNormalizedSearchPreviews(
  occupation: OccupationSearchRecord,
): Record<OccupationSearchSectionKey, Array<{ raw: string; normalized: string }>> {
  const cached = normalizedSearchPreviewsCache.get(occupation);
  if (cached) return cached;

  const normalized = Object.fromEntries(
    Object.entries(occupation.searchPreviews).map(([key, fragments]) => [
      key,
      fragments.map((raw) => ({ raw, normalized: normalizeSearchText(raw) })),
    ]),
  ) as Record<
    OccupationSearchSectionKey,
    Array<{ raw: string; normalized: string }>
  >;
  normalizedSearchPreviewsCache.set(occupation, normalized);
  return normalized;
}

function getHiddenSearchText(occupation: OccupationSearchRecord): string {
  const cached = hiddenSearchTextCache.get(occupation);
  if (cached) return cached;

  const normalized = Object.values(occupation.searchSections).join("");
  hiddenSearchTextCache.set(occupation, normalized);
  return normalized;
}

function searchFieldScore(
  token: string,
  fragments: readonly string[],
  weight: number,
): number {
  let score = 0;
  for (const fragment of fragments) {
    if (!fragment.includes(token)) continue;
    score = Math.max(
      score,
      weight
      + (fragment === token ? Math.round(weight * 0.4) : 0)
      + (fragment.startsWith(token) ? Math.round(weight * 0.15) : 0),
    );
  }
  return score;
}

function getSearchRelevanceScore(
  occupation: OccupationSearchRecord,
  queryTokens: readonly string[],
): number {
  if (queryTokens.length === 0) return 0;

  const sections = occupation.searchSections;
  const fields = [
    { fragments: [normalizeSearchText(occupation.name)], weight: 1_200 },
    { fragments: [sections.identity], weight: 850 },
    {
      fragments: occupation.skillImages.map(normalizeSearchText),
      weight: 650,
    },
    { fragments: [normalizeSearchText(occupation.catchphrase)], weight: 480 },
    { fragments: [normalizeSearchText(occupation.shortDescription)], weight: 420 },
    { fragments: [normalizeSearchText(occupation.roleplayTip)], weight: 360 },
    { fragments: [sections.overview], weight: 300 },
    { fragments: [sections.creative], weight: 250 },
    {
      fragments: [sections.settingAndScenarios],
      weight: 220,
    },
  ];

  return queryTokens.reduce(
    (total, token) =>
      total
      + Math.max(...fields.map(({ fragments, weight }) =>
        searchFieldScore(token, fragments, weight))),
    0,
  );
}

export function searchOccupations(
  occupations: OccupationSearchRecord[],
  filters: OccupationFilters,
): OccupationSearchRecord[] {
  const queryTokens = tokenizeSearchQuery(filters.query);
  const normalizedSkills = filters.skills.map(normalizeSearchText).filter(Boolean);

  const filtered = occupations.filter((occupation) => {
    const cardSearchText = getCardSearchText(occupation);
    const hiddenSearchText = getHiddenSearchText(occupation);
    if (
      queryTokens.length > 0 &&
      !queryTokens.every(
        (token) => hiddenSearchText.includes(token) || cardSearchText.includes(token),
      )
    ) {
      return false;
    }
    if (filters.category && occupation.categoryId !== filters.category) return false;

    const occupationSkills = getNormalizedSkills(occupation);
    if (
      normalizedSkills.length > 0 &&
      !normalizedSkills.every((skill) =>
        occupationSkills.some((occupationSkill) => occupationSkill.includes(skill)),
      )
    ) {
      return false;
    }

    if (filters.aptitudes.some((aptitude) => occupation.aptitude[aptitude] < 4)) return false;
    if (!matchesEncodedSearchFacets(occupation.facetCodes, "eras", filters.eras)) return false;
    if (!matchesEncodedSearchFacets(occupation.facetCodes, "regions", filters.regions)) return false;
    if (!matchesEncodedSearchFacets(occupation.facetCodes, "situations", filters.situations)) return false;
    return true;
  });

  return filtered.sort((a, b) => {
    if (filters.sort === "name") return a.name.localeCompare(b.name, "ja");
    if (filters.sort === "newest") return b.publishedAt.localeCompare(a.publishedAt);
    if (filters.sort === "relevance" && queryTokens.length > 0) {
      const scoreDifference =
        getSearchRelevanceScore(b, queryTokens) - getSearchRelevanceScore(a, queryTokens);
      if (scoreDifference !== 0) return scoreDifference;
    }
    const aRank = a.recommendedRank ?? a.popularRank ?? 999;
    const bRank = b.recommendedRank ?? b.popularRank ?? 999;
    return aRank - bRank || a.name.localeCompare(b.name, "ja");
  });
}

function queryTerms(value: string): Array<{ display: string; normalized: string }> {
  const seen = new Set<string>();
  return value
    .normalize("NFKC")
    .trim()
    .split(/\s+/)
    .flatMap((display) => {
      const normalized = normalizeSearchText(display);
      if (!normalized || seen.has(normalized)) return [];
      seen.add(normalized);
      return [{ display, normalized }];
    });
}

function readableMatchSnippet(
  value: string,
  normalizedTerm: string,
  maxLength = 96,
): string {
  const text = value.replace(/\s+/g, " ").trim();
  const rawCharacters = Array.from(text);
  if (rawCharacters.length <= maxLength) return text;

  const normalizedCharacters: string[] = [];
  const rawIndexes: number[] = [];
  rawCharacters.forEach((character, rawIndex) => {
    for (const normalizedCharacter of Array.from(normalizeSearchText(character))) {
      normalizedCharacters.push(normalizedCharacter);
      rawIndexes.push(rawIndex);
    }
  });

  const termCharacters = Array.from(normalizedTerm);
  let normalizedStart = -1;
  for (
    let index = 0;
    index <= normalizedCharacters.length - termCharacters.length;
    index += 1
  ) {
    if (
      termCharacters.every(
        (character, offset) => normalizedCharacters[index + offset] === character,
      )
    ) {
      normalizedStart = index;
      break;
    }
  }

  const rawMatchStart =
    normalizedStart >= 0 ? (rawIndexes[normalizedStart] ?? 0) : 0;
  const preferredStart = Math.max(0, rawMatchStart - Math.floor(maxLength / 3));
  const start = Math.min(
    preferredStart,
    Math.max(0, rawCharacters.length - maxLength),
  );
  const end = Math.min(rawCharacters.length, start + maxLength);

  return `${start > 0 ? "…" : ""}${rawCharacters.slice(start, end).join("")}${
    end < rawCharacters.length ? "…" : ""
  }`;
}

export function getSearchMatchReasons(
  occupation: OccupationSearchRecord,
  filters: OccupationFilters,
  categoryName?: string,
): OccupationMatchReason[] {
  const reasons: OccupationMatchReason[] = [];
  const searchPreviews = getNormalizedSearchPreviews(occupation);
  const queryFields: Array<{
    label: string;
    searchText: string;
    fragments: string[];
  }> = [
    {
      label: "職業名",
      searchText: normalizeSearchText(occupation.name),
      fragments: [occupation.name],
    },
    {
      label: "キャッチコピー",
      searchText: normalizeSearchText(occupation.catchphrase),
      fragments: [occupation.catchphrase],
    },
    {
      label: "職業説明",
      searchText: normalizeSearchText(occupation.shortDescription),
      fragments: [occupation.shortDescription],
    },
    {
      label: "技能イメージ",
      searchText: occupation.skillImages.map(normalizeSearchText).join(""),
      fragments: occupation.skillImages,
    },
    {
      label: "RPのヒント",
      searchText: normalizeSearchText(occupation.roleplayTip),
      fragments: [occupation.roleplayTip],
    },
    ...Object.entries(occupation.searchSections).map(([key, searchText]) => ({
      label: searchSectionLabels[key as OccupationSearchSectionKey],
      searchText,
      fragments: searchPreviews[key as OccupationSearchSectionKey].map(
        ({ raw }) => raw,
      ),
    })),
  ];

  for (const term of queryTerms(filters.query)) {
    const matchingFields = queryFields.filter(({ searchText }) =>
      searchText.includes(term.normalized));
    const field =
      matchingFields.find(({ fragments }) =>
        fragments.some((item) =>
          normalizeSearchText(item).includes(term.normalized),
        ),
      ) ?? matchingFields[0];
    if (field) {
      const fragment = field.fragments.find((item) =>
        normalizeSearchText(item).includes(term.normalized));
      reasons.push({
        label: field.label,
        value: `「${term.display}」`,
        ...(fragment
          ? { snippet: readableMatchSnippet(fragment, term.normalized) }
          : {}),
      });
    }
  }

  if (filters.category && occupation.categoryId === filters.category) {
    reasons.push({ label: "カテゴリー", value: categoryName ?? filters.category });
  }

  for (const skill of filters.skills) {
    const normalized = normalizeSearchText(skill);
    if (occupation.skillImages.some((item) => normalizeSearchText(item).includes(normalized))) {
      reasons.push({ label: "技能イメージ", value: skill });
    }
  }

  for (const aptitude of filters.aptitudes) {
    if (occupation.aptitude[aptitude] >= 4) {
      reasons.push({
        label: "探索者適性",
        value: `${aptitudeFilterLabels[aptitude]} ${occupation.aptitude[aptitude]}/5`,
      });
    }
  }

  for (const group of searchFacetGroups) {
    for (const id of filters[group.key]) {
      if (matchesEncodedSearchFacets(occupation.facetCodes, group.key, [id])) {
        const option = getSearchFacetOption(group.key, id);
        if (option) reasons.push({ label: group.label, value: option.label });
      }
    }
  }

  return reasons;
}

function uniqueValues(values: string[]): string[] {
  const seen = new Set<string>();
  return values.flatMap((value) => {
    const trimmed = value.trim();
    const normalized = normalizeSearchText(trimmed);
    if (!normalized || seen.has(normalized)) return [];
    seen.add(normalized);
    return [trimmed];
  });
}

export function filtersFromSearchParams(params: URLSearchParams): OccupationFilters {
  const query = params.get("q") ?? "";
  const automaticSort: SortOption =
    tokenizeSearchQuery(query).length > 0 ? "relevance" : "recommended";
  const requestedSort = params.get("sort");
  const sort =
    requestedSort && ["relevance", "recommended", "name", "newest"].includes(requestedSort)
      ? (requestedSort as SortOption)
      : automaticSort;
  const requestedCategory = params.get("category") ?? "";
  const aptitudes = uniqueValues(params.getAll("aptitude")).filter(
    (value): value is AptitudeKey => aptitudeKeys.includes(value as AptitudeKey),
  );
  const facetFilters = Object.fromEntries(
    searchFacetGroups.map((group) => [
      group.key,
      uniqueValues(params.getAll(group.urlKey)).filter((value) =>
        isSearchFacetId(group.key, value),
      ),
    ]),
  ) as Record<SearchFacetKey, string[]>;

  return {
    query,
    category: requestedCategory === "fire" ? "government" : requestedCategory,
    // getAll()は従来の単一キーURLも1要素として復元する。
    skills: uniqueValues(params.getAll("skill")),
    aptitudes,
    eras: facetFilters.eras,
    regions: facetFilters.regions,
    situations: facetFilters.situations,
    sort: sort === "relevance" && tokenizeSearchQuery(query).length === 0
      ? "recommended"
      : sort,
  };
}

export function filtersToSearchParams(filters: OccupationFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.category) params.set("category", filters.category);
  uniqueValues(filters.skills).forEach((skill) => params.append("skill", skill));
  [...new Set(filters.aptitudes)]
    .filter((aptitude) => aptitudeKeys.includes(aptitude))
    .forEach((aptitude) => params.append("aptitude", aptitude));
  for (const group of searchFacetGroups) {
    [...new Set(filters[group.key])]
      .filter((value) => isSearchFacetId(group.key, value))
      .forEach((value) => params.append(group.urlKey, value));
  }
  const automaticSort: SortOption =
    tokenizeSearchQuery(filters.query).length > 0 ? "relevance" : "recommended";
  if (filters.sort !== automaticSort) params.set("sort", filters.sort);
  return params;
}
