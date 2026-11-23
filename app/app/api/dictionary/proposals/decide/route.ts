import { handleProposals } from "@/lib/proposals-api";

export const dynamic = "force-dynamic";

// Unit VW126 (Q-A 3:117.7 rows 3 to 5, Q-A 3:121.2): only the admin decides: Accept, Edit then accept, or Reject. See lib/proposals-api.ts.
export const POST = (req: Request) => handleProposals(req, "decide");
