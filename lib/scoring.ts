import { teamById } from "./teams";
export function validateBallot(
  ids: unknown,
  size = 25,
  allowed = teamById,
): asserts ids is string[] {
  if (
    !Array.isArray(ids) ||
    ids.length !== size ||
    new Set(ids).size !== size ||
    ids.some((id) => typeof id !== "string" || !allowed.has(id))
  )
    throw new Error(`Select exactly ${size} unique FBS teams.`);
}
export function aggregate(ballots: string[][], size = 25, allowed = teamById) {
  const rows = new Map<
    string,
    {
      id: string;
      points: number;
      firsts: number;
      high: number;
      low: number;
      votes: number;
    }
  >();
  for (const ballot of ballots) {
    validateBallot(ballot, size, allowed);
    ballot.forEach((id, index) => {
      const row = rows.get(id) || {
        id,
        points: 0,
        firsts: 0,
        high: size + 1,
        low: 0,
        votes: 0,
      };
      row.points += size - index;
      row.firsts += index === 0 ? 1 : 0;
      row.high = Math.min(row.high, index + 1);
      row.low = Math.max(row.low, index + 1);
      row.votes++;
      rows.set(id, row);
    });
  }
  const sorted = [...rows.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.firsts - a.firsts ||
      (allowed.get(a.id)?.name || a.id).localeCompare(
        allowed.get(b.id)?.name || b.id,
        "en",
      ),
  );
  return sorted.map((r, i) => ({
    ...r,
    rank: i + 1,
    low: r.votes < ballots.length ? size + 1 : r.low,
    tied: sorted.some(
      (other) => other.id !== r.id && other.points === r.points,
    ),
  }));
}
export function agreement(a: string[], b: string[], size = 25) {
  const ids = new Set([...a, ...b]);
  const distance = [...ids].reduce(
    (sum, id) =>
      sum +
      Math.abs(
        (a.includes(id) ? a.indexOf(id) + 1 : size + 1) -
          (b.includes(id) ? b.indexOf(id) + 1 : size + 1),
      ),
    0,
  );
  return Math.max(0, Math.round(100 * (1 - distance / (size * (size + 1)))));
}
export function requireCommissioner(role: string) {
  if (role !== "commissioner") throw new Error("Commissioner access required.");
}
