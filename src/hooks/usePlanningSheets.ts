"use client";

// ============================================================
// LCPS — usePlanningSheets Hook
// Firestore real-time listener for planning sheets collection
// ============================================================

import { useEffect } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/constants";
import { PlanningSheet } from "@/types";
import { usePlanningStore } from "@/store/planningStore";

export function usePlanningSheets() {
  const { setSheets, upsertSheet, removeSheet, setActiveSheet, activeSheetId, setLoading } =
    usePlanningStore();

  useEffect(() => {
    setLoading(true);

    const sheetsRef = collection(db, COLLECTIONS.PLANNING_SHEETS);
    const q = query(sheetsRef, orderBy("order", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sheets = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as PlanningSheet)
      );
      setSheets(sheets);
      setLoading(false);

      // Auto-select first sheet if none selected
      if (!activeSheetId && sheets.length > 0) {
        setActiveSheet(sheets[0].id);
      }
    });

    return () => unsubscribe();
  }, []);
}
