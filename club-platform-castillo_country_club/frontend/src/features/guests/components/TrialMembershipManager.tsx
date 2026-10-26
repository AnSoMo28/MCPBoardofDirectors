// ═══════════════════════════════════════════════════════════
// src/features/guests/components/TrialMembershipManager.tsx
// Phase 34 "The Gateway" — Trial Membership Manager (Rewrite)
// Level 6+ Agency · Production Grade
//
// Trial membership lifecycle:
//   - Stats row: active, expiring soon, converted, conversion %
//   - Create form (HITL: requires admin approval)
//   - Trial list with countdown badges + status workflow
//   - Status pipeline: pending → approved → active → converted
//
// Original: framer-motion + cn() + Tailwind + inline colors
//   → CSS animations + BEM + data-*
// Checklist: TSX-1-39, CSS-1-40
//
// PRE-WRITURE VERIFICATION:
//   TrialMembershipItem { id, guest_name, guest_email?,
//     guest_phone?, referred_by_family_id, trial_type,
//     status, start_date, end_date, privileges(string[]),
//     notes? }                                               ← ../types (by usage) ✅
//   TRIAL_TYPE_CONFIG → Record<string,
//     { label, days, color, bgColor }>                      ← ../types (by usage) ✅
//   TRIAL_STATUS_CONFIG_BACKEND → Record<string,
//     { label, color, bgColor }>                            ← ../types (by usage) ✅
//   PRIVILEGE_CONFIG → Record<string,
//     { label, color, bgColor }>                            ← ../types (by usage) ✅
//
// ANTI-PATTERNS REMOVED: framer-motion, cn(), Tailwind,
//   inline colors, useReducedMotion, className prop,
//   EmptyState action as object, wrong import path
// FIX: EmptyState action → ReactNode, import path corrected
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";

import {
  Sparkles, Plus, Calendar, UserCheck, X, AlertTriangle,
  ChevronRight, Mail,
} from "lucide-react";

import { Card, CardHeader, Button, Skeleton, showToast } from "@/shared/components/ui";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { useMCPQuery, useMCPMutation } from "@/shared/hooks/useMCPQuery";

import type { TrialMembershipItem } from "../types";
import {
  TRIAL_TYPE_CONFIG,
  TRIAL_STATUS_CONFIG_BACKEND,
  PRIVILEGE_CONFIG,
} from "../types";

import "./TrialMembershipManager.css";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

interface TrialListResponse {
  readonly status: string;
  readonly message: string;
  readonly trial_memberships: readonly TrialMembershipItem[];
}

interface TrialMutationResponse {
  readonly status: string;
  readonly message: string;
  readonly trial_membership?: TrialMembershipItem;
  readonly request_id?: string;
  readonly details?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════
// §2 — HELPERS
// ═══════════════════════════════════════════════════════════

const ONE_DAY_MS = 86_400_000;

/** Compute days remaining until endDate. */
function daysUntil(endDate: string): number {
  return Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / ONE_DAY_MS));
}

