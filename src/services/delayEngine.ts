// ============================================================
// LCPS — Delay Engine
// Delay detection, over-maturation tracking, chain propagation
// ============================================================

import {
  DELAY_STATUS,
  OVER_MATURATION_WARNING_HOURS,
  OVER_MATURATION_CRITICAL_HOURS,
  DEFAULT_MATURATION_HOURS,
} from "@/lib/constants";
import { Batch, DelayResult } from "@/types";
import { differenceInMinutes, addHours } from "date-fns";

// ── Delay Detection ───────────────────────────────────────────

export function detectDelay(batch: Batch): DelayResult {
  // A batch is delayed when: actualLineupTime > plannedLineupTime
  if (!batch.actualLineupTime) {
    return {
      isDelayed: false,
      delayHours: 0,
      overMaturationHours: 0,
      newStatus: DELAY_STATUS.ON_TIME,
    };
  }

  const plannedMs = batch.plannedLineupTime.toDate().getTime();
  const actualMs = batch.actualLineupTime.toDate().getTime();
  const diffMinutes = (actualMs - plannedMs) / 60000;
  const delayHours = parseFloat((diffMinutes / 60).toFixed(2));
  const isDelayed = delayHours > 0;

  // Over-maturation = actual lineup - dispersion end
  const dispEndMs = batch.dispersionEnd.toDate().getTime();
  const actualMaturationHours = parseFloat(
    ((actualMs - dispEndMs) / 3600000).toFixed(2)
  );
  const overMaturationHours = Math.max(
    0,
    parseFloat((actualMaturationHours - batch.plannedMaturation).toFixed(2))
  );

  let newStatus: typeof DELAY_STATUS[keyof typeof DELAY_STATUS] =
    DELAY_STATUS.ON_TIME;

  if (isDelayed) {
    const actualMatTotal = batch.plannedMaturation + delayHours;
    if (actualMatTotal >= OVER_MATURATION_CRITICAL_HOURS) {
      newStatus = DELAY_STATUS.CRITICAL;
    } else {
      newStatus = DELAY_STATUS.DELAYED;
    }
  }

  return {
    isDelayed,
    delayHours: Math.max(0, delayHours),
    overMaturationHours,
    newStatus,
  };
}

// ── Over-Maturation Calculation ───────────────────────────────
// Formula: Actual Maturation = Actual Line-Up Time - Dispersion End

export function calcActualMaturation(
  actualLineupTime: Date,
  dispersionEnd: Date
): number {
  const diffMs = actualLineupTime.getTime() - dispersionEnd.getTime();
  return parseFloat((diffMs / 3600000).toFixed(2));
}

export function calcOverMaturation(
  actualMaturation: number,
  plannedMaturation: number = DEFAULT_MATURATION_HOURS
): number {
  return Math.max(0, parseFloat((actualMaturation - plannedMaturation).toFixed(2)));
}

// ── Delay Severity ────────────────────────────────────────────

export type DelaySeverity = "none" | "warning" | "critical";

export function getDelaySeverity(overMaturationHours: number): DelaySeverity {
  if (overMaturationHours <= 0) return "none";
  if (overMaturationHours < OVER_MATURATION_WARNING_HOURS - DEFAULT_MATURATION_HOURS)
    return "warning";
  return "critical";
}

// ── Next Batch Maturation Impact ──────────────────────────────
// When Batch-N is delayed by X hours,
// Batch-N+1's maturation increases by X hours
// because Batch-N+1 was already prepared based on planned timing.

export function calcChainedMaturation(
  basePlannedMaturation: number,
  upstreamDelayHours: number
): number {
  return parseFloat((basePlannedMaturation + upstreamDelayHours).toFixed(2));
}

// ── Batch Status Helpers ──────────────────────────────────────

export function isOverMatured(batch: Batch): boolean {
  if (!batch.actualLineupTime) return false;
  const actual = calcActualMaturation(
    batch.actualLineupTime.toDate(),
    batch.dispersionEnd.toDate()
  );
  return actual > batch.plannedMaturation;
}

export function isCriticallyOverMatured(batch: Batch): boolean {
  if (!batch.actualLineupTime) return false;
  const actual = calcActualMaturation(
    batch.actualLineupTime.toDate(),
    batch.dispersionEnd.toDate()
  );
  return actual >= OVER_MATURATION_CRITICAL_HOURS;
}

// ── Row Color Coding ──────────────────────────────────────────
// Returns Tailwind/CSS class suffix for grid row styling

export function getBatchRowColor(batch: Batch): string {
  if (batch.lockedStatus || batch.compoundedStatus) return "finished";
  if (isCriticallyOverMatured(batch)) return "over-matured";
  if (isOverMatured(batch)) return "over-matured";
  if (batch.delayStatus === DELAY_STATUS.CRITICAL) return "critical";
  if (batch.delayStatus === DELAY_STATUS.DELAYED) return "delayed";
  if (batch.isFirstBatch) return "first-batch";
  return "normal";
}
