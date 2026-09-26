import type {
  Occupation,
  OccupationSearchFacets,
} from "@/app/types/occupation";

export type { OccupationSearchFacets } from "@/app/types/occupation";

export type SearchFacetKey = "eras" | "regions" | "situations";

export type SearchFacetOption = {
  id: string;
  code: string;
  label: string;
};

export type SearchFacetGroup = {
  key: SearchFacetKey;
  urlKey: "era" | "region" | "situation";
  label: string;
  help: string;
  options: readonly SearchFacetOption[];
};

const eraOptions = [
  { id: "modern", code: "m", label: "現代" },
  { id: "taisho-1920s", code: "t", label: "大正・1920年代" },
  { id: "meiji-19c", code: "h", label: "明治・19世紀" },
  { id: "showa", code: "s", label: "昭和" },
  { id: "premodern", code: "o", label: "近世以前" },
  { id: "near-future", code: "n", label: "近未来" },
  { id: "far-future", code: "f", label: "遠未来" },
  { id: "fictional-era", code: "x", label: "架空時代" },
] as const satisfies readonly SearchFacetOption[];

const regionOptions = [
  { id: "japan", code: "j", label: "日本" },
  { id: "overseas", code: "v", label: "海外・異文化圏" },
  { id: "urban", code: "u", label: "都市・市街地" },
  { id: "rural", code: "r", label: "地方・農村" },
  { id: "mountain", code: "m", label: "山岳・高原" },
  { id: "island", code: "i", label: "島・群島" },
  { id: "maritime", code: "w", label: "海上・港湾" },
  { id: "polar", code: "p", label: "極地" },
  { id: "space", code: "c", label: "宇宙・惑星" },
  { id: "fictional", code: "f", label: "架空世界" },
] as const satisfies readonly SearchFacetOption[];

const situationOptions = [
  { id: "closed", code: "A", label: "クローズド・封鎖" },
  { id: "school", code: "B", label: "学校・学園" },
  { id: "hospital", code: "C", label: "病院・医療施設" },
  { id: "museum", code: "D", label: "博物館・美術館" },
  { id: "hotel", code: "E", label: "ホテル・宿泊施設" },
  { id: "mansion", code: "F", label: "豪邸・屋敷" },
  { id: "ruins", code: "G", label: "遺跡・廃墟" },
  { id: "outdoors", code: "H", label: "山岳・野外" },
  { id: "urban", code: "I", label: "市街地" },
  { id: "disaster", code: "J", label: "災害・事故現場" },
  { id: "criminal-case", code: "K", label: "刑事事件・捜査" },
  { id: "courtroom", code: "L", label: "法廷・行政" },
  { id: "maritime", code: "M", label: "海上・船舶" },
  { id: "aviation", code: "N", label: "航空・空港" },
  { id: "space", code: "O", label: "宇宙施設" },
  { id: "research-facility", code: "P", label: "研究・実験施設" },
  { id: "factory", code: "Q", label: "工場・倉庫" },
  { id: "religious-site", code: "R", label: "宗教施設・祭礼" },
  { id: "transport", code: "S", label: "駅・交通機関" },
  { id: "event", code: "T", label: "イベント・大会" },
  { id: "office", code: "U", label: "官公庁・オフィス" },
  { id: "residential", code: "V", label: "住宅・生活圏" },
  { id: "everyday", code: "W", label: "日常・地域" },
] as const satisfies readonly SearchFacetOption[];

export const searchFacetGroups = [
  {
    key: "eras",
    urlKey: "era",
    label: "創作案の時代",
    help: "同じ項目では、どれか一つに合えば表示します。",
    options: eraOptions,
  },
  {
    key: "regions",
    urlKey: "region",
    label: "創作案の舞台",
    help: "職業解説の基準地域ではなく、掲載中の創作案から探します。",
    options: regionOptions,
  },
  {
    key: "situations",
    urlKey: "situation",
    label: "活躍シチュエーション",
    help: "おすすめシナリオシチュエーションを共通語へ整理しています。",
    options: situationOptions,
  },
] as const satisfies readonly SearchFacetGroup[];

const optionsByKey = {
  eras: eraOptions,
  regions: regionOptions,
  situations: situationOptions,
} satisfies Record<SearchFacetKey, readonly SearchFacetOption[]>;

function uniqueInTaxonomy(key: SearchFacetKey, ids: string[]): string[] {
  const selected = new Set(ids);
  return optionsByKey[key].flatMap(({ id }) => selected.has(id) ? [id] : []);
}

/** 編集者がJSONへ明示したIDだけを、taxonomy順へ正規化して検索へ渡します。 */
export function getOccupationSearchFacets(
  occupation: Pick<Occupation, "searchFacets">,
): OccupationSearchFacets {
  return {
    eras: uniqueInTaxonomy("eras", occupation.searchFacets.eras),
    regions: uniqueInTaxonomy("regions", occupation.searchFacets.regions),
    situations: uniqueInTaxonomy("situations", occupation.searchFacets.situations),
  };
}

export function isSearchFacetId(key: SearchFacetKey, value: string): boolean {
  return optionsByKey[key].some(({ id }) => id === value);
}

export function getSearchFacetOption(
  key: SearchFacetKey,
  id: string,
): SearchFacetOption | undefined {
  return optionsByKey[key].find((option) => option.id === id);
}

/** 検索ペイロードを軽く保つため、3軸を1文字コードの連結値として保存します。 */
export function encodeSearchFacets(facets: OccupationSearchFacets): string {
  return searchFacetGroups
    .map((group) => group.options
      .filter(({ id }) => facets[group.key].includes(id))
      .map(({ code }) => code)
      .join(""))
    .join("|");
}

export function matchesEncodedSearchFacets(
  encoded: string,
  key: SearchFacetKey,
  selectedIds: readonly string[],
): boolean {
  if (selectedIds.length === 0) return true;
  const segments = encoded.split("|");
  const segment = segments[searchFacetGroups.findIndex((group) => group.key === key)] ?? "";
  return selectedIds.some((id) => {
    const code = getSearchFacetOption(key, id)?.code;
    return code ? segment.includes(code) : false;
  });
}

/** 軽量コードから比較表示用の日本語ラベルを復元する。 */
export function getEncodedSearchFacetLabels(
  encoded: string,
  key: SearchFacetKey,
): string[] {
  const groupIndex = searchFacetGroups.findIndex((group) => group.key === key);
  if (groupIndex < 0) return [];
  const segment = encoded.split("|")[groupIndex] ?? "";
  return optionsByKey[key].flatMap(({ code, label }) =>
    segment.includes(code) ? [label] : [],
  );
}
