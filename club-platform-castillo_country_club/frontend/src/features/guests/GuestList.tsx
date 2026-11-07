// ═══════════════════════════════════════════════════════════
// src/features/guests/GuestList.tsx
// Phase 34 "The Gateway" — Guest List Page (Rewrite)
// Level 6+ Agency · Production Grade
//
// Tab-based guest management page:
//   Tab 1: Today's guests (auto-refresh 60s) with status filter
//   Tab 2: Trial memberships with pagination
//
// Checkout mutation for guest departure.
// Summary stats from MCP.
//
// Original: framer-motion + cn() + Tailwind + inline colors
//   → CSS animations + BEM + data-*
// Checklist: TSX-1-39, CSS-1-40
//
// PRE-WRITURE VERIFICATION:
//   GuestListResponse { total(number),
//     checkins(GuestCheckIn[]) }                          ← ./types ✅
//   GuestCheckIn { id, guest_name, host_family_name,
//     facility_name, check_in_time, status }              ← ./types (by usage) ✅
//   GuestTodaySummary { currently_present, total_expected,
//     departed, by_facility(Array<{count}>) }             ← ./types (by usage) ✅
//   TrialListResponse { trials(TrialMembership[]), total,
//     conversion_rate, active_count }                     ← ./types (by usage) ✅
//   TrialMembership { id, guest_name, host_family_name,
//     trial_type_label, start_date, end_date, status,
//     activities_attended, conversion_probability }       ← ./types (by usage) ✅
//   GUEST_STATUS_CONFIG → Record<string, {label,color,
//     bgColor}>                                           ← ./types (by usage) ✅
//   TRIAL_STATUS_CONFIG → same shape                      ← ./types (by usage) ✅
//
// ANTI-PATTERNS REMOVED: framer-motion, cn(), Tailwind,
//   inline color styles, useReducedMotion + framer pattern,
//   className prop on Card
// ═══════════════════════════════════════════════════════════

import { useState } from "react";
import { useNavigate } from "react-router";
import { keepPreviousData } from "@tanstack/react-query";

import {
  Users,
  UserCheck,
  UserX,
  Clock,
  MapPin,
  ArrowRight,
  Sparkles,
  Calendar,
  UserPlus,
} from "lucide-react";

import { PageContainer } from "@/shared/components/layout/PageContainer";
import { Button } from "@/shared/components/ui/Button";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { EmptyState, FilterDropdown, showToast } from "@/shared/components/ui";
import { useMCPQuery, useMCPMutation } from "@/shared/hooks/useMCPQuery";
import { timeAgo } from "@/shared/lib/utils";

import {
  type GuestListResponse,
  type GuestTodaySummary,
  GUEST_STATUS_CONFIG,
  TRIAL_STATUS_CONFIG,
} from "./types";

import "./GuestList.css";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

type Tab = "today" | "trials";

/**
 * P2-C3g #9 — envelope + item de manage_trial_memberships(action="list").
 * Backend (guest_management_agent.py, rama list): { status, message, trial_memberships[] }
 * — sin total/conversion_rate/active_count y sin paginacion server-side (E3/E4).
 * Campos FE-only no vienen del backend → opcionales (degradacion documentada, deuda C3h).
 */
interface TrialListEnvelope {
  status: string;
  message?: string;
  trial_memberships?: BackendTrialItem[];
}

interface BackendTrialItem {
  id: string;
  guest_name: string;
  trial_type: string;
  start_date: string;
  end_date: string;
  status: string;
  /** FE-only — el modelo backend (13 campos) no los envia. */
  host_family_name?: string;
  trial_type_label?: string;
  activities_attended?: number;
  conversion_probability?: number | null;
}

// ═══════════════════════════════════════════════════════════
// §2 — CONSTANTS
// ═══════════════════════════════════════════════════════════

const STATUS_OPTIONS = [
  { value: "active", label: "En el club" },
  { value: "departed", label: "Salió" },
  { value: "no_show", label: "No se presentó" },
] as const;

/** P2-C3g #9 — el backend no pagina el list de trials → paginacion client-side. */
const TRIALS_PAGE_SIZE = 10;

// ═══════════════════════════════════════════════════════════
// §3 — HELPERS
// ═══════════════════════════════════════════════════════════

/** Derive visual level from trial days remaining. */
function daysLevel(daysLeft: number): string {
  if (daysLeft <= 3) return "critical";
  if (daysLeft <= 7) return "attention";
  return "normal";
}

