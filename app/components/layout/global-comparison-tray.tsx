"use client";

import Link from "next/link";
import {
  clearComparedOccupations,
  COMPARISON_LIMIT,
  useComparedOccupationSlugs,
} from "@/app/lib/occupation-shortlist";

export function GlobalComparisonTray() {
  const comparedSlugs = useComparedOccupationSlugs();
  const comparisonCount = comparedSlugs.length;
  const comparisonHref = `/occupations?compare=${encodeURIComponent(
    comparedSlugs.join(","),
  )}#comparison-title`;

  return (
    <>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        比較候補は{comparisonCount}件です。最大{COMPARISON_LIMIT}件まで選べます。
      </p>
      {comparisonCount > 0 ? (
        <aside
          className="global-comparison-tray"
          aria-label="職業比較"
        >
          <p className="global-comparison-tray__count">
            <strong>比較 {comparisonCount}/{COMPARISON_LIMIT}</strong>
          </p>
          <div className="global-comparison-tray__actions">
            <Link
              className="global-comparison-tray__view"
              href={comparisonHref}
              aria-label={`選択中の${comparisonCount}件を比較する`}
            >
              比較を見る
            </Link>
            <button
              type="button"
              className="global-comparison-tray__clear"
              onClick={clearComparedOccupations}
            >
              クリア
            </button>
          </div>
        </aside>
      ) : null}
    </>
  );
}
