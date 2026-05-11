"use client";

// ============================================================
// LCPS — useAuth Hook
// Firebase Auth state listener + Firestore user profile
// ============================================================

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/constants";
import { LCPSUser } from "@/types";
import { useAuthStore } from "@/store/authStore";

export function useAuth() {
  const { setFirebaseUser, setLcpsUser, setLoading, lcpsUser } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);

      if (firebaseUser) {
        try {
          // Load user profile from Firestore
          const userRef = doc(db, COLLECTIONS.USERS, firebaseUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            setLcpsUser({ ...userSnap.data(), uid: userSnap.id } as unknown as LCPSUser);
          } else {
            // First-time login: create user doc with operator role
            const newUser: LCPSUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email ?? "",
              displayName: firebaseUser.displayName ?? firebaseUser.email ?? "User",
              role: "operator",
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            };
            await setDoc(userRef, newUser);
            setLcpsUser(newUser);
          }
        } catch (error) {
          console.error("[useAuth] Error loading user profile:", error);
        }
      } else {
        setLcpsUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { lcpsUser };
}
