"use client";

// ============================================================
// LCPS — useBatches Hook
// Firestore real-time listener for batches subcollection
// ============================================================

import { useEffect } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  DocumentChange,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/constants";
import { Batch } from "@/types";
import { useBatchStore } from "@/store/batchStore";

export function useBatches(sheetId: string | null) {
  const { setBatches, upsertBatch, removeBatch, setLoading, setError } =
    useBatchStore();

  useEffect(() => {
    if (!sheetId) {
      setBatches([]);
      return;
    }

    setLoading(true);
    setError(null);

    const batchesRef = collection(
      db,
      COLLECTIONS.PLANNING_SHEETS,
      sheetId,
      COLLECTIONS.BATCHES
    );
    const q = query(batchesRef, orderBy("batchNumber", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // On initial load, set all batches at once
        if (snapshot.metadata.hasPendingWrites === false && snapshot.docChanges().length === snapshot.size) {
          const batches = snapshot.docs.map(
            (d) => ({ id: d.id, ...d.data() } as Batch)
          );
          setBatches(batches);
          setLoading(false);
          return;
        }

        // Incremental updates via docChanges (for real-time multi-user sync)
        snapshot.docChanges().forEach((change: DocumentChange) => {
          const batch = { id: change.doc.id, ...change.doc.data() } as Batch;
          if (change.type === "added" || change.type === "modified") {
            upsertBatch(batch);
          } else if (change.type === "removed") {
            removeBatch(change.doc.id);
          }
        });
        setLoading(false);
      },
      (error) => {
        console.error("[useBatches] Firestore error:", error);
        setError(error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [sheetId]);
}
