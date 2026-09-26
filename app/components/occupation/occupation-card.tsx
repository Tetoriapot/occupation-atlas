import Link from "next/link";
import { OccupationSelectionTools } from "@/app/components/occupation/occupation-selection-tools";
import { getTopAptitudes } from "@/app/lib/aptitudes";
import { getLightweightCategoryById } from "@/app/lib/categories";
import type { Category, Occupation } from "@/app/types/occupation";
import type { OccupationMatchReason } from "@/app/types/occupation-search";

type OccupationCardData = Pick<
  Occupation,
  | "id"
  | "slug"
  | "name"
  | "categoryId"
  | "catchphrase"
  | "shortDescription"
  | "aptitude"
  | "skillImages"
>;

type OccupationCardProps = {
  occupation: OccupationCardData;
  category?: Category;
  headingLevel?: "h2" | "h3";
  saved?: boolean;
  comparisonSelected?: boolean;
  comparisonDisabled?: boolean;
  matchReasons?: OccupationMatchReason[];
  beginnerReason?: string;
  showSelectionTools?: boolean;
  onToggleSaved?: () => void;
  onToggleComparison?: () => void;
};

export function OccupationCard({
  occupation,
  category,
  headingLevel = "h3",
  saved = false,
  comparisonSelected = false,
  comparisonDisabled = false,
  matchReasons = [],
  beginnerReason,
  showSelectionTools = false,
  onToggleSaved,
  onToggleComparison,
}: OccupationCardProps) {
  const resolvedCategory = category ?? getLightweightCategoryById(occupation.categoryId);
  const Heading = headingLevel;
  const topAptitudes = getTopAptitudes(occupation.aptitude);

  return (
    <article className="occupation-card">
      <Link
        className="occupation-card__link"
        href={`/occupations/${occupation.slug}`}
        aria-label={`${occupation.name}の職業詳細を読む`}
      >
        <div className="occupation-card__topline">
          <span className="occupation-card__index">図鑑 {occupation.id}</span>
          {resolvedCategory ? (
            <span className="occupation-card__category">
              <span aria-hidden="true">{resolvedCategory.symbol}</span>
              {resolvedCategory.name}
            </span>
          ) : null}
        </div>

        <Heading className="occupation-card__title">{occupation.name}</Heading>
        <p className="occupation-card__catchphrase">{occupation.catchphrase}</p>
        <p className="occupation-card__description">{occupation.shortDescription}</p>

        {matchReasons.length > 0 ? (
          <div className="occupation-card__matches">
            <p>検索条件との一致箇所</p>
            <ul aria-label={`${occupation.name}が検索条件に一致した理由`}>
              {matchReasons.slice(0, 4).map((reason, index) => (
                <li key={`${reason.label}-${reason.value}-${index}`}>
                  <span className="occupation-card__match-heading">
                    <strong>{reason.label}</strong>
                    <span>{reason.value}</span>
                  </span>
                  {reason.snippet ? (
                    <span className="occupation-card__match-snippet">
                      {reason.snippet}
                    </span>
                  ) : null}
                </li>
              ))}
              {matchReasons.length > 4 ? (
                <li className="occupation-card__matches-more">
                  ほか{matchReasons.length - 4}条件に一致
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}

        <dl className="occupation-card__aptitudes" aria-label="探索者適性の上位3項目">
          {topAptitudes.map((aptitude) => (
            <div key={aptitude.key}>
              <dt>{aptitude.label}</dt>
              <dd>{aptitude.value}/5</dd>
            </div>
          ))}
        </dl>

        {beginnerReason ? (
          <p className="occupation-card__beginner-reason">{beginnerReason}</p>
        ) : null}

        {occupation.skillImages.length > 0 ? (
          <ul className="occupation-card__skills" aria-label="技能イメージ">
            {occupation.skillImages.slice(0, 3).map((skill) => (
              <li key={skill}>{skill}</li>
            ))}
          </ul>
        ) : null}

        <span className="occupation-card__action" aria-hidden="true">
          詳細を見る <span>→</span>
        </span>
      </Link>

      {onToggleSaved || onToggleComparison ? (
        <div className="occupation-card__tools" aria-label={`${occupation.name}の候補操作`}>
          {onToggleSaved ? (
            <button
              type="button"
              className={saved ? "is-active" : ""}
              aria-pressed={saved}
              aria-label={`${occupation.name}を${saved ? "候補から外す" : "候補に保存"}`}
              onClick={onToggleSaved}
            >
              {saved ? "候補から外す" : "候補に保存"}
            </button>
          ) : null}
          {onToggleComparison ? (
            <button
              type="button"
              className={comparisonSelected ? "is-active" : ""}
              aria-pressed={comparisonSelected}
              disabled={comparisonDisabled && !comparisonSelected}
              aria-label={
                comparisonDisabled && !comparisonSelected
                  ? `${occupation.name}は比較上限のため追加できません`
                  : `${occupation.name}を${comparisonSelected ? "比較から外す" : "比較に追加"}`
              }
              onClick={onToggleComparison}
            >
              {comparisonSelected ? "比較中" : "比較に追加"}
            </button>
          ) : null}
        </div>
      ) : showSelectionTools ? (
        <OccupationSelectionTools slug={occupation.slug} name={occupation.name} />
      ) : null}
    </article>
  );
}
