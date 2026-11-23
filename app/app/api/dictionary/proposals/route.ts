import { handleProposals } from "@/lib/proposals-api";

export const dynamic = "force-dynamic";

// Unit VW126 (Q-A 3:117.7 rows 1 and 2): the merged view of the agent proposals. Translator or admin, and only on this Mac (the Monitor switch is on). See lib/proposals-api.ts.
export const GET = (req: Request) => handleProposals(req, "view");
