export const COMPARISON_LIMIT = 4;

const occupationSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type SearchParamsReader = Pick<URLSearchParams, "get">;

function normalizeSlug(value: string): string | null {
  const slug = value.trim().toLowerCase();
  return occupationSlugPattern.test(slug) ? slug : null;
}

export function normalizeComparedOccupationSlugs(
  slugs: Iterable<string>,
  validSlugs?: Iterable<string>,
): readonly string[] {
  const validSlugSet = validSlugs
    ? new Set(
        [...validSlugs]
          .map(normalizeSlug)
          .filter((slug): slug is string => slug !== null),
      )
    : null;
  const normalized: string[] = [];

  for (const value of slugs) {
    const slug = normalizeSlug(value);
    if (
      !slug ||
      validSlugSet?.has(slug) === false ||
      normalized.includes(slug)
    ) {
      continue;
    }

    normalized.push(slug);
    if (normalized.length === COMPARISON_LIMIT) break;
  }

  return Object.freeze(normalized);
}

export function parseComparisonParam(
  params: SearchParamsReader,
  validSlugs?: Iterable<string>,
): readonly string[] {
  const value = params.get("compare");
  if (!value) return Object.freeze([]);

  return normalizeComparedOccupationSlugs(value.split(","), validSlugs);
}

export function setComparisonParam(
  params: URLSearchParams,
  slugs: Iterable<string>,
): URLSearchParams {
  const normalized = normalizeComparedOccupationSlugs(slugs);

  if (normalized.length === 0) {
    params.delete("compare");
  } else {
    params.set("compare", normalized.join(","));
  }

  return params;
}

/**
 * URLが現在の比較状態と同じでも、別の比較状態への遷移が未完了なら置換が必要。
 * これにより「追加→URL反映前に解除」のような往復操作で古いURLへ巻き戻らない。
 */
export function shouldReplaceComparisonUrl(
  currentParamValue: string | null,
  desiredSlugs: Iterable<string>,
  pendingParamValue: string | null,
): boolean {
  const desiredParamValue = normalizeComparedOccupationSlugs(desiredSlugs).join(",");
  const urlAlreadyMatches = desiredParamValue
    ? currentParamValue === desiredParamValue
    : currentParamValue === null;

  return !urlAlreadyMatches
    || (pendingParamValue !== null && pendingParamValue !== desiredParamValue);
}
