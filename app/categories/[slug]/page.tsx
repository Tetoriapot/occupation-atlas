import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/app/components/layout/breadcrumbs";
import { OccupationCard } from "@/app/components/occupation/occupation-card";
import {
  getAllCategories,
  getCategoryBySlug,
  getOccupationsByCategory,
} from "@/app/lib/occupations";
import { absoluteUrl, sharedOpenGraphImage, siteConfig } from "@/app/lib/site";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getAllCategories().map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;

  if (slug === "fire") {
    return {
      title: "消防職は公務員カテゴリーへ移動しました",
      alternates: { canonical: absoluteUrl("/categories/government") },
      robots: { index: false, follow: true },
    };
  }

  const category = getCategoryBySlug(slug);

  if (!category) {
    return {
      title: "カテゴリーが見つかりません",
      robots: { index: false, follow: false },
    };
  }

  const occupations = getOccupationsByCategory(category.id);
  const description = `${category.description}を扱う${occupations.length}件の職業を、現実の仕事内容と創作・TRPG向けの人物設定から紹介します。`;

  return {
    title: `${category.name}の職業一覧`,
    description,
    alternates: { canonical: absoluteUrl(`/categories/${category.slug}`) },
    openGraph: {
      url: absoluteUrl(`/categories/${category.slug}`),
      title: `${category.name}の職業一覧｜${siteConfig.name}`,
      description,
      images: [sharedOpenGraphImage],
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;

  if (slug === "fire") redirect("/categories/government");

  const category = getCategoryBySlug(slug);

  if (!category) notFound();

  const occupations = getOccupationsByCategory(category.id);
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${category.name}の職業一覧`,
    numberOfItems: occupations.length,
    itemListElement: occupations.map((occupation, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: occupation.name,
      description: occupation.shortDescription,
      url: absoluteUrl(`/occupations/${occupation.slug}`),
    })),
  };

  return (
    <div className="page-shell category-detail-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd).replace(/</g, "\\u003c") }}
      />
      <div className="shell">
        <Breadcrumbs
          items={[
            { label: "カテゴリー", href: "/categories" },
            { label: category.name },
          ]}
        />

        <header className="page-header category-detail-header">
          <div className="category-detail-symbol" aria-hidden="true">{category.symbol}</div>
          <div>
            <p className="eyebrow">CATEGORY / {category.slug.toUpperCase()}</p>
            <h1>{category.name}の職業</h1>
            <p>{category.description}。現実の仕事と、物語の中で活かせる役割を一緒に見ていきます。</p>
            <div className="category-detail-actions">
              <span className="result-count">収録 {occupations.length.toLocaleString("ja-JP")}件</span>
              <Link className="button-link button-link-secondary" href={`/occupations?category=${category.id}`}>
                条件を追加して検索
              </Link>
            </div>
          </div>
        </header>

        <section className="category-occupation-list" aria-labelledby="category-occupations-title">
          <div className="section-heading compact-section-heading">
            <div>
              <p className="eyebrow">OCCUPATIONS</p>
              <h2 id="category-occupations-title">{category.name}に属する職業</h2>
            </div>
          </div>

          {occupations.length > 0 ? (
            <div className="occupation-grid">
              {occupations.map((occupation) => (
                <OccupationCard
                  key={occupation.id}
                  occupation={occupation}
                  headingLevel="h3"
                  showSelectionTools
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>この分野の職業は準備中です</h3>
              <p>ほかのカテゴリーから人物像を探してみてください。</p>
              <Link className="button-link" href="/categories">カテゴリー索引へ戻る</Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
