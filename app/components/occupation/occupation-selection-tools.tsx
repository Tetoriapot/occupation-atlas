"use client";

import {
  COMPARISON_LIMIT,
  toggleComparedOccupation,
  toggleSavedOccupation,
  useComparedOccupationSlugs,
  useSavedOccupationSlugs,
} from "@/app/lib/occupation-shortlist";

type OccupationSelectionToolsProps = {
  slug: string;
  name: string;
  variant?: "card" | "detail";
};

export function OccupationSelectionTools({
  slug,
  name,
  variant = "card",
}: OccupationSelectionToolsProps) {
  const savedSlugs = useSavedOccupationSlugs();
  const comparedSlugs = useComparedOccupationSlugs();
  const saved = savedSlugs.includes(slug);
  const compared = comparedSlugs.includes(slug);
  const comparisonFull = comparedSlugs.length >= COMPARISON_LIMIT && !compared;

  return (
    <div
      className={`occupation-selection-tools occupation-selection-tools--${variant}`}
      role="group"
      aria-label={`${name}の候補操作`}
    >
      <button
        type="button"
        className={saved ? "is-active" : ""}
        aria-pressed={saved}
        aria-label={`${name}を${saved ? "候補から外す" : "候補に保存"}`}
        onClick={() => toggleSavedOccupation(slug)}
      >
        {saved ? "候補から外す" : "候補に保存"}
      </button>
      <button
        type="button"
        className={compared ? "is-active" : ""}
        aria-pressed={compared}
        disabled={comparisonFull}
        aria-label={
          comparisonFull
            ? `${name}は比較上限${COMPARISON_LIMIT}件のため追加できません`
            : `${name}を${compared ? "比較から外す" : "比較に追加"}`
        }
        onClick={() => toggleComparedOccupation(slug)}
      >
        {compared ? "比較中" : comparisonFull ? `比較は${COMPARISON_LIMIT}件まで` : "比較に追加"}
      </button>
    </div>
  );
}
