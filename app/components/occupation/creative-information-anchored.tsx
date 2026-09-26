import type { Occupation } from "@/app/types/occupation";

type CreativeInformation = Occupation["creative"];

const creativeFields: Array<{
  key: keyof CreativeInformation;
  id: string;
  title: string;
  marker: string;
}> = [
  { key: "investigatorFeatures", id: "investigator-features", title: "探索者としての特徴", marker: "01" },
  { key: "likelyKnowledge", id: "likely-knowledge", title: "持っていそうな知識", marker: "02" },
  { key: "roleplayTips", id: "roleplay-tips", title: "RPのヒント", marker: "03" },
  { key: "personalityExamples", id: "personality-examples", title: "性格の例", marker: "04" },
  { key: "everydayEvents", id: "everyday-events", title: "日常で遭遇しそうな出来事", marker: "05" },
  { key: "scenarioHooks", id: "scenario-hooks", title: "シナリオへの導入例", marker: "06" },
  { key: "commonCharacterSettings", id: "common-character-settings", title: "よくある創作設定", marker: "07" },
];

export function CreativeInformationAnchored({ creative }: { creative: CreativeInformation }) {
  return (
    <section
      id="creative-information"
      className="occupation-section occupation-section--creative"
      aria-labelledby="creative-information-title"
    >
      <header className="occupation-section__header">
        <p className="occupation-section__eyebrow">FOR CREATORS</p>
        <h2 id="creative-information-title">創作向け情報</h2>
        <p>現実の職業像から発想を広げるための、キャラクターづくりとRPの手がかりです。</p>
      </header>

      <div className="creative-grid">
        {creativeFields.map((field) => (
          <section
            id={field.id}
            className="creative-card creative-card--anchor-target"
            key={field.key}
            aria-labelledby={`${field.id}-title`}
          >
            <span className="creative-card__marker" aria-hidden="true">{field.marker}</span>
            <h3 id={`${field.id}-title`}>{field.title}</h3>
            <ul className="detail-list">
              {creative[field.key].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
