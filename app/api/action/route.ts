import { NextRequest, NextResponse } from "next/server";
import { transaction } from "@/lib/db";
import { execute } from "@/lib/service";
export const runtime = "nodejs";
const attempts = new Map<string, { count: number; until: number }>();
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  let sameOrigin = false;
  try {
    sameOrigin =
      !!origin && new URL(origin).host === request.headers.get("host");
  } catch {}
  if (!sameOrigin)
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  try {
    if (Number(request.headers.get("content-length") || 0) > 256000)
      throw new Error("Request too large.");
    const text = await request.text();
    if (text.length > 256000) throw new Error("Request too large.");
    const input = JSON.parse(text);
    if (!input || typeof input.action !== "string")
      throw new Error("Invalid action.");
    if (["create", "join"].includes(input.action)) {
      const key = request.headers.get("x-forwarded-for") || "local";
      const now = Date.now();
      if (attempts.size > 10000)
        for (const [k, v] of attempts) if (v.until < now) attempts.delete(k);
      const entry = attempts.get(key);
      if (entry && entry.until > now && entry.count >= 30)
        return NextResponse.json(
          { error: "Too many attempts. Try again in an hour." },
          { status: 429 },
        );
      attempts.set(
        key,
        entry && entry.until > now
          ? { ...entry, count: entry.count + 1 }
          : { count: 1, until: now + 3600000 },
      );
    }
    return NextResponse.json(await transaction(() => execute(input)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Request failed");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed." },
      { status: 400 },
    );
  }
}
