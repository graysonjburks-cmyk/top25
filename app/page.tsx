import { loadState } from "@/lib/service";
import PollApp from "./poll-app";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function Page() {
  const state = await loadState();
  return <PollApp state={JSON.parse(JSON.stringify(state))} />;
}