/** Derive visual level from conversion probability. */
function probabilityLevel(prob: number): string {
  if (prob >= 70) return "high";
  if (prob >= 40) return "medium";
  return "low";
}

/** Compute initials from full name. */
function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ═══════════════════════════════════════════════════════════
// §4 — COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * Guest List — tab-based guest management page.
 * Tab 1: Today's guests with real-time refresh and checkout.
 * Tab 2: Trial memberships with pagination and conversion stats.
 *
 * @example
 * <Route path="/guests" element={<GuestList />} />
 */
export default function GuestList() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("today");
  const [statusFilter, setStatusFilter] = useState("");
  const [trialPage, setTrialPage] = useState(1);

  // ── Queries ──
  const todayQ = useMCPQuery<GuestListResponse>(
    "guests",
    "get_today_guests",
    { ...(statusFilter ? { status: statusFilter } : {}) },
    { enabled: activeTab === "today", refetchInterval: 60_000 },
  );

  const summaryQ = useMCPQuery<GuestTodaySummary>(
    "guests",
    "get_today_summary",
    {},
    { enabled: activeTab === "today", refetchInterval: 60_000 },
  );

  const trialsQ = useMCPQuery<TrialListEnvelope>(
    "guests",
    "manage_trial_memberships",
    { action: "list" },
    { enabled: activeTab === "trials", placeholderData: keepPreviousData },
  );

  // ── Checkout mutation ──
  const checkoutMut = useMCPMutation<unknown, { checkin_id: string }>(
    "guests",
    "checkout_guest",
    {
      onSuccess: () => showToast({ type: "success", message: "Salida registrada" }),
      onError: (err) =>
        showToast({
          type: "error",
          message: err instanceof Error ? err.message : "Error al registrar salida",
        }),
    },
  );

  const handleCheckout = (checkinId: string) => {
    checkoutMut.mutate({ checkin_id: checkinId });
  };

  const stats = summaryQ.data;

  // ── P2-C3g #9 · adaptador client-side (deuda C3h: KPIs y paginacion en backend) ──
  const trials = trialsQ.data?.trial_memberships ?? [];
  const trialsTotal = trials.length;
  const activeTrials = trials.filter((t) => t.status === "active").length;
  const trialPages = Math.max(1, Math.ceil(trialsTotal / TRIALS_PAGE_SIZE));
  const currentTrialPage = Math.min(trialPage, trialPages);
  const pagedTrials = trials.slice(
    (currentTrialPage - 1) * TRIALS_PAGE_SIZE,
    currentTrialPage * TRIALS_PAGE_SIZE,
  );

  return (
    <PageContainer
      title="Invitados del Día"
      breadcrumbs={[
        { label: "Dashboard", href: "/admin/dashboard" },
        { label: "Invitados" },
      ]}
      subtitle={
        stats
          ? `${stats.currently_present} presentes · ${stats.total_expected} esperados`
          : undefined
      }
    >
      <div
        className="gst-list"
        role="region"
        aria-label="Gestión de invitados"
        data-testid="guest-list"
      >
        {/* ── Summary Stats ── */}
        <div className="gst-list__stats">
          {summaryQ.isLoading ? (
            <div className="gst-list__stats-loading">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`skel-stat-${i}`} className="gst-list__skeleton-stat">
                  <Skeleton className="gst-list__skeleton-inner" />
                </div>
              ))}
            </div>
          ) : stats ? (
            <div className="gst-list__stats-grid" data-count="4">
              {([
                { stat: "present", label: "Presentes", value: stats.currently_present, Icon: Users },
                { stat: "registered", label: "Registrados", value: stats.total_expected, Icon: UserCheck },
                { stat: "departed", label: "Salieron", value: stats.departed, Icon: UserX },
                {
                  stat: "facilities",
                  label: "Instalaciones",
                  value: stats.by_facility.filter((f) => f.count > 0).length,
                  Icon: MapPin,
                },
              ] as const).map((s) => (
                <div key={s.stat} className="gst-list__stat" data-stat={s.stat}>
                  <div className="gst-list__stat-info">
                    <p className="gst-list__stat-label">{s.label}</p>
                    <p className="gst-list__stat-value">{s.value}</p>
                  </div>
                  <div className="gst-list__stat-icon-wrap" data-stat={s.stat}>
                    <s.Icon className="gst-list__stat-icon" />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* ── Tab List ── */}
        <div
          className="gst-list__tabs"
          role="tablist"
          aria-label="Tipo de vista"
        >
          {([
            { key: "today" as Tab, label: "Invitados de Hoy", Icon: Clock, panelId: "panel-today" },
            { key: "trials" as Tab, label: "Membresías de Prueba", Icon: Sparkles, panelId: "panel-trials" },
          ]).map((tab) => (
            <button
              key={tab.key}
              id={`tab-${tab.key}`}
              className="gst-list__tab"
              data-active={activeTab === tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls={tab.panelId}
              tabIndex={activeTab === tab.key ? 0 : -1}
              onClick={() => setActiveTab(tab.key)}
            >
              <tab.Icon className="gst-list__tab-icon" />
              <span className="gst-list__tab-label">{tab.label}</span>
              {tab.key === "today" && stats && stats.currently_present > 0 && (
                <span className="gst-list__tab-badge">{stats.currently_present}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab Panels ── */}
        <div className="gst-list__panels">

          {/* ══ TODAY PANEL ══ */}
          {activeTab === "today" && (
            <div
              id="panel-today"
              className="gst-list__panel"
              data-panel="today"
              role="tabpanel"
              aria-labelledby="tab-today"
            >
              {/* Filter */}
              <div className="gst-list__filter-bar">
                <FilterDropdown
                  label="Estado"
                  value={statusFilter}
                  options={[...STATUS_OPTIONS]}
                  onChange={setStatusFilter}
                />
                {todayQ.data && (
                  <span className="gst-list__filter-count">
                    {todayQ.data.total} registros
                  </span>
                )}
              </div>

              {/* Loading */}
              {todayQ.isLoading && !todayQ.data && (
                <div className="gst-list__skeleton-list" role="status" aria-label="Cargando invitados">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={`skel-guest-${i}`} className="gst-list__skeleton-card">
                      <Skeleton className="gst-list__skeleton-inner" />
                    </div>
                  ))}
                </div>
              )}

              {/* Empty */}
              {!todayQ.isLoading && (!todayQ.data || todayQ.data.checkins.length === 0) && (
                <div className="gst-list__empty">
                  <EmptyState
                    title="Sin invitados hoy"
                    description="No se han registrado invitados para hoy."
                    action={
                      <Button
                        variant="primary"
                        onClick={() => navigate("/admin/operaciones/checkin")}
                        icon={<UserPlus className="w-4 h-4" />}
                      >
                        Registrar Invitado
                      </Button>
                    }
                  />
                </div>
              )}

              {/* Data */}
              {todayQ.data && todayQ.data.checkins.length > 0 && (
                <div className="gst-list__guest-list" role="list" aria-label="Invitados de hoy">
                  {todayQ.data.checkins.map((ci, i) => {
                    const stCfg = GUEST_STATUS_CONFIG[ci.status] ?? GUEST_STATUS_CONFIG.active;
                    return (
                      <div
                        key={ci.id}
                        className="gst-list__guest-card"
                        data-status={ci.status}
                        role="listitem"
                        style={{ "--stagger-i": i } as React.CSSProperties}
                      >
                        <div className="gst-list__guest-main">
                          <div className="gst-list__avatar" data-status={ci.status}>
                            <span className="gst-list__avatar-text">
                              {initials(ci.guest_name)}
                            </span>
                          </div>
                          <div className="gst-list__guest-info">
                            <p className="gst-list__guest-name">{ci.guest_name}</p>
                            <p className="gst-list__guest-host">
                              Invitado de {ci.host_family_name}
                            </p>
                          </div>
                        </div>

                        <div className="gst-list__guest-meta">
                          <span className="gst-list__meta-item">
                            <MapPin className="gst-list__meta-icon" />
                            {ci.facility_name}
                          </span>
                          <span className="gst-list__meta-item">
                            <Clock className="gst-list__meta-icon" />
                            {timeAgo(ci.check_in_time)}
                          </span>
                          <span
                            className="gst-list__status-badge"
                            data-status={ci.status}
                            style={{
                              "--badge-color": stCfg.color,
                              "--badge-bg": stCfg.bgColor,
                            } as React.CSSProperties}
                          >
                            {stCfg.label}
                          </span>
                          {ci.status === "active" && (
                            <Button
                              variant="ghost"
                              onClick={() => handleCheckout(ci.id)}
                              disabled={checkoutMut.isPending}
                              icon={<ArrowRight className="w-4 h-4" />}
                            >
                              Salida
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══ TRIALS PANEL ══ */}
          {activeTab === "trials" && (
            <div
              id="panel-trials"
              className="gst-list__panel"
              data-panel="trials"
              role="tabpanel"
              aria-labelledby="tab-trials"
            >
              {/* Loading */}
              {trialsQ.isLoading && !trialsQ.data && (
                <div className="gst-list__skeleton-list" role="status" aria-label="Cargando trials">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={`skel-trial-${i}`} className="gst-list__skeleton-card">
                      <Skeleton className="gst-list__skeleton-inner" />
                    </div>
                  ))}
                </div>
              )}

              {/* Empty */}
              {!trialsQ.isLoading && trials.length === 0 && (
                <div className="gst-list__empty">
                  <EmptyState
                    title="Sin membresías de prueba"
                    description="No hay trials activos o recientes."
                    icon={<Sparkles className="w-8 h-8" />}
                    action={
                      <Button
                        variant="secondary"
                        onClick={() => navigate("/admin/guests/register")}
                        icon={<UserPlus className="w-4 h-4" />}
                      >
                        Ofrecer Trial
                      </Button>
                    }
                  />
                </div>
              )}

              {/* Data */}
              {trialsQ.data && trials.length > 0 && (
                <>
                  {/* P2-C3g #9 · banner degradado — backend no expone conversion_rate (deuda C3h) */}
                  {activeTrials > 0 && (
                    <div className="gst-list__conversion-banner">
                      <Sparkles className="gst-list__conversion-icon" />
                      <div className="gst-list__conversion-info">
                        <p className="gst-list__conversion-active">
                          {activeTrials} trials activos
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="gst-list__trial-list" role="list" aria-label="Membresías de prueba">
                    {pagedTrials.map((trial, i) => {
                      const tCfg = TRIAL_STATUS_CONFIG[trial.status] ?? TRIAL_STATUS_CONFIG.active;
                      const daysLeft =
                        trial.status === "active"
                          ? Math.max(
                              0,
                              Math.ceil(
                                (new Date(trial.end_date).getTime() - Date.now()) / 86_400_000,
                              ),
                            )
                          : null;

                      return (
                        <div
                          key={trial.id}
                          className="gst-list__trial-card"
                          data-status={trial.status}
                          role="listitem"
                          style={{ "--stagger-i": i } as React.CSSProperties}
                        >
                          <div className="gst-list__trial-main">
                            <div className="gst-list__trial-header">
                              <p className="gst-list__trial-name">{trial.guest_name}</p>
                              <span
                                className="gst-list__status-badge"
                                data-status={trial.status}
                                style={{
                                  "--badge-color": tCfg.color,
                                  "--badge-bg": tCfg.bgColor,
                                } as React.CSSProperties}
                              >
                                {tCfg.label}
                              </span>
                            </div>

                            <p className="gst-list__trial-host">
                              Invitado por {trial.host_family_name ?? "—"} ·{" "}
                              {trial.trial_type_label ?? trial.trial_type}
                            </p>

                            <div className="gst-list__trial-meta">
                              <span className="gst-list__meta-item">
                                <Calendar className="gst-list__meta-icon" />
                                {new Date(trial.start_date).toLocaleDateString("es-CR", {
                                  day: "numeric",
                                  month: "short",
                                })}
                                {" → "}
                                {new Date(trial.end_date).toLocaleDateString("es-CR", {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </span>
                              {(trial.activities_attended ?? 0) > 0 && (
                                <span className="gst-list__meta-item">
                                  {trial.activities_attended ?? 0} actividades
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="gst-list__trial-aside">
                            {daysLeft !== null && (
                              <div className="gst-list__countdown" data-level={daysLevel(daysLeft)}>
                                <p className="gst-list__countdown-value">{daysLeft}</p>
                                <p className="gst-list__countdown-label">días restantes</p>
                              </div>
                            )}

                            {trial.conversion_probability != null && (
                              <div
                                className="gst-list__probability"
                                data-level={probabilityLevel(trial.conversion_probability)}
                              >
                                <p className="gst-list__probability-label">Prob. conversión</p>
                                <p className="gst-list__probability-value">
                                  {trial.conversion_probability}%
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {trialsTotal > TRIALS_PAGE_SIZE && (
                    <nav className="gst-list__pagination" aria-label="Paginación de trials">
                      <p className="gst-list__pagination-total">
                        {trialsTotal} membresías en total
                      </p>
                      <div className="gst-list__pagination-actions">
                        <Button
                          variant="ghost"
                          onClick={() => setTrialPage((p) => Math.max(1, p - 1))}
                          disabled={currentTrialPage === 1}
                        >
                          Anterior
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setTrialPage((p) => p + 1)}
                          disabled={currentTrialPage >= trialPages}
                        >
                          Siguiente
                        </Button>
                      </div>
                    </nav>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}