import type { PracticeIntervalTier } from "../../../types";

export interface StepOption {
  step: number;
  label: string;
}

/** The default step offered when dances are put on an interval step: about two weeks. */
export const DEFAULT_BASELINE_STEP = 6;

function describeDays(days: number[]): string {
  const shortest = Math.min(...days);
  const longest = Math.max(...days);
  if (shortest !== longest) return `${shortest}–${longest} days`;
  return shortest === 1 ? "1 day" : `${shortest} days`;
}

/**
 * One option per step of the interval ladder. The days depend on the level of a dance, so the label
 * shows the range over all level tiers.
 */
export function buildStepOptions(tiers: readonly PracticeIntervalTier[]): StepOption[] {
  const stepCount = Math.max(0, ...tiers.map((tier) => tier.interval_days.length));
  return Array.from({ length: stepCount }, (_, index) => {
    const days = tiers.flatMap((tier) => tier.interval_days[index] ?? []);
    return { step: index + 1, label: `Step ${index + 1} · due again after ${describeDays(days)}` };
  });
}
