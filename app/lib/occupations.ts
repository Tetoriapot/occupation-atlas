import categoriesJson from "@/data/categories.json";
import occupationsJson from "@/data/occupations.generated.json";
import type { Category, Occupation } from "@/app/types/occupation";

const categories = categoriesJson as Category[];
const occupations = occupationsJson as Occupation[];

export function getAllCategories(): Category[] {
  return categories;
}

export function getCategoryById(id: string): Category | undefined {
  return categories.find((category) => category.id === id);
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((category) => category.slug === slug);
}

export function getAllOccupations(): Occupation[] {
  return occupations;
}

export function getOccupationBySlug(slug: string): Occupation | undefined {
  return occupations.find((occupation) => occupation.slug === slug);
}

export function getOccupationsByCategory(categoryId: string): Occupation[] {
  return occupations.filter((occupation) => occupation.categoryId === categoryId);
}

export function getCategoryCounts(): Record<string, number> {
  return occupations.reduce<Record<string, number>>((counts, occupation) => {
    counts[occupation.categoryId] = (counts[occupation.categoryId] ?? 0) + 1;
    return counts;
  }, {});
}

export function getPopularOccupations(limit = 6): Occupation[] {
  return occupations
    .filter((occupation) => occupation.featured.popularRank !== undefined)
    .sort((a, b) => (a.featured.popularRank ?? 999) - (b.featured.popularRank ?? 999))
    .slice(0, limit);
}

export function getRecommendedOccupations(limit = 6): Occupation[] {
  return occupations
    .filter((occupation) => occupation.featured.recommendedRank !== undefined)
    .sort((a, b) => (a.featured.recommendedRank ?? 999) - (b.featured.recommendedRank ?? 999))
    .slice(0, limit);
}

export function getNewOccupations(limit = 6): Occupation[] {
  return [...occupations]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, limit);
}

export function getRelatedOccupations(occupation: Occupation): Occupation[] {
  return occupation.relatedOccupationSlugs
    .map((slug) => getOccupationBySlug(slug))
    .filter((item): item is Occupation => item !== undefined);
}

