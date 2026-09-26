"use client";

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { appPathname } from "@/app/lib/site-path";
import { OccupationCard } from "@/app/components/occupation/occupation-card";
import { BeginnerDiagnosis } from "@/app/components/search/beginner-diagnosis";
import {
  clearComparedOccupations,
  clearSavedOccupations,
  removeComparedOccupation,
  removeSavedOccupation,
  replaceComparedOccupations,
  toggleComparedOccupation,
  toggleSavedOccupation,
  useComparedOccupationSlugs,
  useSavedOccupationSlugs,
} from "@/app/lib/occupation-shortlist";
import {
  COMPARISON_LIMIT,
  parseComparisonParam,
  setComparisonParam,
  shouldReplaceComparisonUrl,
} from "@/app/lib/occupation-comparison";
import {
  parseBeginnerDiagnosisParams,
  getBeginnerEvaluationReason,
  setBeginnerDiagnosisParams,
  type BeginnerDiagnosisAnswerKey,
  type BeginnerDiagnosisAnswers,
} from "@/app/lib/beginner-diagnosis";
import {
  defaultFilters,
  filtersFromSearchParams,
  filtersToSearchParams,
  getIncomingFilterSyncAction,
  getSearchMatchReasons,
  hydrateOccupationSearchRecords,
  mergeFiltersWithQueryDraft,
  normalizeSearchText,
  SEARCH_INPUT_DEBOUNCE_MS,
  searchOccupations,
  tokenizeSearchQuery,
  type OccupationFilters,
} from "@/app/lib/search";
import { loadOccupationSearchIndex } from "@/app/lib/search-index-client";
import type { AptitudeKey, Category } from "@/app/types/occupation";
import type {
  OccupationSearchBaseRecord,
  OccupationSearchIndex,
} from "@/app/types/occupation-search";
import {
  getSearchFacetOption,
  matchesEncodedSearchFacets,
  searchFacetGroups,
  type SearchFacetGroup,
  type SearchFacetKey,
} from "@/app/lib/search-facets";

const aptitudeOptions: Array<{ key: AptitudeKey; label: string }> = [
  { key: "beginnerFriendly", label: "初心者おすすめ" },
  { key: "investigation", label: "調査向き" },
  { key: "negotiation", label: "交渉向き" },
  { key: "combat", label: "戦闘向き" },
  { key: "infiltration", label: "潜入向き" },
  { key: "support", label: "サポート向き" },
  { key: "knowledge", label: "知識向き" },
];

const resultBatchSize = 24;

const LazyOccupationWorkspace = lazy(() =>
  import("@/app/components/search/occupation-workspace").then((module) => ({
    default: module.OccupationWorkspace,
  })),
);

type Props = {
  occupations: OccupationSearchBaseRecord[];
  categories: Category[];
  searchIndexVersion: string;
};

type SearchIndexStatus = "idle" | "loading" | "ready" | "error";

function filtersAreEqual(left: OccupationFilters, right: OccupationFilters): boolean {
  return filtersToSearchParams(left).toString() === filtersToSearchParams(right).toString();
}

function slugListsAreEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((slug, index) => slug === right[index]);
}

function diagnosisAnswersAreEqual(
  left: Partial<BeginnerDiagnosisAnswers>,
  right: Partial<BeginnerDiagnosisAnswers>,
): boolean {
  return left.role === right.role
    && left.preparation === right.preparation
    && left.risk === right.risk;
}

function diagnosisAnswersToSearchParamString(
  answers: Partial<BeginnerDiagnosisAnswers>,
): string {
  return setBeginnerDiagnosisParams(new URLSearchParams(), answers).toString();
}

type NormalizedFacetGroupProps = {
  group: SearchFacetGroup;
  selectedValues: readonly string[];
  onToggleOption: (key: SearchFacetKey, optionId: string) => void;
};

