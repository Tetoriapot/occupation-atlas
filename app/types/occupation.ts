export type Rating = 1 | 2 | 3 | 4 | 5;

export type AptitudeKey =
  | "investigation"
  | "negotiation"
  | "combat"
  | "infiltration"
  | "support"
  | "knowledge"
  | "beginnerFriendly";

export type AptitudeScores = Record<AptitudeKey, Rating>;

export type Category = {
  id: string;
  slug: string;
  name: string;
  symbol: string;
  description: string;
};

export type SourceType =
  | "government"
  | "education-research"
  | "professional-organization"
  | "public-information";

export type SourceSupport =
  | "responsibilities"
  | "qualifications"
  | "education"
  | "workStyle"
  | "annualIncome";

export type Source = {
  title: string;
  url: string;
  type: SourceType;
  supports: SourceSupport[];
};

export type OccupationSearchFacets = {
  eras: string[];
  regions: string[];
  situations: string[];
};

export type OccupationSetting = {
  eras: string[];
  regions: string[];
  note: string;
};

export type CreativeIdea = {
  title: string;
  summary: string;
  era: string;
  region: string;
};

export type ScenarioSituation = {
  title: string;
  reason: string;
};

export type Occupation = {
  id: string;
  slug: string;
  name: string;
  aliases: string[];
  categoryId: string;
  searchFacets: OccupationSearchFacets;
  catchphrase: string;
  shortDescription: string;
  keywords: string[];
  setting: OccupationSetting;
  overview: {
    responsibilities: string[];
    typicalPeople: string[];
    dailySchedule: Array<{
      time: string;
      title: string;
      description: string;
    }>;
    qualifications: string[];
    education: string[];
    workStyle: string[];
    annualIncome: {
      summary: string;
      note: string;
    };
    suitableFor: string[];
  };
  creative: {
    investigatorFeatures: string[];
    likelyKnowledge: string[];
    roleplayTips: string[];
    personalityExamples: string[];
    everydayEvents: string[];
    scenarioHooks: string[];
    commonCharacterSettings: string[];
  };
  creativeIdeas: CreativeIdea[];
  scenarioSituations: ScenarioSituation[];
  aptitude: AptitudeScores;
  aptitudeReasons: Partial<Record<AptitudeKey, string>>;
  skillImages: string[];
  relatedOccupationSlugs: string[];
  featured: {
    popularRank?: number;
    recommendedRank?: number;
  };
  sources: Source[];
  publishedAt: string;
  updatedAt: string;
  lastReviewedAt: string;
};
