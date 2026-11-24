import "server-only";
import { dictionaryEntry, dictionaryMatches, dictionaryPage } from "./pb";
import { DICT_PER_SCREEN, dictExact, dictItemView, dictQuery, dictReady, dictScreens, exactOnly, orderHits, type DictEntryView, type DictListResponse } from "./dictionary-core";

/*
 * Unit VW126 (Q-A 3:116.8, 3:117.6 rows 1 to 4): the data of the dictionary page /dictionary.
 * Every read uses the token of the signed-in person (or the link key of a view-only visitor), so the PocketBase rules of the list dictionary_entries are the gate:
 * READ_OK (an approved reader, a translator, an admin) or LINK_OK (a visitor of a view-only link). A reader who waits for approval and a signed-out person read nothing.
 */

/**
 * One screen of the list. No query (or a query that is too short): all entries in the order of the readings, 25 on a screen, read page by page.
 * A query of 1 or more folded characters (unit VW128): the entries that hold it, the best fit first (rankOf), 25 on a screen.
 * A query in double quotes: only the entries whose headword, other writing, reading, romaji, or EN form is the whole query (unit VW128).
 */
export async function loadDictionaryList(token: string, rawQuery: string, screenNo: number): Promise<DictListResponse> {
  const query = rawQuery.trim();
  const folded = dictQuery(rawQuery);
  const ready = dictReady(rawQuery);
  const exact = ready && dictExact(rawQuery);
  const empty: DictListResponse = { query, ready, exact, missing: true, count: 0, screen: 1, screens: 1, items: [] };
  if (!ready) {
    const first = await dictionaryPage(token, screenNo);
    if (first === null) return empty;
    const screens = dictScreens(first.total);
    const screen = Math.min(Math.max(1, screenNo), screens);
    const page = screen === screenNo ? first : ((await dictionaryPage(token, screen)) ?? first);
    return { query, ready, exact, missing: false, count: first.total, screen, screens, items: page.records.map((r) => dictItemView(r, "", query)) };
  }
  const found = await dictionaryMatches(token, folded);
  if (found === null) return empty;
  const ordered = orderHits(exact ? exactOnly(found, folded) : found, folded);
  const screens = dictScreens(ordered.length);
  const screen = Math.min(Math.max(1, screenNo), screens);
  const slice = ordered.slice((screen - 1) * DICT_PER_SCREEN, screen * DICT_PER_SCREEN);
  return { query, ready, exact, missing: false, count: ordered.length, screen, screens, items: slice.map((r) => dictItemView(r, folded, query)) };
}

/** The full entry of one entry ID, or null when the person cannot read it or it does not exist. */
export async function loadDictionaryEntry(token: string, entryId: string): Promise<DictEntryView | null> {
  return dictionaryEntry(token, entryId);
}
