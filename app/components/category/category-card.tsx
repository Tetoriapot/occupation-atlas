import Link from "next/link";
import type { Category } from "@/app/types/occupation";

type CategoryCardProps = {
  category: Category;
  count: number;
  headingLevel?: "h2" | "h3";
};

export function CategoryCard({ category, count, headingLevel = "h2" }: CategoryCardProps) {
  const Heading = headingLevel;

  return (
    <article className="category-card">
      <Link href={`/categories/${category.slug}`} aria-label={`${category.name}の職業 ${count}件を見る`}>
        <span className="category-symbol" aria-hidden="true">{category.symbol}</span>
        <div className="category-card-copy">
          <div className="category-card-title-row">
            <Heading>{category.name}</Heading>
            <span className="category-count">{count.toLocaleString("ja-JP")}件</span>
          </div>
          <p className="category-description">{category.description}</p>
          <span className="category-card-action" aria-hidden="true">この分野を見る</span>
        </div>
      </Link>
    </article>
  );
}
