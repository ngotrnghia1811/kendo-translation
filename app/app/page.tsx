import RunsTable from "@/components/RunsTable";
import { listRuns } from "@/lib/runs";
import { requireMonitorOrTranslate } from "@/lib/monitor";

export const dynamic = "force-dynamic";

// Round 43 answer 6 (Q-A l110) and round 44 answer 13 (Q-A l142): tab Runs is the first screen.
// Round 58 answer 7 (Q-A 2026-10-28 l205): with the monitor off, this first page sends the visitor to /translate.
export default async function RunsPage() {
  await requireMonitorOrTranslate();
  return <RunsTable initial={await listRuns()} />;
}
