import type { NationalData } from "./national-types";
export function liveMetrics(data: NationalData | null) {
  if (!data) return [];
  const metrics: any[] = [];
  for (const poll of data.polls)
    if (poll.status === "available" && poll.week !== null)
      metrics.push({
        metric: poll.id,
        season: poll.season,
        week: poll.week,
        source: poll.source,
        unit: "rank",
        updated_at: poll.publishedAt || data.checkedAt,
        values_json: Object.fromEntries(poll.ranks.map((r) => [r.id, r.rank])),
      });
  if (data.week !== null) {
    for (const [metric, field, index] of [
      ["wins", "overall", 0],
      ["losses", "overall", 1],
      ["conferenceWins", "conference", 0],
      ["conferenceLosses", "conference", 1],
    ] as const) {
      const records = Object.entries(data.records).filter(
        ([, record]) => !!record[field],
      );
      if (records.length)
        metrics.push({
          metric,
          season: data.season,
          week: data.week,
          source: "https://www.espn.com/college-football/standings",
          unit: "games",
          updated_at: data.checkedAt,
          values_json: Object.fromEntries(
            records.map(([id, record]) => [
              id,
              Number(record[field]!.split("-")[index]),
            ]),
          ),
        });
    }
  }
  return metrics;
}
