// src/shared/components/layout/MobileNav.tsx
// ═══════════════════════════════════════════════════════════
// Mobile Bottom Navigation — Castillo Country Club
//
// Shows on mobile only (lg:hidden). Fixed at bottom.
// Displays 4 primary items per role + "More" button
// that opens the full sidebar drawer.
//
// Active state uses same startsWith logic as Sidebar.
// Safe-area padding for iOS notch/home indicator.
//
// Rules: #1 tokens, #11 a11y, #12 touch (44px min), #20 breakpoint
// ═══════════════════════════════════════════════════════════

import { Link, useLocation } from "react-router";
import {
  LayoutDashboard, Users, Calendar, DollarSign,
  Home, Building2, UserCheck, FileText, MoreHorizontal,
  Activity, TrendingUp,
} from "lucide-react";
import type { ReactNode } from "react";
import { useAuthStore, type UserRole } from "@/stores/auth.store";
import { useSidebarStore } from "@/stores/sidebar.store";
import { prefetchRoute } from "@/shared/lib/routePrefetch";
import { cn } from "@/shared/lib/utils";
import './MobileNav.css';

interface MobileNavItem {
  label: string;
  path: string;
  icon: ReactNode;
  roles: UserRole[];
}

// ── 4 primary items per role section ──

const MOBILE_NAV: MobileNavItem[] = [
  // Admin
  { label: "Dashboard", path: "/admin/dashboard", icon: <LayoutDashboard size={20} strokeWidth={1.5} />, roles: ["ADMIN"] },
  { label: "Familias", path: "/admin/families", icon: <Users size={20} strokeWidth={1.5} />, roles: ["ADMIN"] },
  { label: "Eventos", path: "/admin/events", icon: <Calendar size={20} strokeWidth={1.5} />, roles: ["ADMIN"] },
  { label: "Finanzas", path: "/admin/finance", icon: <DollarSign size={20} strokeWidth={1.5} />, roles: ["ADMIN"] },

  // Staff
  { label: "Check-in", path: "/operaciones/checkin", icon: <UserCheck size={20} strokeWidth={1.5} />, roles: ["STAFF"] },
  { label: "Reservas", path: "/operaciones/reservas", icon: <Calendar size={20} strokeWidth={1.5} />, roles: ["STAFF"] },
  { label: "Familias", path: "/admin/families", icon: <Users size={20} strokeWidth={1.5} />, roles: ["STAFF"] },
  { label: "Operaciones", path: "/operaciones/centro-operaciones", icon: <Activity size={20} strokeWidth={1.5} />, roles: ["STAFF"] },

  // Socio
  { label: "Inicio", path: "/mi-club", icon: <Home size={20} strokeWidth={1.5} />, roles: ["SOCIO"] },
  { label: "Eventos", path: "/mi-club/eventos", icon: <Calendar size={20} strokeWidth={1.5} />, roles: ["SOCIO"] },
  { label: "Reservas", path: "/mi-club/reservas", icon: <Building2 size={20} strokeWidth={1.5} />, roles: ["SOCIO"] },
  { label: "Cuenta", path: "/mi-club/cuenta", icon: <DollarSign size={20} strokeWidth={1.5} />, roles: ["SOCIO"] },

  // Junta
  { label: "Dashboard", path: "/junta/dashboard", icon: <LayoutDashboard size={20} strokeWidth={1.5} />, roles: ["JUNTA"] },
  { label: "Reportes", path: "/junta/reportes", icon: <FileText size={20} strokeWidth={1.5} />, roles: ["JUNTA"] },
  { label: "Estrategia", path: "/junta/estrategia", icon: <TrendingUp size={20} strokeWidth={1.5} />, roles: ["JUNTA"] },
  { label: "Conocimiento", path: "/admin/documents/knowledge", icon: <FileText size={20} strokeWidth={1.5} />, roles: ["JUNTA"] },
];

// ── Component ──
export function MobileNav() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const { toggleMobile } = useSidebarStore();

  if (!user) return null;

  const items = MOBILE_NAV.filter((item) => item.roles.includes(user.role));

  return (
    <nav
      className="mobile-nav lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-mobile-nav"
      aria-label="Navegación móvil"
    >
      <div className="flex items-stretch justify-around">
        {items.map((item) => {
          const active =
            location.pathname === item.path ||
            location.pathname.startsWith(item.path + "/");

          return (
            <Link
              key={item.path}
              to={item.path}
              onMouseEnter={() => prefetchRoute(item.path)}
              className={cn(
                "mobile-nav-item",
                active && "mobile-nav-item--active",
              )}
              aria-current={active ? "page" : undefined}
            >
              {active && <span className="mobile-nav-item__indicator" />}
              <span className="mobile-nav-item__icon">{item.icon}</span>
              <span className="mobile-nav-item__label">{item.label}</span>
            </Link>
          );
        })}

        {/* "More" button — opens sidebar drawer */}
        <button
          type="button"
          onClick={toggleMobile}
          className="mobile-nav-item"
          aria-label="Abrir menú completo"
        >
          <MoreHorizontal size={20} strokeWidth={1.5} className="mobile-nav-item__icon" />
          <span className="mobile-nav-item__label">Menú</span>
        </button>
      </div>
    </nav>
  );
}