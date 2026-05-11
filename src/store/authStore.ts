// ============================================================
// LCPS — Auth Store (Zustand)
// ============================================================

import { create } from "zustand";
import { User } from "firebase/auth";
import { LCPSUser } from "@/types";

interface AuthState {
  firebaseUser: User | null;
  lcpsUser: LCPSUser | null;
  loading: boolean;
  setFirebaseUser: (user: User | null) => void;
  setLcpsUser: (user: LCPSUser | null) => void;
  setLoading: (loading: boolean) => void;
  isAdmin: () => boolean;
  isSupervisor: () => boolean;
  canEdit: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  firebaseUser: null,
  lcpsUser: null,
  loading: true,

  setFirebaseUser: (user) => set({ firebaseUser: user }),
  setLcpsUser: (user) => set({ lcpsUser: user }),
  setLoading: (loading) => set({ loading }),

  isAdmin: () => get().lcpsUser?.role === "admin",
  isSupervisor: () =>
    get().lcpsUser?.role === "admin" || get().lcpsUser?.role === "supervisor",
  canEdit: () =>
    get().lcpsUser?.role === "admin" || get().lcpsUser?.role === "supervisor",
}));
