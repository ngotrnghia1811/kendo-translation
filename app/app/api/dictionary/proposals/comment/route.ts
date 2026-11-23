import { handleProposals } from "@/lib/proposals-api";

export const dynamic = "force-dynamic";

// Unit VW126 (Q-A 3:117.7 row 3): a translator or an admin adds a comment to a proposal group. See lib/proposals-api.ts.
export const POST = (req: Request) => handleProposals(req, "comment");