function NormalizedFacetGroup({
  group,
  selectedValues,
  onToggleOption,
}: NormalizedFacetGroupProps) {
  const [isOpen, setIsOpen] = useState(selectedValues.length > 0);

  return (
    <details
      className="normalized-facet-group"
      open={isOpen || selectedValues.length > 0}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary>
        <span>{group.label}</span>
        {selectedValues.length > 0 ? <strong>{selectedValues.length}</strong> : null}
      </summary>
      <div className="normalized-facet-group__content">
        <p>{group.help}</p>
        <div className="filter-button-grid">
          {group.options.map((option) => {
            const selected = selectedValues.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                className={selected ? "is-active" : ""}
                aria-pressed={selected}
                onClick={() => onToggleOption(group.key, option.id)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </details>
  );
}

export function OccupationExplorer({
  occupations,
  categories,
  searchIndexVersion,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParamString = searchParams.toString();
  const initial = useMemo(
    () => filtersFromSearchParams(new URLSearchParams(searchParamString)),
    [searchParamString],
  );
  const initialSearchParamString = useMemo(
    () => filtersToSearchParams(initial).toString(),
    [initial],
  );
  const initialDiagnosisAnswers = useMemo(
    () => parseBeginnerDiagnosisParams(new URLSearchParams(searchParamString)),
    [searchParamString],
  );
  const [filters, setFilters] = useState(initial);
  const filtersRef = useRef(initial);
  const [queryDraft, setQueryDraft] = useState(initial.query);
  const queryDraftRef = useRef(initial.query);
  const queryDebounceTimerRef = useRef<number | null>(null);
  const pendingSearchParamStringRef = useRef<string | null>(null);
  const supersededSearchParamStringsRef = useRef(new Set<string>());
  const pendingDiagnosisParamStringRef = useRef<string | null>(null);
  const supersededDiagnosisParamStringsRef = useRef(new Set<string>());
  const pendingComparisonParamStringRef = useRef<string | null>(null);
  const supersededComparisonParamStringsRef = useRef(new Set<string>());
  const observedSearchParamStringRef = useRef(initialSearchParamString);
  const [isComposingQuery, setIsComposingQuery] = useState(false);
  const [skillDraft, setSkillDraft] = useState("");
  const [searchIndex, setSearchIndex] = useState<OccupationSearchIndex | null>(null);
  const [searchIndexStatus, setSearchIndexStatus] = useState<SearchIndexStatus>("idle");
  const [diagnosisAnswers, setDiagnosisAnswers] = useState<Partial<BeginnerDiagnosisAnswers>>(
    initialDiagnosisAnswers,
  );
  const diagnosisAnswersRef = useRef<Partial<BeginnerDiagnosisAnswers>>(initialDiagnosisAnswers);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleResultState, setVisibleResultState] = useState({
    filterKey: filtersToSearchParams(initial).toString(),
    count: resultBatchSize,
  });
  const savedSlugs = useSavedOccupationSlugs();
  const comparisonSlugs = useComparedOccupationSlugs();
  const comparisonSlugsRef = useRef(comparisonSlugs);
  const comparisonUrlImportTargetRef = useRef<readonly string[] | null>(null);
  const validOccupationSlugs = useMemo(
    () => occupations.map((occupation) => occupation.slug),
    [occupations],
  );
  const filterDialogRef = useRef<HTMLDialogElement>(null);
  const filterOpenButtonRef = useRef<HTMLButtonElement>(null);
  const resultsStatusRef = useRef<HTMLParagraphElement>(null);
  const restoreFilterFocusRef = useRef(true);
  const searchIndexRequestInFlightRef = useRef(false);

  const ensureFullTextSearchIndex = useCallback(() => {
    if (searchIndexRequestInFlightRef.current || searchIndexStatus === "ready") return;

    searchIndexRequestInFlightRef.current = true;
    window.queueMicrotask(() => setSearchIndexStatus("loading"));
    void loadOccupationSearchIndex(occupations, searchIndexVersion)
      .then((nextIndex) => {
        searchIndexRequestInFlightRef.current = false;
        setSearchIndex(nextIndex);
        setSearchIndexStatus("ready");
      })
      .catch(() => {
        searchIndexRequestInFlightRef.current = false;
        setSearchIndexStatus("error");
      });
  }, [occupations, searchIndexStatus, searchIndexVersion]);

  const cancelScheduledQueryCommit = useCallback(() => {
    if (queryDebounceTimerRef.current === null) return;
    window.clearTimeout(queryDebounceTimerRef.current);
    queryDebounceTimerRef.current = null;
  }, []);

  const replaceFilterUrl = useCallback((
    next: OccupationFilters,
    comparedSlugs: readonly string[] = comparisonSlugsRef.current,
    force = false,
  ) => {
    const params = filtersToSearchParams(next);
    setComparisonParam(params, comparedSlugs);
    setBeginnerDiagnosisParams(params, diagnosisAnswersRef.current);
    const nextSearchParamString = params.toString();
    const nextFilterSearchParamString = filtersToSearchParams(next).toString();
    const hasPendingNavigation = pendingSearchParamStringRef.current !== null;
    const alreadyAtTarget = nextFilterSearchParamString === observedSearchParamStringRef.current;

    if (alreadyAtTarget && !hasPendingNavigation && !force) return;

    const previousTarget = pendingSearchParamStringRef.current;
    supersededSearchParamStringsRef.current.delete(nextFilterSearchParamString);
    if (previousTarget !== null && previousTarget !== nextFilterSearchParamString) {
      supersededSearchParamStringsRef.current.add(previousTarget);
    }
    pendingSearchParamStringRef.current = nextFilterSearchParamString;
    router.replace(params.size ? `${pathname}?${nextSearchParamString}` : pathname, {
      scroll: false,
    });
  }, [pathname, router]);

  useEffect(() => {
    comparisonSlugsRef.current = comparisonSlugs;
  }, [comparisonSlugs]);

  useEffect(() => {
    const incomingParamString = diagnosisAnswersToSearchParamString(initialDiagnosisAnswers);
    const syncAction = getIncomingFilterSyncAction(
      pendingDiagnosisParamStringRef.current,
      incomingParamString,
      supersededDiagnosisParamStringsRef.current,
    );

    if (syncAction === "ignore") {
      if (pendingDiagnosisParamStringRef.current === null) {
        supersededDiagnosisParamStringsRef.current.delete(incomingParamString);
      }
      replaceFilterUrl(filtersRef.current, comparisonSlugsRef.current, true);
      return;
    }
    if (syncAction === "acknowledge") pendingDiagnosisParamStringRef.current = null;
    if (diagnosisAnswersAreEqual(initialDiagnosisAnswers, diagnosisAnswersRef.current)) return;
    diagnosisAnswersRef.current = initialDiagnosisAnswers;
    setDiagnosisAnswers(initialDiagnosisAnswers);
  }, [initialDiagnosisAnswers, replaceFilterUrl]);

  useEffect(() => {
    const params = new URLSearchParams(searchParamString);
    const hasComparisonParam = params.has("compare");
    if (!hasComparisonParam && pendingComparisonParamStringRef.current === null) return;

    const importedSlugs = parseComparisonParam(params, validOccupationSlugs);
    const incomingParamString = importedSlugs.join(",");
    const syncAction = getIncomingFilterSyncAction(
      pendingComparisonParamStringRef.current,
      incomingParamString,
      supersededComparisonParamStringsRef.current,
    );

    if (syncAction === "ignore") {
      if (pendingComparisonParamStringRef.current === null) {
        supersededComparisonParamStringsRef.current.delete(incomingParamString);
        replaceFilterUrl(filtersRef.current, comparisonSlugsRef.current, true);
      }
      return;
    }
    if (syncAction === "acknowledge") pendingComparisonParamStringRef.current = null;

    if (slugListsAreEqual(importedSlugs, comparisonSlugsRef.current)) {
      const canonicalValue = importedSlugs.join(",");
      if (hasComparisonParam && (params.get("compare") ?? "") !== canonicalValue) {
        replaceFilterUrl(filtersRef.current, importedSlugs, true);
      }
      return;
    }

    comparisonUrlImportTargetRef.current = importedSlugs;
    replaceComparedOccupations(importedSlugs);
  }, [replaceFilterUrl, searchParamString, validOccupationSlugs]);

  useEffect(() => {
    const importTarget = comparisonUrlImportTargetRef.current;
    if (importTarget && !slugListsAreEqual(importTarget, comparisonSlugs)) return;
    comparisonUrlImportTargetRef.current = null;

    const params = new URLSearchParams(searchParamString);
    const canonicalValue = comparisonSlugs.join(",");
    if (!shouldReplaceComparisonUrl(
      params.get("compare"),
      comparisonSlugs,
      pendingComparisonParamStringRef.current,
    )) return;

    const previousTarget = pendingComparisonParamStringRef.current;
    supersededComparisonParamStringsRef.current.delete(canonicalValue);
    if (previousTarget !== null && previousTarget !== canonicalValue) {
      supersededComparisonParamStringsRef.current.add(previousTarget);
    }
    pendingComparisonParamStringRef.current = canonicalValue;

    replaceFilterUrl(filtersRef.current, comparisonSlugs, true);
  }, [comparisonSlugs, replaceFilterUrl, searchParamString]);

  const commitFilters = useCallback((next: OccupationFilters) => {
    filtersRef.current = next;
    setFilters(next);
    queryDraftRef.current = next.query;
    setQueryDraft(next.query);
    replaceFilterUrl(next);
  }, [replaceFilterUrl]);

  useEffect(() => {
    observedSearchParamStringRef.current = initialSearchParamString;
    const syncAction = getIncomingFilterSyncAction(
      pendingSearchParamStringRef.current,
      initialSearchParamString,
      supersededSearchParamStringsRef.current,
    );

    if (syncAction === "ignore") {
      if (pendingSearchParamStringRef.current === null) {
        supersededSearchParamStringsRef.current.delete(initialSearchParamString);
        replaceFilterUrl(filtersRef.current);
      }
      return;
    }
    if (syncAction === "acknowledge") pendingSearchParamStringRef.current = null;
    if (filtersAreEqual(filtersRef.current, initial)) return;

    cancelScheduledQueryCommit();
    filtersRef.current = initial;
    queryDraftRef.current = initial.query;
    setFilters(initial);
    setQueryDraft(initial.query);
  }, [cancelScheduledQueryCommit, initial, initialSearchParamString, replaceFilterUrl]);

  useEffect(() => {
    function syncHistoryNavigation() {
      if (appPathname(window.location.pathname) !== appPathname(pathname)) return;

      cancelScheduledQueryCommit();
      const next = filtersFromSearchParams(new URLSearchParams(window.location.search));
      const nextSearchParamString = filtersToSearchParams(next).toString();
      const previousTarget = pendingSearchParamStringRef.current;

      if (previousTarget !== null && previousTarget !== nextSearchParamString) {
        supersededSearchParamStringsRef.current.add(previousTarget);
      }
      supersededSearchParamStringsRef.current.delete(nextSearchParamString);
      pendingSearchParamStringRef.current = null;
      observedSearchParamStringRef.current = nextSearchParamString;
      filtersRef.current = next;
      queryDraftRef.current = next.query;
      setFilters(next);
      setQueryDraft(next.query);
    }

    window.addEventListener("popstate", syncHistoryNavigation);
    return () => window.removeEventListener("popstate", syncHistoryNavigation);
  }, [cancelScheduledQueryCommit, pathname]);

  useEffect(() => {
    cancelScheduledQueryCommit();
    if (isComposingQuery || queryDraft === filtersRef.current.query) return;

    queryDebounceTimerRef.current = window.setTimeout(() => {
      queryDebounceTimerRef.current = null;
      if (queryDraftRef.current === filtersRef.current.query) return;
      commitFilters(
        mergeFiltersWithQueryDraft(
          filtersRef.current,
          queryDraftRef.current,
          {},
        ),
      );
    }, SEARCH_INPUT_DEBOUNCE_MS);

    return cancelScheduledQueryCommit;
  }, [cancelScheduledQueryCommit, commitFilters, isComposingQuery, queryDraft]);

  useEffect(() => {
    if (tokenizeSearchQuery(queryDraft).length === 0) return;
    ensureFullTextSearchIndex();
  }, [ensureFullTextSearchIndex, queryDraft]);

  useEffect(() => {
    if (comparisonSlugs.length === 0) return;
    ensureFullTextSearchIndex();
  }, [comparisonSlugs.length, ensureFullTextSearchIndex]);

  useEffect(() => {
    if (!filtersOpen) return;

    const bodyOverflow = document.body.style.overflow;
    const documentOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = documentOverflow;
    };
  }, [filtersOpen]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 820px)");

    function closeWhenDesktop(event: MediaQueryListEvent) {
      const dialog = filterDialogRef.current;
      if (!event.matches || !dialog?.open) return;
      restoreFilterFocusRef.current = false;
      dialog.close();
    }

    desktopQuery.addEventListener("change", closeWhenDesktop);
    return () => desktopQuery.removeEventListener("change", closeWhenDesktop);
  }, []);

  const searchableOccupations = useMemo(
    () => hydrateOccupationSearchRecords(occupations, searchIndex),
    [occupations, searchIndex],
  );
  const hasFullTextQuery = tokenizeSearchQuery(filters.query).length > 0;
  const fullTextSearchPending =
    hasFullTextQuery
    && searchIndexStatus !== "ready"
    && searchIndexStatus !== "error";
  const results = useMemo(
    () => searchOccupations(
      searchableOccupations,
      fullTextSearchPending
        ? {
            ...filters,
            query: "",
            sort: filters.sort === "relevance" ? "recommended" : filters.sort,
          }
        : filters,
    ),
    [filters, fullTextSearchPending, searchableOccupations],
  );
  const resultFilterKey = filtersToSearchParams(filters).toString();
  const visibleResultCount = visibleResultState.filterKey === resultFilterKey
    ? visibleResultState.count
    : resultBatchSize;
  const visibleResults = results.slice(0, visibleResultCount);
  const remainingResultCount = Math.max(0, results.length - visibleResults.length);

  const allSkills = useMemo(
    () => [...new Set(searchableOccupations.flatMap((occupation) => occupation.skillImages))].sort((a, b) => a.localeCompare(b, "ja")),
    [searchableOccupations],
  );

  const popularSkills = useMemo(() => {
    const counts = new Map<string, number>();
    searchableOccupations.forEach((occupation) => {
      occupation.skillImages.forEach((skill) => counts.set(skill, (counts.get(skill) ?? 0) + 1));
    });
    return [...counts]
      .sort(([leftSkill, leftCount], [rightSkill, rightCount]) =>
        rightCount - leftCount || leftSkill.localeCompare(rightSkill, "ja"),
      )
      .slice(0, 10)
      .map(([skill]) => skill);
  }, [searchableOccupations]);

  const availableSearchFacetGroups = useMemo(
    () => searchFacetGroups.map((group) => ({
      ...group,
      options: group.options.filter((option) =>
        searchableOccupations.some((occupation) =>
          matchesEncodedSearchFacets(occupation.facetCodes, group.key, [option.id]),
        ),
      ),
    })),
    [searchableOccupations],
  );

  const skillCandidates = useMemo(() => {
    const draft = normalizeSearchText(skillDraft);
    if (!draft) return popularSkills;
    return allSkills
      .filter((skill) => normalizeSearchText(skill).includes(draft))
      .slice(0, 10);
  }, [allSkills, popularSkills, skillDraft]);

  const savedOccupations = useMemo(
    () => savedSlugs.flatMap((slug) => searchableOccupations.find((occupation) => occupation.slug === slug) ?? []),
    [savedSlugs, searchableOccupations],
  );

  const comparisonOccupations = useMemo(
    () => comparisonSlugs.flatMap((slug) => searchableOccupations.find((occupation) => occupation.slug === slug) ?? []),
    [comparisonSlugs, searchableOccupations],
  );

  function updateFilters(patch: Partial<OccupationFilters>) {
    cancelScheduledQueryCommit();
    const next = mergeFiltersWithQueryDraft(
      filtersRef.current,
      queryDraftRef.current,
      patch,
    );
    commitFilters(next);
  }

  function resetFilters() {
    cancelScheduledQueryCommit();
    commitFilters(defaultFilters);
    setSkillDraft("");
  }

  function addSkill(value: string) {
    const trimmed = value.trim();
    const normalized = normalizeSearchText(trimmed);
    if (!normalized) return;

    const canonical = allSkills.find((skill) => normalizeSearchText(skill) === normalized) ?? trimmed;
    const currentSkills = filtersRef.current.skills;
    if (!currentSkills.some((skill) => normalizeSearchText(skill) === normalized)) {
      updateFilters({ skills: [...currentSkills, canonical] });
    }
    setSkillDraft("");
  }

  function toggleSkill(skill: string) {
    const normalized = normalizeSearchText(skill);
    const currentSkills = filtersRef.current.skills;
    const selected = currentSkills.some((item) => normalizeSearchText(item) === normalized);
    updateFilters({
      skills: selected
        ? currentSkills.filter((item) => normalizeSearchText(item) !== normalized)
        : [...currentSkills, skill],
    });
  }

  function toggleAptitude(aptitude: AptitudeKey) {
    const currentAptitudes = filtersRef.current.aptitudes;
    updateFilters({
      aptitudes: currentAptitudes.includes(aptitude)
        ? currentAptitudes.filter((item) => item !== aptitude)
        : [...currentAptitudes, aptitude],
    });
  }

  function toggleFacet(key: SearchFacetKey, id: string) {
    const currentValues = filtersRef.current[key];
    updateFilters({
      [key]: currentValues.includes(id)
        ? currentValues.filter((item) => item !== id)
        : [...currentValues, id],
    });
  }

  function updateDiagnosisAnswer(
    key: BeginnerDiagnosisAnswerKey,
    value: BeginnerDiagnosisAnswers[BeginnerDiagnosisAnswerKey],
  ) {
    const next = { ...diagnosisAnswersRef.current, [key]: value };
    const nextParamString = diagnosisAnswersToSearchParamString(next);
    const previousTarget = pendingDiagnosisParamStringRef.current;
    supersededDiagnosisParamStringsRef.current.delete(nextParamString);
    if (previousTarget !== null && previousTarget !== nextParamString) {
      supersededDiagnosisParamStringsRef.current.add(previousTarget);
    }
    pendingDiagnosisParamStringRef.current = nextParamString;
    diagnosisAnswersRef.current = next;
    setDiagnosisAnswers(next);
    replaceFilterUrl(filtersRef.current, comparisonSlugsRef.current, true);
  }

  function clearDiagnosis() {
    const previousTarget = pendingDiagnosisParamStringRef.current;
    supersededDiagnosisParamStringsRef.current.delete("");
    if (previousTarget !== null && previousTarget !== "") {
      supersededDiagnosisParamStringsRef.current.add(previousTarget);
    }
    pendingDiagnosisParamStringRef.current = "";
    diagnosisAnswersRef.current = {};
    setDiagnosisAnswers({});
    replaceFilterUrl(filtersRef.current, comparisonSlugsRef.current, true);
  }

  function openFilters() {
    const dialog = filterDialogRef.current;
    if (!dialog || dialog.open) return;

    restoreFilterFocusRef.current = true;
    dialog.showModal();
    setFiltersOpen(true);
  }

  function closeFilters(restoreFocus = true) {
    const dialog = filterDialogRef.current;
    restoreFilterFocusRef.current = restoreFocus;

    if (dialog?.open) {
      dialog.close();
      return;
    }

    setFiltersOpen(false);
    if (restoreFocus) filterOpenButtonRef.current?.focus({ preventScroll: true });
  }

  function handleFilterDialogClosed() {
    const shouldRestoreFocus = restoreFilterFocusRef.current;
    restoreFilterFocusRef.current = true;
    setFiltersOpen(false);

    if (shouldRestoreFocus) {
      window.requestAnimationFrame(() => {
        const trigger = filterOpenButtonRef.current;
        if (trigger?.isConnected) {
          trigger.focus({ preventScroll: true });
        }
      });
    }
  }

  function showFilteredResults() {
    closeFilters(false);
    window.requestAnimationFrame(() => {
      resultsStatusRef.current?.focus();
    });
  }

  const categoryName = categories.find((category) => category.id === filters.category)?.name;
  const hasFilters = Boolean(
    filters.query
      || filters.category
      || filters.skills.length
      || filters.aptitudes.length
      || filters.eras.length
      || filters.regions.length
      || filters.situations.length,
  );

  function renderFilterControls(location: "desktop" | "mobile") {
    const isMobile = location === "mobile";
    const titleId = isMobile ? "occupation-filter-dialog-title" : "occupation-filter-sidebar-title";
    const categoryId = `${location}-category-filter`;
    const skillId = `${location}-skill-filter`;
    const suggestionsId = `${location}-skill-suggestions`;
    const skillHelpId = `${location}-skill-help`;

    return <>
      <div className="filter-heading">
        <div>
          <span className="eyebrow">SEARCH NOTES</span>
          <h2 id={titleId}>絞り込み</h2>
        </div>
        {isMobile && (
          <button
            type="button"
            className="filter-close"
            onClick={() => closeFilters()}
            aria-label="絞り込みを閉じる"
            autoFocus
          >
            ×
          </button>
        )}
      </div>

      <label className="field-label" htmlFor={categoryId}>カテゴリー</label>
      <select
        id={categoryId}
        value={filters.category}
        onChange={(event) => updateFilters({ category: event.target.value })}
      >
        <option value="">すべてのカテゴリー</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>{category.name}</option>
        ))}
      </select>

      <div className="normalized-facet-filters">
        {availableSearchFacetGroups.map((group) => {
          const selectedValues = filters[group.key];
          return (
            <NormalizedFacetGroup
              key={`${location}-${group.key}`}
              group={group}
              selectedValues={selectedValues}
              onToggleOption={toggleFacet}
            />
          );
        })}
      </div>

      <label className="field-label" htmlFor={skillId}>技能イメージ</label>
      <form
        className="filter-skill-entry"
        onSubmit={(event) => {
          event.preventDefault();
          addSkill(skillDraft);
        }}
      >
        <input
          id={skillId}
          list={suggestionsId}
          value={skillDraft}
          onChange={(event) => setSkillDraft(event.target.value)}
          placeholder="例：応急手当"
          aria-describedby={skillHelpId}
        />
        <button type="submit" className="button button-ghost" disabled={!normalizeSearchText(skillDraft)}>
          追加
        </button>
      </form>
      <datalist id={suggestionsId}>
        {allSkills.map((skill) => <option key={skill} value={skill} />)}
      </datalist>
      <p id={skillHelpId} className="field-hint">複数選ぶと、すべての技能を持つ職業に絞ります。</p>
      <div className="filter-button-grid" aria-label={skillDraft ? "入力に合う技能候補" : "よく使われる技能候補"}>
        {skillCandidates.map((skill) => {
          const selected = filters.skills.some(
            (item) => normalizeSearchText(item) === normalizeSearchText(skill),
          );
          return (
            <button
              type="button"
              key={skill}
              className={selected ? "is-active" : ""}
              aria-pressed={selected}
              onClick={() => toggleSkill(skill)}
            >
              {skill}
            </button>
          );
        })}
      </div>
      {filters.skills.length > 0 && (
        <div className="active-filters" aria-label="選択中の技能">
          {filters.skills.map((skill) => (
            <button type="button" key={skill} onClick={() => toggleSkill(skill)}>
              {skill} ×
            </button>
          ))}
        </div>
      )}

      <fieldset className="aptitude-filter">
        <legend>探索者適性（4以上）</legend>
        <div className="filter-button-grid">
          {aptitudeOptions.map((option) => (
            <button
              type="button"
              key={option.key}
              className={filters.aptitudes.includes(option.key) ? "is-active" : ""}
              aria-pressed={filters.aptitudes.includes(option.key)}
              onClick={() => toggleAptitude(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <button type="button" className="button button-ghost filter-reset" onClick={resetFilters} disabled={!hasFilters}>
        条件をすべてクリア
      </button>
    </>;
  }

  return (
    <div className="occupation-explorer">
      <div className="search-toolbar card-panel">
        <label className="search-field" htmlFor="occupation-search">
          <span className="sr-only">職業名・キーワードで検索</span>
          <span aria-hidden="true">⌕</span>
          <input
            id="occupation-search"
            type="search"
            value={queryDraft}
            onFocus={ensureFullTextSearchIndex}
            onCompositionStart={() => {
              cancelScheduledQueryCommit();
              setIsComposingQuery(true);
            }}
            onCompositionEnd={(event) => {
              queryDraftRef.current = event.currentTarget.value;
              setIsComposingQuery(false);
              setQueryDraft(event.currentTarget.value);
            }}
            onChange={(event) => {
              const nextQuery = event.target.value;
              queryDraftRef.current = nextQuery;
              setQueryDraft(nextQuery);
              if (nextQuery === "" && filtersRef.current.query !== "") {
                updateFilters({ query: "" });
              }
            }}
            placeholder="職業名、知識、出来事から探す"
            aria-describedby="occupation-search-debounce-help"
          />
          <span id="occupation-search-debounce-help" className="sr-only">
            入力を止めてから約0.3秒後に検索結果とURLを更新します
          </span>
        </label>
        <button
          ref={filterOpenButtonRef}
          type="button"
          className="button filter-open"
          onClick={openFilters}
          aria-haspopup="dialog"
          aria-controls="occupation-filter-dialog"
          aria-expanded={filtersOpen}
        >
          絞り込み
        </button>
      </div>

      <BeginnerDiagnosis
        occupations={fullTextSearchPending ? [] : results}
        answers={diagnosisAnswers}
        savedSlugs={savedSlugs}
        comparedSlugs={comparisonSlugs}
        comparisonLimit={COMPARISON_LIMIT}
        onAnswer={updateDiagnosisAnswer}
        onClear={clearDiagnosis}
        onToggleSaved={toggleSavedOccupation}
        onToggleComparison={toggleComparedOccupation}
      />

      <div className="explorer-layout">
        <aside className="filter-panel filter-panel-desktop" aria-labelledby="occupation-filter-sidebar-title">
          {renderFilterControls("desktop")}
        </aside>

        <dialog
          ref={filterDialogRef}
          id="occupation-filter-dialog"
          className="filter-dialog"
          aria-modal="true"
          aria-labelledby="occupation-filter-dialog-title"
          onCancel={() => {
            restoreFilterFocusRef.current = true;
          }}
          onKeyDown={(event) => {
            if (
              event.key !== "Escape" ||
              event.defaultPrevented ||
              event.nativeEvent.isComposing
            ) {
              return;
            }
            event.preventDefault();
            closeFilters();
          }}
          onClose={handleFilterDialogClosed}
          onClick={(event) => {
            if (event.target !== event.currentTarget) return;

            const bounds = event.currentTarget.getBoundingClientRect();
            const clickedBackdrop =
              event.clientX < bounds.left ||
              event.clientX > bounds.right ||
              event.clientY < bounds.top ||
              event.clientY > bounds.bottom;
            if (clickedBackdrop) closeFilters();
          }}
        >
          <div className="filter-dialog__body">
            {renderFilterControls("mobile")}
          </div>
          <footer className="filter-dialog__footer">
            <p role="status" aria-live="polite" aria-atomic="true">
              {fullTextSearchPending ? (
                "検索データを準備中"
              ) : (
                <>現在 <strong>{results.length.toLocaleString("ja-JP")}</strong>件</>
              )}
            </p>
            <button type="button" className="button" onClick={showFilteredResults}>
              結果を見る
            </button>
          </footer>
        </dialog>

        <section className="search-results">
          <div className="results-header">
            <div>
              <span className="eyebrow">ARCHIVE RESULT</span>
              <p
                ref={resultsStatusRef}
                role="status"
                aria-live="polite"
                aria-atomic="true"
                tabIndex={-1}
              >
                {fullTextSearchPending ? (
                  "全文検索データを読み込んでいます"
                ) : (
                  <><strong>{results.length}</strong> 件の職業が見つかりました</>
                )}
              </p>
            </div>
            <label>
              <span>並び順</span>
              <select value={filters.sort} onChange={(event) => updateFilters({ sort: event.target.value as OccupationFilters["sort"] })}>
                <option value="relevance" disabled={!filters.query.trim()}>関連度順</option>
                <option value="recommended">編集部おすすめ順</option>
                <option value="name">名前順</option>
                <option value="newest">新着順</option>
              </select>
            </label>
          </div>

          {hasFilters && (
            <div className="active-filters" aria-label="適用中の検索条件">
              {filters.query && <button onClick={() => updateFilters({ query: "" })}>「{filters.query}」 ×</button>}
              {categoryName && <button onClick={() => updateFilters({ category: "" })}>{categoryName} ×</button>}
              {filters.skills.map((skill) => (
                <button key={`result-skill-${skill}`} onClick={() => toggleSkill(skill)}>{skill} ×</button>
              ))}
              {filters.aptitudes.map((aptitude) => {
                const label = aptitudeOptions.find((option) => option.key === aptitude)?.label ?? aptitude;
                return (
                  <button key={aptitude} onClick={() => toggleAptitude(aptitude)}>{label} ×</button>
                );
              })}
              {searchFacetGroups.flatMap((group) => filters[group.key].map((id) => {
                const option = getSearchFacetOption(group.key, id);
                if (!option) return null;
                return (
                  <button
                    key={`${group.key}-${id}`}
                    onClick={() => toggleFacet(group.key, id)}
                  >
                    {group.label}：{option.label} ×
                  </button>
                );
              }))}
            </div>
          )}

          {savedOccupations.length > 0 || comparisonOccupations.length > 0 ? (
            <Suspense
              fallback={
                <div className="search-index-status card-panel" role="status">
                  保存・比較パネルを準備しています…
                </div>
              }
            >
              <LazyOccupationWorkspace
                savedOccupations={savedOccupations}
                comparisonOccupations={comparisonOccupations}
                comparisonLimit={COMPARISON_LIMIT}
                onRemoveSaved={removeSavedOccupation}
                onClearSaved={clearSavedOccupations}
                onToggleSavedComparison={toggleComparedOccupation}
                onRemoveComparison={removeComparedOccupation}
                onClearComparison={clearComparedOccupations}
              />
            </Suspense>
          ) : null}

          {searchIndexStatus === "error" && hasFullTextQuery ? (
            <div className="search-index-status search-index-status-error card-panel" role="alert">
              <span className="eyebrow">LIMITED SEARCH</span>
              <h2>全文検索データを取得できませんでした</h2>
              <p>職業名・短い説明・技能イメージの範囲で結果を表示しています。</p>
              <button
                type="button"
                className="button button-ghost"
                onClick={ensureFullTextSearchIndex}
              >
                全文検索を再試行
              </button>
            </div>
          ) : null}

          {fullTextSearchPending ? (
            <div className="search-index-status card-panel" role="status" aria-live="polite">
              <span className="eyebrow">SEARCH INDEX</span>
              <h2>全文検索の準備中</h2>
              <p>職業名だけでなく、創作情報や導入例まで照合するためのデータを読み込んでいます。</p>
            </div>
          ) : results.length > 0 ? (
            <>
              <div id="occupation-search-results" className="occupation-grid">
              {visibleResults.map((occupation) => {
                const comparisonSelected = comparisonSlugs.includes(occupation.slug);
                return (
                  <OccupationCard
                    key={occupation.id}
                    occupation={occupation}
                    saved={savedSlugs.includes(occupation.slug)}
                    comparisonSelected={comparisonSelected}
                    comparisonDisabled={
                      comparisonSlugs.length >= COMPARISON_LIMIT && !comparisonSelected
                    }
                    matchReasons={
                      hasFilters
                        ? getSearchMatchReasons(occupation, filters, categoryName)
                        : undefined
                    }
                    beginnerReason={
                      filters.aptitudes.includes("beginnerFriendly")
                        ? getBeginnerEvaluationReason(occupation)
                        : undefined
                    }
                    onToggleSaved={() => toggleSavedOccupation(occupation.slug)}
                    onToggleComparison={() => toggleComparedOccupation(occupation.slug)}
                  />
                );
              })}
              </div>
              {remainingResultCount > 0 ? (
                <div className="load-more-panel">
                  <p>
                    現在 {visibleResults.length.toLocaleString("ja-JP")}/{results.length.toLocaleString("ja-JP")}件を表示
                  </p>
                  <button
                    type="button"
                    className="button button-ghost"
                    aria-controls="occupation-search-results"
                    onClick={() => {
                      setVisibleResultState({
                        filterKey: resultFilterKey,
                        count: Math.min(visibleResults.length + resultBatchSize, results.length),
                      });
                    }}
                  >
                    もっと見る（残り{remainingResultCount.toLocaleString("ja-JP")}件）
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="empty-state card-panel">
              <span className="empty-mark" aria-hidden="true">?</span>
              <h2>条件に合う職業が見つかりませんでした</h2>
              <p>言葉を短くするか、カテゴリーや適性条件を外してみてください。</p>
              <button type="button" className="button" onClick={resetFilters}>すべての職業を見る</button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
