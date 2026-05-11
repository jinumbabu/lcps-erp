import { Timestamp } from "firebase/firestore";
import { UserRole, DELAY_STATUS, BATCH_STATUS, TANK_STATUS } from "@/lib/constants";

// ── User ─────────────────────────────────────────────────────
export interface LCPSUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── Planning Sheet ────────────────────────────────────────────
export interface PlanningSheet {
  id: string;
  name: string; // "PLAN-A", "MAY-2026", etc.
  createdBy: string; // userId
  createdAt: Timestamp;
  updatedAt: Timestamp;
  batchCount: number;
  order: number; // tab ordering
  color?: string; // optional tab accent color
}

// ── Batch ─────────────────────────────────────────────────────
export interface Batch {
  id: string;
  batchNumber: number; // sequential within sheet
  planningSheetId: string;

  // Tank
  preparationTank: number; // stored as number, displayed as T211
  preparationTankDisplay: string; // "T211"

  // Quantities
  rawLatexQty: number; // kg — primary input
  batchQty: number; // rawLatex × 1.922 (auto-calculated)
  adjustedBatchQty: number; // after side reserve / dip tank deductions
  plannedMaturation: number; // hours, default 30, editable

  // Actuals (filled during production)
  actualMaturation: number | null;
  overMaturation: number | null; // actualMaturation - plannedMaturation
  delayHour: number; // hours delayed
  runtime: number; // adjustedBatchQty / 576.6

  // First-batch-only flags
  isFirstBatch: boolean;
  sideReserveEnabled: boolean; // deducts 2000 kg
  dipTankEnabled: boolean; // deducts 7000 kg
  sideReserveRefill: boolean; // refill scheduling

  // Process Timeline
  stabilizerStart: Timestamp; // primary editable input
  stabilizerEnd: Timestamp; // stabStart + 2h
  dispersionStart: Timestamp; // stabStart + 5h
  dispersionEnd: Timestamp; // dispStart + 5h
  mixPreparationStart: Timestamp; // lineUp - maturation - 12h
  dewebberTime: Timestamp; // lineUp - 4h
  plannedLineupTime: Timestamp; // dispEnd + plannedMaturation
  actualLineupTime: Timestamp | null; // entered during production
  plannedFinishTime: Timestamp; // lineUp + runtime
  actualFinishTime: Timestamp | null; // entered during production

  // Status
  delayStatus: typeof DELAY_STATUS[keyof typeof DELAY_STATUS];
  compoundedStatus: boolean;
  lockedStatus: boolean;
  batchStatus: typeof BATCH_STATUS[keyof typeof BATCH_STATUS];

  // Chaining
  chainedFromBatchId: string | null; // previous batch id
  nextBatchId: string | null;

  // Metadata
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lockedBy?: string; // userId who locked
  lockedAt?: Timestamp;
}

// ── Batch (Form Input) ────────────────────────────────────────
export interface BatchFormData {
  preparationTank: number;
  rawLatexQty: number;
  stabilizerStart: Date;
  plannedMaturation?: number; // optional, defaults to 30
  sideReserveEnabled?: boolean;
  dipTankEnabled?: boolean;
  sideReserveRefill?: boolean;
  actualLineupTime?: Date;
  actualFinishTime?: Date;
}

// ── Computed Schedule ─────────────────────────────────────────
export interface ComputedSchedule {
  batchQty: number;
  adjustedBatchQty: number;
  runtime: number;
  stabilizerStart: Date;
  stabilizerEnd: Date;
  dispersionStart: Date;
  dispersionEnd: Date;
  mixPreparationStart: Date;
  dewebberTime: Date;
  plannedLineupTime: Date;
  plannedFinishTime: Date;
}

// ── Tank ──────────────────────────────────────────────────────
export interface Tank {
  id: string;
  tankNumber: number; // 211, 212, etc.
  displayName: string; // "T211"
  currentBatchId: string | null;
  status: typeof TANK_STATUS[keyof typeof TANK_STATUS];
  updatedAt: Timestamp;
}

// ── Audit Log ─────────────────────────────────────────────────
export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string; // 'batch_updated' | 'batch_locked' | 'sheet_created' | ...
  entityType: "batch" | "sheet" | "tank" | "settings" | "user";
  entityId: string;
  sheetId?: string;
  previousValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
  timestamp: Timestamp;
}

// ── Delay Result ──────────────────────────────────────────────
export interface DelayResult {
  isDelayed: boolean;
  delayHours: number;
  overMaturationHours: number;
  newStatus: typeof DELAY_STATUS[keyof typeof DELAY_STATUS];
}

// ── Dashboard KPIs ────────────────────────────────────────────
export interface DashboardKPIs {
  totalBatchesToday: number;
  runningBatches: number;
  delayedBatches: number;
  overMaturedBatches: number;
  upcomingLineups: Batch[]; // next 3 lineup times
  tankUtilization: Record<string, number>; // tankDisplayName → % utilization
  totalLatexToday: number; // kg
  averageMaturation: number; // hours
}

// ── Presence (multi-user) ─────────────────────────────────────
export interface UserPresence {
  userId: string;
  displayName: string;
  activeSheetId: string | null;
  lastSeen: Timestamp;
  color: string; // for avatar/cursor color
}
