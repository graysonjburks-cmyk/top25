import assert from "node:assert/strict";
import { sampleOrder, teams } from "../lib/teams";
const base = process.env.SMOKE_URL || "http://localhost:3000";
class Client {
  cookie = "";
  async act(action: string, data: any = {}, status = 200) {
    const r = await fetch(base + "/api/action", {
      method: "POST",
      headers: {
        Origin: base,
        "Content-Type": "application/json",
        Cookie: this.cookie,
      },
      body: JSON.stringify({ action, ...data }),
    });
    const jar = new Map(
      this.cookie
        .split("; ")
        .filter(Boolean)
        .map((pair) => {
          const i = pair.indexOf("=");
          return [pair.slice(0, i), pair.slice(i + 1)];
        }),
    );
    for (const cookie of r.headers.getSetCookie()) {
      const pair = cookie.split(";")[0],
        i = pair.indexOf("=");
      jar.set(pair.slice(0, i), pair.slice(i + 1));
    }
    this.cookie = [...jar].map(([key, value]) => `${key}=${value}`).join("; ");
    const body = await r.json();
    assert.equal(r.status, status, JSON.stringify(body));
    return body;
  }
  async state() {
    const r = await fetch(base + "/api/state", {
      headers: { Cookie: this.cookie },
    });
    assert.equal(r.status, 200);
    return r.json();
  }
}
async function main() {
  const commissioner = new Client(),
    friend = new Client(),
    other = new Client();
  let checks = 0;
  const pass = (message: string) => {
    checks++;
    console.log(`PASS ${message}`);
  };
  const created = await commissioner.act("create", {
    group: "Smoke test club",
    name: "Commissioner",
    season: 2025,
  });
  let s = await commissioner.state();
  const week = s.weeks[0].id;
  assert.equal(s.members.length, 1);
  pass("private group creation and persistent session");
  await friend.act("join", { name: "Friend", invite: created.invite });
  await other.act("create", {
    name: "Other commissioner",
    group: "Isolated club",
    season: 2025,
  });
  await other.act("ballot", { week, teams: sampleOrder, submit: true }, 400);
  await friend.act("publish", { week }, 400);
  pass("cross-group and commissioner authorization");
  await friend.act("ballot", {
    week,
    teams: sampleOrder.slice(0, 5),
    submit: false,
  });
  assert.equal((await friend.state()).own[0].teams.length, 5);
  await friend.act(
    "ballot",
    {
      week,
      teams: [...sampleOrder.slice(0, 24), sampleOrder[0]],
      submit: true,
    },
    400,
  );
  await friend.act(
    "ballot",
    { week, teams: sampleOrder.slice(0, 24), submit: true },
    400,
  );
  pass("partial drafts persist; duplicate and incomplete finals rejected");
  await friend.act("ballot", { week, teams: sampleOrder, submit: true });
  await commissioner.act("ballot", {
    week,
    teams: [...sampleOrder].reverse(),
    submit: true,
  });
  s = await commissioner.state();
  assert.equal(s.publications.length, 0);
  assert.equal(s.own.length, 1);
  assert.ok(s.ballots.every((b: any) => !("teams" in b)));
  pass("unpublished ballots private and submission status visible");
  await commissioner.act("status", { week, status: "closed" });
  await friend.act("ballot", { week, teams: sampleOrder, submit: true }, 400);
  await commissioner.act("publish", { week });
  s = await commissioner.state();
  assert.equal(s.publications[0].ballots.length, 2);
  assert.ok(s.publications[0].results.every((r: any) => r.points === 26));
  pass("closed voting enforced and tied weekly aggregate published");
  await commissioner.act("newWeek", { mode: "top25" });
  s = await commissioner.state();
  assert.equal(s.weeks.filter((w: any) => w.mode === "top25").length, 2);
  assert.equal(s.publications.length, 1);
  const next = s.weeks.find((w: any) => w.number === 2).id;
  await commissioner.act("deadline", {
    week: next,
    deadline: "2020-01-01T00:00:00Z",
  });
  await friend.act(
    "ballot",
    { week: next, teams: sampleOrder, submit: true },
    400,
  );
  pass("weekly archive retained and server deadline enforced");
  for (const size of [4, 12, 24]) {
    await commissioner.act("newWeek", { mode: `cfp${size}`, config: {} });
    s = await commissioner.state();
    const w = s.weeks.find((w: any) => w.mode === `cfp${size}`);
    await commissioner.act("ballot", {
      week: w.id,
      teams: sampleOrder.slice(0, size),
      submit: true,
    });
    await commissioner.act("status", { week: w.id, status: "closed" });
    await commissioner.act("publish", { week: w.id });
  }
  s = await commissioner.state();
  assert.equal(s.publications.length, 4);
  pass("four independent formats persist ballots and publications");
  if (!s.directory.verified)
    await commissioner.act("newWeek", { mode: "full" }, 400);
  await commissioner.act("directoryImport", {
    data: {
      season: 2025,
      teams,
      source: "https://www.ncaa.org/sports/2021/5/3/membership-directory.aspx",
      verifiedAt: new Date().toISOString(),
      notes: "TEST FIXTURE — not an independently verified source",
    },
  });
  await commissioner.act("newWeek", { mode: "full" });
  s = await commissioner.state();
  const full = s.weeks.find((w: any) => w.mode === "full");
  assert.equal(full.size, teams.length);
  await commissioner.act("ballot", {
    week: full.id,
    teams: teams.map((t) => t.id),
    submit: true,
  });
  await commissioner.act("newWeek", {
    mode: "conference",
    config: { conference: "SEC" },
  });
  s = await commissioner.state();
  assert.equal(s.weeks.find((w: any) => w.mode === "conference").size, 16);
  pass(
    "full field requires directory verification and uses imported membership count",
  );
  await commissioner.act("metricImport", {
    data: {
      season: 2025,
      week: 1,
      metric: "ap",
      unit: "rank",
      source: "https://apnews.com/hub/ap-top-25-college-football-poll",
      updatedAt: new Date().toISOString(),
      values: { georgia: 1 },
    },
  });
  s = await commissioner.state();
  assert.equal(s.metrics[0].values_json.georgia, 1);
  await friend.act("metricImport", { data: {} }, 400);
  pass("sourced metric import and authorization");
  const friendId = s.members.find((m: any) => m.name === "Friend").id;
  await commissioner.act("remove", { member: friendId });
  await friend.act("ballot", { week: full.id, teams: [], submit: false }, 400);
  pass("removed member session loses access");
  const csrf = await fetch(base + "/api/action", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://evil.example",
    },
    body: JSON.stringify({ action: "create" }),
  });
  assert.equal(csrf.status, 403);
  pass("cross-site mutations rejected");
  const quick = new Client(),
    second = new Client(),
    impostor = new Client();
  const code = `SMOKE-${Date.now()}`;
  await quick.act("quickSubmit", { name: "John", code, teams: sampleOrder });
  let quickState = await quick.state();
  assert.equal(quickState.group.auto_results, true);
  assert.equal(quickState.liveResults[0].ballots.length, 1);
  assert.ok(!("code_hash" in quickState.group));
  await second.act("quickSubmit", {
    name: "Alex",
    code,
    teams: [...sampleOrder].reverse(),
  });
  quickState = await quick.state();
  assert.equal(quickState.liveResults[0].ballots.length, 2);
  assert.ok(
    quickState.liveResults[0].results.every((r: any) => r.points === 26),
  );
  await impostor.act(
    "quickSubmit",
    { name: "John", code, teams: sampleOrder },
    400,
  );
  await quick.act("quickSubmit", {
    name: "John",
    code,
    teams: [...sampleOrder].reverse(),
  });
  assert.equal((await quick.state()).members.length, 2);
  pass(
    "name-and-code ballots create/join a live private group without allowing name impersonation",
  );
  await quick.act("appearance", {
    group: "The Rivalry Room",
    accent: "#881122",
    theme: "newsprint",
  });
  assert.equal((await quick.state()).group.appearance.theme, "newsprint");
  await second.act("appearance", { group: "Not allowed" }, 400);
  await quick.act("quickSubmit", {
    name: "John",
    code: `OTHER-${Date.now()}`,
    teams: sampleOrder,
  });
  await quick.act("quickSubmit", { name: "John", code, teams: sampleOrder });
  assert.equal((await quick.state()).group.name, "The Rivalry Room");
  assert.equal((await quick.state()).members.length, 2);
  pass("group customization persists and remains commissioner-controlled");
  const oldCookie = other.cookie;
  await other.act("logout");
  const revoked = await fetch(base + "/api/state", {
    headers: { Cookie: oldCookie },
  });
  assert.equal(revoked.status, 401);
  pass("sign-out revokes the previous session on the server");
  console.log(`${checks} integration checks passed.`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
