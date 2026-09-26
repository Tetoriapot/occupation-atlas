import type { Occupation } from "@/app/types/occupation";

export type OccupationSearchSectionKey =
  | "identity"
  | "overview"
  | "creative"
  | "settingAndScenarios";

export type OccupationMatchReason = {
  label: string;
  value: string;
  snippet?: string;
};

/**
 * 検索画面へ転送する最小限の職業レコード。
 * 詳細本文は正規化済みの searchText に畳み込み、構造化された全文データは渡さない。
 */
export type OccupationSearchRecord = Pick<
  Occupation,
  | "id"
  | "slug"
  | "name"
  | "categoryId"
  | "catchphrase"
  | "shortDescription"
  | "aptitude"
  | "skillImages"
  | "publishedAt"
> & {
  searchSections: Record<OccupationSearchSectionKey, string>;
  searchPreviews: Record<OccupationSearchSectionKey, string[]>;
  roleplayTip: string;
  facetCodes: string;
  popularRank?: number;
  recommendedRank?: number;
};

/**
 * 一覧カードと絞り込みに必要な初期転送用レコード。
 * 大きな全文検索索引は含めず、検索を始めた時点で別途読み込む。
 */
export type OccupationSearchBaseRecord = Omit<
  OccupationSearchRecord,
  "searchSections" | "searchPreviews"
>;

export type OccupationSearchIndexEntry = Pick<
  OccupationSearchRecord,
  "searchSections" | "searchPreviews"
>;

export type OccupationSearchIndex = Record<string, OccupationSearchIndexEntry>;
