import RunsTable from "@/components/RunsTable";
import { listRuns } from "@/lib/runs";
import { frontDoor } from "@/lib/monitor";

export const dynamic = "force-dynamic";

// Round 43 answer 6 (Q-A l110) and round 44 answer 13 (Q-A l142): tab Runs is the first screen.
// Round 58 answer 7 (Q-A 2026-10-28 l205): with the monitor off, this first page sends the visitor on.
// Unit RC4 (round 68 answer 4, round 69 answer 11): the visitor goes by the sign-in state and the role: /sign-in, /read, or /translate (lib/monitor.ts).
export default async function RunsPage() {
  const door = await frontDoor();
  if (door) return <p role="alert" className="text-red-700">{door.down}</p>;
  return <RunsTable initial={await listRuns()} />;
}
