"use client";
import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowRight,
  Check,
  Copy,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
  SlidersHorizontal,
} from "lucide-react";
import type { NationalData, TeamRecord } from "@/lib/national-types";
import type { Team } from "@/lib/teams";
export function RecordLabel({ record }: { record?: TeamRecord }) {
  return (
    <span
      className="team-record"
      title={
        record
          ? `${record.season} · ${record.source} · Checked ${record.updatedAt}`
          : "Record unavailable — no verified source yet"
      }
    >
      {record?.overall || "—"} <span>({record?.conference || "—"})</span>
    </span>
  );
}
export function NationalBoard({
  data,
  results,
  teamMap,
  onRank,
  refresh,
  loading,
}: {
  data: NationalData | null;
  results: any[];
  teamMap: Map<string, any>;
  onRank: () => void;
  refresh: () => void;
  loading: boolean;
}) {
  const [poll, setPoll] = useState("ap"),
    [search, setSearch] = useState(""),
    [sort, setSort] = useState("rank");
  const selected = data?.polls.find((p) => p.id === poll);
  const rows = (selected?.ranks || [])
    .filter((r) =>
      (teamMap.get(r.id)?.name || r.id)
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "name"
        ? (teamMap.get(a.id)?.name || a.id).localeCompare(
            teamMap.get(b.id)?.name || b.id,
          )
        : sort === "points"
          ? (b.points || 0) - (a.points || 0)
          : a.rank - b.rank,
    );
  return (
    <div className="national-board">
      <div className="broadcast-line">
        <span>
          <span className="live-dot" />
          THE NATIONAL PICTURE
        </span>
        <span>
          {data
            ? `${data.season} SEASON${data.week ? ` · WEEK ${data.week}` : ""}`
            : "CONNECTING TO THE PRESS BOX"}
        </span>
        <button onClick={refresh} disabled={loading}>
          <RefreshCw size={12} className={loading ? "spin" : ""} />
          {loading ? "Checking…" : "Refresh"}
        </button>
      </div>
      <div
        className="national-poll-tabs"
        role="tablist"
        aria-label="National ranking source"
      >
        {[
          ["ap", "AP Top 25"],
          ["coaches", "Coaches Poll"],
          ["cfp", "CFP Rankings"],
          ["bcs", "BCS Archive"],
        ].map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={id === poll}
            onClick={() => setPoll(id)}
          >
            {label}
            {id === "bcs" && <small>1998–2013</small>}
          </button>
        ))}
      </div>
      <div className="poll-provenance">
        <p>
          National polls update when their publishers release them. This page
          checks for changes every five minutes; it does not manufacture
          rankings between releases.
        </p>
        <span>
          {selected?.publishedAt
            ? `Published ${new Date(selected.publishedAt).toLocaleString()}`
            : "Publication time unavailable"}{" "}
          ·{" "}
          {data
            ? `Last checked ${new Date(data.checkedAt).toLocaleTimeString()}`
            : "Awaiting provider"}
          {selected?.source && (
            <>
              {" "}
              ·{" "}
              <a href={selected.source} target="_blank" rel="noreferrer">
                Source ↗
              </a>
            </>
          )}
        </span>
      </div>
      {selected?.status === "historical" ? (
        <div className="historic-notice">
          <span className="eyebrow">A CLOSED CHAPTER OF COLLEGE FOOTBALL</span>
          <h2>The BCS belongs in the archive.</h2>
          <p>
            The Bowl Championship Series ended after the 2013 season. There is
            no current-week BCS poll. Today’s AP, Coaches, and CFP rankings are
            listed separately.
          </p>
        </div>
      ) : rows.length ? (
        <>
          <div className="national-table-tools">
            <label className="search-box">
              <Search size={15} />
              <input
                aria-label="Search national rankings"
                placeholder="Find your team…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <select
              aria-label="Sort national rankings"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="rank">National rank</option>
              <option value="name">Team name</option>
              <option value="points">Total points</option>
            </select>
          </div>
          <div className="data-table-scroll">
            <table className="national-table">
              <thead>
                <tr>
                  <th>RANK</th>
                  <th>TEAM · RECORD (CONF.)</th>
                  <th>POINTS</th>
                  <th>1ST</th>
                  <th>FRIENDS</th>
                  <th>DIFFERENCE</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const team = teamMap.get(r.id),
                    ours = results.find((t) => t.id === r.id),
                    gap = ours ? r.rank - ours.rank : null;
                  return (
                    <tr key={r.id}>
                      <td className="rank-number">
                        {String(r.rank).padStart(2, "0")}
                      </td>
                      <td>
                        <div className="team-cell">
                          <button
                            className="team-badge"
                            style={
                              {
                                "--school": team?.color || "#244c3b",
                              } as React.CSSProperties
                            }
                            onClick={() =>
                              window.dispatchEvent(
                                new CustomEvent("team-museum", {
                                  detail: r.id,
                                }),
                              )
                            }
                          >
                            {team?.initials || r.id.slice(0, 2)}
                          </button>
                          <span className="team-name">
                            {team?.name || r.id}
                            <small>
                              {team?.conference || "Conference unavailable"}
                            </small>
                          </span>
                          <RecordLabel record={data?.records[r.id]} />
                        </div>
                      </td>
                      <td>{r.points ?? "—"}</td>
                      <td>{r.firsts || "—"}</td>
                      <td>{ours ? `#${ours.rank}` : "NR"}</td>
                      <td>
                        <span
                          className={`movement ${gap && gap > 0 ? "up" : gap && gap < 0 ? "down" : ""}`}
                        >
                          {gap === null ? (
                            "—"
                          ) : gap > 0 ? (
                            <>
                              <ArrowUp size={12} />
                              {gap}
                            </>
                          ) : gap < 0 ? (
                            <>
                              <ArrowDown size={12} />
                              {Math.abs(gap)}
                            </>
                          ) : (
                            "—"
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="fine-print">
            Record: overall wins–losses (conference wins–losses). A dash means
            the source has not supplied that record. Positive difference means
            your friends rank the team higher.
          </p>
        </>
      ) : (
        <div className="feed-empty">
          <RefreshCw size={27} />
          <h2>
            {loading
              ? "Checking the national wire…"
              : `${selected?.name || "National rankings"} aren’t available right now.`}
          </h2>
          <p>
            {selected?.note ||
              "The live provider could not be reached. We keep this space empty instead of presenting sample rankings as current."}
          </p>
          <button className="primary" onClick={onRank}>
            Make your own Top 25 <ArrowRight size={15} />
          </button>
        </div>
      )}
      <div className="national-disclaimer">
        <strong>Other national ratings</strong>
        <p>
          ESPN FPI, SOS, SOR and efficiency metrics are available in the Data
          center when a licensed source snapshot is configured. They are not
          substituted for official polls. The CFP may not have released rankings
          yet for this season.
        </p>
      </div>
    </div>
  );
}
export function ComparisonAnalytics({
  results,
  ballots,
  previous,
  data,
  teamMap,
}: {
  results: any[];
  ballots: any[];
  previous: any[];
  data: NationalData | null;
  teamMap: Map<string, any>;
}) {
  const [baseline, setBaseline] = useState("ap");
  const national = data?.polls.find((p) => p.id === baseline);
  const rows = results.slice(0, 25);
  const deviations = rows
    .map((r) => ({
      ...r,
      gap: (national?.ranks.find((n) => n.id === r.id)?.rank || 26) - r.rank,
    }))
    .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
  const disagreements = [...rows].sort(
    (a, b) => b.low - b.high - (a.low - a.high),
  );
  const entering = rows.filter(
    (r) => previous.length && !previous.slice(0, 25).some((p) => p.id === r.id),
  );
  const leaving = previous
    .slice(0, 25)
    .filter((p) => !rows.some((r) => r.id === p.id));
  const averageSpread = rows.length
    ? (rows.reduce((n, r) => n + r.low - r.high, 0) / rows.length).toFixed(1)
    : "—";
  return (
    <section className="analytics-desk">
      <div className="section-title">
        <div>
          <span className="eyebrow">THE ARGUMENT, QUANTIFIED</span>
          <h2>Inside the ballot box.</h2>
        </div>
        <select
          aria-label="Compare analytics to"
          value={baseline}
          onChange={(e) => setBaseline(e.target.value)}
        >
          <option value="ap">vs AP Top 25</option>
          <option value="coaches">vs Coaches Poll</option>
          <option value="cfp">vs CFP Rankings</option>
        </select>
      </div>
      <div className="analytics-metrics">
        <div>
          <b>{ballots.length}</b>
          <span>Submitted opinions</span>
        </div>
        <div>
          <b>{averageSpread}</b>
          <span>Average voter rank spread</span>
        </div>
        <div>
          <b>{rows.filter((r) => r.firsts > 0).length}</b>
          <span>Different No. 1 picks</span>
        </div>
        <div>
          <b>{entering.length}</b>
          <span>New to your Top 25</span>
        </div>
      </div>
      <div className="analytics-columns">
        <article>
          <h3>Against the national grain</h3>
          {national?.ranks.length ? (
            deviations.slice(0, 5).map((r) => (
              <div className="analysis-bar-row" key={r.id}>
                <span>{teamMap.get(r.id)?.name || r.id}</span>
                <div>
                  <i
                    style={{
                      width: `${Math.min(100, Math.abs(r.gap) * 4)}%`,
                      background: r.gap >= 0 ? "var(--green)" : "#b8664b",
                    }}
                  />
                </div>
                <b>
                  {r.gap > 0 ? "+" : ""}
                  {r.gap}
                </b>
              </div>
            ))
          ) : (
            <p className="muted">
              This comparison appears when a verified national poll is
              available. No sample poll is used.
            </p>
          )}
          <small>
            Positive = your group is higher. National unranked = 26 for Top 25
            comparison.
          </small>
        </article>
        <article>
          <h3>The room is divided</h3>
          {disagreements.slice(0, 5).map((r) => (
            <div className="disagreement-row" key={r.id}>
              <span>{teamMap.get(r.id)?.name || r.id}</span>
              <strong>
                #{r.high} <span>to</span> {r.low > 25 ? "NR" : `#${r.low}`}
              </strong>
            </div>
          ))}
          {!rows.length && (
            <p className="muted">
              Submit the first ballot to start the conversation.
            </p>
          )}
        </article>
      </div>
      {previous.length > 0 && (
        <div className="ins-outs">
          <span>
            <b>IN</b>{" "}
            {entering.map((r) => teamMap.get(r.id)?.name || r.id).join(", ") ||
              "No new teams"}
          </span>
          <span>
            <b>OUT</b>{" "}
            {leaving.map((r) => teamMap.get(r.id)?.name || r.id).join(", ") ||
              "No teams dropped"}
          </span>
        </div>
      )}
    </section>
  );
}
export function CodeSettings({
  act,
  busy,
  state,
}: {
  act: (a: string, d: any) => Promise<boolean>;
  busy: boolean;
  state: any;
}) {
  return (
    <>
      <section className="code-settings">
        <h3>A name. A code. You’re in.</h3>
        <p>
          Share a private code with your friends. They can rank first and submit
          with just their name and this code. An existing voter still needs
          their original browser to change their ballot.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const d = new FormData(e.currentTarget);
            act("groupCode", {
              code: d.get("code"),
              live: d.get("live") === "on",
            });
          }}
        >
          <label className="field-label">
            {state.group.has_code
              ? "Change private group code"
              : "Set private group code"}
            <input
              name="code"
              minLength={5}
              maxLength={40}
              pattern="[A-Za-z0-9-]{5,40}"
              required
              placeholder="e.g. your group’s shared code"
              autoComplete="off"
            />
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              name="live"
              defaultChecked={state.group.auto_results}
            />
            Show live consensus and submitted individual ballots to group
            members
          </label>
          <p className="fine-print">
            Anyone with the code can join. Five-digit codes are easy to guess; a
            longer code keeps your group more private. The code is hashed and
            cannot be displayed again.
          </p>
          <button className="secondary" disabled={busy}>
            Save group code <Check size={14} />
          </button>
        </form>
      </section>
      <section className="code-settings">
        <h3>Make it your Saturday.</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            act(
              "appearance",
              Object.fromEntries(new FormData(e.currentTarget)),
            );
          }}
        >
          <label className="field-label">
            Group name
            <input
              name="group"
              defaultValue={state.group.name}
              maxLength={60}
              required
            />
          </label>
          <label className="field-label">
            School-color accent
            <input
              type="color"
              name="accent"
              defaultValue={state.group.appearance?.accent || "#244c3b"}
            />
          </label>
          <label className="field-label">
            Editorial theme
            <select
              name="theme"
              defaultValue={state.group.appearance?.theme || "classic"}
            >
              <option value="classic">Classic Saturday program</option>
              <option value="scoreboard">Stadium scoreboard</option>
              <option value="newsprint">Sunday sports section</option>
            </select>
          </label>
          <button className="secondary" disabled={busy}>
            Save your look <SlidersHorizontal size={14} />
          </button>
        </form>
      </section>
    </>
  );
}
