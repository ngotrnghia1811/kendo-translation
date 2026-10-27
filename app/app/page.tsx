import RunsTable from "@/components/RunsTable";
import { listRuns } from "@/lib/runs";

export const dynamic = "force-dynamic";

// Round 43 answer 6 (Q-A l110) and round 44 answer 13 (Q-A l142): tab Runs is the first screen.
export default async function RunsPage() {
  return <RunsTable initial={await listRuns()} />;
}
