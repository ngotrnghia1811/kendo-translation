import { handleProposals } from "@/lib/proposals-api";

export const dynamic = "force-dynamic";

// Unit VW126 (Q-A 3:117.7 row 6): only the admin rebuilds the dictionary file. {"apply": false} is the dry run. See lib/proposals-api.ts.
export const POST = (req: Request) => handleProposals(req, "rebuild");
