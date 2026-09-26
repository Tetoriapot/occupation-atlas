"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import {
  formatJapaneseDateLabel,
  getDailyOccupationIndex,
  getTokyoDateKey,
} from "@/app/components/home/daily-occupation-selection";

export type DailyOccupationItem = {
  id: string;
  slug: string;
  name: string;
  catchphrase: string;
  shortDescription: string;
  categoryName: string;
  categorySlug: string;
  skillImages: string[];
};

function getCurrentTokyoDateKey(): string {
  return getTokyoDateKey(new Date());
}

function subscribeToTokyoDate(onStoreChange: () => void): () => void {
  const intervalId = window.setInterval(onStoreChange, 60_000);
  window.addEventListener("focus", onStoreChange);
  document.addEventListener("visibilitychange", onStoreChange);

  return () => {
    window.clearInterval(intervalId);
    window.removeEventListener("focus", onStoreChange);
    document.removeEventListener("visibilitychange", onStoreChange);
  };
}

type Props = {
  occupations: DailyOccupationItem[];
  serverDateKey: string;
};

export function DailyOccupation({ occupations, serverDateKey }: Props) {
  const dateKey = useSyncExternalStore(
    subscribeToTokyoDate,
    getCurrentTokyoDateKey,
    () => serverDateKey,
  );
  const [alternate, setAlternate] = useState<{ dateKey: string; index: number } | null>(null);
  const [announcement, setAnnouncement] = useState("");

  if (occupations.length === 0) return null;

  const dailyIndex = getDailyOccupationIndex(dateKey, occupations.length);
  const validAlternate = alternate?.dateKey === dateKey && alternate.index !== dailyIndex;
  const currentIndex = validAlternate ? alternate.index : dailyIndex;
  const occupation = occupations[currentIndex];
  const dailyOccupation = occupations[dailyIndex];

  function drawAnother() {
    if (occupations.length < 2) return;

    const candidates = occupations
      .map((_, index) => index)
      .filter((index) => index !== dailyIndex && index !== currentIndex);
    const fallbackCandidates = occupations
      .map((_, index) => index)
      .filter((index) => index !== dailyIndex);
    const pool = candidates.length > 0 ? candidates : fallbackCandidates;
    const index = pool[Math.floor(Math.random() * pool.length)];
    setAlternate({ dateKey, index });
    setAnnouncement(`別の候補として「${occupations[index].name}」を表示しました。`);
  }

  function returnToDailyOccupation() {
    setAlternate(null);
    setAnnouncement(`本日の一職「${dailyOccupation.name}」に戻りました。`);
  }

  return (
    <section className="home-section random-section" id="daily-occupation" aria-labelledby="daily-title">
      <div className="shell random-panel">
        <div className="random-intro">
          <p className="eyebrow">DAILY ENTRY</p>
          <h2 id="daily-title">本日の一職</h2>
          <p className="daily-date"><time dateTime={dateKey}>{formatJapaneseDateLabel(dateKey)}</time></p>
          <p>
            東京の日付から図鑑の一件を選ぶ、日替わりの入口です。
            編集部の順位やアクセス数による選定ではなく、同じ日は誰が見ても同じ職業になります。
          </p>
          <div className="random-actions">
            <button className="random-button" type="button" onClick={drawAnother}>
              別の一職を見る
            </button>
            {validAlternate && (
              <button
                className="random-button random-button-secondary"
                type="button"
                onClick={returnToDailyOccupation}
              >
                本日の一職に戻る
              </button>
            )}
          </div>
        </div>

        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {announcement}
        </p>
        <article className="random-card">
          <div className="random-card-meta">
            <span>図鑑 No. {occupation.id}</span>
            <Link href={`/categories/${occupation.categorySlug}`}>{occupation.categoryName}</Link>
          </div>
          {validAlternate && (
            <p className="random-card-status">
              別の候補を表示中。本日の一職は「{dailyOccupation.name}」です。
            </p>
          )}
          <p className="random-card-catchphrase">{occupation.catchphrase}</p>
          <h3>{occupation.name}</h3>
          <p>{occupation.shortDescription}</p>
          <ul className="tag-list" aria-label="技能イメージ">
            {occupation.skillImages.slice(0, 4).map((skill) => (
              <li key={skill}>{skill}</li>
            ))}
          </ul>
          <Link className="button-link" href={`/occupations/${occupation.slug}`}>
            {validAlternate ? "この候補を読む" : "本日の一職を読む"}
          </Link>
        </article>
      </div>
    </section>
  );
}
