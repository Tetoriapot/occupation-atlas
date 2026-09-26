import Link from "next/link";
import { OccupationCard } from "@/app/components/occupation/occupation-card";
import type { Occupation } from "@/app/types/occupation";

type OccupationShelfProps = {
  id?: string;
  eyebrow: string;
  title: string;
  description: string;
  occupations: Occupation[];
  href?: string;
  linkLabel?: string;
  note?: string;
};

export function OccupationShelf({
  id,
  eyebrow,
  title,
  description,
  occupations,
  href = "/occupations",
  linkLabel = "職業一覧を見る",
  note,
}: OccupationShelfProps) {
  if (occupations.length === 0) return null;

  const headingId = id ? `${id}-title` : undefined;

  return (
    <section className="home-section occupation-shelf" id={id} aria-labelledby={headingId}>
      <div className="shell">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 id={headingId}>{title}</h2>
            <p>{description}</p>
          </div>
          <Link className="section-link" href={href}>
            {linkLabel}
          </Link>
        </div>
        {note ? <p className="editorial-note">{note}</p> : null}
        <div className="occupation-grid occupation-shelf-grid">
          {occupations.map((occupation) => (
            <OccupationCard key={occupation.id} occupation={occupation} headingLevel="h3" />
          ))}
        </div>
      </div>
    </section>
  );
}
