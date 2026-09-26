import Link from "next/link";
import {
  beginnerDiagnosisQuestions,
  getBeginnerDiagnosisMatchReasons,
  getBeginnerEvaluationReason,
  isCompleteBeginnerDiagnosis,
  rankBeginnerOccupations,
  type BeginnerDiagnosisAnswerKey,
  type BeginnerDiagnosisAnswers,
} from "@/app/lib/beginner-diagnosis";
import { aptitudeLabels, getTopAptitudes } from "@/app/lib/aptitudes";
import type { OccupationSearchRecord } from "@/app/types/occupation-search";

type BeginnerAnswerValue = BeginnerDiagnosisAnswers[BeginnerDiagnosisAnswerKey];

type BeginnerDiagnosisProps = {
  occupations: OccupationSearchRecord[];
  answers: Partial<BeginnerDiagnosisAnswers>;
  savedSlugs: readonly string[];
  comparedSlugs: readonly string[];
  comparisonLimit: number;
  onAnswer: (key: BeginnerDiagnosisAnswerKey, value: BeginnerAnswerValue) => void;
  onClear: () => void;
  onToggleSaved: (slug: string) => void;
  onToggleComparison: (slug: string) => void;
};

export function BeginnerDiagnosis({
  occupations,
  answers,
  savedSlugs,
  comparedSlugs,
  comparisonLimit,
  onAnswer,
  onClear,
  onToggleSaved,
  onToggleComparison,
}: BeginnerDiagnosisProps) {
  const answeredCount = beginnerDiagnosisQuestions.filter(
    ({ key }) => answers[key] !== undefined,
  ).length;
  const complete = isCompleteBeginnerDiagnosis(answers);
  const recommendations = complete
    ? rankBeginnerOccupations(occupations, answers, 6)
    : [];
  const activeQuestion = complete
    ? undefined
    : beginnerDiagnosisQuestions.find(({ key }) => answers[key] === undefined);

  return (
    <section className="beginner-diagnosis card-panel" aria-labelledby="beginner-diagnosis-title">
      <header className="beginner-diagnosis__header">
        <div>
          <span className="eyebrow">FIRST INVESTIGATOR</span>
          <h2 id="beginner-diagnosis-title">初心者向け・3問職業診断</h2>
          <p>遊びたい役割と準備量から、最初の探索者に取り入れやすい職業を順位付けします。</p>
        </div>
        <p className="beginner-diagnosis__progress">
          回答 {answeredCount}/3
        </p>
      </header>

      {complete ? (
        <dl className="beginner-diagnosis__answer-summary" aria-label="診断で選んだ回答">
          {beginnerDiagnosisQuestions.map((question, questionIndex) => {
            const answer = answers[question.key];
            const selectedOption = question.options.find(({ value }) => value === answer);
            return (
              <div key={question.key}>
                <dt>Q{questionIndex + 1}</dt>
                <dd>{selectedOption?.label}</dd>
              </div>
            );
          })}
        </dl>
      ) : activeQuestion ? (
        <div className="beginner-diagnosis__questions">
          <fieldset key={activeQuestion.key}>
            <legend>
              <span>{answeredCount + 1}</span>
              {activeQuestion.legend}
            </legend>
            <div className="beginner-diagnosis__options">
              {activeQuestion.options.map((option) => {
                const inputId = `beginner-${activeQuestion.key}-${option.value}`;
                return (
                  <label key={option.value} htmlFor={inputId}>
                    <input
                      id={inputId}
                      type="radio"
                      name={`beginner-${activeQuestion.key}`}
                      value={option.value}
                      checked={answers[activeQuestion.key] === option.value}
                      onChange={() =>
                        onAnswer(
                          activeQuestion.key,
                          option.value as BeginnerAnswerValue,
                        )}
                    />
                    <span>
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>
      ) : null}

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {complete
          ? recommendations.length > 0
            ? `診断が完了しました。おすすめの${recommendations.length}職を表示しました。`
            : "診断が完了しましたが、現在の検索条件に合う候補はありません。"
          : ""}
      </p>

      {answeredCount > 0 ? (
        <button type="button" className="button button-ghost beginner-diagnosis__clear" onClick={onClear}>
          診断をやり直す
        </button>
      ) : null}

      {complete ? (
        <div className="beginner-diagnosis__results" aria-labelledby="beginner-results-title">
          <div className="beginner-diagnosis__results-heading">
            <div>
              <span className="eyebrow">YOUR PICKS</span>
              <h3 id="beginner-results-title">
                あなたに合いそうな{recommendations.length}職
              </h3>
            </div>
            <p>現在の検索結果を、3回答との相性で並べ直しています。</p>
          </div>
          {recommendations.length > 0 ? <ol>
            {recommendations.map(({ occupation }, index) => {
              const topAptitude = getTopAptitudes(occupation.aptitude, 7)
                .find(({ key }) => key !== "beginnerFriendly");
              const matchReasons = getBeginnerDiagnosisMatchReasons(occupation, answers);
              const saved = savedSlugs.includes(occupation.slug);
              const compared = comparedSlugs.includes(occupation.slug);
              const comparisonFull =
                comparedSlugs.length >= comparisonLimit && !compared;
              return (
                <li key={occupation.slug}>
                  <article>
                    <div className="beginner-diagnosis__result-topline">
                      <span>候補 {index + 1}</span>
                      <span>
                        {aptitudeLabels.beginnerFriendly} {occupation.aptitude.beginnerFriendly}/5
                      </span>
                    </div>
                    <h4><Link href={`/occupations/${occupation.slug}`}>{occupation.name}</Link></h4>
                    {topAptitude ? (
                      <p className="beginner-diagnosis__fit">
                        得意な役割：{topAptitude.label} {topAptitude.value}/5
                      </p>
                    ) : null}
                    <p>{getBeginnerEvaluationReason(occupation)}</p>
                    <ul
                      className="beginner-diagnosis__match-reasons"
                      aria-label={`${occupation.name}が診断結果に合う理由`}
                    >
                      {matchReasons.map((reason) => (
                        <li key={reason.label}>
                          <strong>{reason.label}</strong>
                          <span>{reason.text}</span>
                        </li>
                      ))}
                    </ul>
                    <div
                      className="beginner-diagnosis__result-tools"
                      aria-label={`${occupation.name}の候補操作`}
                    >
                      <button
                        type="button"
                        className={saved ? "is-active" : ""}
                        aria-pressed={saved}
                        onClick={() => onToggleSaved(occupation.slug)}
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
                            ? `${occupation.name}は比較上限${comparisonLimit}件のため追加できません`
                            : undefined
                        }
                        onClick={() => onToggleComparison(occupation.slug)}
                      >
                        {compared
                          ? "比較中"
                          : comparisonFull
                            ? `比較は${comparisonLimit}件まで`
                            : "比較に追加"}
                      </button>
                    </div>
                    <Link className="beginner-diagnosis__detail-link" href={`/occupations/${occupation.slug}`}>
                      詳細を見る <span aria-hidden="true">→</span>
                    </Link>
                  </article>
                </li>
              );
            })}
          </ol> : (
            <div className="beginner-diagnosis__empty" role="status">
              <p>現在の検索・絞り込み条件に合う診断候補がありません。</p>
              <p>条件を少し減らしてから、診断結果をもう一度確認してください。</p>
            </div>
          )}
        </div>
      ) : (
        <p className="beginner-diagnosis__prompt">
          1問ずつ回答します。あと{3 - answeredCount}問で候補を表示します。
        </p>
      )}
    </section>
  );
}
