// ============================================================
// LCPS — Batch Store (Zustand)
// Local state cache for batches — synced from Firestore
// ============================================================

import { create } from "zustand";
import { Batch } from "@/types";

interface BatchState {
  batches: Batch[];
  selectedBatchId: string | null;
  isLoading: boolean;
  error: string | null;
  setBatches: (batches: Batch[]) => void;
  upsertBatch: (batch: Batch) => void;
  removeBatch: (batchId: string) => void;
  setSelectedBatch: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  getBatchByNumber: (num: number) => Batch | undefined;
}

export const useBatchStore = create<BatchState>((set, get) => ({
  batches: [],
  selectedBatchId: null,
  isLoading: false,
  error: null,

  setBatches: (batches) => set({ batches }),

  upsertBatch: (batch) =>
    set((state) => {
      const idx = state.batches.findIndex((b) => b.id === batch.id);
      if (idx >= 0) {
        const updated = [...state.batches];
        updated[idx] = batch;
        return { batches: updated };
      }
      return { batches: [...state.batches, batch] };
    }),

  removeBatch: (batchId) =>
    set((state) => ({
      batches: state.batches.filter((b) => b.id !== batchId),
    })),

  setSelectedBatch: (id) => set({ selectedBatchId: id }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  getBatchByNumber: (num) =>
    get().batches.find((b) => b.batchNumber === num),
}));
