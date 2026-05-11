"use client";

// ============================================================
// LCPS — Grid Column Definitions
// All 27 columns per spec with formatters, editors, renderers
// ============================================================

import { ColDef, ValueFormatterParams, ICellRendererParams } from "ag-grid-community";
import { format } from "date-fns";
import { Batch } from "@/types";
import { GANTT_COLORS } from "@/lib/constants";

// ── Formatters ────────────────────────────────────────────────

const fmtNum = (v: number | null | undefined, decimals = 1): string =>
  v == null ? "—" : v.toFixed(decimals);

const fmtKg = (v: number | null | undefined): string =>
  v == null ? "—" : `${v.toLocaleString()} kg`;

const fmtHr = (v: number | null | undefined): string =>
  v == null ? "—" : `${fmtNum(v, 2)} hr`;

const fmtTime = (ts: { toDate?: () => Date } | null | undefined): string => {
  if (!ts) return "—";
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts as unknown as string);
    return format(d, "dd/MM HH:mm");
  } catch {
    return "—";
  }
};

// ── Status Renderers ──────────────────────────────────────────

function DelayStatusRenderer(params: ICellRendererParams) {
  const val = params.value;
  const map: Record<string, { label: string; cls: string }> = {
    on_time: { label: "On Time", cls: "badge-on-time" },
    delayed: { label: "Delayed", cls: "badge-delayed" },
    critical: { label: "Critical", cls: "badge-critical" },
  };
  const cfg = map[val] ?? { label: val, cls: "" };
  return `<span class="badge ${cfg.cls}">${cfg.label}</span>`;
}

function BooleanRenderer(
  params: ICellRendererParams,
  trueLabel = "Yes",
  falseLabel = "No"
) {
  return params.value
    ? `<span class="badge badge-on-time">✓ ${trueLabel}</span>`
    : `<span style="color:var(--text-muted);font-size:12px">${falseLabel}</span>`;
}

function LockedRenderer(params: ICellRendererParams) {
  if (params.value) {
    return `<span class="badge badge-locked">🔒 Locked</span>`;
  }
  return `<span style="color:var(--text-muted);font-size:12px">—</span>`;
}

function TankRenderer(params: ICellRendererParams) {
  const tank = params.data?.preparationTankDisplay ?? params.value;
  if (!tank) return "—";
  return `<span style="font-weight:600;font-family:monospace;font-size:13px;color:var(--accent-blue)">${tank}</span>`;
}

function OverMatRenderer(params: ICellRendererParams) {
  const val = params.value;
  if (val == null || val === 0) return `<span style="color:var(--text-muted)">—</span>`;
  const color = val >= 18 ? "#ff4444" : val >= 6 ? "var(--accent-amber)" : "var(--accent-orange)";
  return `<span style="color:${color};font-weight:600">+${fmtNum(val, 1)} hr</span>`;
}

// ── Column Definitions ────────────────────────────────────────

