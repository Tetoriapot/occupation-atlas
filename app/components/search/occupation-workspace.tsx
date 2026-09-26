"use client";

import Link from "next/link";
import { useState } from "react";
import { aptitudeLabels, aptitudeOrder } from "@/app/lib/aptitudes";
import { getBeginnerEvaluationReason } from "@/app/lib/beginner-diagnosis";
import { getLightweightCategoryById } from "@/app/lib/categories";
import { getEncodedSearchFacetLabels } from "@/app/lib/search-facets";
import type { OccupationSearchRecord } from "@/app/types/occupation-search";

type Props = {
  savedOccupations: OccupationSearchRecord[];
  comparisonOccupations: OccupationSearchRecord[];
  comparisonLimit: number;
  onRemoveSaved: (slug: string) => void;
  onClearSaved: () => void;
  onToggleSavedComparison: (slug: string) => void;
  onRemoveComparison: (slug: string) => void;
  onClearComparison: () => void;
};

export function OccupationWorkspace({
  savedOccupations,
  comparisonOccupations,
  comparisonLimit,
  onRemoveSaved,
  onClearSaved,
  onToggleSavedComparison,
  onRemoveComparison,
  onClearComparison,
}: Props) {
  const [shareStatus, setShareStatus] = useState("");

  if (savedOccupations.length === 0 && comparisonOccupations.length === 0) return null;

  async function shareComparison() {
    const url = new URL(window.location.href);
    url.searchParams.set(
      "compare",
      comparisonOccupations.map((occupation) => occupation.slug).join(","),
    );
    const title = `職業比較｜${comparisonOccupations.map((occupation) => occupation.name).join("・")}`;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url: url.toString() });
        setShareStatus("比較リンクの共有メニューを開きました。");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url.toString());
      setShareStatus("比較状態を復元できるURLをコピーしました。");
    } catch {
      setShareStatus("URLをコピーできませんでした。ブラウザーのアドレス欄からコピーしてください。");
    }
  }

  return (
    <div className="occupation-workspace">
      {savedOccupations.length > 0 ? (
        <section className="shortlist-panel card-panel" aria-labelledby="shortlist-title">
          <div className="workspace-heading">
            <div>
              <span className="eyebrow">SHORTLIST</span>
              <h2 id="shortlist-title">保存した候補</h2>
              <p>{savedOccupations.length}件をこの端末に保存しています。</p>
            </div>
            <button type="button" className="workspace-clear" onClick={onClearSaved}>
              保存をすべて解除
            </button>
          </div>
          <ul className="shortlist-items">
            {savedOccupations.map((occupation) => (
              <li key={occupation.slug}>
                <Link href={`/occupations/${occupation.slug}`}>{occupation.name}</Link>
                <button
                  type="button"
                  className={
                    comparisonOccupations.some((item) => item.slug === occupation.slug)
                      ? "is-active"
                      : ""
                  }
                  aria-pressed={comparisonOccupations.some((item) => item.slug === occupation.slug)}
                  aria-label={
                    comparisonOccupations.some((item) => item.slug === occupation.slug)
                      ? `${occupation.name}を比較から外す`
                      : comparisonOccupations.length >= comparisonLimit
                        ? `${occupation.name}は比較上限${comparisonLimit}件のため追加できません`
                      : `${occupation.name}を比較に追加`
                  }
                  disabled={
                    comparisonOccupations.length >= comparisonLimit
                    && !comparisonOccupations.some((item) => item.slug === occupation.slug)
                  }
                  onClick={() => onToggleSavedComparison(occupation.slug)}
                >
                  {comparisonOccupations.some((item) => item.slug === occupation.slug)
                    ? "比較中"
                    : "比較に追加"}
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveSaved(occupation.slug)}
                  aria-label={`${occupation.name}を候補から外す`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {comparisonOccupations.length > 0 ? (
        <section className="comparison-panel card-panel" aria-labelledby="comparison-title">
          <div className="workspace-heading">
            <div>
              <span className="eyebrow">COMPARE</span>
              <h2 id="comparison-title">職業を比較</h2>
              <p>
                {comparisonOccupations.length}/{comparisonLimit}件を選択中
              </p>
            </div>
            <div className="workspace-actions">
              <button type="button" className="workspace-share" onClick={shareComparison}>
                比較URLを共有
              </button>
              <button type="button" className="workspace-clear" onClick={onClearComparison}>
                比較をクリア
              </button>
            </div>
          </div>

          <p className="workspace-share-status" role="status" aria-live="polite" aria-atomic="true">
            {shareStatus}
          </p>

          {comparisonOccupations.length < 2 ? (
            <p className="comparison-hint">もう1件選ぶと、適性と技能を並べて比較できます。</p>
          ) : (
            <div className="comparison-table-scroll" tabIndex={0} aria-label="職業比較表。横にスクロールできます">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th scope="col">比較項目</th>
                    {comparisonOccupations.map((occupation) => (
                      <th scope="col" key={occupation.slug}>
                        <Link href={`/occupations/${occupation.slug}`}>{occupation.name}</Link>
                        <button
                          type="button"
                          onClick={() => onRemoveComparison(occupation.slug)}
                          aria-label={`${occupation.name}を比較から外す`}
                        >
                          比較から外す
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">カテゴリー</th>
                    {comparisonOccupations.map((occupation) => (
                      <td key={occupation.slug}>
                        {getLightweightCategoryById(occupation.categoryId)?.name ??
                          occupation.categoryId}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">時代・地域</th>
                    {comparisonOccupations.map((occupation) => {
                      const eras = getEncodedSearchFacetLabels(
                        occupation.facetCodes,
                        "eras",
                      );
                      const regions = getEncodedSearchFacetLabels(
                        occupation.facetCodes,
                        "regions",
                      );
                      return (
                        <td key={occupation.slug}>
                          <span className="comparison-table__label">時代</span>
                          {eras.slice(0, 3).join("、") || "設定による"}
                          <br />
                          <span className="comparison-table__label">地域</span>
                          {regions.slice(0, 3).join("、") || "設定による"}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <th scope="row">初心者評価の理由</th>
                    {comparisonOccupations.map((occupation) => (
                      <td key={occupation.slug}>
                        {getBeginnerEvaluationReason(occupation)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">活躍しやすい場面</th>
                    {comparisonOccupations.map((occupation) => (
                      <td key={occupation.slug}>
                        {occupation.searchPreviews.settingAndScenarios[0] ??
                          occupation.shortDescription}
                      </td>
                    ))}
                  </tr>
                  {aptitudeOrder.map((key) => (
                    <tr key={key}>
                      <th scope="row">{aptitudeLabels[key]}</th>
                      {comparisonOccupations.map((occupation) => (
                        <td key={occupation.slug}>{occupation.aptitude[key]}/5</td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <th scope="row">技能イメージ</th>
                    {comparisonOccupations.map((occupation) => (
                      <td key={occupation.slug}>{occupation.skillImages.slice(0, 4).join("、")}</td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">立場・RPの入口</th>
                    {comparisonOccupations.map((occupation) => (
                      <td key={occupation.slug}>{occupation.roleplayTip}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
