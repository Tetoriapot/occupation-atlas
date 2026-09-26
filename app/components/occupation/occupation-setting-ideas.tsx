import type { CreativeIdea, OccupationSetting } from "@/app/types/occupation";

type OccupationSettingIdeasProps = {
  setting: OccupationSetting;
  creativeIdeas: CreativeIdea[];
};

export function OccupationSettingIdeas({
  setting,
  creativeIdeas,
}: OccupationSettingIdeasProps) {
  return (
    <section
      id="setting-and-ideas"
      className="occupation-section occupation-section--setting-ideas"
      aria-labelledby="setting-and-ideas-title"
    >
      <header className="occupation-section__header">
        <p className="occupation-section__eyebrow">SETTING VARIATIONS</p>
        <h2 id="setting-and-ideas-title">時代・地域と創作案</h2>
        <p>
          現実の職業解説が基準とする時代・地域と、そこから発想を広げるための設定例です。
        </p>
      </header>

      <aside className="occupation-setting" aria-label="現実職業解説の基準">
        <div className="occupation-setting__heading">
          <p className="occupation-setting__label">現実職業解説の基準</p>
          <ul className="occupation-setting__tags">
            {setting.eras.map((era) => (
              <li key={`era-${era}`}>
                <span>時代</span>{era}
              </li>
            ))}
            {setting.regions.map((region) => (
              <li key={`region-${region}`}>
                <span>地域</span>{region}
              </li>
            ))}
          </ul>
        </div>
        <p>{setting.note}</p>
      </aside>

      <div className="creative-idea-grid">
        {creativeIdeas.map((idea, index) => (
          <article className="creative-idea-card" key={idea.title}>
            <p className="creative-idea-card__number" aria-hidden="true">
              IDEA {String(index + 1).padStart(2, "0")}
            </p>
            <ul className="creative-idea-card__tags" aria-label={`${idea.title}の設定`}>
              <li><span>時代</span>{idea.era}</li>
              <li><span>地域</span>{idea.region}</li>
            </ul>
            <h3>{idea.title}</h3>
            <p>{idea.summary}</p>
          </article>
        ))}
      </div>

      <p className="creative-ideas-disclaimer" role="note">
        <strong>創作上の設定です：</strong>
        「創作案」はキャラクターやシナリオの発想を広げるための独自案です。時代風・架空地域の案は、実在する制度、地域、人物、史実を再現するものではありません。
      </p>
    </section>
  );
}
