// ============================================================
// LCPS — Planning Store (Zustand)
// Active planning sheet + tab management
// ============================================================

import { create } from "zustand";
import { PlanningSheet } from "@/types";

interface PlanningState {
  sheets: PlanningSheet[];
  activeSheetId: string | null;
  isLoading: boolean;
  setSheets: (sheets: PlanningSheet[]) => void;
  upsertSheet: (sheet: PlanningSheet) => void;
  removeSheet: (sheetId: string) => void;
  setActiveSheet: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  getActiveSheet: () => PlanningSheet | undefined;
}

export const usePlanningStore = create<PlanningState>((set, get) => ({
  sheets: [],
  activeSheetId: null,
  isLoading: false,

  setSheets: (sheets) => set({ sheets }),

  upsertSheet: (sheet) =>
    set((state) => {
      const idx = state.sheets.findIndex((s) => s.id === sheet.id);
      if (idx >= 0) {
        const updated = [...state.sheets];
        updated[idx] = sheet;
        return { sheets: updated };
      }
      return { sheets: [...state.sheets, sheet] };
    }),

  removeSheet: (sheetId) =>
    set((state) => ({
      sheets: state.sheets.filter((s) => s.id !== sheetId),
      activeSheetId:
        state.activeSheetId === sheetId ? null : state.activeSheetId,
    })),

  setActiveSheet: (id) => set({ activeSheetId: id }),
  setLoading: (isLoading) => set({ isLoading }),

  getActiveSheet: () =>
    get().sheets.find((s) => s.id === get().activeSheetId),
}));
