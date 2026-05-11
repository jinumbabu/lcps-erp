// ============================================================
// LCPS — Planning Sheet Service
// Firestore CRUD for planning sheets (Excel-like tabs)
// ============================================================

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  Timestamp,
  serverTimestamp,
  writeBatch,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/constants";
import { PlanningSheet } from "@/types";
import { logAudit } from "./auditService";

// ── Create Planning Sheet ─────────────────────────────────────

export async function createPlanningSheet(
  name: string,
  userId: string,
  userEmail: string,
  existingCount: number
): Promise<string> {
  const sheetsRef = collection(db, COLLECTIONS.PLANNING_SHEETS);
  const newSheet: Omit<PlanningSheet, "id"> = {
    name,
    createdBy: userId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    batchCount: 0,
    order: existingCount,
  };

  const docRef = await addDoc(sheetsRef, newSheet);

  await logAudit({
    userId,
    userEmail,
    action: "sheet_created",
    entityType: "sheet",
    entityId: docRef.id,
    previousValue: {},
    newValue: { name },
  });

  return docRef.id;
}

// ── Get All Planning Sheets ───────────────────────────────────

export async function getPlanningSheets(): Promise<PlanningSheet[]> {
  const sheetsRef = collection(db, COLLECTIONS.PLANNING_SHEETS);
  const q = query(sheetsRef, orderBy("order", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PlanningSheet));
}

// ── Rename Planning Sheet ─────────────────────────────────────

export async function renamePlanningSheet(
  sheetId: string,
  newName: string,
  userId: string,
  userEmail: string,
  oldName: string
): Promise<void> {
  const sheetRef = doc(db, COLLECTIONS.PLANNING_SHEETS, sheetId);
  await updateDoc(sheetRef, { name: newName, updatedAt: serverTimestamp() });

  await logAudit({
    userId,
    userEmail,
    action: "sheet_renamed",
    entityType: "sheet",
    entityId: sheetId,
    previousValue: { name: oldName },
    newValue: { name: newName },
  });
}

// ── Duplicate Planning Sheet ──────────────────────────────────

export async function duplicatePlanningSheet(
  sourceSheetId: string,
  newName: string,
  userId: string,
  userEmail: string,
  existingCount: number
): Promise<string> {
  // Create new sheet
  const newSheetId = await createPlanningSheet(newName, userId, userEmail, existingCount);

  // Copy all batches from source to new sheet
  const sourceBatchesRef = collection(
    db, COLLECTIONS.PLANNING_SHEETS, sourceSheetId, COLLECTIONS.BATCHES
  );
  const sourceBatches = await getDocs(query(sourceBatchesRef, orderBy("batchNumber", "asc")));

  const batch = writeBatch(db);
  sourceBatches.docs.forEach((batchDoc) => {
    const newBatchRef = doc(
      collection(db, COLLECTIONS.PLANNING_SHEETS, newSheetId, COLLECTIONS.BATCHES)
    );
    batch.set(newBatchRef, {
      ...batchDoc.data(),
      planningSheetId: newSheetId,
      compoundedStatus: false,
      lockedStatus: false,
      batchStatus: "planned",
      createdBy: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  });

  await batch.commit();

  // Update batch count
  const newSheetRef = doc(db, COLLECTIONS.PLANNING_SHEETS, newSheetId);
  await updateDoc(newSheetRef, { batchCount: sourceBatches.size });

  return newSheetId;
}

// ── Delete Planning Sheet ─────────────────────────────────────

export async function deletePlanningSheet(
  sheetId: string,
  userId: string,
  userEmail: string,
  sheetName: string
): Promise<void> {
  // Delete all batches in sheet first
  const batchesRef = collection(db, COLLECTIONS.PLANNING_SHEETS, sheetId, COLLECTIONS.BATCHES);
  const batchSnapshot = await getDocs(batchesRef);
  const deleteBatch = writeBatch(db);
  batchSnapshot.docs.forEach((d) => deleteBatch.delete(d.ref));
  await deleteBatch.commit();

  // Delete sheet
  const sheetRef = doc(db, COLLECTIONS.PLANNING_SHEETS, sheetId);
  await deleteDoc(sheetRef);

  await logAudit({
    userId,
    userEmail,
    action: "sheet_deleted",
    entityType: "sheet",
    entityId: sheetId,
    previousValue: { name: sheetName },
    newValue: {},
  });
}

// ── Update Batch Count ────────────────────────────────────────

export async function updateSheetBatchCount(
  sheetId: string,
  count: number
): Promise<void> {
  const sheetRef = doc(db, COLLECTIONS.PLANNING_SHEETS, sheetId);
  await updateDoc(sheetRef, { batchCount: count, updatedAt: serverTimestamp() });
}
