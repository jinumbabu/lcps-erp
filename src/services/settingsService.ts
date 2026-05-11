// ============================================================
// LCPS — Settings Service
// Firestore CRUD for system settings
// ============================================================

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/constants";
import { logAudit } from "./auditService";

export interface SystemSettings {
  id: string;
  latexConsumptionPerHour: number;
  batchMultiplier: number;
  defaultMaturationHours: number;
  preparationDuration: number;
  stabilizerDuration: number;
  dispersionOffset: number;
  dispersionDuration: number;
  dewebberOffset: number;
  sideReserveDeduction: number;
  dipTankDeduction: number;
  overMaturationWarningHours: number;
  overMaturationCriticalHours: number;
  updatedAt: any;
}

const DEFAULT_SETTINGS: Omit<SystemSettings, "id" | "updatedAt"> = {
  latexConsumptionPerHour: 576.6,
  batchMultiplier: 1.922,
  defaultMaturationHours: 30,
  preparationDuration: 12,
  stabilizerDuration: 2,
  dispersionOffset: 5,
  dispersionDuration: 5,
  dewebberOffset: 4,
  sideReserveDeduction: 2000,
  dipTankDeduction: 7000,
  overMaturationWarningHours: 36,
  overMaturationCriticalHours: 48,
};

export async function getSettings(): Promise<SystemSettings> {
  const settingsRef = doc(db, COLLECTIONS.SETTINGS, "system");
  const snap = await getDoc(settingsRef);

  if (snap.exists()) {
    return { id: snap.id, ...snap.data() } as SystemSettings;
  }

  // Create default settings if not exist
  await setDoc(settingsRef, {
    ...DEFAULT_SETTINGS,
    updatedAt: serverTimestamp(),
  });

  const newSnap = await getDoc(settingsRef);
  return { id: newSnap.id, ...newSnap.data() } as SystemSettings;
}

export async function updateSettings(
  updates: Partial<Omit<SystemSettings, "id" | "updatedAt">>,
  userId: string,
  userEmail: string
): Promise<void> {
  const settingsRef = doc(db, COLLECTIONS.SETTINGS, "system");
  
  // Get current settings for audit
  const currentSnap = await getDoc(settingsRef);
  const currentData = currentSnap.exists() ? currentSnap.data() : {};

  await updateDoc(settingsRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });

  await logAudit({
    userId,
    userEmail,
    action: "settings_updated",
    entityType: "settings",
    entityId: "system",
    previousValue: currentData,
    newValue: updates,
  });
}

export async function resetSettings(
  userId: string,
  userEmail: string
): Promise<void> {
  const settingsRef = doc(db, COLLECTIONS.SETTINGS, "system");
  
  // Get current settings for audit
  const currentSnap = await getDoc(settingsRef);
  const currentData = currentSnap.exists() ? currentSnap.data() : {};

  await setDoc(settingsRef, {
    ...DEFAULT_SETTINGS,
    updatedAt: serverTimestamp(),
  });

  await logAudit({
    userId,
    userEmail,
    action: "settings_reset",
    entityType: "settings",
    entityId: "system",
    previousValue: currentData,
    newValue: DEFAULT_SETTINGS,
  });
}
