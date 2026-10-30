export type NationalTeam = {
  id: string;
  name: string;
  conference: string;
  initials: string;
  color: string;
  providerId?: string;
};
export type TeamRecord = {
  overall: string | null;
  conference: string | null;
  season: number;
  source: string;
  updatedAt: string;
};
export type NationalRank = {
  id: string;
  rank: number;
  previous: number | null;
  points: number | null;
  firsts: number | null;
  record: string | null;
};
export type NationalPoll = {
  id: string;
  name: string;
  season: number;
  week: number | null;
  publishedAt: string | null;
  source: string;
  ranks: NationalRank[];
  status: "available" | "unavailable" | "historical";
  note?: string;
};
export type NationalData = {
  season: number;
  week: number | null;
  checkedAt: string;
  teams: NationalTeam[];
  records: Record<string, TeamRecord>;
  polls: NationalPoll[];
  errors: string[];
  source: string;
  directoryVerified: boolean;
};
