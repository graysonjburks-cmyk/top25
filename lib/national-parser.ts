import { teams, teamById } from "./teams";
import type { NationalPoll, NationalTeam, TeamRecord } from "./national-types";
export function footballSeason(now = new Date()) {
  return now.getUTCMonth() < 2
    ? now.getUTCFullYear() - 1
    : now.getUTCFullYear();
}
const aliases: Record<string, string> = {
  "miami-fl": "miami",
  "miami-florida": "miami",
  "app-state": "appalachian-state",
  "appalachian-st": "appalachian-state",
  umass: "massachusetts",
  "hawai-i": "hawaii",
  "southern-mississippi": "southern-miss",
  connecticut: "uconn",
  "ul-monroe": "louisiana-monroe",
  "ul-lafayette": "louisiana",
  "san-jose-st": "san-jose-state",
  pitt: "pittsburgh",
};
export function teamId(team: any) {
  const raw = String(
    team?.location || team?.shortDisplayName || team?.displayName || "",
  )
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const adjusted = raw
    .replace("texas-a-and-m", "texas-a-m")
    .replace("texas-and-m", "texas-a-m");
  return aliases[adjusted] || adjusted;
}
export function parseTeam(team: any, conference?: string): NationalTeam | null {
  const id = teamId(team);
  if (!id || !team?.id) return null;
  const known = teamById.get(id);
  return {
    id,
    providerId: String(team.id),
    name: String(
      team.location || team.shortDisplayName || known?.name || team.displayName,
    ),
    conference:
      conference ||
      team.groups?.name ||
      known?.conference ||
      "Conference unavailable",
    initials: String(team.abbreviation || known?.initials || id.slice(0, 3)),
    color: /^[a-f0-9]{6}$/i.test(team.color || "")
      ? `#${team.color}`
      : known?.color || "#244c3b",
  };
}
function recordString(value: unknown) {
  return typeof value === "string" && /^\d+-\d+(?:-\d+)?$/.test(value)
    ? value
    : null;
}
export function parseRecords(
  item: any,
  season: number,
  source: string,
  updatedAt: string,
): TeamRecord {
  const stats = item?.stats || item?.record?.items || item?.records || [];
  let overall = recordString(item?.recordSummary),
    conference: string | null = null;
  const numeric: Record<string, number> = {};
  for (const stat of Array.isArray(stats) ? stats : []) {
    const key = String(stat.type || stat.name || stat.description || "")
      .toLowerCase()
      .replace(/[^a-z]/g, "");
    if (
      typeof stat.value === "number" &&
      Number.isInteger(stat.value) &&
      stat.value >= 0
    )
      numeric[key] = stat.value;
    const value = recordString(stat.summary || stat.displayValue);
    if (["total", "overall", "overallrecord", "totalrecord"].includes(key))
      overall = value || overall;
    if (
      [
        "vsconf",
        "conference",
        "conferencerecord",
        "conferenceoverall",
      ].includes(key)
    )
      conference = value || conference;
  }
  if (!overall && numeric.wins !== undefined && numeric.losses !== undefined)
    overall = `${numeric.wins}-${numeric.losses}`;
  if (
    !conference &&
    numeric.conferencewins !== undefined &&
    numeric.conferencelosses !== undefined
  )
    conference = `${numeric.conferencewins}-${numeric.conferencelosses}`;
  return { overall, conference, season, source, updatedAt };
}
export function parseRankings(
  data: any,
  season: number,
  now = new Date(),
): {
  polls: NationalPoll[];
  teams: NationalTeam[];
  week: number | null;
  records: Record<string, TeamRecord>;
} {
  const source = "https://www.espn.com/college-football/rankings";
  const polls: NationalPoll[] = [],
    directory: NationalTeam[] = [],
    records: Record<string, TeamRecord> = {};
  const sourceSeason = Number(
    data?.season?.year || data?.leagues?.[0]?.season?.year,
  );
  const week = Number.isInteger(data?.week?.number) ? data.week.number : null;
  if (sourceSeason !== season) return { polls, teams: [], week: null, records };
  for (const raw of Array.isArray(data.rankings) ? data.rankings : []) {
    const text =
      `${raw.type || ""} ${raw.name || ""} ${raw.shortName || ""}`.toLowerCase();
    if (/\bfcs\b|division ii|division iii/.test(text)) continue;
    const id = /\bbcs\b/.test(text)
      ? "bcs"
      : /\bap\b|associated press/.test(text)
        ? "ap"
        : /coach|usa today|afca/.test(text)
          ? "coaches"
          : /playoff|\bcfp\b/.test(text)
            ? "cfp"
            : null;
    if (!id || id === "bcs") continue;
    const published = raw.date ? new Date(raw.date) : null;
    if (
      published &&
      (!Number.isFinite(published.getTime()) ||
        published.getTime() > now.getTime() + 86400000 ||
        footballSeason(published) !== season)
    )
      continue;
    const ranks = [];
    for (const entry of Array.isArray(raw.ranks) ? raw.ranks : []) {
      const t = parseTeam(entry.team);
      const rank = Number(entry.current || entry.rank);
      if (!t || !Number.isInteger(rank) || rank < 1) continue;
      directory.push(t);
      const record = recordString(
        entry.recordSummary ||
          entry.team?.recordSummary ||
          entry.record?.summary,
      );
      ranks.push({
        id: t.id,
        rank,
        previous: Number(entry.previous) > 0 ? Number(entry.previous) : null,
        points: Number.isFinite(entry.points) ? entry.points : null,
        firsts: Number.isFinite(entry.firstPlaceVotes)
          ? entry.firstPlaceVotes
          : null,
        record,
      });
      if (record)
        records[t.id] = {
          overall: record,
          conference: null,
          season,
          source,
          updatedAt: published?.toISOString() || now.toISOString(),
        };
    }
    if (ranks.length)
      polls.push({
        id,
        name:
          id === "ap"
            ? "AP Top 25"
            : id === "coaches"
              ? "Coaches Poll"
              : "College Football Playoff",
        season,
        week,
        publishedAt: published?.toISOString() || null,
        source,
        ranks: ranks.sort((a, b) => a.rank - b.rank),
        status: "available",
      });
  }
  return { polls, teams: directory, week, records };
}
export function parseStandings(data: any, season: number, now = new Date()) {
  const records: Record<string, TeamRecord> = {},
    directory: NationalTeam[] = [];
  const providerSeason = Number(
    data?.season?.year || data?.season || data?.leagues?.[0]?.season?.year,
  );
  if (Number.isFinite(providerSeason) && providerSeason !== season)
    return { records, teams: directory };
  const source = "https://www.espn.com/college-football/standings";
  function walk(node: any, conference?: string) {
    const name = node?.name || node?.shortName || conference;
    for (const entry of node?.standings?.entries || []) {
      const team = parseTeam(entry.team, name);
      if (!team) continue;
      directory.push(team);
      records[team.id] = parseRecords(entry, season, source, now.toISOString());
    }
    for (const child of node?.children || []) walk(child, name);
  }
  walk(data);
  return { records, teams: directory };
}
export function mergeTeams(values: NationalTeam[]) {
  return [...new Map([...teams, ...values].map((t) => [t.id, t])).values()];
}
