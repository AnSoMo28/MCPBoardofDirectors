// src/shared/hooks/useKeyboardNav.ts
// ═══════════════════════════════════════════════════════════
// Keyboard Navigation — Go-To shortcuts (GitHub-style)
//
// Pattern: press G, then within 800ms press the target key.
// Example: G → D = navigate to Dashboard
//
// Only active shortcuts for user's current role.
// Disabled when focus is on input/textarea/select/contentEditable.
//
// Rules: #11 a11y (doesn't interfere with text input)
// ═══════════════════════════════════════════════════════════

import { useEffect, useRef, useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { useAuthStore, type UserRole } from "@/stores/auth.store";

interface KeyBinding {
  key: string;
  route: string;
  label: string;
  roles: UserRole[];
}

const BINDINGS: KeyBinding[] = [
  { key: "d", route: "/admin/dashboard", label: "Dashboard", roles: ["ADMIN"] },
  { key: "f", route: "/admin/families", label: "Familias", roles: ["ADMIN", "STAFF"] },
  { key: "e", route: "/admin/events", label: "Eventos", roles: ["ADMIN", "STAFF"] },
  { key: "z", route: "/admin/finance", label: "Finanzas", roles: ["ADMIN"] },
  { key: "a", route: "/admin/approvals", label: "Aprobaciones", roles: ["ADMIN"] },
  { key: "c", route: "/admin/communications", label: "Comunicaciones", roles: ["ADMIN"] },
  { key: "g", route: "/admin/engagement", label: "Engagement", roles: ["ADMIN"] },
  { key: "r", route: "/admin/facilities", label: "Instalaciones", roles: ["ADMIN", "STAFF"] },
  { key: "h", route: "/operaciones/checkin", label: "Check-in", roles: ["STAFF"] },
  { key: "o", route: "/operaciones/centro-operaciones", label: "Operaciones", roles: ["STAFF", "ADMIN"] },
  { key: "m", route: "/mi-club", label: "Mi Club", roles: ["SOCIO"] },
  { key: "j", route: "/junta/dashboard", label: "Junta", roles: ["JUNTA"] },
];

const WINDOW_MS = 800; // ms to wait for second key

export function useKeyboardNav() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const pendingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [helpOpen, setHelpOpen] = useState(false);

  const isInputFocused = useCallback((): boolean => {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    if (el.getAttribute("contenteditable") === "true") return true;
    // Check if inside CommandPalette or search
    if (el.closest("[data-command-palette]")) return true;
    return false;
  }, []);

  useEffect(() => {
    if (!role) return;

    const activeBindings = BINDINGS.filter((b) => b.roles.includes(role));

    const handler = (e: KeyboardEvent) => {
      // Ignore if modifier keys pressed
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Ignore if typing in input
      if (isInputFocused()) return;

      const key = e.key.toLowerCase();

      if (pendingRef.current) {
        // Second key — check for match
        clearTimeout(timerRef.current);
        pendingRef.current = false;

        const match = activeBindings.find((b) => b.key === key);
        if (match) {
          e.preventDefault();
          navigate(match.route);
        }
      } else if (key === "g") {
        // First key — start window
        pendingRef.current = true;
        timerRef.current = setTimeout(() => {
          pendingRef.current = false;
        }, WINDOW_MS);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [role, navigate, isInputFocused]);

  /* ── ? key for help modal ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isInputFocused()) return;
      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isInputFocused]);

  return { helpOpen, closeHelp: () => setHelpOpen(false) };
}
