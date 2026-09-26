import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ページが見つかりません",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="page-shell not-found-page">
      <section className="not-found-card" aria-labelledby="not-found-title">
        <p className="not-found-card__code" aria-hidden="true">404</p>
        <p className="not-found-card__eyebrow">RECORD NOT FOUND</p>
        <h1 id="not-found-title">その記録は見つかりませんでした</h1>
        <p>
          URLが変更されたか、職業データがまだ図鑑へ登録されていない可能性があります。
        </p>
        <div className="not-found-card__actions">
          <Link className="button-link" href="/occupations">職業を探す</Link>
          <Link className="text-link" href="/">トップへ戻る</Link>
        </div>
      </section>
    </div>
  );
}
