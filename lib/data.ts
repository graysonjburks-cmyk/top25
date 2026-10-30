import { query } from "./db";
import { teams, referenceSeason, directorySource } from "./teams";
export async function directory(season: number) {
  const row = (
    await query("SELECT * FROM season_directories WHERE season=$1", [season])
  )[0];
  if (row)
    return {
      season,
      teams: row.teams,
      source: row.source,
      verifiedAt: row.verified_at,
      verified: true,
      notes: row.notes,
    };
  return {
    season: referenceSeason,
    teams,
    source: directorySource,
    verifiedAt: null,
    verified: false,
    notes:
      "Offline reference membership; authoritative verification is pending. Do not treat this as a verified current-season field.",
  };
}
export { metricDefinitions } from "./metrics";
export function sourceUrl(value: unknown) {
  if (typeof value !== "string") throw new Error("A source URL is required.");
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Sources must use HTTPS.");
  return url.href;
}
