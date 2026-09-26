import type { Metadata } from "next";
import Link from "next/link";
import { CategoryGrid } from "@/app/components/category/category-grid";
import {
  DailyOccupation,
  type DailyOccupationItem,
} from "@/app/components/home/daily-occupation";
import { getTokyoDateKey } from "@/app/components/home/daily-occupation-selection";
import { HeroSearch } from "@/app/components/home/hero-search";
import { OccupationShelf } from "@/app/components/home/occupation-shelf";
import {
  getAllCategories,
  getAllOccupations,
  getCategoryById,
  getCategoryCounts,
  getNewOccupations,
  getPopularOccupations,
  getRecommendedOccupations,
} from "@/app/lib/occupations";
import { absoluteUrl, sharedOpenGraphImage, siteConfig } from "@/app/lib/site";
import type { Occupation } from "@/app/types/occupation";

export const metadata: Metadata = {
  description: siteConfig.description,
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    url: absoluteUrl("/"),
    title: siteConfig.name,
    description: siteConfig.description,
    images: [sharedOpenGraphImage],
  },
};

function fillShelf(preferred: Occupation[], all: Occupation[], limit: number): Occupation[] {
  const selected = new Map(preferred.map((occupation) => [occupation.id, occupation]));
  for (const occupation of all) {
    if (selected.size >= limit) break;
    selected.set(occupation.id, occupation);
  }
  return [...selected.values()].slice(0, limit);
}

export default function Home() {
  const occupations = getAllOccupations();
  const categories = getAllCategories();
  const categoryCounts = getCategoryCounts();
  const highlightedCategoryIds = [
    "medical",
    "police",
    "government",
    "it",
    "research",
    "arts",
    "media",
    "student",
  ];
  const highlightedCategories = highlightedCategoryIds
    .map((categoryId) => categories.find(({ id }) => id === categoryId))
    .filter((category): category is NonNullable<typeof category> => Boolean(category));

  const editorialPicks = fillShelf(getPopularOccupations(4), occupations, 4);
  const recommended = fillShelf(getRecommendedOccupations(4), occupations, 4);
  const beginnerFriendly = [...occupations]
    .filter((occupation) => occupation.aptitude.beginnerFriendly >= 4)
    .sort(
      (a, b) =>
        b.aptitude.beginnerFriendly - a.aptitude.beginnerFriendly ||
        b.aptitude.support - a.aptitude.support ||
        a.name.localeCompare(b.name, "ja"),
    )
    .slice(0, 4);

  const dailyOccupationItems: DailyOccupationItem[] = occupations.map((occupation) => {
    const category = getCategoryById(occupation.categoryId);
    return {
      id: occupation.id,
      slug: occupation.slug,
      name: occupation.name,
      catchphrase: occupation.catchphrase,
      shortDescription: occupation.shortDescription,
      categoryName: category?.name ?? "その他",
      categorySlug: category?.slug ?? "other",
      skillImages: occupation.skillImages,
    };
  });

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: absoluteUrl("/"),
    description: siteConfig.description,
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl("/occupations")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c") }}
      />

      <HeroSearch occupationCount={occupations.length} categoryCount={categories.length} />

      <OccupationShelf
        id="editorial-picks"
        eyebrow="EDITORIAL PICKS"
        title="編集部がいま読んでほしい職業"
        description="人物像の広げやすさや、シナリオへのつなげやすさから選んだ入口です。"
        occupations={editorialPicks}
        href="/occupations?sort=recommended"
        linkLabel="編集部おすすめを見る"
        note="この並びはアクセス数による人気ランキングではなく、MVP版の編集部セレクトです。"
      />

      <OccupationShelf
        id="beginner-friendly"
        eyebrow="FIRST CHARACTER"
        title="はじめての人物づくりに"
        description="役割を想像しやすく、仲間との会話や調査に参加させやすい職業を集めました。"
        occupations={beginnerFriendly}
        href="/occupations?aptitude=beginnerFriendly"
        linkLabel="初心者おすすめをすべて見る"
      />

      <DailyOccupation
        occupations={dailyOccupationItems}
        serverDateKey={getTokyoDateKey(new Date())}
      />

      <section className="home-section category-index" aria-labelledby="home-categories-title">
        <div className="shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{highlightedCategories.length} PICKUP / {categories.length} FIELDS</p>
              <h2 id="home-categories-title">仕事の分野から探す</h2>
              <p>探索や人物づくりの入口になりやすい8分野を抜粋しました。</p>
            </div>
            <Link className="section-link" href="/categories">全{categories.length}カテゴリーを見る</Link>
          </div>
          <CategoryGrid categories={highlightedCategories} counts={categoryCounts} headingLevel="h3" />
          <div className="category-index__all-link">
            <Link className="button-link" href="/categories">
              全{categories.length}カテゴリーから探す
            </Link>
          </div>
        </div>
      </section>

      <OccupationShelf
        id="story-starters"
        eyebrow="STORY STARTERS"
        title="物語の起点になる職業"
        description="現場へのアクセス、専門知識、人との接点。導入を組み立てやすい仕事から選べます。"
        occupations={recommended}
        href="/occupations?sort=recommended"
        linkLabel="おすすめ順で探す"
      />

      <OccupationShelf
        id="new-occupations"
        eyebrow="NEW ENTRIES"
        title="新しく加わった職業"
        description="図鑑に最近収録した職業です。異なる立場から、新しい人物像を探してみてください。"
        occupations={getNewOccupations(4)}
        href="/occupations?sort=newest"
        linkLabel="新着順で見る"
      />
    </>
  );
}
