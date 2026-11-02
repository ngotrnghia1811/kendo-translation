import RunsTable from "@/components/RunsTable";
import { listRuns } from "@/lib/runs";
import { requireMonitor } from "@/lib/monitor";

export const dynamic = "force-dynamic";

// Unit VW77a (round 80), VISION-viewer 15.24.4.1 and 15.24.10: the old runs table moved here from "/". The tab is called Lists.
// Round 58 answer 7 (Q-A 2026-10-28 l205): with the monitor off, the page gives "not found".
export default async function ListsPage() {
  await requireMonitor();
  return <RunsTable initial={await listRuns()} />;
}
