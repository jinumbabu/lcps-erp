// ============================================================
// LCPS — Audit Service
// Writes audit log entries to Firestore
// ============================================================

import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/constants";
import { AuditLog } from "@/types";

interface LogAuditParams {
  userId: string;
  userEmail: string;
  action: string;
  entityType: AuditLog["entityType"];
  entityId: string;
  sheetId?: string;
  previousValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
}

export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    const logsRef = collection(db, COLLECTIONS.AUDIT_LOGS);
    await addDoc(logsRef, {
      userId: params.userId,
      userEmail: params.userEmail,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      sheetId: params.sheetId ?? null,
      previousValue: params.previousValue,
      newValue: params.newValue,
      timestamp: Timestamp.now(),
    });
  } catch (error) {
    // Audit logging should never break main flow
    console.error("[AuditService] Failed to log audit:", error);
  }
}
