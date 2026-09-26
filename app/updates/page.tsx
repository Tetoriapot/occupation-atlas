import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/app/components/layout/breadcrumbs";
import { absoluteUrl, sharedOpenGraphImage, siteConfig } from "@/app/lib/site";
import { getAllSiteUpdates } from "@/app/lib/site-updates";

const description = "探索者職業図鑑の職業追加、情報確認、検索・UI改善などの更新履歴です。";

export const metadata: Metadata = {
  title: "更新情報",
  description,
  alternates: { canonical: absoluteUrl("/updates") },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: siteConfig.name,
    url: absoluteUrl("/updates"),
    title: `更新情報｜${siteConfig.name}`,
    description,
    images: [sharedOpenGraphImage],
  },
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00+09:00`));
}

export default function UpdatesPage() {
  const updates = getAllSiteUpdates();
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${siteConfig.name} 更新情報`,
    numberOfItems: updates.length,
    itemListElement: updates.map((update, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: update.title,
      description: update.summary,
      url: `${absoluteUrl("/updates")}#${update.id}`,
    })),
  };

  return (
    <div className="page-shell updates-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd).replace(/</g, "\\u003c") }}
      />
      <Breadcrumbs items={[{ label: "更新情報" }]} />

      <article className="updates-content">
        <header className="page-heading">
          <p className="page-heading__eyebrow">UPDATE LOG</p>
          <h1>更新情報</h1>
          <p>
            職業の追加や改稿、検索・画面の改善を記録します。今後の更新も、変更した理由と内容が分かる形でここへ追記します。
          </p>
        </header>

        <ol className="update-list">
          {updates.map((update, index) => (
            <li key={update.id} id={update.id} className="update-entry card-panel">
              <header className="update-entry__header">
                <div>
                  <p className="update-entry__number">UPDATE {String(updates.length - index).padStart(2, "0")}</p>
                  <h2>{update.title}</h2>
                </div>
                <time dateTime={update.date}>{formatDate(update.date)}</time>
              </header>
              <p className="update-entry__summary">{update.summary}</p>
              <ul className="update-tag-list" aria-label="更新種別">
                {update.tags.map((tag) => <li key={tag}>{tag}</li>)}
              </ul>
              <div className="update-change-list">
                {update.changes.map((change) => (
                  <section key={change.title}>
                    <h3>{change.title}</h3>
                    <p>{change.description}</p>
                  </section>
                ))}
              </div>
            </li>
          ))}
        </ol>

        <footer className="about-content__footer">
          <p>追加された職業を、新着順から確認できます。</p>
          <Link className="button-link" href="/occupations?sort=newest">新着職業を見る</Link>
        </footer>
      </article>
    </div>
  );
}
