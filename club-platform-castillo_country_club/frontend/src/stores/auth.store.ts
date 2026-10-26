// src/stores/auth.store.ts
// ═══════════════════════════════════════════════════════════
// CASTILLO — Auth Store (aligned with backend port 8001)
//
// Proxy: Vite redirige /api/* → localhost:8001
// Backend login response: { status, tokens: {...}, user: {...} }
// Backend refresh response: { status, tokens: {...} }
// Roles: lowercase backend → uppercase frontend
// loginTimestamp: Date.now() capturado al login para cálculo
// de sesión real en SettingsPage.
// ═══════════════════════════════════════════════════════════

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { jwtDecode } from "jwt-decode";
import { signalBus } from "@/shared/lib/advisor-engine/signal-bus";

// ── Types ──

import type { UserRole } from "@/shared/types/permissions";
export type { UserRole };

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  familyId: string | null;
  familyName: string | null;
  tier: string | null;
  avatar: string | null;
}

interface TokenPayload {
  sub: string;
  role: string;
  name: string;
  family_id: string | null;
  exp: number;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  loginTimestamp: number | null;

  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (...roles: UserRole[]) => boolean;
  devBypass: () => void;
}

// ── Helpers ──

function normalizeRole(role: string): UserRole {
  const upper = role.toUpperCase();
  if (["SOCIO", "STAFF", "ADMIN", "JUNTA"].includes(upper)) {
    return upper as UserRole;
  }
  return "SOCIO";
}

// ── Store ──

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      loginTimestamp: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.detail || "Credenciales inválidas");
          }

          const data = await res.json();

          // Backend: { status, message, tokens: { access_token, refresh_token }, user: { id, name, email, role, family_id } }
          const tokens = data.tokens;
          const userData = data.user;

          set({
            user: {
              id: userData.id,
              name: userData.name,
              email: userData.email,
              role: normalizeRole(userData.role),
              familyId: userData.family_id,
              familyName: null,
              tier: null,
              avatar: null,
            },
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            loginTimestamp: Date.now(),
          });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : "Error de conexión",
            isLoading: false,
          });
        }
      },

      logout: () => {
        // Clear cross-domain signal bus — prevent stale signals
        // from leaking into the next session
        signalBus.clear();
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
          loginTimestamp: null,
        });
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          get().logout();
          return;
        }

        try {
          const res = await fetch("/api/auth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });

          if (!res.ok) {
            get().logout();
            return;
          }

          const data = await res.json();

          // Backend: { status, tokens: { access_token, refresh_token } }
          const tokens = data.tokens;
          const decoded = jwtDecode<TokenPayload>(tokens.access_token);

          set((state) => ({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token || state.refreshToken,
            user: state.user
              ? { ...state.user, role: normalizeRole(decoded.role) }
              : null,
          }));
        } catch {
          get().logout();
        }
      },

      hasPermission: (_permission: string) => {
        const { user } = get();
        if (!user) return false;
        if (user.role === "ADMIN") return true;
        return false;
      },

      hasRole: (...roles: UserRole[]) => {
        const { user } = get();
        if (!user) return false;
        return roles.includes(user.role);
      },

      // TEMPORAL: bypass para desarrollo sin backend
      devBypass: () => {
        set({
          user: {
            id: "dev-001",
            name: "Admin Dev",
            email: "admin@castillo.cr",
            role: "ADMIN",
            familyId: null,
            familyName: null,
            tier: null,
            avatar: null,
          },
          accessToken: "dev-token-no-real",
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          loginTimestamp: Date.now(),
        });
      },
    }),
    {
      name: "castillo-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        loginTimestamp: state.loginTimestamp,
      }),
    },
  ),
);
