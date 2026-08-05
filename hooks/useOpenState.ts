import { useEffect, useState } from "react";
import { getOpenState, OpenState } from "../lib/openingHours";

/** How often to re-evaluate, so a page left open does not keep claiming "Open". */
const TICK_MS = 60_000;

/**
 * Whether a place is open at this moment, resolved on the client only.
 *
 * Returns null until after mount, and callers must render nothing for that first pass.
 * Two separate reasons, either of which alone would be enough:
 *
 *  - These pages are statically generated and cached for an hour (ISR), so anything
 *    computed during the render would be a single instant's answer served to everyone who
 *    arrives in the following hour. "Open now" would be a coin flip.
 *  - The server and the first client render must produce identical markup. A time-dependent
 *    value cannot, and React responds to that mismatch by keeping whichever markup it
 *    happens to have, which is the same failure mode the theme toggles hit.
 *
 * Re-evaluates on a timer as well as on mount, because the interesting transitions
 * (closing at 10pm) happen while someone is looking at the page.
 */
export const useOpenState = (weekdayText?: string[]): OpenState | null => {
  const [state, setState] = useState<OpenState | null>(null);

  useEffect(() => {
    const evaluate = () => setState(getOpenState(weekdayText));

    evaluate();
    const timer = setInterval(evaluate, TICK_MS);
    return () => clearInterval(timer);
  }, [weekdayText]);

  return state;
};
