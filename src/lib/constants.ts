// ============================================================
// LCPS ERP — Business Constants
// Latex Compounding Production Scheduling System
// ============================================================

// ── Batch Calculation Constants ─────────────────────────────
export const BATCH_MULTIPLIER = 1.922; // Batch Qty = Raw Latex × 1.922
export const LATEX_CONSUMPTION_PER_HOUR = 576.6; // kg/hour

// ── Process Duration Constants (hours) ──────────────────────
export const STABILIZER_DURATION_HOURS = 2; // Stab End = Stab Start + 2h
export const DISPERSION_OFFSET_HOURS = 5; // Disp Start = Stab Start + 5h
export const DISPERSION_DURATION_HOURS = 5; // Disp End = Disp Start + 5h
export const TOTAL_PREPARATION_HOURS = 12; // Stab Start → Disp End = 12h
export const DEFAULT_MATURATION_HOURS = 30; // Ideal maturation
export const DEWEBBER_OFFSET_HOURS = 4; // Dewebber = LineUp - 4h

// ── First Batch Deductions (kg) ─────────────────────────────
export const SIDE_RESERVE_DEDUCTION_KG = 2000;
export const DIP_TANK_DEDUCTION_KG = 7000;

// ── Over-Maturation Thresholds (hours) ──────────────────────
export const OVER_MATURATION_WARNING_HOURS = 36; // 6h over ideal
export const OVER_MATURATION_CRITICAL_HOURS = 48; // 18h over ideal

// ── Tank Display Format ──────────────────────────────────────
// Input: 211 → Display: T211
export const formatTankNumber = (tank: number): string =>
  `T${String(tank).padStart(3, "0")}`;

export const parseTankNumber = (display: string): number =>
  parseInt(display.replace(/^T/, ""), 10);

// ── Firestore Collection Names ───────────────────────────────
export const COLLECTIONS = {
  USERS: "users",
  PLANNING_SHEETS: "planning_sheets",
  BATCHES: "batches", // subcollection under planning_sheets
  TANKS: "tanks",
  SETTINGS: "settings",
  AUDIT_LOGS: "audit_logs",
  PRESENCE: "presence",
} as const;

// ── Default System Settings ──────────────────────────────────
export const DEFAULT_SETTINGS = {
  latexConsumptionPerHour: LATEX_CONSUMPTION_PER_HOUR,
  batchMultiplier: BATCH_MULTIPLIER,
  defaultMaturationHours: DEFAULT_MATURATION_HOURS,
  preparationDuration: TOTAL_PREPARATION_HOURS,
  stabilizerDuration: STABILIZER_DURATION_HOURS,
  dispersionOffset: DISPERSION_OFFSET_HOURS,
  dispersionDuration: DISPERSION_DURATION_HOURS,
  dewebberOffset: DEWEBBER_OFFSET_HOURS,
  sideReserveDeduction: SIDE_RESERVE_DEDUCTION_KG,
  dipTankDeduction: DIP_TANK_DEDUCTION_KG,
};

// ── User Roles ───────────────────────────────────────────────
export const USER_ROLES = {
  ADMIN: "admin",
  SUPERVISOR: "supervisor",
  OPERATOR: "operator",
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// ── Batch Status ─────────────────────────────────────────────
export const BATCH_STATUS = {
  PLANNED: "planned",
  IN_PROGRESS: "in_progress",
  COMPOUNDED: "compounded",
  LOCKED: "locked",
} as const;

// ── Delay Status ─────────────────────────────────────────────
export const DELAY_STATUS = {
  ON_TIME: "on_time",
  DELAYED: "delayed",
  CRITICAL: "critical",
} as const;

// ── Tank Status ──────────────────────────────────────────────
export const TANK_STATUS = {
  AVAILABLE: "available",
  OCCUPIED: "occupied",
  MAINTENANCE: "maintenance",
} as const;

// ── Gantt Color Coding (per spec) ────────────────────────────
export const GANTT_COLORS = {
  STABILIZER: "#3B82F6",     // Blue
  DISPERSION: "#8B5CF6",     // Purple
  MATURATION: "#F97316",     // Orange
  RUNNING: "#22C55E",        // Green
  FINISHED: "#6B7280",       // Gray
  FIRST_BATCH: "#EAB308",    // Yellow
  DELAYED: "#EF4444",        // Red
  OVER_MATURED: "#991B1B",   // Dark Red
} as const;
