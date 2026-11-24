"use client";
import { useEffect, useState } from "react";
import { OPEN_COUNT_EVENT, proposalsButtonText } from "@/lib/proposal-terms";

/*
 * Unit VW129 (Q-A 3:129.4 row 1): the text of the button "Agent proposals (N open)" on /dictionary.
 * The server writes the first count. After Accept, Edit then accept, or Reject, the panel sends the new count in the window event OPEN_COUNT_EVENT, so the button stays right without a reload.
 */
export default function ProposalsTabLabel({ initial }: { initial: number | null }) {
  const [count, setCount] = useState<number | null>(initial);
  useEffect(() => {
    const on = (e: Event) => {
      const n = (e as CustomEvent<unknown>).detail;
      if (typeof n === "number") setCount(n);
    };
    window.addEventListener(OPEN_COUNT_EVENT, on);
    return () => window.removeEventListener(OPEN_COUNT_EVENT, on);
  }, []);
  return <span data-proposals-open-count={count ?? ""}>{proposalsButtonText(count)}</span>;
}
