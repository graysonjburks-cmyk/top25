import { NextResponse } from "next/server";
import { nationalData } from "@/lib/national";
import { query } from "@/lib/db";
export const runtime = "nodejs";
export async function GET() {
  const data = await nationalData();
  // Preserve manual imports. Only a season-confirmed, complete provider directory may be stored.
  if (data.directoryVerified) {
    try {
      await query(
        "INSERT INTO season_directories(season,teams,source,verified_at,notes) VALUES($1,$2::jsonb,$3,$4,$5) ON CONFLICT(season) DO UPDATE SET teams=EXCLUDED.teams,verified_at=EXCLUDED.verified_at WHERE season_directories.source=EXCLUDED.source",
        [
          data.season,
          JSON.stringify(data.teams),
          "https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams",
          data.checkedAt,
          "Provider-confirmed current-season FBS directory; query group 80.",
        ],
      );
    } catch {
      data.errors.push("The provider directory could not be cached.");
    }
  }
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
