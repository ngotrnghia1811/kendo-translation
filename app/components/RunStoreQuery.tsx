"use client";
import { createContext, useContext, type ReactNode } from "react";

// Unit VW85 (round 91), Q-A 3:26.3 (a): "The step view and the training monitor work for a book run too."
// The step data and the opened lines of the training monitor load from /api/monitor/phase-2/step and /api/monitor/phase-2/box.
// For a book run the query gets "list=<stamp>" or "book=<slug>" (lib/run-store.ts storeQuery), so the server reads book-store/<book>/.
// The phase 2 screens set no value, so their addresses stay as before (VW95, VW98).

const StoreQueryContext = createContext<string | null>(null);

export function RunStoreQueryProvider({ query, children }: { query: string | null; children: ReactNode }) {
  return <StoreQueryContext.Provider value={query}>{children}</StoreQueryContext.Provider>;
}

/** The query part that names the store of the run, or null for phase 2. */
export function useRunStoreQuery(): string | null {
  return useContext(StoreQueryContext);
}

/** A query with the store part added at the end. */
export function withStoreQuery(query: string, store: string | null): string {
  return store ? `${query}&${store}` : query;
}
