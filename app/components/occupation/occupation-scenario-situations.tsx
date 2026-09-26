import type { ScenarioSituation } from "@/app/types/occupation";

type OccupationScenarioSituationsProps = {
  situations: ScenarioSituation[];
};

export function OccupationScenarioSituations({
  situations,
}: OccupationScenarioSituationsProps) {
  return (
    <section
      id="scenario-situations"
      className="occupation-section occupation-section--scenario-situations"
      aria-labelledby="scenario-situations-title"
    >
      <header className="occupation-section__header">
        <p className="occupation-section__eyebrow">SCENARIO FIT</p>
        <h2 id="scenario-situations-title">おすすめシナリオシチュエーション</h2>
        <p>
          この職業を物語へ自然に導入しやすい舞台例と、なぜその場で活躍しやすいのかを紹介します。
        </p>
      </header>

      <ol className="scenario-situation-grid" role="list">
        {situations.map((situation, index) => (
          <li key={`${situation.title}-${index}`}>
            <article className="scenario-situation-card">
              <p className="scenario-situation-card__number" aria-hidden="true">
                SCENE {String(index + 1).padStart(2, "0")}
              </p>
              <h3>{situation.title}</h3>
              <p>{situation.reason}</p>
            </article>
          </li>
        ))}
      </ol>

      <p className="scenario-situations-note" role="note">
        シチュエーションは創作・RPの発想を広げるための独自提案です。特定のTRPGシステムのルールや推奨構成を示すものではありません。
      </p>
    </section>
  );
}
