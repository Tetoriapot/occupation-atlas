import { CategoryCard } from "@/app/components/category/category-card";
import type { Category } from "@/app/types/occupation";

type CategoryGridProps = {
  categories: Category[];
  counts: Record<string, number>;
  headingLevel?: "h2" | "h3";
};

export function CategoryGrid({ categories, counts, headingLevel = "h2" }: CategoryGridProps) {
  return (
    <div className="category-grid">
      {categories.map((category) => (
        <CategoryCard
          key={category.id}
          category={category}
          count={counts[category.id] ?? 0}
          headingLevel={headingLevel}
        />
      ))}
    </div>
  );
}
