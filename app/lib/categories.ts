import categoriesJson from "@/data/categories.json";
import type { Category } from "@/app/types/occupation";

const categories = categoriesJson as Category[];

/** 職業本文を含むデータモジュールを読み込まず、カテゴリー表示だけを解決する。 */
export function getLightweightCategoryById(id: string): Category | undefined {
  return categories.find((category) => category.id === id);
}
