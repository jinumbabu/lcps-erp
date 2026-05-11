// ============================================================
// LCPS — User Service
// Firestore operations for user management
// ============================================================

import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, USER_ROLES } from "@/lib/constants";
import { LCPSUser } from "@/types";
import { logAudit } from "./auditService";

export async function getAllUsers(): Promise<LCPSUser[]> {
  const usersRef = collection(db, COLLECTIONS.USERS);
  const q = query(usersRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ uid: d.id, ...d.data() } as unknown as LCPSUser));
}

export async function updateUserRole(
  userId: string,
  newRole: keyof typeof USER_ROLES,
  adminUserId: string,
  adminEmail: string
): Promise<void> {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  
  // Get current user data for audit
  const currentSnap = await getDoc(userRef);
  const currentData = currentSnap.exists() ? currentSnap.data() : {};

  await updateDoc(userRef, {
    role: newRole,
    updatedAt: new Date(),
  });

  await logAudit({
    userId: adminUserId,
    userEmail: adminEmail,
    action: "user_role_updated",
    entityType: "user",
    entityId: userId,
    previousValue: { role: currentData.role },
    newValue: { role: newRole },
  });
}
