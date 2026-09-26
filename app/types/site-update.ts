export type SiteUpdateChange = {
  title: string;
  description: string;
};

export type SiteUpdate = {
  id: string;
  date: string;
  title: string;
  summary: string;
  tags: string[];
  changes: SiteUpdateChange[];
};
