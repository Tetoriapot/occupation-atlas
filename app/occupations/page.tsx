import type { Metadata } from "next";
import { Suspense } from "react";
import searchIndexVersionJson from "@/data/occupation-search-index-version.generated.json";
import { Breadcrumbs } from "@/app/components/layout/breadcrumbs";
import { OccupationExplorer } from "@/app/components/search/occupation-explorer";
import { getAllCategories, getAllOccupations } from "@/app/lib/occupations";
import { createOccupationSearchBaseRecords } from "@/app/lib/search";
import { absoluteUrl, sharedOpenGraphImage, siteConfig } from "@/app/lib/site";

const description = "職業名、カテゴリー、技能イメージ、探索者適性から創作に合う職業を探せます。";

export const metadata: Metadata = {
  title: "職業を探す",
  description,
  alternates: { canonical: absoluteUrl("/occupations") },
  openGraph: {
    url: absoluteUrl("/occupations"),
    title: `職業を探す｜${siteConfig.name}`,
    description,
    images: [sharedOpenGraphImage],
  },
};

export default function OccupationsPage() {
  const occupations = createOccupationSearchBaseRecords(getAllOccupations());
  const categories = getAllCategories();

  return (
    <>
      <header className="page-hero page-hero-compact">
        <div className="shell">
          <Breadcrumbs items={[{ label: "職業を探す" }]} />
          <span className="eyebrow">OCCUPATION ARCHIVE</span>
          <h1>物語に合う職業を探す</h1>
          <p>名前だけでなく、知識や得意分野、探索者としての役割から絞り込めます。</p>
        </div>
      </header>
      <div className="shell page-section">
        <Suspense fallback={<div className="loading-panel" role="status">職業索引を準備しています…</div>}>
          <OccupationExplorer
            occupations={occupations}
            categories={categories}
            searchIndexVersion={searchIndexVersionJson.version}
          />
        </Suspense>
      </div>
    </>
  );
}
