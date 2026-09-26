import type { Occupation } from "@/app/types/occupation";

type Overview = Occupation["overview"];

function TextList({ items }: { items: string[] }) {
  return (
    <ul className="detail-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function OccupationOverview({ overview }: { overview: Overview }) {
  return (
    <section id="overview" className="occupation-section" aria-labelledby="occupation-overview-title">
      <header className="occupation-section__header">
        <p className="occupation-section__eyebrow">REAL WORLD</p>
        <h2 id="occupation-overview-title">職業概要</h2>
      </header>

      <div className="occupation-fact-grid">
        <section className="occupation-fact occupation-fact--wide">
          <h3>仕事内容</h3>
          <TextList items={overview.responsibilities} />
        </section>

        <section className="occupation-fact">
          <h3>どんな人がなる？</h3>
          <TextList items={overview.typicalPeople} />
        </section>

        <section className="occupation-fact">
          <h3>向いている人</h3>
          <TextList items={overview.suitableFor} />
        </section>

        <section className="occupation-fact">
          <h3>必要資格</h3>
          <TextList items={overview.qualifications} />
        </section>

        <section className="occupation-fact">
          <h3>必要学歴</h3>
          <TextList items={overview.education} />
        </section>

        <section className="occupation-fact">
          <h3>平均的な勤務形態</h3>
          <TextList items={overview.workStyle} />
        </section>

        <section className="occupation-fact occupation-fact--income">
          <h3>年収目安</h3>
          <p className="occupation-fact__lead">{overview.annualIncome.summary}</p>
          <p className="occupation-fact__note">{overview.annualIncome.note}</p>
        </section>
      </div>

      <section className="daily-schedule" aria-labelledby="daily-schedule-title">
        <h3 id="daily-schedule-title">一日の流れ</h3>
        <p className="daily-schedule__note">代表的な一例です。所属先や担当によって異なります。</p>
        <ol>
          {overview.dailySchedule.map((item) => (
            <li key={`${item.time}-${item.title}`}>
              <time>{item.time}</time>
              <div>
                <h4>{item.title}</h4>
                <p>{item.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </section>
  );
}
