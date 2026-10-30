import {
  footballSeason,
  parseRankings,
  parseStandings,
  parseTeam,
} from "./national-parser";
import type {
  NationalData,
  NationalTeam,
  NationalPoll,
} from "./national-types";
const SITE = "https://site.api.espn.com";
async function get(path: string) {
  const response = await fetch(SITE + path, {
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(8000),
    headers: { Accept: "application/json" },
  });
  if (!response.ok)
    throw new Error(`Sports feed returned HTTP ${response.status}.`);
  return response.json();
}
export async function nationalData(): Promise<NationalData> {
  const season = footballSeason(),
    checkedAt = new Date().toISOString();
  const results = await Promise.allSettled([
    get("/apis/site/v2/sports/football/college-football/rankings"),
    get(
      `/apis/v2/sports/football/college-football/standings?groups=80&season=${season}`,
    ),
    get(
      `/apis/site/v2/sports/football/college-football/teams?groups=80&limit=1000&season=${season}`,
    ),
  ]);
  const errors: string[] = [];
  const ranking =
    results[0].status === "fulfilled"
      ? parseRankings(results[0].value, season)
      : { polls: [], teams: [], week: null, records: {} };
  if (results[0].status === "rejected")
    errors.push(
      "National rankings are temporarily unavailable from the provider.",
    );
  const standings =
    results[1].status === "fulfilled"
      ? parseStandings(results[1].value, season)
      : { records: {}, teams: [] };
  if (results[1].status === "rejected")
    errors.push("Team records are temporarily unavailable from the provider.");
  let directory: NationalTeam[] = [],
    directoryVerified = false;
  if (results[2].status === "fulfilled") {
    const data = results[2].value;
    const providerSeason = Number(
      data.sports?.[0]?.leagues?.[0]?.season?.year ||
        data.leagues?.[0]?.season?.year ||
        data.season?.year,
    );
    if (providerSeason === season) {
      for (const sport of data.sports || [])
        for (const league of sport.leagues || [])
          for (const entry of league.teams || []) {
            const t = parseTeam(entry.team);
            if (t) directory.push(t);
          }
      directoryVerified =
        directory.length > 100 &&
        directory.length <= 300 &&
        new Set(directory.map((t) => t.id)).size === directory.length;
    }
  }
  if (!directoryVerified)
    errors.push(
      "A complete current-season FBS directory could not be verified.",
    );
  const polls: NationalPoll[] = ["ap", "coaches", "cfp"].map(
    (id) =>
      ranking.polls.find((p) => p.id === id) || {
        id,
        name:
          id === "ap"
            ? "AP Top 25"
            : id === "coaches"
              ? "Coaches Poll"
              : "College Football Playoff",
        season,
        week: ranking.week,
        publishedAt: null,
        source: "https://www.espn.com/college-football/rankings",
        ranks: [],
        status: "unavailable",
        note: "No verified current-season release is available from the provider.",
      },
  );
  polls.push({
    id: "bcs",
    name: "BCS (historical)",
    season: 2013,
    week: null,
    publishedAt: null,
    source: "https://collegefootballplayoff.com",
    ranks: [],
    status: "historical",
    note: "The BCS ended after the 2013 season. There is no current-week BCS poll; it has not been replaced with invented rankings.",
  });
  return {
    season,
    week: ranking.week,
    checkedAt,
    teams: [
      ...new Map(
        (directoryVerified
          ? directory.map(
              (t) => standings.teams.find((s) => s.id === t.id) || t,
            )
          : [...ranking.teams, ...standings.teams]
        ).map((t) => [t.id, t]),
      ).values(),
    ],
    records: Object.fromEntries(
      [
        ...new Set([
          ...Object.keys(ranking.records),
          ...Object.keys(standings.records),
        ]),
      ].map((id) => [
        id,
        {
          ...ranking.records[id],
          ...standings.records[id],
          overall:
            standings.records[id]?.overall ||
            ranking.records[id]?.overall ||
            null,
        },
      ]),
    ),
    polls,
    errors,
    source: "https://www.espn.com/college-football/",
    directoryVerified,
  };
}
