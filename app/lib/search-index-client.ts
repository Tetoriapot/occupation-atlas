import { sitePath } from "./site-path.ts";
import type {
  OccupationSearchBaseRecord,
  OccupationSearchIndex,
  OccupationSearchIndexEntry,
  OccupationSearchSectionKey,
} from "@/app/types/occupation-search";

export const OCCUPATION_SEARCH_INDEX_PATH =
  sitePath("/occupation-search-index.json");
export const OCCUPATION_SEARCH_INDEX_GZIP_PATH =
  sitePath("/occupation-search-index.compressed.json");

const sectionKeys: OccupationSearchSectionKey[] = [
  "identity",
  "overview",
  "creative",
  "settingAndScenarios",
];

const cachedSearchIndexPromises = new Map<
  string,
  Promise<OccupationSearchIndex>
>();

function isIndexEntry(value: unknown): value is OccupationSearchIndexEntry {
  if (!value || typeof value !== "object") return false;

  const entry = value as Partial<OccupationSearchIndexEntry>;
  return sectionKeys.every(
    (key) =>
      typeof entry.searchSections?.[key] === "string"
      && Array.isArray(entry.searchPreviews?.[key])
      && entry.searchPreviews[key].every((preview) => typeof preview === "string"),
  );
}

export function validateOccupationSearchIndex(
  value: unknown,
  occupations: readonly OccupationSearchBaseRecord[],
): OccupationSearchIndex {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("全文検索索引の形式が正しくありません。");
  }

  const index = value as OccupationSearchIndex;
  for (const occupation of occupations) {
    if (!isIndexEntry(index[occupation.slug])) {
      throw new Error(`全文検索索引に ${occupation.slug} がありません。`);
    }
  }
  return index;
}

export function loadOccupationSearchIndex(
  occupations: readonly OccupationSearchBaseRecord[],
  version: string,
): Promise<OccupationSearchIndex> {
  const versionQuery = `?v=${encodeURIComponent(version)}`;
  const requestUrl = `${OCCUPATION_SEARCH_INDEX_GZIP_PATH}${versionQuery}`;
  const cachedPromise = cachedSearchIndexPromises.get(requestUrl);
  if (cachedPromise) return cachedPromise;

  const promise = (async () => {
    if (typeof DecompressionStream === "function") {
      try {
        const compressedResponse = await fetch(requestUrl, {
          credentials: "same-origin",
        });
        if (compressedResponse.ok && compressedResponse.body) {
          const stream = compressedResponse.body.pipeThrough(
            new DecompressionStream("gzip"),
          );
          return validateOccupationSearchIndex(
            await new Response(stream).json(),
            occupations,
          );
        }
      } catch {
        // 圧縮ストリーム非対応・取得失敗時は通常JSONへフォールバックする。
      }
    }

    const response = await fetch(
      `${OCCUPATION_SEARCH_INDEX_PATH}${versionQuery}`,
      { credentials: "same-origin" },
    );
    if (!response.ok) {
      throw new Error(`全文検索索引を取得できませんでした（${response.status}）。`);
    }
    return validateOccupationSearchIndex(await response.json(), occupations);
  })().catch((error: unknown) => {
    cachedSearchIndexPromises.delete(requestUrl);
    throw error;
  });

  cachedSearchIndexPromises.set(requestUrl, promise);
  return promise;
}
