"use client";
import { useState, useEffect } from "react";
import {
  Search,
  X,
  ArrowUpDown,
  ExternalLink,
  Shield,
  BookOpen,
  Star,
  Volume2,
  VolumeX,
  Check,
  ArrowRight,
} from "lucide-react";
import { teams as referenceTeams, Team } from "@/lib/teams";
import { metricDefinitions } from "@/lib/metrics";
import { formats, makeBracket, selectField } from "@/lib/formats";
export function FormatPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="format-strip">
      <span className="eyebrow">THE FORMAT</span>
      <div role="group" aria-label="Polling format">
        {formats.map((f) => (
          <button
            key={f.id}
            className={f.id === value ? "selected" : ""}
            onClick={() => onChange(f.id)}
          >
            {f.id === "top25"
              ? "AP Top 25"
              : f.id === "cfp4"
                ? "CFP 4"
                : f.id === "cfp12"
                  ? "CFP 12"
                  : f.id === "cfp24"
                    ? "CFP 24*"
                    : f.name}
          </button>
        ))}
      </div>
      <small>* A hypothetical expanded playoff.</small>
    </div>
  );
}
export function DataHub({
  state,
  results,
  teams,
}: {
  state: any;
  results: any[];
  teams: Team[];
}) {
  const [search, setSearch] = useState(""),
    [week, setWeek] = useState("latest"),
    [columns, setColumns] = useState([
      "ap",
      "coaches",
      "cfp",
      "fpi",
      "wins",
      "losses",
    ]),
    [sort, setSort] = useState("name"),
    [descending, setDescending] = useState(false);
  const metrics: any[] = state?.metrics || [],
    season = state?.group.season || 2025;
  function snapshot(key: string) {
    return metrics
      .filter(
        (m) =>
          m.metric === key && (week === "latest" || m.week === Number(week)),
      )
      .sort(
        (a, b) =>
          b.week - a.week ||
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      )[0];
  }
  function value(id: string, key: string): number | string | null {
    if (key === "name") return teams.find((t) => t.id === id)?.name || id;
    if (key === "group") return results.find((r) => r.id === id)?.rank ?? null;
    return snapshot(key)?.values_json[id] ?? null;
  }
  const shown = teams
    .filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = value(a.id, sort),
        bv = value(b.id, sort);
      if (av === null) return bv === null ? 0 : 1;
      if (bv === null) return -1;
      return (
        (typeof av === "string"
          ? av.localeCompare(String(bv))
          : Number(av) - Number(bv)) * (descending ? -1 : 1)
      );
    });
  function header(key: string, label: string) {
    return (
      <button
        onClick={() => {
          setSort(key);
          setDescending(sort === key ? !descending : false);
        }}
      >
        {label}
        <ArrowUpDown size={11} />
        {sort === key ? (descending ? " ↓" : " ↑") : ""}
      </button>
    );
  }
  return (
    <section className="data-hub">
      <div className="section-title">
        <h2>The numbers behind the noise.</h2>
        <select
          aria-label="Statistics week"
          value={week}
          onChange={(e) => setWeek(e.target.value)}
        >
          <option value="latest">Latest available</option>
          {[...new Set(metrics.map((m) => m.week))]
            .sort((a, b) => b - a)
            .map((w) => (
              <option key={w} value={w}>
                Week {w}
              </option>
            ))}
        </select>
      </div>
      <p className="muted">
        Season {season}. Imported, licensed snapshots only. Each column reports
        its own source week; latest values may have different update dates.
        Missing data stays unavailable.
      </p>
      <label className="search-box">
        <Search size={17} />
        <input
          placeholder="Search the FBS field…"
          aria-label="Search statistics teams"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <details className="column-picker">
        <summary>Customize statistics columns ({columns.length})</summary>
        <div>
          {metricDefinitions.map(([key, label]) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={columns.includes(key)}
                onChange={() =>
                  setColumns(
                    columns.includes(key)
                      ? columns.filter((c) => c !== key)
                      : [...columns, key],
                  )
                }
              />
              {label}
            </label>
          ))}
        </div>
      </details>
      <div className="data-table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th
                aria-sort={
                  sort === "name"
                    ? descending
                      ? "descending"
                      : "ascending"
                    : "none"
                }
              >
                {header("name", "Team")}
              </th>
              <th>
                {header("group", "Group rank")}
                <small>Published group poll</small>
              </th>
              {columns.map((key) => {
                const def = metricDefinitions.find((d) => d[0] === key)!,
                  m = snapshot(key);
                return (
                  <th
                    key={key}
                    aria-sort={
                      sort === key
                        ? descending
                          ? "descending"
                          : "ascending"
                        : "none"
                    }
                  >
                    {header(key, def[1])}
                    <small>
                      {m ? `${m.unit} · ${m.season} W${m.week}` : def[2]}
                    </small>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {shown.map((t) => (
              <tr key={t.id}>
                <td>
                  <button
                    className="team-text-link"
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent("team-museum", { detail: t.id }),
                      )
                    }
                  >
                    {t.name}
                  </button>
                  <small>{t.conference}</small>
                </td>
                <td>{value(t.id, "group") ?? "—"}</td>
                {columns.map((key) => (
                  <td key={key}>
                    {value(t.id, key) ?? (
                      <span className="unavailable">Unavailable</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="sources-list">
        <h3>Sources & freshness</h3>
        {columns.map((key) => {
          const def = metricDefinitions.find((d) => d[0] === key)!,
            m = snapshot(key);
          return (
            <div key={key}>
              <strong>{def[1]}</strong>
              {m ? (
                <>
                  <a href={m.source} target="_blank" rel="noreferrer">
                    Source <ExternalLink size={10} />
                  </a>
                  <span>
                    {m.season} · Week {m.week} · {m.unit} · Updated{" "}
                    {new Date(m.updated_at).toLocaleString()}
                  </span>
                </>
              ) : (
                <span>
                  {[
                    "fpi",
                    "sor",
                    "offensiveEfficiency",
                    "defensiveEfficiency",
                  ].includes(key)
                    ? "Unavailable — proprietary metric; no licensed source configured."
                    : "Unavailable — no sourced snapshot imported."}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
export function PlayoffBracket({
  ranking,
  ballots,
  size,
  rules,
  demo = false,
}: {
  ranking: any[];
  ballots: any[];
  size: number;
  rules: any;
  demo?: boolean;
}) {
  const [voter, setVoter] = useState("consensus");
  let field: string[] = [];
  let error = "";
  try {
    field =
      voter === "consensus"
        ? selectField(ranking, size, rules?.automaticQualifiers || []).map(
            (r) => r.id,
          )
        : ballots.find((b) => b.id === voter)?.teams || [];
  } catch (e) {
    error = (e as Error).message;
  }
  const rounds = field.length ? makeBracket(field, rules) : [];
  return (
    <div className="playoff-display">
      <div className="section-title">
        <h2>{size === 24 ? "The hypothetical 24." : `The final ${size}.`}</h2>
        <select
          aria-label="Bracket voter"
          value={voter}
          onChange={(e) => setVoter(e.target.value)}
        >
          <option value="consensus">Consensus field</option>
          {ballots.map((b) => (
            <option value={b.id} key={b.id}>
              {b.name}’s bracket
            </option>
          ))}
        </select>
      </div>
      <p className="muted">
        {demo ? "Sample projection. " : ""}
        {rules?.description ||
          "Group projection, not an official CFP selection."}{" "}
        Seeds follow consensus points. Automatic qualifiers replace the lowest
        non-qualifier without changing anyone’s ballot. Byes:{" "}
        {rules?.byes ?? 2 ** Math.ceil(Math.log2(size)) - size}.
      </p>
      {size === 24 && (
        <span className="sample-label">
          HYPOTHETICAL FORMAT · NOT THE OFFICIAL CFP
        </span>
      )}
      {error && <p className="danger">{error}</p>}
      <div className="bracket">
        {rounds.map((round, i) => (
          <div className="bracket-round" key={i}>
            <span className="eyebrow">{round.label}</span>
            {round.games.map((game, j) => (
              <div className="matchup" key={j}>
                {[game.a, game.b].map((seed, k) => (
                  <div key={k}>
                    {seed ? (
                      <>
                        <span className="seed">{seed.seed}</span>
                        <strong>
                          {ranking.find((r) => r.id === seed.id)?.name ||
                            referenceTeams.find((t) => t.id === seed.id)
                              ?.name ||
                            seed.id}
                        </strong>
                      </>
                    ) : (
                      <span className="muted">
                        {i === 0 ? "BYE" : game.from}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
      {!rounds.length && (
        <div className="empty-state">
          Publish seed ballots to reveal the bracket.
        </div>
      )}
    </div>
  );
}
export function RulesForm({
  act,
  busy,
  teams,
}: {
  act: (action: string, data: any) => Promise<boolean>;
  busy: boolean;
  teams: Team[];
}) {
  const [format, setFormat] = useState("top25"),
    [size, setSize] = useState(10);
  return (
    <form
      className="rules-form"
      onSubmit={(e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget),
          f = formats.find((f) => f.id === format)!;
        act("newWeek", {
          mode: format,
          size,
          config: {
            conference: d.get("conference") || undefined,
            byes: format.startsWith("cfp") ? Number(d.get("byes")) : undefined,
            automaticQualifiers: String(d.get("aq") || "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            seedOrder: d.get("seedOrder") || "standard",
            description: d.get("description") || undefined,
          },
        });
      }}
    >
      <h3>Open an independent polling week</h3>
      <label className="field-label">
        Format
        <select value={format} onChange={(e) => setFormat(e.target.value)}>
          {formats.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </label>
      {format === "custom" && (
        <label className="field-label">
          Number of teams
          <input
            type="number"
            min={2}
            max={teams.length}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            required
          />
        </label>
      )}
      {format === "conference" && (
        <label className="field-label">
          Conference
          <select name="conference">
            {[...new Set(teams.map((t) => t.conference))].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      )}
      {format.startsWith("cfp") && (
        <>
          <label className="field-label">
            First-round byes
            <input
              name="byes"
              type="number"
              min={0}
              max={24}
              defaultValue={format === "cfp4" ? 0 : format === "cfp12" ? 4 : 8}
              key={format}
            />
          </label>
          <label className="field-label">
            Seed placement
            <select name="seedOrder">
              <option value="standard">Balanced tournament seeding</option>
              <option value="straight">Adjacent seeds</option>
            </select>
          </label>
          <label className="field-label">
            Automatic qualifiers (comma-separated team IDs)
            <input name="aq" placeholder="georgia, ohio-state" />
          </label>
          <label className="field-label">
            Season-specific rules / explanation
            <input
              name="description"
              placeholder="2026 group projection; no automatic bids"
              maxLength={400}
            />
          </label>
          <p className="fine-print">
            Automatic qualifiers must appear on a submitted ballot. Field size
            fixes the number of byes for a single-elimination bracket. No AP
            ballot is reused.
          </p>
        </>
      )}
      <button className="primary" disabled={busy}>
        Open polling week <ArrowRight size={15} />
      </button>
    </form>
  );
}
export function Imports({
  act,
  busy,
}: {
  act: (a: string, d: any) => Promise<boolean>;
  busy: boolean;
}) {
  const [kind, setKind] = useState("directoryImport"),
    [text, setText] = useState(""),
    [error, setError] = useState("");
  return (
    <details className="import-panel">
      <summary>
        Import verified directory, licensed metrics, or museum exhibits
      </summary>
      <p className="fine-print">
        Use the documented JSON formats in README.md. A source URL is required
        for every import. Membership verification and content rights are the
        importer’s responsibility.
      </p>
      <label className="field-label">
        Data type
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="directoryImport">Season team directory</option>
          <option value="metricImport">Metric snapshot</option>
          <option value="exhibitImport">Sourced museum exhibit</option>
        </select>
      </label>
      <textarea
        aria-label="Import JSON"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste sourced JSON…"
        rows={9}
      />
      <button
        className="secondary"
        disabled={busy || !text}
        onClick={async () => {
          try {
            const data = JSON.parse(text);
            setError("");
            if (await act(kind, { data })) setText("");
          } catch {
            setError("Enter valid JSON.");
          }
        }}
      >
        Validate and import
      </button>
      {error && <p className="danger">{error}</p>}
    </details>
  );
}
export function TeamMuseum({
  team,
  exhibits,
  close,
  collecting,
}: {
  team: Team;
  exhibits: any[];
  close: () => void;
  collecting: boolean;
}) {
  const [category, setCategory] = useState("identity"),
    [trivia, setTrivia] = useState(false),
    [collected, setCollected] = useState(false);
  useEffect(() => {
    setCollected(
      JSON.parse(localStorage.getItem("poll-collection") || "[]").includes(
        team.id,
      ),
    );
  }, [team.id]);
  const entries = exhibits.filter(
    (e) => e.team_id === team.id && e.category === category,
  );
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        className="museum-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="museum-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="close-modal"
          aria-label="Close team museum"
          onClick={close}
        >
          <X size={20} />
        </button>
        <div
          className="museum-top"
          style={{ "--school": team.color } as React.CSSProperties}
        >
          <span className="eyebrow">
            THE SATURDAY COLLECTION · PROGRAM CABINET
          </span>
          <div className="museum-wordmark">{team.initials}</div>
          <h2 id="museum-title">{team.name}</h2>
          <p>{team.conference} · Original typographic badge</p>
        </div>
        <div className="museum-content">
          <div className="museum-tabs">
            {[
              ["identity", "Program identity"],
              ["stadium", "Stadium & campus"],
              ["history", "Football history"],
              ["people", "People"],
              ["memorabilia", "Memorabilia"],
            ].map(([id, label]) => (
              <button
                key={id}
                className={category === id ? "selected" : ""}
                onClick={() => {
                  setCategory(id);
                  setTrivia(false);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {entries.length ? (
            entries.map((e) => (
              <article className="exhibit" key={e.id}>
                <span className="eyebrow">CURATED EXHIBIT</span>
                <h3>{e.title}</h3>
                <p>{e.body}</p>
                {e.media_url && (
                  <a href={e.media_url} rel="noreferrer" target="_blank">
                    Open licensed media <ExternalLink size={12} />
                  </a>
                )}
                <div className="exhibit-source">
                  <a href={e.source} rel="noreferrer" target="_blank">
                    Historical source ↗
                  </a>
                  <span>Usage rights: {e.rights}</span>
                </div>
              </article>
            ))
          ) : (
            <div className="museum-placeholder">
              <BookOpen size={32} />
              <h3>This cabinet is awaiting its collection.</h3>
              <p>
                No verified {category} exhibits have been imported for{" "}
                {team.name}. Historical claims, archival imagery, fight songs,
                and player profiles appear here only with sources and usage
                rights.
              </p>
              <a
                href="https://www.ncaa.org/sports/2021/5/3/membership-directory.aspx"
                target="_blank"
                rel="noreferrer"
              >
                Research through the NCAA directory <ExternalLink size={12} />
              </a>
            </div>
          )}
          <div className="museum-interactive">
            <h3>The quick scouting report</h3>
            <p>
              Which conference does the loaded directory list for {team.name}?
            </p>
            <button className="secondary" onClick={() => setTrivia(!trivia)}>
              {trivia ? team.conference : "Reveal directory answer"}
            </button>
            <p className="fine-print">
              Directory-based trivia; this does not verify historical
              affiliations.
            </p>
            {collecting && (
              <button
                className="text-button"
                disabled={collected}
                onClick={() => {
                  const list = JSON.parse(
                    localStorage.getItem("poll-collection") || "[]",
                  );
                  localStorage.setItem(
                    "poll-collection",
                    JSON.stringify([...new Set([...list, team.id])]),
                  );
                  setCollected(true);
                }}
              >
                <Star size={14} />
                {collected
                  ? "Added to your program collection"
                  : "Collect this program badge"}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
export function Preferences({
  enabled,
  setEnabled,
}: {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
}) {
  return (
    <div className="preferences">
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            setEnabled(e.target.checked);
            localStorage.setItem("poll-gamification", String(e.target.checked));
          }}
        />
        Enable program collection & weekly voter scorecards
      </label>
      <p className="fine-print">
        Optional. Collection badges stay on this browser. Scorecards reward
        participation, never ballot choices.
      </p>
    </div>
  );
}
