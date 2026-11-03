// Unit TF85 (owner round 87 answer 9, "Fix the row sort (Recommended)"). Row order of the Monitor dashboard `/` (VISION 15.24.4.1, line 3916):
// "Inside a group, the newest event comes first. Not started books sort by slug." The groups follow the order of GROUPS.
// Why this file exists: the old comparator of sortRows used the slug rule for a pair of Not started rows and the time rule for every other pair.
// That is not transitive across groups. Example (fixture dt of unit VW77c): rs_mark_broken < rs_ns (slug), rs_ns < rs_pilot (newer event), rs_pilot < rs_mark_broken (the row without a time goes last).
// Node (server render) and Firefox (client) then sorted the three rows in a different order, and React gave error #418 (hydration mismatch) on `/`.
// The fix: compare the group first, then apply the VISION rule inside the group. That is a strict total order, so the result does not depend on the input order or on the sort algorithm.
// The file holds no import from book-status-rules.ts (no cycle). The dev server on port 3000 keeps old module instances, so book-status-rules.ts gets no new export (unit VW77a lesson).

/** The three fields of a row that the order needs. A MonitorRow fits. */
export interface OrderRow {
  slug: string;
  group: string;
  eventEpoch: number | null;
}

// The time of a row. A missing time or a value that is not a finite number goes last [unit default TF85]. NaN would break the order.
function timeOf(r: OrderRow): number {
  return typeof r.eventEpoch === "number" && Number.isFinite(r.eventEpoch) ? r.eventEpoch : -Infinity;
}

function bySlug(a: OrderRow, b: OrderRow): number {
  return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
}

/**
 * Compare two rows (VISION 15.24.4.1, line 3916). Order: the group (its index in `groups`), then inside the group:
 * Not started by slug, every other group by the newest event first (a row with no time last), then by slug as the tie breaker.
 * A group that is not in `groups` goes after all known groups, ordered by its name [unit default TF85].
 */
export function compareRows(a: OrderRow, b: OrderRow, groups: readonly string[]): number {
  const ia = groups.indexOf(a.group);
  const ib = groups.indexOf(b.group);
  const ra = ia < 0 ? groups.length : ia;
  const rb = ib < 0 ? groups.length : ib;
  if (ra !== rb) return ra < rb ? -1 : 1;
  if (a.group !== b.group) return a.group < b.group ? -1 : 1;
  if (a.group === "Not started") return bySlug(a, b);
  const x = timeOf(a);
  const y = timeOf(b);
  if (x !== y) return x > y ? -1 : 1;
  return bySlug(a, b);
}

/** Sort a copy of the rows with compareRows. The input array stays as it is. */
export function orderRows<T extends OrderRow>(rows: readonly T[], groups: readonly string[]): T[] {
  return [...rows].sort((a, b) => compareRows(a, b, groups));
}
