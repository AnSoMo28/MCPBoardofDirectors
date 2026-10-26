// src/shared/components/layout/Sidebar.tsx
// ═══════════════════════════════════════════════════════════
// CASTILLO — Sidebar (Silver Tide)
//
// Signature layout: Logo → Avatar → Nav → Footer
// MarbleCanvas as background (z-0)
// Glass overlay SIN backdrop-filter (z-1)
// Content (z-2)
//
// REWRITE: Inline styles → CSS classes + Tailwind
// Hover via onMouseEnter/Leave → CSS :hover
// All visual values preserved exactly.
// ═══════════════════════════════════════════════════════════

import { useRef, useState, type ChangeEvent } from "react";
import { Link, useLocation } from "react-router";
import { useAuthStore, type UserRole } from "@/stores/auth.store";
import { useSidebarStore } from "@/stores/sidebar.store";
import { useThemeStore } from "@/stores/theme.store";
import { useGlobalStatus } from "@/shared/hooks/useGlobalStatus";
import { useInsightCounts } from "@/shared/hooks/useInsightCounts";
import { prefetchRoute } from "@/shared/lib/routePrefetch";
import { cn, roleLabel } from "@/shared/lib/utils";
import {
  LayoutDashboard, Users, Calendar, Building2, DollarSign,
  MessageSquare, Heart, FileText, ClipboardCheck, Settings,
  LogOut, ChevronLeft, ChevronRight, Sun, Moon, X, Home,
  UserCheck, Shield, TrendingUp, BookOpen, Camera, Brain,
  Activity, Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import MarbleCanvas from "./MarbleCanvas";
import AvatarAura from "./AvatarAura";

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
  roles: UserRole[];
  sectionBefore?: { id: string; label: string };
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/admin/dashboard", icon: <LayoutDashboard size={15} strokeWidth={1.2} />, roles: ["ADMIN"] },
  { label: "Familias", path: "/admin/families", icon: <Users size={15} strokeWidth={1.2} />, roles: ["ADMIN", "STAFF"] },
  { label: "Grupos Etarios", path: "/admin/age-groups", icon: <Users size={15} strokeWidth={1.2} />, roles: ["ADMIN", "STAFF"] },
  { label: "Eventos", path: "/admin/events", icon: <Calendar size={15} strokeWidth={1.2} />, roles: ["ADMIN", "STAFF"] },
  { label: "Deportes", path: "/admin/sports", icon: <Activity size={15} strokeWidth={1.2} />, roles: ["ADMIN", "STAFF"] },
  { label: "Cultural", path: "/admin/cultural", icon: <Sparkles size={15} strokeWidth={1.2} />, roles: ["ADMIN", "STAFF"] },
  { label: "Instalaciones", path: "/admin/facilities", icon: <Building2 size={15} strokeWidth={1.2} />, roles: ["ADMIN", "STAFF"] },
  { label: "Gestión Instalaciones", path: "/admin/facilities-management", icon: <Settings size={15} strokeWidth={1.2} />, roles: ["ADMIN", "STAFF"] },
  { label: "Wellness", path: "/admin/wellness", icon: <Activity size={15} strokeWidth={1.2} />, roles: ["ADMIN"] },
  { label: "Finanzas", path: "/admin/finance", icon: <DollarSign size={15} strokeWidth={1.2} />, roles: ["ADMIN"] },
  { label: "Comunicaciones", path: "/admin/communications", icon: <MessageSquare size={15} strokeWidth={1.2} />, roles: ["ADMIN"] },
  { label: "Engagement", path: "/admin/engagement", icon: <Heart size={15} strokeWidth={1.2} />, roles: ["ADMIN"] },
  { label: "Invitados", path: "/admin/guests", icon: <UserCheck size={15} strokeWidth={1.2} />, roles: ["ADMIN", "STAFF"] },
  { label: "Recomendaciones", path: "/admin/recommendations", icon: <Sparkles size={15} strokeWidth={1.2} />, roles: ["ADMIN"] },
  { label: "Inteligencia", path: "/admin/members/intelligence", icon: <Brain size={15} strokeWidth={1.2} />, roles: ["ADMIN"] },
  { label: "ML Intelligence", path: "/admin/ml", icon: <Brain size={15} strokeWidth={1.2} />, roles: ["ADMIN", "JUNTA"] },
  { label: "Documentos", path: "/admin/documents", icon: <FileText size={15} strokeWidth={1.2} />, roles: ["ADMIN"] },
  { label: "Conocimiento", path: "/admin/documents/knowledge", icon: <BookOpen size={15} strokeWidth={1.2} />, roles: ["ADMIN", "STAFF", "JUNTA"] },
  { label: "Aprobaciones", path: "/admin/approvals", icon: <ClipboardCheck size={15} strokeWidth={1.2} />, roles: ["ADMIN"] },
  {
    label: "Sistema AI",
    path: "/admin/ai-system",
    icon: <Brain size={15} strokeWidth={1.2} />,
    roles: ["ADMIN"],
    sectionBefore: { id: "ai-system", label: "Inteligencia" },
  },
  { label: "Mi Club", path: "/mi-club", icon: <Home size={15} strokeWidth={1.2} />, roles: ["SOCIO"] },
  { label: "Mi Familia", path: "/mi-club/familia", icon: <Users size={15} strokeWidth={1.2} />, roles: ["SOCIO"] },
  { label: "Eventos", path: "/mi-club/eventos", icon: <Calendar size={15} strokeWidth={1.2} />, roles: ["SOCIO"] },
  { label: "Mis Reservas", path: "/mi-club/reservas", icon: <Building2 size={15} strokeWidth={1.2} />, roles: ["SOCIO"] },
  { label: "Mi Cuenta", path: "/mi-club/cuenta", icon: <DollarSign size={15} strokeWidth={1.2} />, roles: ["SOCIO"] },
  { label: "Check-in", path: "/operaciones/checkin", icon: <UserCheck size={15} strokeWidth={1.2} />, roles: ["STAFF"] },
  { label: "Reservas Hoy", path: "/operaciones/reservas", icon: <Calendar size={15} strokeWidth={1.2} />, roles: ["STAFF"] },
  { label: "Mantenimiento", path: "/operaciones/mantenimiento", icon: <Settings size={15} strokeWidth={1.2} />, roles: ["STAFF"] },
  { label: "Centro Operaciones", path: "/operaciones/centro-operaciones", icon: <Activity size={15} strokeWidth={1.2} />, roles: ["STAFF", "ADMIN"] },
  { label: "Dashboard", path: "/junta/dashboard", icon: <LayoutDashboard size={15} strokeWidth={1.2} />, roles: ["JUNTA"] },
  { label: "Board Reports", path: "/junta/reportes", icon: <FileText size={15} strokeWidth={1.2} />, roles: ["JUNTA"] },
  { label: "Estrategia", path: "/junta/estrategia", icon: <TrendingUp size={15} strokeWidth={1.2} />, roles: ["JUNTA"] },
];

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { isCollapsed, isMobileOpen, toggleCollapse, closeMobile } = useSidebarStore();
  const { theme, toggleTheme } = useThemeStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const { pendingApprovals, todayEvents } = useGlobalStatus();
  const insightCounts = useInsightCounts();

  const onAvatarUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLocalAvatar(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  if (!user) return null;

  const navItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role));
  const avatarSrc = localAvatar || user.avatar;

  /* ── Badge map (path → count) ── */
  const badgeMap: Record<string, { count: number; color: string }> = {};
  if (pendingApprovals > 0) {
    badgeMap["/admin/approvals"] = { count: pendingApprovals, color: "var(--color-amber-400)" };
  }
  if (todayEvents > 0) {
    badgeMap["/admin/events"] = { count: todayEvents, color: "var(--color-teal-400)" };
    badgeMap["/operaciones/reservas"] = { count: todayEvents, color: "var(--color-teal-400)" };
  }
  for (const [route, entry] of Object.entries(insightCounts)) {
    if (!badgeMap[route]) badgeMap[route] = entry;
  }

  return (
    <>
      {/* ── Mobile backdrop ── */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-screen z-50 flex flex-col overflow-hidden",
          "border-r border-r-white/[0.07]",
          "shadow-[4px_0_24px_rgba(0,0,0,0.4)]",
          isCollapsed ? "w-[72px]" : "w-[280px]",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
        style={{
          minWidth: isCollapsed ? 0 : 280,
          transition:
            "width 0.5s var(--ease-apple), min-width 0.5s var(--ease-apple), opacity 0.4s ease, transform 0.5s var(--ease-apple)",
        }}
      >
        {/* ── z-0: Marble canvas (animated veins) ── */}
        <MarbleCanvas />

        {/* ── z-1: Dark tint overlay — NO backdrop-filter ── */}
        <div className="sidebar-overlay" aria-hidden="true" />

        {/* ── z-2: Content ── */}
        <div
          className="sidebar-content"
          style={{ padding: isCollapsed ? "28px 12px" : "28px 20px" }}
        >
          {/* ════════════════════════════════════
              LOGO + HEADER
              ════════════════════════════════════ */}
          <div
            className="flex items-center gap-3"
            style={{ paddingBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="castillo-logo">
              <Shield size={20} strokeWidth={1.5} className="text-[#080B12]" />
            </div>

            {!isCollapsed && (
              <div className="min-w-0">
                <h1
                  className="font-[family-name:var(--font-display)] font-semibold text-[var(--color-silver-100)] truncate"
                  style={{ fontSize: 16, letterSpacing: "0.06em", lineHeight: 1.2 }}
                >
                  Castillo
                </h1>
                <p
                  className="font-[family-name:var(--font-ui)]"
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "var(--color-gold-300)",
                    marginTop: 3,
                    opacity: 0.8,
                  }}
                >
                  Country Club
                </p>
              </div>
            )}

            <button
              onClick={closeMobile}
              className="ml-auto lg:hidden p-1 rounded hover:bg-white/10 transition-colors"
              aria-label="Cerrar"
            >
              <X size={20} className="text-[var(--color-silver-300)]" />
            </button>
          </div>

          {/* ════════════════════════════════════
              AVATAR SECTION
              ════════════════════════════════════ */}
          {!isCollapsed && (
            <div
              className="flex flex-col items-center"
              style={{ paddingBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 22 }}
            >
              {/* Aura + Avatar */}
              <div className="relative" style={{ width: 88, height: 88, marginBottom: 12 }}>
                <AvatarAura size={124} avatarSize={88} />
                <div
                  className="sidebar-avatar-wrap relative z-10 rounded-full overflow-hidden flex items-center justify-center cursor-pointer"
                  style={{
                    width: 88,
                    height: 88,
                    border: "1.5px solid rgba(201,169,110,0.55)",
                    background: "linear-gradient(135deg, rgba(40,52,70,0.8), rgba(20,28,42,0.9))",
                    boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 8px 28px rgba(0,0,0,0.5)",
                  }}
                  onClick={() => fileRef.current?.click()}
                  title="Subir foto"
                >
                  {avatarSrc ? (
                    <img src={avatarSrc} alt={user.name} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <svg viewBox="0 0 40 40" fill="none" style={{ width: 40, height: 40, opacity: 0.4 }}>
                      <circle cx="20" cy="14" r="7" stroke="rgba(180,200,220,0.7)" strokeWidth="1.2" />
                      <path d="M5 37C5 28 35 28 35 37" stroke="rgba(180,200,220,0.7)" strokeWidth="1.2" fill="none" />
                    </svg>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatarUpload} />
              </div>

              {/* Name */}
              <p
                className="font-[family-name:var(--font-ui)] text-[var(--color-silver-100)]"
                style={{ fontSize: 14, letterSpacing: "0.07em", marginBottom: 2 }}
              >
                {user.name}
              </p>

              {/* Role */}
              <p
                className="font-[family-name:var(--font-ui)]"
                style={{
                  fontSize: 9,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--color-gold-300)",
                  opacity: 0.8,
                  marginBottom: 4,
                }}
              >
                {roleLabel(user.role)}
              </p>

              {/* Upload button */}
              <button
                onClick={() => fileRef.current?.click()}
                className="sidebar-upload-btn mt-1"
              >
                <Camera size={11} strokeWidth={1.5} />
                Subir Foto
              </button>
            </div>
          )}

          {/* Collapsed avatar */}
          {isCollapsed && (
            <div className="flex justify-center py-4">
              <div
                className="rounded-full flex items-center justify-center overflow-hidden"
                style={{
                  width: 36,
                  height: 36,
                  border: "1.5px solid rgba(201,169,110,0.55)",
                  background: "var(--color-gold-400)",
                }}
              >
                {avatarSrc ? (
                  <img src={avatarSrc} alt={user.name} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <span className="text-sm font-semibold text-[#080B12]">
                    {user.name.charAt(0)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════
              NAVIGATION
              ════════════════════════════════════ */}
          <nav
            className="sidebar-nav-scroll flex-1 overflow-y-auto"
            style={{ paddingTop: 4, paddingBottom: 8 }}
          >
            {!isCollapsed && (
              <div className="sidebar-section-label" style={{ margin: "16px 0 8px", paddingLeft: 2 }}>
                Club
              </div>
            )}

            <ul className="flex flex-col" style={{ gap: 2 }}>
              {navItems.map((item) => {
                const active =
                  location.pathname === item.path ||
                  location.pathname.startsWith(item.path + "/");

                return (
                  <li key={item.path}>
                    {/* Section divider + label */}
                    {item.sectionBefore && (
                      <>
                        <div
                          className="mx-2"
                          style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "10px 0 6px" }}
                        />
                        {!isCollapsed && (
                          <div className="sidebar-section-label" style={{ margin: "0 0 6px", paddingLeft: 2 }}>
                            {item.sectionBefore.label}
                          </div>
                        )}
                      </>
                    )}

                    <Link
                      to={item.path}
                      onClick={closeMobile}
                      onMouseEnter={() => prefetchRoute(item.path)}
                      className={cn(
                        "sidebar-link group",
                        isCollapsed && "sidebar-link--collapsed",
                        active && "sidebar-link--active",
                      )}
                    >
                      <span
                        className="relative flex-shrink-0 flex"
                        style={{ opacity: active ? 1 : 0.65 }}
                      >
                        {item.icon}
                        {/* Collapsed tooltip */}
                        {isCollapsed && (
                          <span className="sidebar-tooltip">
                            {item.label}
                          </span>
                        )}
                      </span>

                      {!isCollapsed && (
                        <span
                          className="truncate"
                          style={{ opacity: active ? 1 : 0.85 }}
                        >
                          {item.label}
                        </span>
                      )}

                      {/* Badge — expanded */}
                      {!isCollapsed && badgeMap[item.path] && (
                        <span
                          className="ml-auto px-1.5 py-0.5 rounded-full text-[9px] font-bold font-[family-name:var(--font-mono)] leading-none"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${badgeMap[item.path].color} 15%, transparent)`,
                            color: badgeMap[item.path].color,
                          }}
                        >
                          {badgeMap[item.path].count}
                        </span>
                      )}

                      {/* Badge — collapsed (dot) */}
                      {isCollapsed && badgeMap[item.path] && (
                        <span
                          className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-[var(--color-abyss)] font-[family-name:var(--font-mono)]"
                          style={{ backgroundColor: badgeMap[item.path].color }}
                        >
                          {badgeMap[item.path].count}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* ════════════════════════════════════
              FOOTER
              ════════════════════════════════════ */}
          <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 16 }}>
            <button
              onClick={toggleTheme}
              className={cn("sidebar-link w-full", isCollapsed && "sidebar-link--collapsed")}
            >
              {theme === "light" ? (
                <Moon size={15} strokeWidth={1.2} style={{ opacity: 0.65 }} />
              ) : (
                <Sun size={15} strokeWidth={1.2} style={{ opacity: 0.65 }} />
              )}
              {!isCollapsed && <span>{theme === "light" ? "Modo oscuro" : "Modo claro"}</span>}
            </button>

            <button
              onClick={logout}
              className={cn("sidebar-link w-full mt-0.5", isCollapsed && "sidebar-link--collapsed")}
            >
              <LogOut size={15} strokeWidth={1.2} style={{ opacity: 0.65 }} />
              {!isCollapsed && <span>Salir</span>}
            </button>
          </div>

          {/* ── Collapse toggle ── */}
          <button
            onClick={toggleCollapse}
            className={cn(
              "hidden lg:flex absolute -right-3 top-20 w-6 h-6 rounded-full items-center justify-center",
              "bg-[var(--color-surface-1)] border border-white/[0.10]",
              "text-[var(--color-silver-400)] hover:text-[var(--color-gold-200)] hover:border-[var(--color-gold-300)]",
              "transition-colors",
              "shadow-[0_2px_8px_rgba(0,0,0,0.3)]",
            )}
            aria-label={isCollapsed ? "Expandir" : "Colapsar"}
          >
            {isCollapsed ? (
              <ChevronRight size={14} strokeWidth={1.3} />
            ) : (
              <ChevronLeft size={14} strokeWidth={1.3} />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}