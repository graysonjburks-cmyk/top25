import { query } from "./db";
import { identity, id, token, hash, setSession } from "./auth";
import { aggregate, validateBallot, requireCommissioner } from "./scoring";
import { formats, selectField, makeBracket } from "./formats";
import { directory, sourceUrl, metricDefinitions } from "./data";
import { teamById } from "./teams";
function name(value: unknown, max = 60) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    throw new Error(`Enter a name of 1–${max} characters.`);
  return value.trim();
}
export async function execute(input: any) {
  if (input.action === "create") {
    const groupName = name(input.group),
      memberName = name(input.name, 40),
      group = id(),
      member = id(),
      secret = token(),
      invite = token();
    const season = Number(input.season) || new Date().getFullYear();
    if (!Number.isInteger(season) || season < 1900 || season > 2100)
      throw new Error("Invalid season.");
    await query(
      "INSERT INTO groups(id,name,invite_hash,season) VALUES($1,$2,$3,$4)",
      [group, groupName, hash(invite), season],
    );
    await query(
      "INSERT INTO members(id,group_id,name,role,session_hash) VALUES($1,$2,$3,'commissioner',$4)",
      [member, group, memberName, hash(secret)],
    );
    const dir = await directory(season);
    if (dir.teams.length < 25)
      throw new Error("The season directory needs at least 25 teams.");
    await query(
      "INSERT INTO weeks(id,group_id,number,deadline,config) VALUES($1,$2,1,$3,$4::jsonb)",
      [
        id(),
        group,
        new Date(Date.now() + 7 * 86400000).toISOString(),
        JSON.stringify({
          teams: dir.teams,
          allowedIds: dir.teams.map((t: any) => t.id),
          directorySeason: dir.season,
          directoryVerified: dir.verified,
        }),
      ],
    );
    await setSession(secret);
    return { invite };
  }
  if (input.action === "join") {
    const memberName = name(input.name, 40);
    if (typeof input.invite !== "string")
      throw new Error("Invitation required.");
    const group = (
      await query("SELECT id FROM groups WHERE invite_hash=$1", [
        hash(input.invite),
      ])
    )[0];
    if (!group)
      throw new Error("This invitation is invalid or has been rotated.");
    const secret = token();
    await query(
      "INSERT INTO members(id,group_id,name,role,session_hash) VALUES($1,$2,$3,'member',$4)",
      [id(), group.id, memberName, hash(secret)],
    );
    await setSession(secret);
    return {};
  }
  if (input.action === "logout") {
    const current=await identity();if(current)await query("UPDATE members SET session_hash=$1 WHERE id=$2",[hash(token()),current.id]);
    await setSession("");
    return {};
  }
  const member = await identity();
  if (!member) throw new Error("Join or create a group first.");
  if (input.action === "invite") {
    requireCommissioner(member.role);
    const invite = token();
    await query("UPDATE groups SET invite_hash=$1 WHERE id=$2", [
      hash(invite),
      member.group_id,
    ]);
    return { invite };
  }
  if (input.action === "remove") {
    requireCommissioner(member.role);
    if (input.member === member.id)
      throw new Error("The commissioner cannot remove themselves.");
    await query("UPDATE members SET active=false WHERE id=$1 AND group_id=$2", [
      input.member,
      member.group_id,
    ]);
    return {};
  }
  if (input.action === "newWeek") {
    requireCommissioner(member.role);
    const format = formats.find((f) => f.id === input.mode);
    if (!format) throw new Error("Unknown polling format.");
    const group = (
        await query("SELECT * FROM groups WHERE id=$1", [member.group_id])
      )[0],
      dir = await directory(group.season);
    const config = input.config || {};
    const eligible = dir.teams.filter(
      (t: any) =>
        format.id !== "conference" || t.conference === config.conference,
    );
    const size =
      format.id === "full" || format.id === "conference"
        ? eligible.length
        : format.id === "custom"
          ? Number(input.size)
          : format.size;
    if (!Number.isInteger(size) || size < 2 || size > eligible.length)
      throw new Error("Choose a valid field size and conference.");
    if (
      ["full", "conference"].includes(format.id) &&
      (!dir.verified || dir.season !== group.season)
    )
      throw new Error(
        "Import a verified directory for this group’s season before opening full-field or conference polls.",
      );
    config.teams = eligible;
    config.directorySeason = dir.season;
    config.directoryVerified = dir.verified;
    config.allowedIds = eligible.map((t: any) => t.id);
    if (format.id.startsWith("cfp")) {
      const byes = 2 ** Math.ceil(Math.log2(size)) - size;
      config.byes = Number(config.byes ?? byes);
      if (config.byes !== byes)
        throw new Error(`This field requires ${byes} first-round byes.`);
      config.automaticQualifiers = config.automaticQualifiers || [];
      if (
        !Array.isArray(config.automaticQualifiers) ||
        config.automaticQualifiers.some(
          (id: any) => !config.allowedIds.includes(id),
        ) ||
        new Set(config.automaticQualifiers).size !==
          config.automaticQualifiers.length ||
        config.automaticQualifiers.length > size
      )
        throw new Error("Invalid automatic qualifiers.");
      if (!["standard", "straight", undefined].includes(config.seedOrder))
        throw new Error("Invalid seeding rule.");
    }
    await query(
      "INSERT INTO weeks(id,group_id,number,mode,size,deadline,config) SELECT $1,$2,COALESCE(MAX(number),0)+1,$3,$4,$5,$6::jsonb FROM weeks WHERE group_id=$2 AND mode=$3",
      [
        id(),
        member.group_id,
        format.id,
        size,
        new Date(Date.now() + 7 * 86400000).toISOString(),
        JSON.stringify(config),
      ],
    );
    return {};
  }
  if (input.action === "directoryImport") {
    requireCommissioner(member.role);
    const data = input.data;
    if (
      !data ||
      !Number.isInteger(data.season) ||
      !Array.isArray(data.teams) ||
      !data.teams.length ||
      data.teams.length > 300
    )
      throw new Error("Provide a season-aware directory JSON.");
    sourceUrl(data.source);
    const ids = new Set();
    for (const team of data.teams) {
      if (
        !team ||
        typeof team.id !== "string" ||
        !/^[a-z0-9-]+$/.test(team.id) ||
        ids.has(team.id) ||
        typeof team.name !== "string" ||
        typeof team.conference !== "string" ||
        typeof team.initials !== "string" ||
        !/^#[a-fA-F0-9]{6}$/.test(team.color)
      )
        throw new Error("Invalid or duplicate team.");
      ids.add(team.id);
    }
    const verified = new Date(data.verifiedAt);
    if (!Number.isFinite(verified.getTime()) || verified.getTime() > Date.now())
      throw new Error("Provide the actual membership verification date.");
    await query(
      "INSERT INTO season_directories(season,teams,source,verified_at,notes) VALUES($1,$2::jsonb,$3,$4,$5) ON CONFLICT(season) DO UPDATE SET teams=EXCLUDED.teams,source=EXCLUDED.source,verified_at=EXCLUDED.verified_at,notes=EXCLUDED.notes",
      [
        data.season,
        JSON.stringify(data.teams),
        data.source,
        verified.toISOString(),
        data.notes || "",
      ],
    );
    return {};
  }
  if (input.action === "metricImport") {
    requireCommissioner(member.role);
    const data = input.data;
    if (
      !data ||
      !metricDefinitions.some((m) => m[0] === data.metric) ||
      !Number.isInteger(data.season) ||
      !Number.isInteger(data.week) ||
      typeof data.unit !== "string" ||
      !data.values ||
      typeof data.values !== "object"
    )
      throw new Error("Invalid metric snapshot.");
    sourceUrl(data.source);
    const updated = new Date(data.updatedAt);
    if (!Number.isFinite(updated.getTime()) || updated.getTime() > Date.now())
      throw new Error("Invalid source update timestamp.");
    for (const v of Object.values(data.values))
      if (typeof v !== "number" || !Number.isFinite(v))
        throw new Error("Metrics must be finite numbers.");
    await query(
      "INSERT INTO metric_snapshots(id,season,week,metric,source,unit,updated_at,values_json) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb)",
      [
        id(),
        data.season,
        data.week,
        data.metric,
        data.source,
        data.unit,
        updated.toISOString(),
        JSON.stringify(data.values),
      ],
    );
    return {};
  }
  if (input.action === "exhibitImport") {
    requireCommissioner(member.role);
    const d = input.data;
    if (
      !d ||
      !["identity", "stadium", "history", "people", "memorabilia"].includes(
        d.category,
      ) ||
      !teamById.has(d.teamId) ||
      typeof d.title !== "string" ||
      typeof d.body !== "string" ||
      typeof d.rights !== "string" ||
      !d.rights.trim()
    )
      throw new Error("Provide a sourced exhibit and usage rights.");
    sourceUrl(d.source);
    if (d.mediaUrl) sourceUrl(d.mediaUrl);
    await query(
      "INSERT INTO team_exhibits(id,team_id,category,title,body,source,rights,media_url,season) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [
        id(),
        d.teamId,
        d.category,
        d.title,
        d.body,
        d.source,
        d.rights,
        d.mediaUrl || null,
        d.season || null,
      ],
    );
    return {};
  }
  const week = (
    await query("SELECT * FROM weeks WHERE id=$1 AND group_id=$2 FOR UPDATE", [
      input.week,
      member.group_id,
    ])
  )[0];
  if (!week) throw new Error("Polling week not found.");
  const group = (
    await query("SELECT season FROM groups WHERE id=$1", [member.group_id])
  )[0];
  const dir = await directory(group.season);
  const eligibleIds = week.config?.allowedIds;
  const allowed = new Map<string, any>(
    (week.config?.teams || dir.teams)
      .filter((t: any) => !eligibleIds || eligibleIds.includes(t.id))
      .map((t: any) => [t.id, t]),
  );
  if (input.action === "ballot") {
    if (
      !Array.isArray(input.teams) ||
      input.teams.length > week.size ||
      new Set(input.teams).size !== input.teams.length ||
      input.teams.some((t: unknown) => typeof t !== "string" || !allowed.has(t))
    )
      throw new Error("Choose unique teams from the directory.");
    if (input.submit) validateBallot(input.teams, week.size, allowed);
    // The write itself checks deadline and status; a stale browser cannot submit after close.
    const saved = await query(
      `INSERT INTO ballots(week_id,member_id,teams,submitted) SELECT $1,$2,$3::jsonb,$4 FROM weeks WHERE id=$1 AND status='open' AND deadline>now() ON CONFLICT(week_id,member_id) DO UPDATE SET teams=EXCLUDED.teams,submitted=EXCLUDED.submitted,updated_at=now() WHERE EXISTS(SELECT 1 FROM weeks WHERE id=$1 AND status='open' AND deadline>now()) RETURNING week_id`,
      [week.id, member.id, JSON.stringify(input.teams), !!input.submit],
    );
    if (!saved.length)
      throw new Error("Voting is closed or the deadline has passed.");
    return {};
  }
  requireCommissioner(member.role);
  if (input.action === "deadline") {
    const deadline = new Date(input.deadline);
    if (!Number.isFinite(deadline.getTime()))
      throw new Error("Choose a valid deadline.");
    await query("UPDATE weeks SET deadline=$1 WHERE id=$2", [
      deadline.toISOString(),
      week.id,
    ]);
    return {};
  }
  if (input.action === "status") {
    if (!["open", "closed"].includes(input.status))
      throw new Error("Invalid voting status.");
    if (week.status === "published")
      throw new Error("Unpublish before changing voting.");
    await query("UPDATE weeks SET status=$1 WHERE id=$2", [
      input.status,
      week.id,
    ]);
    return {};
  }
  if (input.action === "unpublish") {
    await query("UPDATE weeks SET status='closed' WHERE id=$1", [week.id]);
    await query("DELETE FROM publications WHERE week_id=$1", [week.id]);
    return {};
  }
  if (input.action === "publish") {
    if (week.status === "published")
      throw new Error("Unpublish before replacing published results.");
    if (week.status === "open")
      throw new Error("Close voting before publishing.");
    const ballots = await query(
      "SELECT b.teams,m.name,m.id FROM ballots b JOIN members m ON m.id=b.member_id WHERE b.week_id=$1 AND b.submitted=true AND m.active=true ORDER BY m.name,m.id",
      [week.id],
    );
    if (!ballots.length)
      throw new Error("At least one final ballot is required.");
    const results = aggregate(
      ballots.map((b) => b.teams),
      week.size,
      allowed,
    );
    if (week.mode.startsWith("cfp")) {
      const field = selectField(
        results,
        week.size,
        week.config?.automaticQualifiers || [],
      );
      makeBracket(
        field.map((r) => r.id),
        week.config,
      );
    }
    await query(
      "INSERT INTO publications(week_id,results,ballots) VALUES($1,$2::jsonb,$3::jsonb) ON CONFLICT(week_id) DO UPDATE SET results=EXCLUDED.results,ballots=EXCLUDED.ballots,published_at=now()",
      [week.id, JSON.stringify(results), JSON.stringify(ballots)],
    );
    await query("UPDATE weeks SET status='published' WHERE id=$1", [week.id]);
    return {};
  }
  throw new Error("Unknown action.");
}
export async function loadState() {
  const member = await identity();
  if (!member) return null;
  const group = (
    await query("SELECT id,name,season FROM groups WHERE id=$1", [
      member.group_id,
    ])
  )[0];
  const members = await query(
    "SELECT id,name,role FROM members WHERE group_id=$1 AND active=true ORDER BY role,name",
    [group.id],
  );
  const weeks = await query(
    "SELECT * FROM weeks WHERE group_id=$1 ORDER BY number DESC,mode",
    [group.id],
  );
  const ballots = await query(
    "SELECT b.week_id,b.member_id,b.submitted,b.updated_at FROM ballots b JOIN weeks w ON w.id=b.week_id JOIN members m ON m.id=b.member_id WHERE w.group_id=$1 AND m.active=true",
    [group.id],
  );
  const own = await query(
    "SELECT b.* FROM ballots b JOIN weeks w ON w.id=b.week_id WHERE b.member_id=$1 AND w.group_id=$2",
    [member.id, group.id],
  );
  const publications = await query(
    "SELECT p.* FROM publications p JOIN weeks w ON w.id=p.week_id WHERE w.group_id=$1 AND w.status='published'",
    [group.id],
  );
  const dir = await directory(group.season);
  const metrics = await query(
    "SELECT DISTINCT ON(metric,week) * FROM metric_snapshots WHERE season=$1 ORDER BY metric,week,updated_at DESC",
    [group.season],
  );
  const exhibits = await query("SELECT * FROM team_exhibits ORDER BY title");
  return {
    directory: dir,
    metrics,
    exhibits,
    member: { id: member.id, name: member.name, role: member.role },
    group,
    members,
    weeks,
    ballots,
    own,
    publications,
  };
}
