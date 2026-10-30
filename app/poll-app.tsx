"use client";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Check,
  GripVertical,
  X,
  Users,
  ArrowRight,
  Copy,
  Download,
  Shield,
  Clock,
  Trophy,
} from "lucide-react";
import { teamById, sampleOrder, Team } from "@/lib/teams";
import {
  FormatPicker,
  DataHub,
  PlayoffBracket,
  RulesForm,
  Imports,
  TeamMuseum,
  Preferences,
} from "./extended";
import { formats } from "@/lib/formats";
import { aggregate, agreement } from "@/lib/scoring";
type View =
  | "rankings"
  | "ballot"
  | "voters"
  | "history"
  | "cfp"
  | "settings"
  | "data";
const sampleBallots = [
  sampleOrder,
  [...sampleOrder.slice(1, 3), sampleOrder[0], ...sampleOrder.slice(3)],
  [sampleOrder[1], sampleOrder[0], ...sampleOrder.slice(2)],
  [
    ...sampleOrder.slice(0, 5),
    sampleOrder[6],
    sampleOrder[5],
    ...sampleOrder.slice(7),
  ],
  [
    ...sampleOrder.slice(0, 9),
    sampleOrder[10],
    sampleOrder[9],
    ...sampleOrder.slice(11),
  ],
];
function Badge({ id, small = false }: { id: string; small?: boolean }) {
  const t = teamById.get(id) || {
    name: id,
    initials: id.slice(0, 2).toUpperCase(),
    color: "#244c3b",
  };
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={`Explore ${t.name} museum`}
      onClick={(e) => {
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent("team-museum", { detail: id }));
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          window.dispatchEvent(new CustomEvent("team-museum", { detail: id }));
        }
      }}
      className={`team-badge ${small ? "small" : ""}`}
      style={{ "--school": t.color } as React.CSSProperties}
    >
      {t.initials}
    </span>
  );
}
export default function PollApp({ state: initialState }: { state: any }) {
  const [state, setState] = useState(initialState);
  const [activeMode, setActiveMode] = useState("top25"),
    [museum, setMuseum] = useState<string | null>(null),
    [gamification, setGamification] = useState(false),
    [sound, setSound] = useState(false);
  const teams: Team[] = state?.directory.teams || Array.from(teamById.values());
  const localTeams = new Map<string, any>(
    [
      ...Array.from(teamById.values()),
      ...(state?.weeks.flatMap((w: any) => w.config?.teams || []) || []),
      ...teams,
    ].map((t: any) => [t.id, t]),
  );
  useEffect(() => {
    const listener = (e: Event) => setMuseum((e as CustomEvent).detail);
    window.addEventListener("team-museum", listener);
    setGamification(localStorage.getItem("poll-gamification") === "true");
    return () => window.removeEventListener("team-museum", listener);
  }, []);
  const [view, setView] = useState<View>("rankings"),
    [modal, setModal] = useState<"create" | "join" | null>(null),
    [invite, setInvite] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState(""),
    [selectedWeek, setSelectedWeek] = useState(""),
    [ballot, setBallot] = useState<string[]>([]),
    [drag, setDrag] = useState<number | null>(null),
    [compare, setCompare] = useState(0),
    [conference, setConference] = useState("All conferences");
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("invite");
    if (token) {
      setInvite(token);
      setModal("join");
    }
  }, []);
  useEffect(() => {
    if (!modal && !museum) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector('[role="dialog"]');
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input,select,textarea,a[href],[tabindex="0"]',
        ) || [],
      );
    focusable()[0]?.focus();
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModal(null);
        setMuseum(null);
      }
      if (e.key === "Tab") {
        const items = focusable();
        if (!items.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", listener);
    return () => {
      document.removeEventListener("keydown", listener);
      previous?.focus();
    };
  }, [modal, museum]);
  const demo = !state,
    member = state?.member;
  const mode = activeMode;
  const format = formats.find((f) => f.id === activeMode)!;
  const weeks =
    state?.weeks.filter((w: any) => view === "settings" || w.mode === mode) ||
    [];
  const week = weeks.find((w: any) => w.id === selectedWeek) || weeks[0];
  const size =
    week?.size ||
    (activeMode === "full"
      ? teams.length
      : activeMode === "conference"
        ? teams.filter((t) => t.conference === "SEC").length
        : format.size || 25);
  const eligibleTeams: Team[] = week?.config?.teams || teams;
  const own = state?.own.find((b: any) => b.week_id === week?.id);
  useEffect(() => {
    setBallot(own?.teams || []);
  }, [week?.id, own?.updated_at]);
  const publication = state?.publications.find(
    (p: any) => p.week_id === week?.id,
  );
  const demoBallots = sampleBallots.map((b) =>
    (activeMode === "conference"
      ? [...b, ...teams.map((t) => t.id)].filter(
          (id, i, a) =>
            a.indexOf(id) === i && localTeams.get(id)?.conference === "SEC",
        )
      : [...b, ...teams.map((t) => t.id)].filter(
          (id, i, a) => a.indexOf(id) === i,
        )
    ).slice(0, size),
  );
  const results = demo
    ? aggregate(demoBallots, size)
    : publication?.results || [];
  const previousWeek = weeks.find(
    (w: any) =>
      w.number < (week?.number || 0) &&
      state?.publications.some((p: any) => p.week_id === w.id),
  );
  const previous =
    state?.publications.find((p: any) => p.week_id === previousWeek?.id)
      ?.results || [];
  const publishedBallots = demo
    ? demoBallots.map((b, i) => ({
        id: String(i),
        name: ["Grayson", "Alex", "Jordan", "Sam", "Casey"][i],
        teams: b.slice(0, size),
      }))
    : publication?.ballots || [];
  const submissions = demo
    ? 5
    : state?.ballots.filter((b: any) => b.week_id === week?.id && b.submitted)
        .length || 0;
  const members = demo
    ? ["Grayson", "Alex", "Jordan", "Sam", "Casey"].map((name, i) => ({
        id: String(i),
        name,
        role: i === 0 ? "commissioner" : "member",
      }))
    : state.members;
  async function act(action: string, data: any = {}) {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const response = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, week: week?.id, ...data }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (result.invite)
        setInvite(`${location.origin}/?invite=${result.invite}`);
      setNotice(
        action === "ballot"
          ? data.submit
            ? "Ballot submitted. You can edit it until voting closes."
            : "Draft saved."
          : action === "publish"
            ? "The official poll is published."
            : "Changes saved.",
      );
      if (action === "logout") setView("rankings");
      if (action === "create" || action === "join") {
        setActiveMode("top25");setSelectedWeek("");
        setModal(null);
        history.replaceState(null, "", "/");
        setView("ballot");
      }
      const fresh = await fetch("/api/state", { cache: "no-store" });
      setState(fresh.ok ? await fresh.json() : null);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  function openBallot() {
    if (demo) {
      setModal("create");
      return;
    }
    setView("ballot");
  }
  function move(from: number, to: number) {
    if (to < 0 || to >= ballot.length) return;
    const next = [...ballot];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setBallot(next);
  }
  function exportResults() {
    const rows = [
      ["Rank", "Team", "Points", "First place votes", "High", "Low"],
      ...results.map((r: any) => [
        r.rank,
        localTeams.get(r.id)?.name,
        r.points,
        r.firsts,
        r.high,
        r.low,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `saturday-poll-week-${week?.number || 8}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  const isCommissioner = member?.role === "commissioner";
  return (
    <>
      <header className="masthead">
        <div
          className="brand"
          onClick={() => setView("rankings")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setView("rankings")}
        >
          <span className="brand-emblem">
            S<span>★</span>P
          </span>
          <span>
            SATURDAY
            <span className="brand-second">
              POLL<span className="brand-dot">.</span>
            </span>
          </span>
        </div>
        <nav aria-label="Main navigation">
          {(
            [
              ["rankings", "The Top 25"],
              ["ballot", "My ballot"],
              ["voters", "The voters"],
              ["history", "Poll archive"],
              ["cfp", "Playoff"],
              ["data", "Data center"],
            ] as [View, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              className={view === key ? "nav-active" : ""}
              onClick={() =>
                key === "ballot"
                  ? openBallot()
                  : key === "cfp"
                    ? (setActiveMode(
                        activeMode.startsWith("cfp") ? activeMode : "cfp12",
                      ),
                      setView("cfp"))
                    : setView(key)
              }
            >
              {label}
              {key === "cfp" && <span className="new-tag">CFP</span>}
            </button>
          ))}
        </nav>
        <button
          className="group-pill"
          onClick={() => (demo ? setModal("create") : setView("settings"))}
        >
          <span className="group-icon">
            <Users size={16} />
          </span>
          <span>
            {state?.group.name || "The Saturday Club"}
            <small>
              {demo
                ? "Sample private group"
                : `${members.length} members · Private group`}
            </small>
          </span>
          <ChevronDown size={15} />
        </button>
      </header>
      <div className="season-bar">
        <span>
          <span className="live-dot" />
          {state?.group.season || "SAMPLE SEASON"} COLLEGE FOOTBALL
        </span>
        <span>INDEPENDENT OPINIONS. ONE OFFICIAL POLL.</span>
        <span>
          EST. 2026 <span className="tiny-star">✦</span>
        </span>
      </div>
      <main>
        <div className="breadcrumb">
          {state?.group.name.toUpperCase()||"THE SATURDAY CLUB"} <ChevronRight size={12} />
          {view === "ballot"
            ? "YOUR BALLOT"
            : view === "cfp"
              ? "COLLEGE FOOTBALL PLAYOFF"
              : view === "settings"
                ? "COMMISSIONER’S OFFICE"
                : "THE PEOPLE’S POLL"}
        </div>
        <section className="page-heading">
          <div>
            <div className="eyebrow">
              <span className="short-line" />
              {view === "ballot"
                ? "MAKE YOUR CASE"
                : view === "cfp"
                  ? "THE ROAD TO A CHAMPIONSHIP"
                  : view === "settings"
                    ? "BEHIND THE POLL"
                    : "COLLEGE FOOTBALL, BY YOUR PEOPLE"}
            </div>
            <h1>
              {view === "rankings"
                ? "Every Saturday."
                : view === "ballot"
                  ? "Trust your gut."
                  : view === "voters"
                    ? "The selection committee."
                    : view === "history"
                      ? "For the record."
                      : view === "data"
                        ? "Beyond the eye test."
                        : view === "cfp"
                          ? `The final ${size}.`
                          : "Your league. Your rules."}
              {view === "rankings" && (
                <>
                  <br />
                  <em>A new pecking order.</em>
                </>
              )}
            </h1>
            <p>
              {view === "rankings"
                ? `${demo ? "Five" : members.length} friends. ${size} teams. Absolutely no shortage of opinions.`
                : view === "ballot"
                  ? `Build your ${size}. Make it official. Defend it in the group chat.`
                  : view === "cfp"
                    ? "A separate ballot. A different kind of debate."
                    : view === "voters"
                      ? "Different loyalties. One shared Saturday tradition."
                      : view === "history"
                        ? "Every rise, every fall, every “I told you so.”"
                        : "Keep the competition fair and the invitations private."}
            </p>
          </div>
          <div className="heading-action">
            {demo && (
              <span className="sample-label">
                SAMPLE DATA · NOT LIVE RANKINGS
              </span>
            )}
            {view === "rankings" && (
              <button className="primary" onClick={openBallot}>
                Build your ballot <ArrowUpRight size={17} />
              </button>
            )}
            {!demo && view !== "settings" && (
              <button
                className="text-button"
                onClick={() => setView("settings")}
              >
                Group settings <ArrowRight size={14} />
              </button>
            )}
          </div>
        </section>
        <FormatPicker
          value={activeMode}
          onChange={(v) => {
            setActiveMode(v);
            setSelectedWeek("");
            if (view === "cfp" && !v.startsWith("cfp")) setView("rankings");
          }}
        />
        {!demo && !state.directory.verified && (
          <div className="directory-notice">
            Using an unverified {state.directory.season} reference directory for
            a {state.group.season} group. Full-field and conference polls
            require a verified season import. No live sports data is implied.
          </div>
        )}
        {error && (
          <div className="alert error" role="alert">
            {error}
            <button onClick={() => setError("")} aria-label="Dismiss error">
              <X size={16} />
            </button>
          </div>
        )}
        {notice && (
          <div className="alert success" role="status">
            <Check size={16} />
            {notice}
          </div>
        )}
        {view === "rankings" && (
          <>
            <div className="poll-toolbar">
              <div className="poll-title">
                <span className="black-label">
                  {activeMode === "top25"
                    ? "THE TOP 25"
                    : format.name.toUpperCase()}
                </span>
                <span className="divider" />
                <strong>Week {week?.number || 8}</strong>
                <span className="status-pill">
                  {demo || publication ? (
                    <>
                      <span />
                      PUBLISHED
                    </>
                  ) : week?.status === "open" ? (
                    "VOTING OPEN"
                  ) : (
                    "VOTING CLOSED"
                  )}
                </span>
              </div>
              <div className="toolbar-right">
                {weeks.length > 0 && (
                  <select
                    aria-label="Polling week"
                    value={week?.id}
                    onChange={(e) => setSelectedWeek(e.target.value)}
                  >
                    {weeks.map((w: any) => (
                      <option value={w.id} key={w.id}>
                        Week {w.number}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  className="icon-text"
                  onClick={exportResults}
                  disabled={!results.length}
                >
                  <Download size={14} />
                  Export
                </button>
              </div>
            </div>
            <div className="results-layout">
              <section className="rankings-panel">
                <div className="table-caption">
                  <span>
                    {state?.group.name || "The Saturday Club"}{" "}
                    <span className="muted">/ Official consensus rankings</span>
                  </span>
                  <span>{submissions} BALLOTS CAST</span>
                </div>
                {results.length ? (
                  <>
                    <table className="rankings-table">
                      <thead>
                        <tr>
                          <th>RANK</th>
                          <th>TEAM</th>
                          <th>POINTS</th>
                          <th className="hide-mobile">1ST</th>
                          <th>MOVE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.slice(0, size).map((r: any, i: number) => {
                          const t = localTeams.get(r.id) || {
                            name: r.id,
                            conference: "Archived program",
                          };
                          const prev = demo
                            ? r.rank + [0, 1, -1, 2, -2, 0, 3, -1][i % 8]
                            : previous.find((p: any) => p.id === r.id)?.rank;
                          const change = prev ? prev - r.rank : 0;
                          return (
                            <tr key={r.id}>
                              <td className="rank-number">
                                {String(r.rank).padStart(2, "0")}
                              </td>
                              <td>
                                <div className="team-cell">
                                  <Badge id={r.id} />
                                  <span className="team-name">
                                    {t.name}
                                    <small>{t.conference}</small>
                                  </span>
                                  {i === 0 && (
                                    <span className="number-one">
                                      <Trophy size={12} />
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="points">
                                {r.points}
                                {r.tied && (
                                  <sup title="Tied points; first-place votes then alphabetical team name break ties">
                                    T
                                  </sup>
                                )}
                              </td>
                              <td className="hide-mobile first-votes">
                                {r.firsts || "—"}
                              </td>
                              <td>
                                <span
                                  className={`movement ${change > 0 ? "up" : change < 0 ? "down" : ""}`}
                                >
                                  {!prev ? (
                                    <span className="new-team">NEW</span>
                                  ) : change > 0 ? (
                                    <>
                                      <ArrowUp size={12} />
                                      {change}
                                    </>
                                  ) : change < 0 ? (
                                    <>
                                      <ArrowDown size={12} />
                                      {Math.abs(change)}
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
                    <div className="table-footnote">
                      {size} points for No. 1 · 1 point for No. {size} · Ties:
                      first-place votes, then alphabetical team name.{" "}
                      <span>T = tied point totals.</span>
                    </div>
                  </>
                ) : (
                  <div className="empty-state">
                    <Trophy size={34} />
                    <h2>The poll is taking shape.</h2>
                    <p>
                      {week
                        ? "Results stay private until the commissioner publishes this week’s poll."
                        : "Start your first polling week in group settings."}
                    </p>
                    <button className="primary" onClick={openBallot}>
                      Build your ballot <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              </section>
              <aside>
                <section className="club-card">
                  <div className="card-eyebrow">
                    <span className="live-dot" />
                    THE COMMISSIONER’S DESK
                  </div>
                  <h2>
                    A little rivalry.
                    <br />A lot of tradition.
                  </h2>
                  <p>
                    Your people. Your rankings.
                    <br />A weekly ritual worth arguing over.
                  </p>
                  <div className="avatar-stack">
                    {members.slice(0, 5).map((m: any, i: number) => (
                      <span
                        key={m.id}
                        style={{
                          background: [
                            "#c8d2ba",
                            "#dcccb3",
                            "#bdcbd6",
                            "#dec4b8",
                            "#c9c0d2",
                          ][i % 5],
                        }}
                      >
                        {m.name.slice(0, 1)}
                      </span>
                    ))}
                    <span className="member-total">
                      {members.length} voters
                    </span>
                  </div>
                  <div className="card-divider" />
                  <div className="submission-row">
                    <span>Ballots submitted</span>
                    <strong>
                      {submissions}
                      <span> / {members.length}</span>
                    </strong>
                  </div>
                  <div className="progress">
                    <span
                      style={{
                        width: `${(100 * submissions) / Math.max(1, members.length)}%`,
                      }}
                    />
                  </div>
                  <span className="deadline">
                    <Clock size={13} />
                    {demo
                      ? "Sample poll · voting complete"
                      : week
                        ? `Deadline: ${new Date(week.deadline).toLocaleString()}`
                        : "No polling week yet"}
                  </span>
                  <button
                    className="card-link"
                    onClick={() => setView("voters")}
                  >
                    Meet the voters <ArrowUpRight size={16} />
                  </button>
                </section>
                <section className="story-card">
                  <span className="eyebrow">THE WEEK’S TALKING POINT</span>
                  <div className="quote-mark">“</div>
                  <h3>
                    Rankings are better
                    <br />
                    when they’re personal.
                  </h3>
                  <p>
                    No national panel. No mystery formula. Just the people you
                    watch football with.
                  </p>
                  <div className="story-signature">
                    THAT’S SATURDAY POLL. <span>↗</span>
                  </div>
                </section>
                {results.length > 0 && (
                  <section className="stat-card">
                    <span className="eyebrow">ROOM FOR DEBATE</span>
                    <h3>The biggest split</h3>
                    {[...results]
                      .sort(
                        (a: any, b: any) => b.low - b.high - (a.low - a.high),
                      )
                      .slice(0, 1)
                      .map((r: any) => (
                        <div key={r.id}>
                          <div className="team-cell">
                            <Badge id={r.id} small />
                            <strong>{localTeams.get(r.id)?.name}</strong>
                          </div>
                          <p>
                            Highest: #{r.high} <span>·</span> Lowest:{" "}
                            {r.low > 25 ? "Unranked" : `#${r.low}`}
                          </p>
                        </div>
                      ))}
                  </section>
                )}
              </aside>
            </div>
          </>
        )}
        {view === "ballot" && (
          <section className="builder-layout">
            <div className="ballot-list">
              <div className="section-title">
                <h2>
                  {activeMode.startsWith("cfp") ? "Your seeds" : "Your Top"}{" "}
                  {size}
                </h2>
                <span>
                  {ballot.length} / {size} selected
                </span>
              </div>
              <p className="muted">
                Drag to reorder, use arrows, or enter a rank. Changes are saved
                when you choose Save draft or Submit.
              </p>
              <div className="bulk-actions">
                <button
                  className="text-button"
                  onClick={() =>
                    setBallot(
                      [
                        ...ballot,
                        ...[...eligibleTeams]
                          .sort((a: any, b: any) =>
                            a.name.localeCompare(b.name),
                          )
                          .filter((t: any) => !ballot.includes(t.id))
                          .map((t: any) => t.id),
                      ].slice(0, size),
                    )
                  }
                >
                  Fill remaining alphabetically
                </button>
                <button className="text-button" onClick={() => setBallot([])}>
                  Clear ballot
                </button>
                <label>
                  <input
                    type="checkbox"
                    checked={sound}
                    onChange={(e) => setSound(e.target.checked)}
                  />{" "}
                  Selection sound
                </label>
              </div>
              {own?.submitted && (
                <div className="alert success">
                  <Check size={16} />
                  Final ballot on file. Saving a draft will return it to draft
                  status.
                </div>
              )}
              {ballot.map((id, i) => (
                <div
                  className="ballot-row"
                  key={id}
                  draggable
                  onDragStart={() => setDrag(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (drag !== null) move(drag, i);
                    setDrag(null);
                  }}
                >
                  <GripVertical size={15} />
                  <b>{i + 1}</b>
                  <Badge id={id} small />
                  <strong>{localTeams.get(id)?.name}</strong>
                  <div className="reorder">
                    <input
                      type="number"
                      className="rank-jump"
                      aria-label={`Move ${localTeams.get(id)?.name || id} to position`}
                      min={1}
                      max={ballot.length}
                      value={i + 1}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (n >= 1 && n <= ballot.length) move(i, n - 1);
                      }}
                    />
                    <button
                      aria-label={`Move ${localTeams.get(id)?.name} up`}
                      onClick={() => move(i, i - 1)}
                      disabled={i === 0}
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      aria-label={`Move ${localTeams.get(id)?.name} down`}
                      onClick={() => move(i, i + 1)}
                      disabled={i === ballot.length - 1}
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      aria-label={`Remove ${localTeams.get(id)?.name}`}
                      onClick={() => setBallot(ballot.filter((t) => t !== id))}
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              ))}
              {!ballot.length && (
                <div className="empty-state">
                  <Plus size={28} />
                  <h3>Your No. 1 is waiting.</h3>
                  <p>Search the directory and add your first team.</p>
                </div>
              )}
              <div className="ballot-actions">
                <button
                  className="secondary"
                  disabled={busy || week?.status !== "open"}
                  onClick={() =>
                    act("ballot", { teams: ballot, submit: false })
                  }
                >
                  Save draft
                </button>
                <button
                  className="primary"
                  disabled={
                    busy ||
                    ballot.length !== week?.size ||
                    week?.status !== "open"
                  }
                  onClick={() => act("ballot", { teams: ballot, submit: true })}
                >
                  Submit final ballot <Check size={16} />
                </button>
              </div>
              <p className="fine-print">
                {week
                  ? `Voting ${week.status} · Deadline ${new Date(week.deadline).toLocaleString()}`
                  : "The commissioner needs to open a poll."}{" "}
                · Your session is your identity. Keep access to this browser.
              </p>
            </div>
            <div className="directory">
              <div className="section-title">
                <h2>The field</h2>
                <span>{teams.length} FBS teams</span>
              </div>
              <label className="search-box">
                <Search size={17} />
                <input
                  aria-label="Search teams"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Find a team…"
                />
              </label>
              <select
                aria-label="Filter conference"
                value={conference}
                onChange={(e) => setConference(e.target.value)}
              >
                {[
                  "All conferences",
                  ...new Set(teams.map((t) => t.conference)),
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <div className="directory-scroll">
                {eligibleTeams
                  .filter(
                    (t: any) =>
                      t.name.toLowerCase().includes(search.toLowerCase()) &&
                      (conference === "All conferences" ||
                        t.conference === conference),
                  )
                  .map((t: any) => (
                    <button
                      className="directory-team"
                      key={t.id}
                      disabled={ballot.includes(t.id) || ballot.length >= size}
                      onClick={() => {
                        setBallot([...ballot, t.id]);
                        if (sound) {
                          const audio = new AudioContext();
                          const tone = audio.createOscillator(),
                            gain = audio.createGain();
                          tone.connect(gain);
                          gain.connect(audio.destination);
                          gain.gain.setValueAtTime(0.03, audio.currentTime);
                          gain.gain.exponentialRampToValueAtTime(
                            0.001,
                            audio.currentTime + 0.09,
                          );
                          tone.frequency.value = 420;
                          tone.start();
                          tone.stop(audio.currentTime + 0.1);
                          tone.onended = () => audio.close();
                        }
                      }}
                    >
                      <Badge id={t.id} small />
                      <span>
                        <strong>{t.name}</strong>
                        <small>{t.conference}</small>
                      </span>
                      {ballot.includes(t.id) ? (
                        <Check size={17} />
                      ) : (
                        <Plus size={17} />
                      )}
                    </button>
                  ))}
              </div>
            </div>
          </section>
        )}
        {view === "voters" && (
          <>
            {gamification && (
              <div className="voter-scorecard">
                <span className="eyebrow">YOUR WEEKLY SCORECARD</span>
                <h3>
                  {own?.submitted
                    ? "Ballot on the record."
                    : "Make your opinion count."}
                </h3>
                <p>
                  {own?.submitted
                    ? "1 participation badge earned this week. No points are awarded for choosing particular teams."
                    : "Submit your ballot to earn your weekly participation badge."}
                </p>
              </div>
            )}
            <div className="voter-grid">
              {members.map((m: any, i: number) => {
                const submitted =
                  demo ||
                  state.ballots.some(
                    (b: any) =>
                      b.member_id === m.id &&
                      b.week_id === week?.id &&
                      b.submitted,
                  );
                return (
                  <section className="voter-card" key={m.id}>
                    <div className="large-avatar">{m.name[0]}</div>
                    <h2>{m.name}</h2>
                    <p>
                      {m.role === "commissioner"
                        ? "Commissioner"
                        : "Poll voter"}
                    </p>
                    <span
                      className={`status-pill ${submitted ? "" : "pending"}`}
                    >
                      {submitted ? "✓ BALLOT SUBMITTED" : "AWAITING BALLOT"}
                    </span>
                  </section>
                );
              })}
            </div>
            {publishedBallots.length > 0 && (
              <section className="comparison">
                <div className="section-title">
                  <h2>The individual ballots</h2>
                  <select
                    aria-label="Choose voter"
                    value={compare}
                    onChange={(e) => setCompare(Number(e.target.value))}
                  >
                    {publishedBallots.map((b: any, i: number) => (
                      <option key={b.id} value={i}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="muted">
                  Published ballots only. High / low includes unranked teams as
                  No. {size + 1}.
                </p>
                <div className="agreement-row">
                  {publishedBallots
                    .filter((_: any, i: number) => i !== compare)
                    .map((b: any) => (
                      <span key={b.id}>
                        {b.name}{" "}
                        <b>
                          {agreement(
                            publishedBallots[compare]?.teams || [],
                            b.teams,
                            size,
                          )}
                          %
                        </b>{" "}
                        agreement
                      </span>
                    ))}
                </div>
                <div className="comparison-grid">
                  {publishedBallots[compare]?.teams.map(
                    (id: string, i: number) => {
                      const r = results.find((r: any) => r.id === id);
                      return (
                        <div className="comparison-team" key={id}>
                          <b>{i + 1}</b>
                          <Badge id={id} small />
                          <strong>{localTeams.get(id)?.name}</strong>
                          <small>
                            High {r?.high} / Low {r?.low > size ? "NR" : r?.low}
                          </small>
                        </div>
                      );
                    },
                  )}
                </div>
              </section>
            )}
            {!publishedBallots.length && (
              <p className="empty-state">
                Individual ballots become visible after publication.
              </p>
            )}
          </>
        )}
        {view === "history" && (
          <>
            <div className="archive-grid">
              {demo ? (
                <section className="archive-card">
                  <span className="eyebrow">SAMPLE ARCHIVE</span>
                  <h2>Week 8</h2>
                  <Badge id="georgia" />
                  <h3>Georgia takes the top spot.</h3>
                  <p>5 voters · Sample results</p>
                  <button
                    className="text-button"
                    onClick={() => setView("rankings")}
                  >
                    View poll <ArrowRight size={15} />
                  </button>
                </section>
              ) : (
                state.weeks
                  .filter((w: any) =>
                    state.publications.some((p: any) => p.week_id === w.id),
                  )
                  .map((w: any) => {
                    const pub = state.publications.find(
                      (p: any) => p.week_id === w.id,
                    );
                    return (
                      <section className="archive-card" key={w.id}>
                        <span className="eyebrow">
                          {state.group.season} ·{" "}
                          {w.mode.startsWith("cfp")
                            ? "PLAYOFF"
                            : w.mode.toUpperCase()}
                        </span>
                        <h2>Week {w.number}</h2>
                        <Badge id={pub.results[0].id} />
                        <h3>
                          {localTeams.get(pub.results[0].id)?.name} at No. 1
                        </h3>
                        <p>
                          {pub.ballots.length} voters ·{" "}
                          {new Date(pub.published_at).toLocaleDateString()}
                        </p>
                        <button
                          className="text-button"
                          onClick={() => {
                            setSelectedWeek(w.id);
                            setActiveMode(w.mode);
                            setView(
                              w.mode.startsWith("cfp") ? "cfp" : "rankings",
                            );
                          }}
                        >
                          View poll <ArrowRight size={15} />
                        </button>
                      </section>
                    );
                  })
              )}
            </div>
            {!demo && !state.publications.length && (
              <div className="empty-state">
                Published polls will be archived here throughout the season.
              </div>
            )}
            {previous.length > 0 && (
              <div className="comparison">
                <h2>In & out this week</h2>
                <p>
                  Entering:{" "}
                  {results
                    .filter(
                      (r: any) =>
                        !previous.some((p: any) => p.id === r.id) &&
                        r.rank <= 25,
                    )
                    .map((r: any) => localTeams.get(r.id)?.name)
                    .join(", ") || "None"}
                </p>
                <p>
                  Leaving:{" "}
                  {previous
                    .filter(
                      (p: any) =>
                        p.rank <= 25 &&
                        !results.slice(0, 25).some((r: any) => r.id === p.id),
                    )
                    .map((r: any) => localTeams.get(r.id)?.name)
                    .join(", ") || "None"}
                </p>
              </div>
            )}
          </>
        )}
        {view === "cfp" && (
          <section className="comparison">
            <PlayoffBracket
              ranking={results.map((r: any) => ({
                ...r,
                name: localTeams.get(r.id)?.name,
              }))}
              ballots={publishedBallots}
              size={size}
              rules={week?.config || {}}
              demo={demo}
            />
            {!demo && (
              <button className="primary" onClick={() => setView("ballot")}>
                Build your independent seed ballot <ArrowRight size={15} />
              </button>
            )}
          </section>
        )}
        {view === "data" && (
          <DataHub state={state} results={results} teams={teams} />
        )}
        {view === "settings" && !demo && (
          <div className="settings-grid">
            <section className="comparison">
              <div className="section-title">
                <h2>{state.group.name}</h2>
                <Shield size={20} />
              </div>
              <p className="muted">
                {member.name} · {member.role}. Your identity is stored in a
                secure browser cookie. Rejoining with an invitation creates a
                new identity.
              </p>
              {isCommissioner && (
                <>
                  <h3>Private invitations</h3>
                  <p>
                    Generate a new link to invite friends. This invalidates
                    previous invitation links.
                  </p>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => act("invite")}
                  >
                    Generate invitation <Copy size={15} />
                  </button>
                  {invite && (
                    <div className="invite-box">
                      <input
                        aria-label="Invitation link"
                        readOnly
                        value={invite}
                      />
                      <button
                        aria-label="Copy invitation link"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(invite);
                            setNotice("Invitation copied.");
                          } catch {
                            setError("Select and copy the invitation link.");
                          }
                        }}
                      >
                        <Copy size={17} />
                      </button>
                    </div>
                  )}
                  <h3>Manage members</h3>
                  {members.map((m: any) => (
                    <div className="member-row" key={m.id}>
                      <span>
                        {m.name} <small>{m.role}</small>
                      </span>
                      {m.id !== member.id && (
                        <button
                          className="text-button danger"
                          onClick={() => act("remove", { member: m.id })}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </>
              )}
              <Preferences
                enabled={gamification}
                setEnabled={setGamification}
              />
              <button className="text-button" onClick={() => act("logout")}>
                Sign out of this browser <ArrowRight size={15} />
              </button>
            </section>
            {isCommissioner && (
              <section className="comparison">
                <h2>Polling controls</h2>
                <label className="field-label">
                  Week
                  <select
                    value={selectedWeek || week?.id || ""}
                    onChange={(e) => setSelectedWeek(e.target.value)}
                  >
                    {state.weeks.map((w: any) => (
                      <option key={w.id} value={w.id}>
                        Week {w.number} · {w.mode}
                      </option>
                    ))}
                  </select>
                </label>
                {week && (
                  <>
                    <p>
                      Current status: <strong>{week.status}</strong>
                    </p>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const data = new FormData(e.currentTarget);
                        act("deadline", {
                          deadline: new Date(
                            String(data.get("deadline")),
                          ).toISOString(),
                        });
                      }}
                    >
                      <label className="field-label">
                        Voting deadline
                        <input
                          aria-label="Voting deadline"
                          type="datetime-local"
                          name="deadline"
                          required
                          defaultValue={new Date(
                            new Date(week.deadline).getTime() -
                              new Date().getTimezoneOffset() * 60000,
                          )
                            .toISOString()
                            .slice(0, 16)}
                        />
                      </label>
                      <button className="secondary" disabled={busy}>
                        Save deadline
                      </button>
                    </form>
                    <div className="control-buttons">
                      <button
                        className="secondary"
                        disabled={busy || week.status === "published"}
                        onClick={() =>
                          act("status", {
                            status: week.status === "open" ? "closed" : "open",
                          })
                        }
                      >
                        {week.status === "open"
                          ? "Close voting"
                          : "Reopen voting"}
                      </button>
                      <button
                        className="primary"
                        disabled={busy}
                        onClick={() =>
                          act(
                            week.status === "published"
                              ? "unpublish"
                              : "publish",
                          )
                        }
                      >
                        {week.status === "published"
                          ? "Unpublish results"
                          : "Publish results"}
                      </button>
                    </div>
                  </>
                )}
                <RulesForm act={act} busy={busy} teams={teams} />
                <Imports act={act} busy={busy} />
              </section>
            )}
          </div>
        )}
      </main>
      <footer>
        <div className="footer-brand">
          SATURDAY POLL<span>®</span>
        </div>
        <p>For the love of the game. And the argument.</p>
        <span>PRIVATE POLLS. PUBLIC-LEVEL PASSION.</span>
      </footer>
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-modal"
              aria-label="Close dialog"
              onClick={() => setModal(null)}
            >
              <X size={20} />
            </button>
            <span className="eyebrow">WELCOME TO YOUR SATURDAY TRADITION</span>
            <h2 id="modal-title">
              {modal === "create"
                ? "Build your inner circle."
                : "You’re on the committee."}
            </h2>
            <p>
              {modal === "create"
                ? "Create a private group, invite your friends, and put your football opinions on the record."
                : "Choose your name to join this private polling group."}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(e.currentTarget));
                act(modal === "create" ? "create" : "join", {
                  ...data,
                  invite:
                    new URL(invite, location.origin).searchParams.get(
                      "invite",
                    ) || invite,
                });
              }}
            >
              {modal === "create" && (
                <label className="field-label">
                  Group name
                  <input
                    name="group"
                    placeholder="The Saturday Club"
                    required
                    maxLength={60}
                  />
                </label>
              )}
              {modal === "create" && (
                <label className="field-label">
                  Season
                  <input
                    type="number"
                    name="season"
                    min={1900}
                    max={2100}
                    defaultValue={2026}
                    required
                  />
                </label>
              )}
              <label className="field-label">
                Your name
                <input
                  name="name"
                  placeholder="Grayson"
                  required
                  maxLength={40}
                />
              </label>
              {modal === "join" && !invite && (
                <label className="field-label">
                  Invitation token
                  <input
                    required
                    value={invite}
                    onChange={(e) => setInvite(e.target.value)}
                  />
                </label>
              )}
              <button className="primary" disabled={busy}>
                {busy
                  ? "One moment…"
                  : modal === "create"
                    ? "Create private group"
                    : "Join the group"}
                <ArrowRight size={16} />
              </button>
            </form>
            {error && (
              <p className="danger" role="alert">
                {error}
              </p>
            )}
            <p className="fine-print">
              No password to remember. Your membership stays in this browser.
              Keep the invitation private.
            </p>
            <button
              className="text-button"
              onClick={() => setModal(modal === "create" ? "join" : "create")}
            >
              {modal === "create"
                ? "Have an invitation? Join a group"
                : "Start your own group"}
            </button>
          </section>
        </div>
      )}
      {museum && localTeams.has(museum) && (
        <TeamMuseum
          key={museum}
          team={localTeams.get(museum)}
          exhibits={state?.exhibits || []}
          close={() => setMuseum(null)}
          collecting={gamification}
        />
      )}
    </>
  );
}