export const getColumnDefs = (canEdit: boolean): ColDef<Batch>[] => [
  // ── Core Identity ─────────────────────────────────────────
  {
    field: "batchNumber",
    headerName: "Batch No",
    width: 90,
    pinned: "left",
    editable: false,
    cellStyle: { fontWeight: 700, color: "var(--text-primary)" },
    cellRenderer: (p: ICellRendererParams) =>
      `<span style="color:var(--accent-orange);font-weight:700">#${p.value}</span>`,
  },
  {
    field: "preparationTank",
    headerName: "Tank",
    width: 90,
    pinned: "left",
    editable: canEdit,
    cellRenderer: TankRenderer,
    valueFormatter: (p: ValueFormatterParams) =>
      p.data?.preparationTankDisplay ?? `T${String(p.value).padStart(3, "0")}`,
  },

  // ── Quantities ────────────────────────────────────────────
  {
    field: "rawLatexQty",
    headerName: "Raw Latex (kg)",
    width: 130,
    editable: canEdit,
    valueFormatter: (p: ValueFormatterParams) => fmtKg(p.value),
    cellStyle: { fontWeight: 500 },
  },
  {
    field: "batchQty",
    headerName: "Batch Qty (kg)",
    width: 130,
    editable: false,
    valueFormatter: (p: ValueFormatterParams) => fmtKg(p.value),
    cellStyle: { color: "var(--text-secondary)" },
  },

  // ── First Batch Special ───────────────────────────────────
  {
    field: "sideReserveEnabled",
    headerName: "Side Reserve",
    width: 120,
    editable: (params) => canEdit && (params.data?.isFirstBatch ?? false),
    cellRenderer: (p: ICellRendererParams) => BooleanRenderer(p, "Active", "—"),
    cellStyle: (params) => ({
      opacity: params.data?.isFirstBatch ? 1 : 0.35,
    }),
  },
  {
    field: "dipTankEnabled",
    headerName: "Dip Tank Fill",
    width: 120,
    editable: (params) => canEdit && (params.data?.isFirstBatch ?? false),
    cellRenderer: (p: ICellRendererParams) => BooleanRenderer(p, "Active", "—"),
    cellStyle: (params) => ({
      opacity: params.data?.isFirstBatch ? 1 : 0.35,
    }),
  },
  {
    field: "sideReserveRefill",
    headerName: "Side Reserve Refill",
    width: 140,
    editable: (params) => canEdit && (params.data?.isFirstBatch ?? false),
    cellRenderer: (p: ICellRendererParams) => BooleanRenderer(p, "Active", "—"),
    cellStyle: (params) => ({
      opacity: params.data?.isFirstBatch ? 1 : 0.35,
    }),
  },
  {
    field: "adjustedBatchQty",
    headerName: "Adjusted Qty (kg)",
    width: 140,
    editable: false,
    valueFormatter: (p: ValueFormatterParams) => fmtKg(p.value),
    cellStyle: { color: "var(--accent-green)", fontWeight: 600 },
  },

  // ── Maturation ────────────────────────────────────────────
  {
    field: "plannedMaturation",
    headerName: "Planned Mat. (hr)",
    width: 145,
    editable: canEdit,
    valueFormatter: (p: ValueFormatterParams) => fmtHr(p.value),
    cellStyle: { color: "var(--accent-amber)" },
  },
  {
    field: "actualMaturation",
    headerName: "Actual Mat. (hr)",
    width: 140,
    editable: false,
    valueFormatter: (p: ValueFormatterParams) => fmtHr(p.value),
  },
  {
    field: "overMaturation",
    headerName: "Over Mat. (hr)",
    width: 130,
    editable: false,
    cellRenderer: OverMatRenderer,
  },

  // ── Timing ────────────────────────────────────────────────
  {
    field: "delayHour",
    headerName: "Delay (hr)",
    width: 110,
    editable: false,
    valueFormatter: (p: ValueFormatterParams) =>
      p.value ? `+${fmtNum(p.value, 2)} hr` : "—",
    cellStyle: (params) => ({
      color: params.value > 0 ? "var(--accent-red)" : "var(--text-muted)",
      fontWeight: params.value > 0 ? 600 : 400,
    }),
  },
  {
    field: "runtime",
    headerName: "Runtime (hr)",
    width: 120,
    editable: canEdit,
    valueFormatter: (p: ValueFormatterParams) => fmtHr(p.value),
  },

  // ── Process Timeline ──────────────────────────────────────
  {
    field: "stabilizerStart",
    headerName: "Stabilizer Start",
    width: 140,
    editable: canEdit,
    valueFormatter: (p: ValueFormatterParams) => fmtTime(p.value),
    cellStyle: { color: GANTT_COLORS.STABILIZER },
  },
  {
    field: "stabilizerEnd",
    headerName: "Stabilizer End",
    width: 130,
    editable: false,
    valueFormatter: (p: ValueFormatterParams) => fmtTime(p.value),
    cellStyle: { color: GANTT_COLORS.STABILIZER, opacity: 0.75 },
  },
  {
    field: "dispersionStart",
    headerName: "Dispersion Start",
    width: 140,
    editable: false,
    valueFormatter: (p: ValueFormatterParams) => fmtTime(p.value),
    cellStyle: { color: GANTT_COLORS.DISPERSION },
  },
  {
    field: "dispersionEnd",
    headerName: "Dispersion End",
    width: 135,
    editable: false,
    valueFormatter: (p: ValueFormatterParams) => fmtTime(p.value),
    cellStyle: { color: GANTT_COLORS.DISPERSION, opacity: 0.75 },
  },
  {
    field: "mixPreparationStart",
    headerName: "Mix Prep Start",
    width: 135,
    editable: false,
    valueFormatter: (p: ValueFormatterParams) => fmtTime(p.value),
    cellStyle: { color: "var(--text-secondary)" },
  },
  {
    field: "dewebberTime",
    headerName: "Dewebber Time",
    width: 135,
    editable: false,
    valueFormatter: (p: ValueFormatterParams) => fmtTime(p.value),
    cellStyle: { color: "var(--text-secondary)" },
  },

  // ── Line-Up & Finish ──────────────────────────────────────
  {
    field: "plannedLineupTime",
    headerName: "Planned Line-Up",
    width: 145,
    editable: false,
    valueFormatter: (p: ValueFormatterParams) => fmtTime(p.value),
    cellStyle: { color: GANTT_COLORS.RUNNING, fontWeight: 600 },
  },
  {
    field: "actualLineupTime",
    headerName: "Actual Line-Up",
    width: 140,
    editable: canEdit,
    valueFormatter: (p: ValueFormatterParams) => fmtTime(p.value),
    cellStyle: (params) => ({
      color:
        params.value && params.data?.plannedLineupTime &&
        params.value.toDate?.() > params.data.plannedLineupTime.toDate?.()
          ? "var(--accent-red)"
          : "var(--accent-green)",
      fontWeight: 600,
    }),
  },
  {
    field: "plannedFinishTime",
    headerName: "Planned Finish",
    width: 140,
    editable: false,
    valueFormatter: (p: ValueFormatterParams) => fmtTime(p.value),
    cellStyle: { color: GANTT_COLORS.RUNNING, fontWeight: 600 },
  },
  {
    field: "actualFinishTime",
    headerName: "Actual Finish",
    width: 130,
    editable: canEdit,
    valueFormatter: (p: ValueFormatterParams) => fmtTime(p.value),
    cellStyle: { color: "var(--text-secondary)" },
  },

  // ── Status ────────────────────────────────────────────────
  {
    field: "delayStatus",
    headerName: "Delay Status",
    width: 120,
    editable: false,
    cellRenderer: DelayStatusRenderer,
  },
  {
    field: "compoundedStatus",
    headerName: "Compounded",
    width: 120,
    editable: false,
    cellRenderer: (p: ICellRendererParams) =>
      BooleanRenderer(p, "Yes", "Pending"),
  },
  {
    field: "lockedStatus",
    headerName: "Locked",
    width: 100,
    editable: false,
    cellRenderer: LockedRenderer,
  },
  {
    headerName: "Actions",
    width: 80,
    pinned: "right",
    editable: false,
    suppressSizeToFit: true,
    cellRenderer: (params: ICellRendererParams) => {
      const batch = params.data as Batch;
      return `
        <div class="batch-actions-menu-trigger" data-batch-id="${batch.id}" style="display:flex;align-items:center;justify-content:center;gap:4px;">
          <button class="action-btn" data-action="menu" title="More actions" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;padding:4px;border-radius:4px;transition:all 0.15s;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
            </svg>
          </button>
        </div>
      `;
    },
  } as ColDef<Batch>,
];

// ── Row Class Rules ───────────────────────────────────────────

export const rowClassRules = {
  "row-locked": (params: { data?: Batch }) => !!params.data?.lockedStatus,
  "row-finished": (params: { data?: Batch }) =>
    !!(params.data?.lockedStatus || params.data?.compoundedStatus),
  "row-over-matured": (params: { data?: Batch }) =>
    !!(params.data?.overMaturation && params.data.overMaturation > 0),
  "row-critical": (params: { data?: Batch }) =>
    params.data?.delayStatus === "critical",
  "row-delayed": (params: { data?: Batch }) =>
    params.data?.delayStatus === "delayed",
  "row-first-batch": (params: { data?: Batch }) =>
    !!(params.data?.isFirstBatch && params.data?.delayStatus === "on_time"),
};
