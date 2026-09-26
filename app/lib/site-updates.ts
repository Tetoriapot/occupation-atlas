import updatesJson from "@/data/updates.json";
import type { SiteUpdate } from "@/app/types/site-update";

const updates = updatesJson as SiteUpdate[];

export function getAllSiteUpdates(): SiteUpdate[] {
  return [...updates].sort(
    (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
  );
}

export function getLatestSiteUpdate(): SiteUpdate | undefined {
  return getAllSiteUpdates()[0];
}