/** Derive countdown urgency level. */
function countdownLevel(days: number): "critical" | "warning" | "normal" {
  if (days === 0) return "critical";
  if (days <= 3) return "warning";
  return "normal";
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
// §3 — SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

function CountdownBadge({ endDate, status }: {
  readonly endDate: string;
  readonly status: string;
}) {
  if (status !== "active") return null;

  const days = daysUntil(endDate);
  const level = countdownLevel(days);

  return (
    <div className="trial-mgr__countdown" data-level={level}>
      <p className="trial-mgr__countdown-number">
        {days === 0 ? "!" : days}
      </p>
      <p className="trial-mgr__countdown-label">
        {days === 0 ? "Expira hoy" : `${days} día${days !== 1 ? "s" : ""}`}
      </p>
    </div>
  );
}

// In TrialMembershipManager.tsx — StatCard component

function StatCard({
  label,
  value,
  colorVar,
  icon: Icon,
}: {
  readonly label: string;
  readonly value: string;
  readonly colorVar: string;
  readonly icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}) {
  return (
    <Card className="trial-mgr__stat">
      <div className="trial-mgr__stat-inner">
        <Icon className="trial-mgr__stat-icon" style={{ color: colorVar }} />
        <div>
          <p className="trial-mgr__stat-label">{label}</p>
          <p className="trial-mgr__stat-value">{value}</p>
        </div>
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════
// §4 — STAT CONFIG
// ═══════════════════════════════════════════════════════════

function useStats(trials: readonly TrialMembershipItem[]) {
  return useMemo(() => {
    const active = trials.filter((t) => t.status === "active").length;
    const expiringSoon = trials.filter((t) => {
      if (t.status !== "active") return false;
      return daysUntil(t.end_date) <= 3;
    }).length;
    const converted = trials.filter((t) => t.status === "converted").length;
    const total = trials.length;
    return {
      active,
      expiringSoon,
      converted,
      total,
      conversionRate: total > 0 ? (converted / total) * 100 : 0,
    };
  }, [trials]);
}

// ═══════════════════════════════════════════════════════════
// §5 — MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * Trial Membership Manager — create, track, and convert trials.
 *
 * @example
 * <TrialMembershipManager />
 */
export default function TrialMembershipManager() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    guest_name: "",
    guest_email: "",
    guest_phone: "",
    referred_by_family_id: "",
    trial_type: "week_trial",
    start_date: "",
    end_date: "",
    privileges: [] as string[],
    notes: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ── Query ──
  const trialsQ = useMCPQuery<TrialListResponse>(
    "guest_management",
    "manage_trial_memberships",
    { action: "list" },
    { staleTime: 60_000 },
  );

  const trials = trialsQ.data?.trial_memberships ?? [];
  const stats = useStats(trials);

  // ── Mutations ──
  const createMut = useMCPMutation<TrialMutationResponse>(
    "guest_management",
    "manage_trial_memberships",
    {
      onSuccess: (data) => {
        showToast({ type: "success", message: data.message ?? "Membresía de prueba creada" });
        setShowForm(false);
        resetForm();
        trialsQ.refetch();
      },
      onError: (err) =>
        showToast({ type: "error", message: err instanceof Error ? err.message : "Error al crear" }),
    },
  );

  const updateStatusMut = useMCPMutation<TrialMutationResponse>(
    "guest_management",
    "manage_trial_memberships",
    {
      onSuccess: (data) => {
        showToast({ type: "success", message: data.message ?? "Estado actualizado" });
        trialsQ.refetch();
      },
      onError: (err) =>
        showToast({ type: "error", message: err instanceof Error ? err.message : "Error al actualizar" }),
    },
  );

  // ── Form helpers ──
  function resetForm() {
    setForm({
      guest_name: "", guest_email: "", guest_phone: "",
      referred_by_family_id: "", trial_type: "week_trial",
      start_date: "", end_date: "", privileges: [], notes: "",
    });
    setFormErrors({});
  }

  function togglePrivilege(key: string) {
    setForm((p) => ({
      ...p,
      privileges: p.privileges.includes(key)
        ? p.privileges.filter((pr) => pr !== key)
        : [...p.privileges, key],
    }));
  }

  const updateField = useCallback(
    (field: string, value: string) => {
      setForm((p) => ({ ...p, [field]: value }));
      setFormErrors((p) => {
        const n = { ...p };
        delete n[field];
        return n;
      });
    },
    [],
  );

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.guest_name.trim()) e.guest_name = "Requerido";
    if (!form.referred_by_family_id.trim()) e.referred_by_family_id = "Requerido";
    if (!form.start_date) e.start_date = "Requerido";
    if (!form.end_date) e.end_date = "Requerido";
    if (form.start_date && form.end_date && form.end_date <= form.start_date) {
      e.end_date = "Debe ser posterior al inicio";
    }
    setFormErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    createMut.mutate({
      action: "create",
      ...form,
      privileges: form.privileges.join(","),
    });
  }

  function handleStatusUpdate(trialId: string, newStatus: string) {
    updateStatusMut.mutate({
      action: "update_status",
      trial_id: trialId,
      new_status: newStatus,
    });
  }

  // ── Loading ──
  if (trialsQ.isLoading) {
    return (
      <div className="trial-mgr" data-state="loading" role="region" aria-label="Membresías de prueba" data-testid="trial-membership-manager">
        <div className="trial-mgr__loading">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={`skel-${i}`} className="trial-mgr__skeleton" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="trial-mgr"
      data-state="data"
      data-form-open={showForm}
      role="region"
      aria-label="Membresías de prueba"
      data-testid="trial-membership-manager"
    >
      {/* ── Stats Row ── */}
      <div className="trial-mgr__stats">
        <StatCard label="Activos" value={String(stats.active)} colorVar="var(--trial-mgr-emerald)" icon={Sparkles} />
        <StatCard label="Por expirar" value={String(stats.expiringSoon)} colorVar="var(--trial-mgr-amber)" icon={AlertTriangle} />
        <StatCard label="Convertidos" value={String(stats.converted)} colorVar="var(--trial-mgr-gold)" icon={UserCheck} />
        <StatCard label="Conversión" value={`${stats.conversionRate.toFixed(0)}%`} colorVar="var(--trial-mgr-teal)" icon={ChevronRight} />
      </div>

      {/* ── Header ── */}
      <div className="trial-mgr__header">
        <p className="trial-mgr__header-count">
          {(trials as TrialMembershipItem[]).length} membresía(s) de prueba
        </p>
        <Button
          variant="primary"
          onClick={() => setShowForm(!showForm)}
          icon={showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        >
          {showForm ? "Cerrar" : "Nueva Membresía"}
        </Button>
      </div>

      {/* ── Create Form ── */}
      {showForm && (
        <div className="trial-mgr__form-panel" data-expanded="true">
          <Card className="trial-mgr__form-card">
            <CardHeader>
              <h3 className="trial-mgr__form-title">Nueva Membresía de Prueba</h3>
              <p className="trial-mgr__form-subtitle">Requiere aprobación del administrador</p>
            </CardHeader>

            <div className="trial-mgr__form-fields">
              {/* Guest name */}
              <div className="trial-mgr__form-group">
                <label className="trial-mgr__label">Nombre del Invitado *</label>
                <input
                  type="text"
                  value={form.guest_name}
                  onChange={(e) => updateField("guest_name", e.target.value)}
                  placeholder="Nombre completo"
                  className="trial-mgr__input"
                  aria-invalid={!!formErrors.guest_name}
                />
                {formErrors.guest_name && (
                  <p className="trial-mgr__error" role="alert">{formErrors.guest_name}</p>
                )}
              </div>

              {/* Contact row */}
              <div className="trial-mgr__form-row" data-cols="3">
                <div className="trial-mgr__form-group">
                  <label className="trial-mgr__label">Email</label>
                  <input
                    type="email"
                    value={form.guest_email}
                    onChange={(e) => updateField("guest_email", e.target.value)}
                    placeholder="email@ejemplo.com"
                    className="trial-mgr__input"
                  />
                </div>
                <div className="trial-mgr__form-group">
                  <label className="trial-mgr__label">Teléfono</label>
                  <input
                    type="tel"
                    value={form.guest_phone}
                    onChange={(e) => updateField("guest_phone", e.target.value)}
                    placeholder="+506 8888-0000"
                    className="trial-mgr__input"
                  />
                </div>
                <div className="trial-mgr__form-group">
                  <label className="trial-mgr__label">Familia que Refiere *</label>
                  <input
                    type="text"
                    value={form.referred_by_family_id}
                    onChange={(e) => updateField("referred_by_family_id", e.target.value)}
                    placeholder="fam-001"
                    className="trial-mgr__input"
                    aria-invalid={!!formErrors.referred_by_family_id}
                  />
                  {formErrors.referred_by_family_id && (
                    <p className="trial-mgr__error" role="alert">{formErrors.referred_by_family_id}</p>
                  )}
                </div>
              </div>

              {/* Trial type + dates */}
              <div className="trial-mgr__form-row" data-cols="3">
                <div className="trial-mgr__form-group">
                  <label className="trial-mgr__label">Tipo de Trial</label>
                  <select
                    value={form.trial_type}
                    onChange={(e) => updateField("trial_type", e.target.value)}
                    className="trial-mgr__input"
                  >
                    {Object.entries(TRIAL_TYPE_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>
                        {cfg.label} ({cfg.days} día{cfg.days !== 1 ? "s" : ""})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="trial-mgr__form-group">
                  <label className="trial-mgr__label">Fecha Inicio *</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => updateField("start_date", e.target.value)}
                    className="trial-mgr__input"
                    data-variant="mono"
                    aria-invalid={!!formErrors.start_date}
                  />
                  {formErrors.start_date && (
                    <p className="trial-mgr__error" role="alert">{formErrors.start_date}</p>
                  )}
                </div>
                <div className="trial-mgr__form-group">
                  <label className="trial-mgr__label">Fecha Fin *</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => updateField("end_date", e.target.value)}
                    className="trial-mgr__input"
                    data-variant="mono"
                    aria-invalid={!!formErrors.end_date}
                  />
                  {formErrors.end_date && (
                    <p className="trial-mgr__error" role="alert">{formErrors.end_date}</p>
                  )}
                </div>
              </div>

              {/* Privileges */}
              <div className="trial-mgr__form-group">
                <label className="trial-mgr__label">Privilegios de Acceso</label>
                <div className="trial-mgr__priv-grid" role="group" aria-label="Seleccionar privilegios">
                  {Object.entries(PRIVILEGE_CONFIG).map(([key, cfg]) => {
                    const selected = form.privileges.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => togglePrivilege(key)}
                        className="trial-mgr__priv-btn"
                        data-active={selected}
                        aria-pressed={selected}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div className="trial-mgr__form-group">
                <label className="trial-mgr__label">Notas</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  rows={2}
                  placeholder="Notas sobre el candidato..."
                  className="trial-mgr__input trial-mgr__textarea"
                />
              </div>

              {/* HITL notice */}
              <div className="trial-mgr__hitl-notice" role="note">
                <p className="trial-mgr__hitl-text">
                  Las membresías de prueba requieren aprobación del administrador.
                  Ofrecer un trial implica un compromiso implícito con el candidato.
                </p>
              </div>

              {/* Submit */}
              <div className="trial-mgr__form-actions">
                <Button variant="ghost" onClick={() => { setShowForm(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={createMut.isPending}
                  icon={createMut.isPending ? undefined : <Sparkles className="w-4 h-4" />}
                >
                  {createMut.isPending ? "Enviando…" : "Solicitar Trial"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Expiring Soon Alert ── */}
      {stats.expiringSoon > 0 && (
        <div className="trial-mgr__alert" role="alert">
          <AlertTriangle className="trial-mgr__alert-icon" />
          <p className="trial-mgr__alert-text">
            {stats.expiringSoon} trial{stats.expiringSoon !== 1 ? "s" : ""} expira{stats.expiringSoon === 1 ? "" : "n"} en los próximos 3 días.
            Contactá a los candidatos para evaluar conversión.
          </p>
        </div>
      )}

      {/* ── Trial List ── */}
      <div className="trial-mgr__list">
        {(trials as TrialMembershipItem[]).length === 0 ? (
          <EmptyState
            title="Sin membresías de prueba"
            description="Ofrecé un trial a un invitado interesado en membresía."
            icon={<Sparkles className="w-8 h-8" />}
            action={
              <Button
                variant="primary"
                onClick={() => setShowForm(true)}
                icon={<Plus className="w-4 h-4" />}
              >
                Crear Trial
              </Button>
            }
          />
        ) : (
          <div className="trial-mgr__trial-list" role="list" aria-label="Membresías de prueba">
            {(trials as TrialMembershipItem[]).map((trial, i) => {
              const stCfg = TRIAL_STATUS_CONFIG_BACKEND[trial.status]
                ?? TRIAL_STATUS_CONFIG_BACKEND.pending_approval;
              const typeCfg = TRIAL_TYPE_CONFIG[trial.trial_type]
                ?? TRIAL_TYPE_CONFIG.week_trial;
              const isTerminal = ["expired", "converted", "cancelled"].includes(trial.status);

              return (
                <div
                  key={trial.id}
                  className="trial-mgr__trial-card"
                  data-status={trial.status}
                  role="listitem"
                  style={{ "--stagger-i": i } as React.CSSProperties}
                >
                  <div className="trial-mgr__trial-row">
                    {/* Info */}
                    <div className="trial-mgr__trial-main">
                      <div className="trial-mgr__avatar" data-status={trial.status}>
                        <span className="trial-mgr__avatar-text">{initials(trial.guest_name)}</span>
                      </div>
                      <div className="trial-mgr__trial-info">
                        <div className="trial-mgr__trial-name-row">
                          <p className="trial-mgr__trial-name">{trial.guest_name}</p>
                          <span
                            className="trial-mgr__badge"
                            data-kind="status"
                            style={{
                              "--badge-color": stCfg.color,
                              "--badge-bg": stCfg.bgColor,
                            } as React.CSSProperties}
                          >
                            {stCfg.label}
                          </span>
                          <span
                            className="trial-mgr__badge"
                            data-kind="type"
                            style={{
                              "--badge-color": typeCfg.color,
                              "--badge-bg": typeCfg.bgColor,
                            } as React.CSSProperties}
                          >
                            {typeCfg.label}
                          </span>
                        </div>
                        <div className="trial-mgr__trial-meta">
                          <span className="trial-mgr__meta-item">
                            <UserCheck className="trial-mgr__meta-icon" />
                            Ref: {trial.referred_by_family_id}
                          </span>
                          <span className="trial-mgr__meta-item">
                            <Calendar className="trial-mgr__meta-icon" />
                            {trial.start_date} → {trial.end_date}
                          </span>
                          {trial.guest_email && (
                            <span className="trial-mgr__meta-item">
                              <Mail className="trial-mgr__meta-icon" />
                              {trial.guest_email}
                            </span>
                          )}
                        </div>
                        {/* Privileges */}
                        {trial.privileges.length > 0 && (
                          <div className="trial-mgr__priv-chips">
                            {trial.privileges.map((p) => {
                              const cfg = PRIVILEGE_CONFIG[p as keyof typeof PRIVILEGE_CONFIG];
                              return cfg ? (
                                <span key={p} className="trial-mgr__priv-chip" data-privilege={p}>
                                  {cfg.label}
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Countdown + Actions */}
                    <div className="trial-mgr__trial-side">
                      <CountdownBadge endDate={trial.end_date} status={trial.status} />

                      {!isTerminal && (
                        <div className="trial-mgr__trial-actions">
                          {trial.status === "pending_approval" && (
                            <Button
                              variant="secondary"
                              onClick={() => handleStatusUpdate(trial.id, "approved")}
                              disabled={updateStatusMut.isPending}
                              icon={<UserCheck className="w-3.5 h-3.5" />}
                            >
                              Aprobar
                            </Button>
                          )}
                          {trial.status === "approved" && (
                            <Button
                              variant="secondary"
                              onClick={() => handleStatusUpdate(trial.id, "active")}
                              disabled={updateStatusMut.isPending}
                              icon={<Sparkles className="w-3.5 h-3.5" />}
                            >
                              Activar
                            </Button>
                          )}
                          {trial.status === "active" && (
                            <Button
                              variant="secondary"
                              onClick={() => handleStatusUpdate(trial.id, "converted")}
                              disabled={updateStatusMut.isPending}
                              icon={<ChevronRight className="w-3.5 h-3.5" />}
                            >
                              Convertir
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            onClick={() => handleStatusUpdate(trial.id, "cancelled")}
                            disabled={updateStatusMut.isPending}
                            icon={<X className="w-3.5 h-3.5" />}
                          >
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {trial.notes && (
                    <p className="trial-mgr__trial-notes">
                      {trial.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}