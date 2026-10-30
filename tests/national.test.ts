import { test } from "node:test";
import assert from "node:assert/strict";
import {
  footballSeason,
  parseRankings,
  parseRecords,
  teamId,
} from "../lib/national-parser";
import { normalizeCode, codeHash } from "../lib/group-codes";
// Provider-shaped synthetic fixtures; these are NOT real rankings or sports records.
const payload = {
  season: { year: 2026 },
  week: { number: 9 },
  rankings: [
    {
      type: "ap",
      name: "AP Top 25",
      date: "2026-10-25T17:00:00Z",
      ranks: [
        {
          current: 1,
          previous: 2,
          points: 100,
          firstPlaceVotes: 4,
          recordSummary: "7-1",
          team: { id: "61", location: "Georgia", abbreviation: "UGA" },
        },
      ],
    },
    {
      type: "usa",
      name: "Coaches Poll",
      ranks: [{ current: 1, team: { id: "61", location: "Georgia" } }],
    },
  ],
};
test("current provider season and publication date are validated; poll identity and records retained", () => {
  const result = parseRankings(payload, 2026, new Date("2026-10-30T12:00:00Z"));
  assert.equal(result.week, 9);
  assert.deepEqual(
    result.polls.map((p) => p.id),
    ["ap", "coaches"],
  );
  assert.equal(result.records.georgia.overall, "7-1");
  assert.equal(result.records.georgia.conference, null);
  assert.equal(result.polls[0].publishedAt, "2026-10-25T17:00:00.000Z");
  assert.equal(result.polls[0].ranks[0].previous, 2);
});
test("a prior-season feed is never presented as current", () => {
  assert.equal(parseRankings(payload, 2027).polls.length, 0);
  const stale = {
    ...payload,
    rankings: [{ ...payload.rankings[0], date: "2025-10-25T17:00:00Z" }],
  };
  assert.equal(
    parseRankings(stale, 2026, new Date("2026-10-30")).polls.length,
    0,
  );
});
test("BCS is never manufactured as a current poll and missing records stay missing", () => {
  assert.equal(
    parseRankings(
      {
        ...payload,
        rankings: [
          { type: "bcs", name: "BCS", ranks: payload.rankings[0].ranks },
        ],
      },
      2026,
    ).polls.length,
    0,
  );
  const record = parseRecords(
    {
      stats: [
        { name: "overall", displayValue: "8-0" },
        { name: "vsConf", displayValue: "5-0" },
      ],
    },
    2026,
    "https://example.invalid",
    new Date().toISOString(),
  );
  assert.equal(record.overall, "8-0");
  assert.equal(record.conference, "5-0");
  assert.equal(parseRecords({}, 2026, "source", "date").overall, null);
});
test("football season handles January and team aliases produce stable directory IDs", () => {
  assert.equal(footballSeason(new Date("2027-01-10")), 2026);
  assert.equal(footballSeason(new Date("2027-08-10")), 2027);
  assert.equal(teamId({ location: "Texas A&M" }), "texas-a-m");
  assert.equal(teamId({ location: "App State" }), "appalachian-state");
});
test("private codes normalize consistently, are hashed, and reject undersized or invalid codes", () => {
  assert.equal(normalizeCode(" Abc-12 "), "ABC-12");
  assert.equal(codeHash("abc-12"), codeHash("ABC-12"));
  assert.notEqual(codeHash("12345"), "12345");
  assert.throws(() => normalizeCode("1234"));
  assert.throws(() => normalizeCode("<script>"));
});
test("live metrics carry source metadata and preserve overall/conference record separation", async () => {
  const { liveMetrics } = await import("../lib/live-metrics");
  const parsed = parseRankings(payload, 2026, new Date("2026-10-30"));
  const records = {
    ...parsed.records,
    georgia: { ...parsed.records.georgia, conference: "4-1" },
  };
  const metrics = liveMetrics({
    season: 2026,
    week: 9,
    checkedAt: "2026-10-30T12:00:00Z",
    teams: [],
    records,
    polls: parsed.polls,
    errors: [],
    source: "https://example.invalid",
    directoryVerified: false,
  });
  assert.equal(metrics.find((m) => m.metric === "wins").values_json.georgia, 7);
  assert.equal(
    metrics.find((m) => m.metric === "conferenceWins").values_json.georgia,
    4,
  );
  assert.equal(metrics.find((m) => m.metric === "ap").week, 9);
  assert.ok(metrics.every((m) => m.source.startsWith("https:")));
});
