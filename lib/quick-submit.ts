import { query } from "./db";
import { id, token, hash, setSession, groupIdentity } from "./auth";
import { codeHash } from "./group-codes";
import { directory } from "./data";
import { validateBallot } from "./scoring";
import { formats } from "./formats";
import { footballSeason } from "./national-parser";
export async function quickSubmit(input: any) {
  const memberName = typeof input.name === "string" ? input.name.trim() : "";
  if (!memberName || memberName.length > 40)
    throw new Error("Enter your name (1–40 characters).");
  const code = codeHash(input.code);
  const format = formats.find((f) => f.id === (input.mode || "top25"));
  if (!format || !["top25", "cfp4", "cfp12", "cfp24"].includes(format.id))
    throw new Error("Choose Top 25 or a playoff format for code submission.");
  const season = footballSeason();
  let group = (
    await query("SELECT * FROM groups WHERE code_hash=$1 FOR UPDATE", [code])
  )[0];
  if (!group) {
    const groupName =
      typeof input.group === "string" && input.group.trim()
        ? input.group.trim()
        : `${memberName}’s Saturday Club`;
    if (groupName.length > 60)
      throw new Error("Use a group name of 60 characters or less.");
    const newId = id();
    const inserted = await query(
      "INSERT INTO groups(id,name,invite_hash,season,code_hash,auto_results) VALUES($1,$2,$3,$4,$5,true) ON CONFLICT(code_hash) DO NOTHING RETURNING *",
      [newId, groupName, hash(token()), season, code],
    );
    group =
      inserted[0] ||
      (
        await query("SELECT * FROM groups WHERE code_hash=$1 FOR UPDATE", [
          code,
        ])
      )[0];
  }
  const dir = await directory(group.season);
  let week = (
    await query(
      "SELECT * FROM weeks WHERE group_id=$1 AND mode=$2 ORDER BY number DESC LIMIT 1 FOR UPDATE",
      [group.id, format.id],
    )
  )[0];
  if (!week) {
    const config = {
      teams: dir.teams,
      allowedIds: dir.teams.map((t: any) => t.id),
      directorySeason: dir.season,
      directoryVerified: dir.verified,
    };
    week = (
      await query(
        "INSERT INTO weeks(id,group_id,number,mode,size,deadline,config) VALUES($1,$2,1,$3,$4,$5,$6::jsonb) RETURNING *",
        [
          id(),
          group.id,
          format.id,
          format.size,
          new Date(Date.now() + 7 * 86400000).toISOString(),
          JSON.stringify(config),
        ],
      )
    )[0];
  }
  if (week.status !== "open" || new Date(week.deadline).getTime() <= Date.now())
    throw new Error(
      "Voting for this group is closed. Ask the commissioner to open the next week.",
    );
  const allowed = new Map<string, any>(
    (week.config.teams || dir.teams).map((t: any) => [t.id, t]),
  );
  validateBallot(input.teams, week.size, allowed);
  const saved = await groupIdentity(group.id);
  let member = saved?.member,
    secret = saved?.secret;
  const existing = (
    await query(
      "SELECT id FROM members WHERE group_id=$1 AND lower(name)=lower($2) AND active=true",
      [group.id, memberName],
    )
  )[0];
  if (existing && existing.id !== member?.id)
    throw new Error(
      "That name is already in this group. Use the original browser to edit that ballot, or choose a different name.",
    );
  if (!member) {
    secret = token();
    const count = (
      await query("SELECT count(*) AS n FROM members WHERE group_id=$1", [
        group.id,
      ])
    )[0];
    member = (
      await query(
        "INSERT INTO members(id,group_id,name,role,session_hash) VALUES($1,$2,$3,$4,$5) RETURNING *",
        [
          id(),
          group.id,
          memberName,
          Number(count.n) === 0 ? "commissioner" : "member",
          hash(secret!),
        ],
      )
    )[0];
  } else if (member.name !== memberName)
    await query("UPDATE members SET name=$1 WHERE id=$2", [
      memberName,
      member.id,
    ]);
  await query(
    "INSERT INTO ballots(week_id,member_id,teams,submitted) VALUES($1,$2,$3::jsonb,true) ON CONFLICT(week_id,member_id) DO UPDATE SET teams=EXCLUDED.teams,submitted=true,updated_at=now()",
    [week.id, member.id, JSON.stringify(input.teams)],
  );
  await setSession(secret!, group.id);
  return { group: group.name, week: week.id, live: group.auto_results };
}
