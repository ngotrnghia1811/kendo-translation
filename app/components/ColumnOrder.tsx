"use client";
import { createContext, useContext } from "react";
import { COLUMN_IDS } from "@/lib/panel-order";

// Unit VW117 (Q-A 3:96.6 row 4): the order of the page columns of /translate/<book> (Japanese, Agent translation, Your translation, Comments, Version history).
// The book screen (components/HtvBook.tsx) holds the order. The header bar moves the columns, and every page section reads the same order.
// A page section drawn with no provider (a test) has the old order.

export interface ColumnOrderValue {
  /** The full order of the 5 columns. */
  order: string[];
  /** Keep a new full order. */
  set: (next: string[]) => void;
}

const OLD: ColumnOrderValue = { order: [...COLUMN_IDS], set: () => {} };

export const ColumnOrderContext = createContext<ColumnOrderValue>(OLD);

export const useColumnOrder = (): ColumnOrderValue => useContext(ColumnOrderContext);
