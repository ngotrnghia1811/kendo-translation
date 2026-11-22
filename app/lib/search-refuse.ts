// Unit VW124 (Q-A 3:117.4 and 3:117.5, "a link visitor never writes anything"): the two search routes answer GET only.
// Each write method answers 405 with the header Allow: GET, before any session check, so a visitor of a view-only link and a signed-in person get the same refusal.
export function refuseWrite(): Response {
  return Response.json({ error: "This address reads only. Use GET." }, { status: 405, headers: { Allow: "GET", "Cache-Control": "no-store" } });
}
