import type { MetadataRoute } from "next";
import { getAllCategories, getAllOccupations } from "@/app/lib/occupations";
import { absoluteUrl } from "@/app/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/occupations"), changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/categories"), changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/updates"), changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/about"), changeFrequency: "monthly", priority: 0.5 },
  ];

  const occupationPages: MetadataRoute.Sitemap = getAllOccupations().map((occupation) => ({
    url: absoluteUrl(`/occupations/${occupation.slug}`),
    lastModified: occupation.updatedAt,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const categoryPages: MetadataRoute.Sitemap = getAllCategories().map((category) => ({
    url: absoluteUrl(`/categories/${category.slug}`),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticPages, ...categoryPages, ...occupationPages];
}
