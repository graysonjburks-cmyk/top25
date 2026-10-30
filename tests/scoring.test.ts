import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aggregate,
  validateBallot,
  requireCommissioner,
  agreement,
} from "../lib/scoring";
import { sampleOrder, teams } from "../lib/teams";
import { makeBracket, seedOrder, selectField } from "../lib/formats";
test("AP scoring assigns 25 through 1, sums every final ballot and counts firsts", () => {
  const reverse = [...sampleOrder].reverse();
  const result = aggregate([sampleOrder, sampleOrder, reverse]);
  assert.equal(result.find((r) => r.id === sampleOrder[0])?.points, 51);
  assert.equal(result.find((r) => r.id === sampleOrder[0])?.firsts, 2);
  assert.equal(result.find((r) => r.id === sampleOrder[24])?.points, 27);
  assert.equal(
    result.reduce((n, r) => n + r.points, 0),
    975,
  );
});
test("reject duplicate, unknown and incomplete final ballots without modifying them", () => {
  const copy = [...sampleOrder];
  assert.throws(() => validateBallot([...copy.slice(0, 24), copy[0]]));
  assert.throws(() => validateBallot(copy.slice(0, 24)));
  assert.throws(() => validateBallot(["fake", ...copy.slice(1)]));
  assert.deepEqual(copy, sampleOrder);
});
test("tied totals use first votes, then alphabetical names; tied totals stay marked", () => {
  const results = aggregate(
    [
      ["georgia", "texas", "alabama", "oregon"],
      ["alabama", "oregon", "georgia", "texas"],
    ],
    4,
  );
  assert.equal(results[0].id, "alabama");
  assert.equal(results[1].id, "georgia");
  assert.equal(results[0].points, 6);
  assert.equal(results[0].tied, true);
});
test("independent weekly aggregation does not retain other week votes", () => {
  const a = aggregate([sampleOrder]),
    b = aggregate([[...sampleOrder].reverse()]);
  assert.equal(a[0].id, sampleOrder[0]);
  assert.equal(b[0].id, sampleOrder[24]);
  assert.equal(b[0].points, 25);
});
test("commissioner authorization and agreement", () => {
  assert.throws(() => requireCommissioner("member"));
  assert.doesNotThrow(() => requireCommissioner("commissioner"));
  assert.equal(agreement(sampleOrder, sampleOrder), 100);
  assert.ok(agreement(sampleOrder, [...sampleOrder].reverse()) < 100);
});
test("4, 12 and 24 fields have unique seeds, correct byes and full elimination paths", () => {
  for (const size of [4, 12, 24]) {
    const field = teams.slice(0, size).map((t) => t.id),
      bracket = makeBracket(field);
    const first = bracket[0].games.flatMap((g) => [g.a, g.b]);
    assert.equal(first.filter(Boolean).length, size);
    assert.equal(
      first.filter((v) => v === null).length,
      2 ** Math.ceil(Math.log2(size)) - size,
    );
    assert.equal(bracket.at(-1)?.games.length, 1);
    assert.equal(new Set(first.filter(Boolean).map((v) => v!.id)).size, size);
  }
  assert.deepEqual(seedOrder(4), [1, 4, 2, 3]);
  assert.throws(() => makeBracket(sampleOrder.slice(0, 12), { byes: 0 }));
});
test("automatic qualifiers change field selection, never original ranking or ballots", () => {
  const ranking = sampleOrder.map((id) => ({ id }));
  const field = selectField(ranking, 4, [sampleOrder[20]]);
  assert.ok(field.some((r) => r.id === sampleOrder[20]));
  assert.equal(field.length, 4);
  assert.equal(ranking[3].id, sampleOrder[3]);
  assert.throws(() => selectField(ranking, 4, ["unknown"]));
});
test("full-field scoring scales to directory size without hardcoded count", () => {
  const field = teams.map((t) => t.id),
    result = aggregate([field], field.length);
  assert.equal(result.length, field.length);
  assert.equal(result[0].points, field.length);
  assert.equal(result.at(-1)?.points, 1);
});
