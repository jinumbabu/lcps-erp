// ============================================================
// LCPS — Batch Service
// Firestore CRUD operations for batches
// Integrates schedule engine + delay engine
// ============================================================

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  Timestamp,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/constants";
import { Batch, BatchFormData, ComputedSchedule } from "@/types";
import { forwardSchedule } from "./scheduleEngine";
import { detectDelay } from "./delayEngine";
import { logAudit } from "./auditService";

// ── Helpers ───────────────────────────────────────────────────

function dateToTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

function scheduleToTimestamps(
  schedule: ComputedSchedule
): Partial<Batch> {
  return {
    batchQty: schedule.batchQty,
    adjustedBatchQty: schedule.adjustedBatchQty,
    runtime: schedule.runtime,
    stabilizerStart: dateToTimestamp(schedule.stabilizerStart),
    stabilizerEnd: dateToTimestamp(schedule.stabilizerEnd),
    dispersionStart: dateToTimestamp(schedule.dispersionStart),
    dispersionEnd: dateToTimestamp(schedule.dispersionEnd),
    mixPreparationStart: dateToTimestamp(schedule.mixPreparationStart),
    dewebberTime: dateToTimestamp(schedule.dewebberTime),
    plannedLineupTime: dateToTimestamp(schedule.plannedLineupTime),
    plannedFinishTime: dateToTimestamp(schedule.plannedFinishTime),
  };
}

// ── Create Batch ──────────────────────────────────────────────

export async function createBatch(
  sheetId: string,
  formData: BatchFormData,
  currentBatchCount: number,
  userId: string,
  userEmail: string
): Promise<string> {
  const isFirstBatch = currentBatchCount === 0;
  const batchNumber = currentBatchCount + 1;

  // If not first batch, get previous batch to chain from
  let stabilizerStart = formData.stabilizerStart;
  if (!isFirstBatch && !formData.stabilizerStart) {
    const previousBatches = await getBatches(sheetId);
    if (previousBatches.length > 0) {
      const lastBatch = previousBatches[previousBatches.length - 1];
      if (lastBatch.plannedFinishTime) {
        stabilizerStart = lastBatch.plannedFinishTime.toDate();
      }
    }
  }

  // Calculate schedule
  const schedule = forwardSchedule({
    stabilizerStart,
    rawLatexKg: formData.rawLatexQty,
    plannedMaturation: formData.plannedMaturation,
    sideReserveEnabled: isFirstBatch ? formData.sideReserveEnabled : false,
    dipTankEnabled: isFirstBatch ? formData.dipTankEnabled : false,
    sideReserveRefill: isFirstBatch ? formData.sideReserveRefill : false,
  });

  // Use Record type for Firestore document data (avoids strict Partial<Batch> conflicts)
  const scheduledFields = scheduleToTimestamps(schedule);
  
  // Get previous batch ID for chaining
  let chainedFromBatchId: string | null = null;
  if (!isFirstBatch) {
    const previousBatches = await getBatches(sheetId);
    if (previousBatches.length > 0) {
      const lastBatch = previousBatches[previousBatches.length - 1];
      chainedFromBatchId = lastBatch.id;
      
      // Update previous batch's nextBatchId
      const prevBatchRef = doc(db, COLLECTIONS.PLANNING_SHEETS, sheetId, COLLECTIONS.BATCHES, lastBatch.id);
      await updateDoc(prevBatchRef, { nextBatchId: "pending", updatedAt: serverTimestamp() });
    }
  }

  const batchData: Record<string, unknown> = {
    batchNumber,
    planningSheetId: sheetId,
    preparationTank: formData.preparationTank,
    preparationTankDisplay: `T${String(formData.preparationTank).padStart(3, "0")}`,
    rawLatexQty: formData.rawLatexQty,
    plannedMaturation: formData.plannedMaturation ?? 30,
    isFirstBatch,
    sideReserveEnabled: isFirstBatch ? (formData.sideReserveEnabled ?? false) : false,
    dipTankEnabled: isFirstBatch ? (formData.dipTankEnabled ?? false) : false,
    sideReserveRefill: isFirstBatch ? (formData.sideReserveRefill ?? false) : false,
    actualMaturation: null,
    overMaturation: null,
    delayHour: 0,
    actualLineupTime: null,
    actualFinishTime: null,
    delayStatus: "on_time",
    compoundedStatus: false,
    lockedStatus: false,
    batchStatus: "planned",
    chainedFromBatchId,
    nextBatchId: null,
    createdBy: userId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...scheduledFields,
  };

  const batchRef = collection(db, COLLECTIONS.PLANNING_SHEETS, sheetId, COLLECTIONS.BATCHES);
  const newDoc = await addDoc(batchRef, batchData);
  const newBatchId = newDoc.id;

  // Update previous batch's nextBatchId with actual ID
  if (chainedFromBatchId) {
    const prevBatchRef = doc(db, COLLECTIONS.PLANNING_SHEETS, sheetId, COLLECTIONS.BATCHES, chainedFromBatchId);
    await updateDoc(prevBatchRef, { nextBatchId: newBatchId, updatedAt: serverTimestamp() });
  }

  // Audit log
  await logAudit({
    userId,
    userEmail,
    action: "batch_created",
    entityType: "batch",
    entityId: newDoc.id,
    sheetId,
    previousValue: {},
    newValue: { batchNumber, rawLatexQty: formData.rawLatexQty },
  });

  return newDoc.id;
}

