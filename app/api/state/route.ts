import { NextResponse } from "next/server";
import { loadState } from "@/lib/service";
export const dynamic = "force-dynamic";
export async function GET() {
  const state = await loadState();
  return NextResponse.json(state, {
    status: state ? 200 : 401,
    headers: { "Cache-Control": "no-store" },
  });
}
