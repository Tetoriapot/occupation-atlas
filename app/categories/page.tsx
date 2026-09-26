import type { Metadata } from "next";
import { Breadcrumbs } from "@/app/components/layout/breadcrumbs";
import { CategoryGrid } from "@/app/components/category/category-grid";
import {
  getAllCategories,
  getAllOccupations,
  getCategoryCounts,
} from "@/app/lib/occupations";
import { absoluteUrl, sharedOpenGraphImage, siteConfig } from "@/app/lib/site";

const description = `探索者職業図鑑に収録した職業を、医療・法律・教育・IT・芸術など${getAllCategories().length}の分野から探せます。`;

export const metadata: Metadata = {
  title: "カテゴリーから職業を探す",
  description,
  alternates: { canonical: absoluteUrl("/categories") },
  openGraph: {
    url: absoluteUrl("/categories"),
    title: `カテゴリーから職業を探す｜${siteConfig.name}`,
    description,
    images: [sharedOpenGraphImage],
  },
};

export default function CategoriesPage() {
  const categories = getAllCategories();
  const occupations = getAllOccupations();
  const counts = getCategoryCounts();

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "探索者職業図鑑 カテゴリー索引",
    numberOfItems: categories.length,
    itemListElement: categories.map((category, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: category.name,
      description: category.description,
      url: absoluteUrl(`/categories/${category.slug}`),
    })),
  };

  return (
    <div className="page-shell category-list-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd).replace(/</g, "\\u003c") }}
      />
      <div className="shell">
        <Breadcrumbs items={[{ label: "カテゴリー" }]} />
        <header className="page-header category-list-header">
          <p className="eyebrow">CATEGORY INDEX</p>
          <h1>仕事の分野から探す</h1>
          <p>
            職場の空気、出会う相手、持っている知識は、属する分野によって変わります。
            物語にほしい現場から職業をたどってください。
          </p>
          <dl className="index-summary" aria-label="図鑑の収録数">
            <div>
              <dt>カテゴリー</dt>
              <dd>{categories.length}分野</dd>
            </div>
            <div>
              <dt>掲載職業</dt>
              <dd>{occupations.length.toLocaleString("ja-JP")}件</dd>
            </div>
          </dl>
        </header>

        <section className="category-list-section" aria-labelledby="category-list-title">
          <h2 id="category-list-title" className="visually-hidden">カテゴリー一覧</h2>
          <CategoryGrid categories={categories} counts={counts} headingLevel="h3" />
        </section>
      </div>
    </div>
  );
}
