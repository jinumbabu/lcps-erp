// ============================================================
// LCPS — Schedule Engine
// Forward & Reverse scheduling logic
// All time arithmetic based on the spec formulas
// ============================================================

import { addHours, subHours } from "date-fns";
import {
  BATCH_MULTIPLIER,
  LATEX_CONSUMPTION_PER_HOUR,
  DEFAULT_MATURATION_HOURS,
  STABILIZER_DURATION_HOURS,
  DISPERSION_OFFSET_HOURS,
  DISPERSION_DURATION_HOURS,
  DEWEBBER_OFFSET_HOURS,
  TOTAL_PREPARATION_HOURS,
  SIDE_RESERVE_DEDUCTION_KG,
  DIP_TANK_DEDUCTION_KG,
  formatTankNumber,
} from "@/lib/constants";
import { BatchFormData, ComputedSchedule } from "@/types";

// ── Quantity Calculations ────────────────────────────────────

export function calcBatchQty(rawLatexKg: number): number {
  return parseFloat((rawLatexKg * BATCH_MULTIPLIER).toFixed(2));
}

export function calcAdjustedQty(
  batchQty: number,
  sideReserve: boolean,
  dipTank: boolean,
  sideRefill: boolean
): number {
  let qty = batchQty;
  if (sideReserve) qty -= SIDE_RESERVE_DEDUCTION_KG;
  if (dipTank) qty -= DIP_TANK_DEDUCTION_KG;
  // sideRefill does not reduce quantity directly — it schedules a refill
  return Math.max(qty, 0);
}

export function calcRuntime(adjustedBatchQty: number): number {
  // Runtime = Adjusted Batch Qty ÷ 576.6 (hours, rounded to 2 decimals)
  return parseFloat((adjustedBatchQty / LATEX_CONSUMPTION_PER_HOUR).toFixed(2));
}

// ── Forward Scheduling ────────────────────────────────────────
// User provides: stabilizerStart
// System calculates: everything downstream

export function forwardSchedule(params: {
  stabilizerStart: Date;
  rawLatexKg: number;
  plannedMaturation?: number;
  sideReserveEnabled?: boolean;
  dipTankEnabled?: boolean;
  sideReserveRefill?: boolean;
}): ComputedSchedule {
  const {
    stabilizerStart,
    rawLatexKg,
    plannedMaturation = DEFAULT_MATURATION_HOURS,
    sideReserveEnabled = false,
    dipTankEnabled = false,
    sideReserveRefill = false,
  } = params;

  // Quantities
  const batchQty = calcBatchQty(rawLatexKg);
  const adjustedBatchQty = calcAdjustedQty(
    batchQty,
    sideReserveEnabled,
    dipTankEnabled,
    sideReserveRefill
  );
  const runtime = calcRuntime(adjustedBatchQty);

  // Timeline
  const stabilizerEnd = addHours(stabilizerStart, STABILIZER_DURATION_HOURS);
  const dispersionStart = addHours(stabilizerStart, DISPERSION_OFFSET_HOURS);
  const dispersionEnd = addHours(dispersionStart, DISPERSION_DURATION_HOURS);
  const plannedLineupTime = addHours(dispersionEnd, plannedMaturation);
  const dewebberTime = subHours(plannedLineupTime, DEWEBBER_OFFSET_HOURS);
  const plannedFinishTime = addHours(plannedLineupTime, runtime);
  const mixPreparationStart = subHours(
    plannedLineupTime,
    plannedMaturation + TOTAL_PREPARATION_HOURS
  );

  return {
    batchQty,
    adjustedBatchQty,
    runtime,
    stabilizerStart,
    stabilizerEnd,
    dispersionStart,
    dispersionEnd,
    mixPreparationStart,
    dewebberTime,
    plannedLineupTime,
    plannedFinishTime,
  };
}

// ── Reverse Scheduling ────────────────────────────────────────
// User provides: desired Line-Up Time
// System calculates: backward to stabilizerStart

export function reverseSchedule(params: {
  desiredLineupTime: Date;
  rawLatexKg: number;
  plannedMaturation?: number;
  sideReserveEnabled?: boolean;
  dipTankEnabled?: boolean;
  sideReserveRefill?: boolean;
}): ComputedSchedule {
  const {
    desiredLineupTime,
    rawLatexKg,
    plannedMaturation = DEFAULT_MATURATION_HOURS,
    sideReserveEnabled = false,
    dipTankEnabled = false,
    sideReserveRefill = false,
  } = params;

  // Quantities
  const batchQty = calcBatchQty(rawLatexKg);
  const adjustedBatchQty = calcAdjustedQty(
    batchQty,
    sideReserveEnabled,
    dipTankEnabled,
    sideReserveRefill
  );
  const runtime = calcRuntime(adjustedBatchQty);

  // Backward timeline calculation
  // LineUp → DispersionEnd → DispersionStart → StabilizerStart
  const plannedLineupTime = desiredLineupTime;
  const dispersionEnd = subHours(plannedLineupTime, plannedMaturation);
  const dispersionStart = subHours(dispersionEnd, DISPERSION_DURATION_HOURS);
  const stabilizerStart = subHours(dispersionStart, DISPERSION_OFFSET_HOURS - STABILIZER_DURATION_HOURS);
  // stabilizerStart = dispersionStart - (5h - 2h) = dispersionStart - 3h
  // Because: dispStart = stabStart + 5h → stabStart = dispStart - 5h
  // Wait — per spec: DispersionStart = stabStart + 5h → stabStart = dispStart - 5h
  const stabilizerStartCorrected = subHours(dispersionStart, DISPERSION_OFFSET_HOURS);
  const stabilizerEnd = addHours(stabilizerStartCorrected, STABILIZER_DURATION_HOURS);
  const dewebberTime = subHours(plannedLineupTime, DEWEBBER_OFFSET_HOURS);
  const plannedFinishTime = addHours(plannedLineupTime, runtime);
  const mixPreparationStart = subHours(
    plannedLineupTime,
    plannedMaturation + TOTAL_PREPARATION_HOURS
  );

  return {
    batchQty,
    adjustedBatchQty,
    runtime,
    stabilizerStart: stabilizerStartCorrected,
    stabilizerEnd,
    dispersionStart,
    dispersionEnd,
    mixPreparationStart,
    dewebberTime,
    plannedLineupTime,
    plannedFinishTime,
  };
}

// ── Batch Chaining ────────────────────────────────────────────
// Next batch stabilizer start = previous batch finish time

export function chainBatchStart(previousBatchFinishTime: Date): Date {
  return new Date(previousBatchFinishTime.getTime());
}

// ── Validation ────────────────────────────────────────────────

export function validateBatchInput(
  rawLatexKg: number,
  stabilizerStart: Date
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!rawLatexKg || rawLatexKg <= 0) {
    errors.push("Raw Latex Quantity must be greater than 0");
  }
  if (!stabilizerStart || isNaN(stabilizerStart.getTime())) {
    errors.push("Stabilizer Start time is required");
  }

  return { valid: errors.length === 0, errors };
}

// ── Tank Display Helper ───────────────────────────────────────

export { formatTankNumber };
