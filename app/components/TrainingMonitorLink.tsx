"use client";
import { createContext, useContext, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { monitorHref } from "@/lib/training-monitor";
import { BoxCode } from "./BoxCode";

// Unit VW98 (round 91), Q-A 3:23.3: each box code in the step view /monitor/phase-2 and in the step tree of the run view links to the training
// monitor of that box (/runs/<stamp>?box=TL_2#training-monitor). The code keeps its hover name (Q-A 3:18.5).
// [unit default VW98] The code sits inside the toggle button of its step line. A link element inside a button is not valid HTML, so the code is
// a span with the role "link": a click or the Enter key opens the monitor and does not fold the step line.

const StampContext = createContext<string | null>(null);

/** The list stamp whose run view holds the training monitor. Without a provider, box codes stay plain codes. */
export function MonitorStampProvider({ stamp, children }: { stamp: string | null; children: ReactNode }) {
  return <StampContext.Provider value={stamp}>{children}</StampContext.Provider>;
}

/** A box code that opens the training monitor of its box. Other codes (reference-diff-critic) stay plain. */
export function BoxMonitorLink({ code }: { code: string }) {
  const stamp = useContext(StampContext);
  const router = useRouter();
  const href = stamp ? monitorHref(stamp, code) : null;
  if (!href) return <BoxCode code={code} />;
  const go = (e: MouseEvent | KeyboardEvent) => {
    e.stopPropagation();
    e.preventDefault();
    router.push(href);
  };
  return (
    <span
      role="link"
      tabIndex={0}
      data-monitor-link={href}
      onClick={go}
      onKeyDown={(e) => {
        if (e.key === "Enter") go(e);
      }}
      className="cursor-pointer text-accent underline underline-offset-2"
    >
      <BoxCode code={code} />
    </span>
  );
}
