import { StarRating } from "@/app/components/occupation/star-rating";
import type { AptitudeKey, Occupation } from "@/app/types/occupation";

const aptitudeFields: Array<{ key: AptitudeKey; label: string; description: string }> = [
  { key: "investigation", label: "調査", description: "情報を集め、手がかりを読み解く役を作りやすい" },
  { key: "negotiation", label: "交渉", description: "会話や信頼関係から展開を動かす役を作りやすい" },
  { key: "combat", label: "戦闘", description: "危険な場面で身体的に行動する設定へつなげやすい" },
  { key: "infiltration", label: "潜入", description: "人目を避けた行動や立入理由を設定しやすい" },
  { key: "support", label: "サポート", description: "仲間の判断や行動を支える役を作りやすい" },
  { key: "knowledge", label: "知識", description: "専門知識を物語の手がかりとして扱いやすい" },
  { key: "beginnerFriendly", label: "初心者おすすめ", description: "知名度が高く、専門知識なしでも日常や会話を演じ始めやすい" },
];

export function AptitudeRatings({
  aptitude,
  aptitudeReasons,
  beginnerReason,
}: {
  aptitude: Occupation["aptitude"];
  aptitudeReasons?: Occupation["aptitudeReasons"];
  beginnerReason?: string;
}) {
  return (
    <section id="aptitude" className="occupation-section aptitude-section" aria-labelledby="aptitude-title">
      <header className="occupation-section__header">
        <p className="occupation-section__eyebrow">CREATIVE FIT</p>
        <h2 id="aptitude-title">探索者適性</h2>
        <p>
          ゲーム上の能力値ではなく、この職業をキャラクターの設定やRPへ取り入れやすいかを表す独自評価です。3を標準とし、4・5は職務との結びつきが特に強い場合に付けています。
        </p>
      </header>

      {beginnerReason ? (
        <aside className="beginner-evaluation-note" aria-labelledby="beginner-evaluation-title">
          <strong id="beginner-evaluation-title">初心者おすすめの評価理由</strong>
          <p>{beginnerReason}</p>
        </aside>
      ) : null}

      <dl className="aptitude-list">
        {aptitudeFields.map((field) => (
          <div className="aptitude-list__item" key={field.key}>
            <dt>
              <span className="aptitude-list__label">{field.label}</span>
              <span className="aptitude-list__description">{field.description}</span>
              {aptitudeReasons?.[field.key] ? (
                <span className="aptitude-list__reason">
                  {aptitudeReasons[field.key]}
                </span>
              ) : null}
            </dt>
            <dd>
              <StarRating label={field.label} value={aptitude[field.key]} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
