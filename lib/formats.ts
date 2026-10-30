export const formats = [
  { id: "top25", name: "Weekly AP Top 25", size: 25 },
  { id: "cfp4", name: "CFP Four-Team", size: 4 },
  { id: "cfp12", name: "CFP Twelve-Team", size: 12 },
  { id: "cfp24", name: "Hypothetical CFP 24", size: 24 },
  { id: "full", name: "Full FBS field", size: 0 },
  { id: "custom", name: "Custom Top N", size: 10 },
  { id: "conference", name: "Conference poll", size: 0 },
] as const;
export type BracketRules = {
  byes?: number;
  automaticQualifiers?: string[];
  seedOrder?: "standard" | "straight";
  description?: string;
  conference?: string;
};
export function seedOrder(size: number): number[] {
  if (size === 2) return [1, 2];
  return seedOrder(size / 2).flatMap((seed) => [seed, size + 1 - seed]);
}
export function makeBracket(field: string[], rules: BracketRules = {}) {
  const capacity = 2 ** Math.ceil(Math.log2(Math.max(field.length, 2))),
    naturalByes = capacity - field.length;
  if (rules.byes !== undefined && rules.byes !== naturalByes)
    throw new Error(
      `A ${field.length}-team single-elimination field requires ${naturalByes} first-round byes.`,
    );
  const order =
    rules.seedOrder === "straight"
      ? Array.from({ length: capacity }, (_, i) => i + 1)
      : seedOrder(capacity);
  const rounds: {
    label: string;
    games: {
      a: { id: string; seed: number } | null;
      b: { id: string; seed: number } | null;
      from?: string;
    }[];
  }[] = [];
  const slots = order.map((seed) =>
    seed <= field.length ? { id: field[seed - 1], seed } : null,
  );
  rounds.push({
    label: "Opening round",
    games: Array.from({ length: capacity / 2 }, (_, i) => ({
      a: slots[i * 2],
      b: slots[i * 2 + 1],
    })),
  });
  for (let count = capacity / 4, round = 2; count >= 1; count /= 2, round++)
    rounds.push({
      label:
        count === 1
          ? "Championship"
          : count === 2
            ? "Semifinals"
            : `Round ${round}`,
      games: Array.from({ length: count }, (_, i) => ({
        a: null,
        b: null,
        from: `Winners of games ${i * 2 + 1} & ${i * 2 + 2}`,
      })),
    });
  return rounds;
}
export function selectField<T extends { id: string }>(
  ranking: T[],
  size: number,
  automaticQualifiers: string[] = [],
): T[] {
  if (
    new Set(automaticQualifiers).size !== automaticQualifiers.length ||
    automaticQualifiers.length > size
  )
    throw new Error("Invalid automatic qualifiers.");
  if (automaticQualifiers.some((id) => !ranking.some((r) => r.id === id)))
    throw new Error(
      "Every automatic qualifier must appear on at least one submitted ballot.",
    );
  const field = ranking.slice(0, size);
  for (const id of automaticQualifiers)
    if (!field.some((r) => r.id === id)) {
      const replace = field.findLastIndex(
        (r) => !automaticQualifiers.includes(r.id),
      );
      field[replace] = ranking.find((r) => r.id === id)!;
    }
  return field.sort((a, b) => ranking.indexOf(a) - ranking.indexOf(b));
}
