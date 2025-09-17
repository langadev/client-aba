// store/authStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

type Role = "ADMIN" | "PAI" | "PSICOLOGO";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setUser: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  hasRole: (role: Role) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,

      setUser: (user, token) => set({ user, token }),

      logout: () => set({ user: null, token: null }),

      isAuthenticated: () => !!get().token,

      hasRole: (role) => get().user?.role === role,
    }),
    {
      name: "auth-storage",
    }
  )
);
