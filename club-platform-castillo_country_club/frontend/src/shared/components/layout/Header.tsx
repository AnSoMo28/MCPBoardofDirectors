// src/shared/components/layout/Header.tsx
// Sprint 12A + 11F — NotificationDropdown + CommandPalette trigger
// Glass bar translúcida sobre el WebGL.
// A/B Patch: inline styles → CSS class
// ═══════════════════════════════════════════════════════════

import { useLocation } from "react-router";
import { useAuthStore } from "@/stores/auth.store";
import { useSidebarStore } from "@/stores/sidebar.store";
import { getGreeting } from "@/shared/lib/utils";
import { NotificationCenter } from "./NotificationCenter";
import { Menu, Search } from "lucide-react";

export function Header() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const toggleMobile = useSidebarStore((s) => s.toggleMobile);

  const segments = location.pathname
    .split("/")
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));

  return (
    <header className="glass-header h-16 flex items-center justify-between px-4 sm:px-6">
      {/* Left: mobile menu + breadcrumbs */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <button
          onClick={toggleMobile}
          className="lg:hidden p-2 rounded-lg hover:bg-[var(--color-surface-3)] transition-colors flex-shrink-0"
          aria-label="Abrir menú"
        >
          <Menu size={20} strokeWidth={1.5} className="text-[var(--color-silver-100)]" />
        </button>

        <nav className="flex items-center gap-2 text-sm font-[family-name:var(--font-ui)] min-w-0 overflow-hidden">
          <span className="header-brand flex-shrink-0">
            Castillo
          </span>
          {segments.map((seg, i) => (
            <span key={i} className="flex items-center gap-2 flex-shrink-0">
              <span className="text-white/[0.15]">/</span>
              <span
                className={
                  i === segments.length - 1
                    ? "text-[var(--color-silver-100)] font-medium truncate"
                    : "text-[var(--color-silver-400)] truncate hidden sm:inline"
                }
              >
                {seg}
              </span>
            </span>
          ))}
        </nav>
      </div>

      {/* Right: search + notifications + greeting */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Search trigger — desktop */}
        <button
          onClick={() => {
            window.dispatchEvent(
              new KeyboardEvent("keydown", { key: "k", metaKey: true }),
            );
          }}
          className="glass-header-search hidden sm:flex"
          aria-label="Búsqueda rápida (Cmd+K)"
        >
          <Search size={16} strokeWidth={1.5} className="text-[var(--color-silver-400)]" />
          <span className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
            Buscar...
          </span>
          <kbd className="hidden lg:inline-flex px-1.5 py-0.5 rounded text-[10px] font-[family-name:var(--font-mono)] text-[var(--color-silver-500)] bg-white/[0.04] border border-white/[0.06]">
            ⌘K
          </kbd>
        </button>

        {/* Mobile search — icon only */}
        <button
          onClick={() => {
            window.dispatchEvent(
              new KeyboardEvent("keydown", { key: "k", metaKey: true }),
            );
          }}
          className="sm:hidden p-2 rounded-lg hover:bg-[var(--color-surface-3)] transition-colors"
          aria-label="Búsqueda rápida"
        >
          <Search size={18} strokeWidth={1.5} className="text-[var(--color-silver-400)]" />
        </button>

        {/* Notifications */}
        <NotificationCenter />

        {/* Greeting */}
        <div className="hidden md:block text-right ml-2">
          <p className="text-sm font-medium text-[var(--color-silver-100)] font-[family-name:var(--font-ui)]">
            {getGreeting()}, {user?.name?.split(" ")[0]}
          </p>
          <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
            {new Date().toLocaleDateString("es-CR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
      </div>
    </header>
  );
}