// ── Recalculate Chained Batches ───────────────────────────────────
// When a batch is delayed, recalculate all downstream batches
// to maintain proper chaining and update maturation times

export async function recalculateChainedBatches(
  sheetId: string,
  startingBatchId: string,
  userId: string,
  userEmail: string
): Promise<void> {
  const allBatches = await getBatches(sheetId);
  const startIndex = allBatches.findIndex((b) => b.id === startingBatchId);
  
  if (startIndex === -1 || startIndex === allBatches.length - 1) {
    return; // No downstream batches to recalculate
  }

  const batch = writeBatch(db);
  
  // Recalculate each downstream batch
  for (let i = startIndex + 1; i < allBatches.length; i++) {
    const currentBatch = allBatches[i];
    const previousBatch = allBatches[i - 1];
    
    if (!previousBatch.plannedFinishTime || currentBatch.lockedStatus) {
      continue; // Skip if can't chain or batch is locked
    }

    // New stabilizer start = previous batch finish
    const newStabilizerStart = previousBatch.plannedFinishTime.toDate();
    
    // Recalculate schedule with new start time
    const schedule = forwardSchedule({
      stabilizerStart: newStabilizerStart,
      rawLatexKg: currentBatch.rawLatexQty,
      plannedMaturation: currentBatch.plannedMaturation,
      sideReserveEnabled: currentBatch.sideReserveEnabled,
      dipTankEnabled: currentBatch.dipTankEnabled,
    });

    // Calculate delay impact on maturation
    const delayHours = previousBatch.delayHour || 0;
    const newMaturation = currentBatch.plannedMaturation + delayHours;
    
    const batchRef = doc(db, COLLECTIONS.PLANNING_SHEETS, sheetId, COLLECTIONS.BATCHES, currentBatch.id);
    batch.update(batchRef, {
      ...scheduleToTimestamps(schedule),
      plannedMaturation: newMaturation,
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();

  await logAudit({
    userId,
    userEmail,
    action: "chain_recalculated",
    entityType: "batch",
    entityId: startingBatchId,
    sheetId,
    previousValue: {},
    newValue: { affectedBatches: allBatches.length - startIndex - 1 },
  });
}

// ── Update Batch ──────────────────────────────────────────────

export async function updateBatch(
  sheetId: string,
  batchId: string,
  updates: Partial<BatchFormData>,
  existingBatch: Batch,
  userId: string,
  userEmail: string
): Promise<void> {
  if (existingBatch.lockedStatus) {
    throw new Error("Cannot edit a locked batch. Admin unlock required.");
  }

  const recalc: Partial<Batch> = {};

  // If stabilizer start or quantities change, recalculate schedule
  if (
    updates.stabilizerStart ||
    updates.rawLatexQty ||
    updates.plannedMaturation !== undefined ||
    updates.sideReserveEnabled !== undefined ||
    updates.dipTankEnabled !== undefined
  ) {
    const schedule = forwardSchedule({
      stabilizerStart: updates.stabilizerStart ?? existingBatch.stabilizerStart.toDate(),
      rawLatexKg: updates.rawLatexQty ?? existingBatch.rawLatexQty,
      plannedMaturation: updates.plannedMaturation ?? existingBatch.plannedMaturation,
      sideReserveEnabled: updates.sideReserveEnabled ?? existingBatch.sideReserveEnabled,
      dipTankEnabled: updates.dipTankEnabled ?? existingBatch.dipTankEnabled,
    });
    Object.assign(recalc, scheduleToTimestamps(schedule));
  }

  // If actual lineup time provided, detect delay
  if (updates.actualLineupTime) {
    recalc.actualLineupTime = dateToTimestamp(updates.actualLineupTime);
    // Delay detection needs Firestore timestamps merged with recalc
    const patchedBatch: Batch = {
      ...existingBatch,
      ...recalc,
      actualLineupTime: recalc.actualLineupTime ?? existingBatch.actualLineupTime,
    } as Batch;
    const delayResult = detectDelay(patchedBatch);
    recalc.delayHour = delayResult.delayHours;
    recalc.actualMaturation = patchedBatch.actualLineupTime
      ? (patchedBatch.actualLineupTime.toDate().getTime() - patchedBatch.dispersionEnd.toDate().getTime()) / 3600000
      : null;
    if (recalc.actualMaturation !== null) {
      recalc.overMaturation = Math.max(0, recalc.actualMaturation - existingBatch.plannedMaturation);
    }
    recalc.delayStatus = delayResult.newStatus;
  }

  if (updates.actualFinishTime) {
    recalc.actualFinishTime = dateToTimestamp(updates.actualFinishTime);
  }

  const batchRef = doc(db, COLLECTIONS.PLANNING_SHEETS, sheetId, COLLECTIONS.BATCHES, batchId);
  await updateDoc(batchRef, {
    ...recalc,
    updatedAt: serverTimestamp(),
  });

  // If batch is delayed, recalculate downstream batches
  if (recalc.delayHour && recalc.delayHour > 0) {
    try {
      await recalculateChainedBatches(sheetId, batchId, userId, userEmail);
    } catch (error) {
      console.error("[batchService] Chain recalculation failed:", error);
      // Don't fail the update if chain recalc fails
    }
  }

  await logAudit({
    userId,
    userEmail,
    action: "batch_updated",
    entityType: "batch",
    entityId: batchId,
    sheetId,
    previousValue: { rawLatexQty: existingBatch.rawLatexQty },
    newValue: updates as Record<string, unknown>,
  });
}

// ── Lock Batch (Compounded) ───────────────────────────────────

export async function lockBatch(
  sheetId: string,
  batchId: string,
  userId: string,
  userEmail: string
): Promise<void> {
  const batchRef = doc(db, COLLECTIONS.PLANNING_SHEETS, sheetId, COLLECTIONS.BATCHES, batchId);
  await updateDoc(batchRef, {
    compoundedStatus: true,
    lockedStatus: true,
    batchStatus: "compounded",
    lockedBy: userId,
    lockedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await logAudit({
    userId,
    userEmail,
    action: "batch_locked",
    entityType: "batch",
    entityId: batchId,
    sheetId,
    previousValue: { lockedStatus: false },
    newValue: { lockedStatus: true, compoundedStatus: true },
  });
}

// ── Unlock Batch (Admin only) ─────────────────────────────────

export async function unlockBatch(
  sheetId: string,
  batchId: string,
  userId: string,
  userEmail: string
): Promise<void> {
  const batchRef = doc(db, COLLECTIONS.PLANNING_SHEETS, sheetId, COLLECTIONS.BATCHES, batchId);
  await updateDoc(batchRef, {
    lockedStatus: false,
    compoundedStatus: false,
    batchStatus: "in_progress",
    updatedAt: serverTimestamp(),
  });

  await logAudit({
    userId,
    userEmail,
    action: "batch_unlocked",
    entityType: "batch",
    entityId: batchId,
    sheetId,
    previousValue: { lockedStatus: true },
    newValue: { lockedStatus: false },
  });
}

// ── Delete Batch ──────────────────────────────────────────────

export async function deleteBatch(
  sheetId: string,
  batchId: string,
  existingBatch: Batch,
  userId: string,
  userEmail: string
): Promise<void> {
  if (existingBatch.lockedStatus) {
    throw new Error("Cannot delete a locked batch.");
  }

  const batchRef = doc(db, COLLECTIONS.PLANNING_SHEETS, sheetId, COLLECTIONS.BATCHES, batchId);
  await deleteDoc(batchRef);

  await logAudit({
    userId,
    userEmail,
    action: "batch_deleted",
    entityType: "batch",
    entityId: batchId,
    sheetId,
    previousValue: { batchNumber: existingBatch.batchNumber },
    newValue: {},
  });
}

// ── Get All Batches ───────────────────────────────────────────

export async function getBatches(sheetId: string): Promise<Batch[]> {
  const batchRef = collection(db, COLLECTIONS.PLANNING_SHEETS, sheetId, COLLECTIONS.BATCHES);
  const q = query(batchRef, orderBy("batchNumber", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Batch));
}

// ── Duplicate Batch ──────────────────────────────────────────────

export async function duplicateBatch(
  sheetId: string,
  sourceBatchId: string,
  currentBatchCount: number,
  userId: string,
  userEmail: string
): Promise<string> {
  const sourceBatchRef = doc(db, COLLECTIONS.PLANNING_SHEETS, sheetId, COLLECTIONS.BATCHES, sourceBatchId);
  const sourceSnap = await getDoc(sourceBatchRef);
  
  if (!sourceSnap.exists()) {
    throw new Error("Source batch not found");
  }

  const sourceBatch = { id: sourceSnap.id, ...sourceSnap.data() } as Batch;
  const batchNumber = currentBatchCount + 1;

  // Get previous batch for chaining
  let stabilizerStart = sourceBatch.stabilizerStart.toDate();
  let chainedFromBatchId: string | null = null;
  
  const allBatches = await getBatches(sheetId);
  if (allBatches.length > 0) {
    const lastBatch = allBatches[allBatches.length - 1];
    chainedFromBatchId = lastBatch.id;
    stabilizerStart = lastBatch.plannedFinishTime.toDate();
    
    // Update previous batch's nextBatchId
    const prevBatchRef = doc(db, COLLECTIONS.PLANNING_SHEETS, sheetId, COLLECTIONS.BATCHES, lastBatch.id);
    await updateDoc(prevBatchRef, { nextBatchId: "pending", updatedAt: serverTimestamp() });
  }

  // Recalculate schedule with new start time
  const schedule = forwardSchedule({
    stabilizerStart,
    rawLatexKg: sourceBatch.rawLatexQty,
    plannedMaturation: sourceBatch.plannedMaturation,
    sideReserveEnabled: false, // Duplicated batches are never first batch
    dipTankEnabled: false,
  });

  const batchData: Record<string, unknown> = {
    batchNumber,
    planningSheetId: sheetId,
    preparationTank: sourceBatch.preparationTank,
    preparationTankDisplay: sourceBatch.preparationTankDisplay,
    rawLatexQty: sourceBatch.rawLatexQty,
    plannedMaturation: sourceBatch.plannedMaturation,
    isFirstBatch: false,
    sideReserveEnabled: false,
    dipTankEnabled: false,
    sideReserveRefill: false,
    actualMaturation: null,
    overMaturation: null,
    delayHour: 0,
    actualLineupTime: null,
    actualFinishTime: null,
    delayStatus: "on_time",
    compoundedStatus: false,
    lockedStatus: false,
    batchStatus: "planned",
    chainedFromBatchId,
    nextBatchId: null,
    createdBy: userId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...scheduleToTimestamps(schedule),
  };

  const batchRef = collection(db, COLLECTIONS.PLANNING_SHEETS, sheetId, COLLECTIONS.BATCHES);
  const newDoc = await addDoc(batchRef, batchData);
  const newBatchId = newDoc.id;

  // Update previous batch's nextBatchId
  if (chainedFromBatchId) {
    const prevBatchRef = doc(db, COLLECTIONS.PLANNING_SHEETS, sheetId, COLLECTIONS.BATCHES, chainedFromBatchId);
    await updateDoc(prevBatchRef, { nextBatchId: newBatchId, updatedAt: serverTimestamp() });
  }

  await logAudit({
    userId,
    userEmail,
    action: "batch_duplicated",
    entityType: "batch",
    entityId: newBatchId,
    sheetId,
    previousValue: { sourceBatchNumber: sourceBatch.batchNumber },
    newValue: { newBatchNumber: batchNumber },
  });

  return newBatchId;
}
