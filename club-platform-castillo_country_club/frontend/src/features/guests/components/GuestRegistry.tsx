// ═══════════════════════════════════════════════════════════
// src/features/guests/components/GuestRegistry.tsx
// Phase 34 "The Gateway" — Guest Registry (Rewrite)
// Level 6+ Agency · Production Grade
//
// Guest management with:
//   - Inline registration form with guest limit tracking (HITL)
//   - Guest list with status filter + text search
//   - Inline privilege manager per guest
//   - MCP mutations: create, check_in, cancel, assign, revoke
//
// Original: framer-motion + cn() + Tailwind + inline colors
//   → CSS animations + BEM + data-*
// Checklist: TSX-1-39, CSS-1-40
//
// PRE-WRITURE VERIFICATION:
//   GuestRegistryItem { id, guest_name, family_id,
//     host_member_id, visit_date, purpose, status,
//     privileges(string[]) }                               ← ../types (by usage) ✅
//   GUEST_REGISTRY_STATUS_CONFIG → Record<string,
//     { label, color, bgColor }>                          ← ../types (by usage) ✅
//   PRIVILEGE_CONFIG → Record<string,
//     { label, color, bgColor }>                          ← ../types (by usage) ✅
//
// ANTI-PATTERNS REMOVED: framer-motion, cn(), Tailwind,
//   inline colors, useReducedMotion, className prop,
//   EmptyState action as object, wrong import path
// FIX: EmptyState action → ReactNode, import path corrected
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";

import {
  UserPlus, Search, Shield, X, Clock,
  AlertTriangle, LogIn,
} from "lucide-react";

import { Card, CardHeader, Button, Skeleton, showToast } from "@/shared/components/ui";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { useMCPQuery, useMCPMutation } from "@/shared/hooks/useMCPQuery";
import type { GuestRegistryItem } from "../types";
import {
  GUEST_REGISTRY_STATUS_CONFIG,
  PRIVILEGE_CONFIG,
} from "../types";

import "./GuestRegistry.css";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

interface GuestListResponse {
  readonly status: string;
  readonly message: string;
  readonly guests: readonly GuestRegistryItem[];
}

interface GuestMutationResponse {
  readonly status: string;
  readonly message: string;
  readonly guest?: GuestRegistryItem;
  readonly request_id?: string;
  readonly current_guests?: number;
  readonly limit?: number;
}

interface PrivilegeMutationResponse {
  readonly status: string;
  readonly message: string;
  readonly guest?: GuestRegistryItem;
}

// ═══════════════════════════════════════════════════════════
// §2 — CONSTANTS
// ═══════════════════════════════════════════════════════════

const PURPOSE_OPTIONS = [
  { value: "social", label: "Social" },
  { value: "dining", label: "Gastronomía" },
  { value: "sports", label: "Deportes" },
  { value: "pool", label: "Piscina" },
  { value: "event", label: "Evento especial" },
  { value: "meeting", label: "Reunión" },
  { value: "tour", label: "Visita guiada" },
  { value: "other", label: "Otro" },
] as const;

const GUEST_LIMIT = 4;

const STATUS_FILTER_OPTIONS = [
  { value: "registered", label: "Registrado" },
  { value: "checked_in", label: "En el club" },
  { value: "completed", label: "Completado" },
  { value: "cancelled", label: "Cancelado" },
] as const;

// ═══════════════════════════════════════════════════════════
// §3 — HELPERS
// ═══════════════════════════════════════════════════════════

/** Compute initials from full name. */
function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Derive guest limit level for visual indicator. */
function limitLevel(current: number, limit: number): string {
  if (current >= limit) return "critical";
  if (current >= limit - 1) return "attention";
  return "ok";
}

// ═══════════════════════════════════════════════════════════
// §4 — SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

function PrivilegePanel({
  guest,
  onToggle,
  isToggling,
}: {
  readonly guest: GuestRegistryItem;
  readonly onToggle: (privilege: string, hasIt: boolean) => void;
  readonly isToggling: boolean;
}) {
  return (
    <div className="gst-registry__priv-grid" role="group" aria-label={`Privilegios de ${guest.guest_name}`}>
      {Object.entries(PRIVILEGE_CONFIG).map(([key, cfg]) => {
        const hasIt = guest.privileges.includes(key);
        return (
          <Button
            variant="unstyled"
            key={key}
            type="button"
            onClick={() => onToggle(key, hasIt)}
            disabled={isToggling}
            className="gst-registry__priv-btn"
            data-active={hasIt}
            aria-pressed={hasIt}
            aria-label={`${cfg.label}: ${hasIt ? "asignado" : "no asignado"}`}
          >
            {hasIt ? "✓ " : ""}{cfg.label}
          </Button>
        );
      })}
    </div>
  );
}

function GuestLimitBar({ current, limit }: { readonly current: number; readonly limit: number }) {
  const pct = Math.min((current / limit) * 100, 100);
  const level = limitLevel(current, limit);

  return (
    <div className="gst-registry__limit" data-level={level}>
      <div className="gst-registry__limit-track">
        <div
          className="gst-registry__limit-fill"
          style={{ "--fill-width": `${pct}%` } as React.CSSProperties}
        />
      </div>
      <span className="gst-registry__limit-count">{current}/{limit}</span>
      {current >= limit && (
        <span className="gst-registry__limit-notice">Requiere aprobación</span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §5 — MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * Guest Registry — management and privilege control.
 * Inline form for registration with guest limit tracking.
 * Guest list with expandable privilege manager per guest.
 *
 * @example
 * <GuestRegistry />
 */
export default function GuestRegistry() {
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGuestId, setExpandedGuestId] = useState<string | null>(null);

  const [form, setForm] = useState({
    family_id: "",
    host_member_id: "",
    guest_name: "",
    guest_email: "",
    guest_phone: "",
    visit_date: new Date().toISOString().split("T")[0],
    purpose: "social",
    privileges: [] as string[],
    notes: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ── Queries ──
  const guestsQ = useMCPQuery<GuestListResponse>(
    "guest_management",
    "register_guest",
    { action: "list", ...(statusFilter ? { status: statusFilter } : {}) },
    { staleTime: 60_000 },
  );

  const guests = guestsQ.data?.guests ?? [];

  const filteredGuests = useMemo(() => {
    if (!searchQuery) return guests;
    const q = searchQuery.toLowerCase();
    return (guests as GuestRegistryItem[]).filter(
      (g) =>
        g.guest_name.toLowerCase().includes(q) ||
        g.family_id.toLowerCase().includes(q) ||
        g.purpose.toLowerCase().includes(q),
    );
  }, [guests, searchQuery]);

  // ── Guest limit computation ──
  const guestLimitCount = useMemo(() => {
    if (!form.family_id || !form.visit_date) return 0;
    return (guests as GuestRegistryItem[]).filter(
      (g) =>
        g.family_id === form.family_id &&
        g.visit_date === form.visit_date &&
        (g.status === "registered" || g.status === "checked_in"),
    ).length;
  }, [guests, form.family_id, form.visit_date]);

  // ── Mutations ──
  const createMut = useMCPMutation<GuestMutationResponse>(
    "guest_management",
    "register_guest",
    {
      onSuccess: (data) => {
        if (data.status === "pending_approval") {
          showToast({ type: "success", message: data.message ?? "Solicitud enviada a aprobación" });
        } else {
          showToast({ type: "success", message: data.message ?? "Invitado registrado" });
        }
        setShowForm(false);
        resetForm();
        guestsQ.refetch();
      },
      onError: (err) =>
        showToast({ type: "error", message: err instanceof Error ? err.message : "Error al registrar" }),
    },
  );

  const checkInMut = useMCPMutation<GuestMutationResponse>(
    "guest_management",
    "register_guest",
    {
      onSuccess: (data) => {
        showToast({ type: "success", message: data.message ?? "Check-in exitoso" });
        guestsQ.refetch();
      },
      onError: (err) =>
        showToast({ type: "error", message: err instanceof Error ? err.message : "Error en check-in" }),
    },
  );

  const cancelMut = useMCPMutation<GuestMutationResponse>(
    "guest_management",
    "register_guest",
    {
      onSuccess: (data) => {
        showToast({ type: "success", message: data.message ?? "Registro cancelado" });
        guestsQ.refetch();
      },
      onError: (err) =>
        showToast({ type: "error", message: err instanceof Error ? err.message : "Error al cancelar" }),
    },
  );

  const assignPrivMut = useMCPMutation<PrivilegeMutationResponse>(
    "guest_management",
    "manage_guest_privileges",
    {
      onSuccess: () => {
        showToast({ type: "success", message: "Privilegio asignado" });
        guestsQ.refetch();
      },
      onError: (err) =>
        showToast({ type: "error", message: err instanceof Error ? err.message : "Error al asignar" }),
    },
  );

  const revokePrivMut = useMCPMutation<PrivilegeMutationResponse>(
    "guest_management",
    "manage_guest_privileges",
    {
      onSuccess: () => {
        showToast({ type: "success", message: "Privilegio revocado" });
        guestsQ.refetch();
      },
      onError: (err) =>
        showToast({ type: "error", message: err instanceof Error ? err.message : "Error al revocar" }),
    },
  );

  // ── Form helpers ──
  function resetForm() {
    setForm({
      family_id: "",
      host_member_id: "",
      guest_name: "",
      guest_email: "",
      guest_phone: "",
      visit_date: new Date().toISOString().split("T")[0],
      purpose: "social",
      privileges: [],
      notes: "",
    });
    setFormErrors({});
  }

  function togglePrivilege(key: string) {
    setForm((prev) => ({
      ...prev,
      privileges: prev.privileges.includes(key)
        ? prev.privileges.filter((p) => p !== key)
        : [...prev.privileges, key],
    }));
  }

  const updateField = useCallback(
    (field: string, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      setFormErrors((prev) => {
        const n = { ...prev };
        delete n[field];
        return n;
      });
    },
    [],
  );

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.family_id.trim()) e.family_id = "Requerido";
    if (!form.host_member_id.trim()) e.host_member_id = "Requerido";
    if (!form.guest_name.trim()) e.guest_name = "Requerido";
    if (!form.visit_date) e.visit_date = "Requerido";
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

  function handlePrivilegeToggle(guest: GuestRegistryItem, privilege: string, hasIt: boolean) {
    if (hasIt) {
      revokePrivMut.mutate({ action: "revoke", guest_id: guest.id, privilege_type: privilege });
    } else {
      assignPrivMut.mutate({ action: "assign", guest_id: guest.id, privilege_type: privilege });
    }
  }

  // ── Loading ──
  if (guestsQ.isLoading) {
    return (
      <div className="gst-registry" data-state="loading" role="region" aria-label="Registro de invitados" data-testid="guest-registry">
        <div className="gst-registry__loading">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={`skel-${i}`} className="gst-registry__skeleton" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="gst-registry"
      data-state="data"
      data-form-open={showForm}
      role="region"
      aria-label="Registro de invitados"
      data-testid="guest-registry"
    >
      {/* ── Header ── */}
      <div className="gst-registry__header">
        <p className="gst-registry__header-count">
          {(guests as GuestRegistryItem[]).length} invitado(s) registrado(s)
        </p>
        <Button
          variant="primary"
          onClick={() => setShowForm(!showForm)}
          icon={showForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
        >
          {showForm ? "Cerrar" : "Nuevo Invitado"}
        </Button>
      </div>

      {/* ── Registration Form ── */}
      {showForm && (
        <div className="gst-registry__form-panel" data-expanded="true">
          <Card className="gst-registry__form-card">
            <CardHeader>
              <h3 className="gst-registry__form-title">Registrar Invitado</h3>
              <p className="gst-registry__form-subtitle">
                Al registrar más de {GUEST_LIMIT} invitados por familia/día se requiere aprobación
              </p>
            </CardHeader>

            <div className="gst-registry__form-fields">
              {/* Family + Host row */}
              <div className="gst-registry__form-row" data-cols="2">
                <div className="gst-registry__form-group">
                  <label className="gst-registry__label">ID Familia *</label>
                  <input
                    type="text"
                    value={form.family_id}
                    onChange={(e) => updateField("family_id", e.target.value)}
                    placeholder="fam-001"
                    className="gst-registry__input"
                    aria-invalid={!!formErrors.family_id}
                  />
                  {formErrors.family_id && (
                    <p className="gst-registry__error" role="alert">{formErrors.family_id}</p>
                  )}
                  {form.family_id && form.visit_date && (
                    <GuestLimitBar current={guestLimitCount} limit={GUEST_LIMIT} />
                  )}
                </div>
                <div className="gst-registry__form-group">
                  <label className="gst-registry__label">ID Socio Anfitrión *</label>
                  <input
                    type="text"
                    value={form.host_member_id}
                    onChange={(e) => updateField("host_member_id", e.target.value)}
                    placeholder="member-001"
                    className="gst-registry__input"
                    aria-invalid={!!formErrors.host_member_id}
                  />
                  {formErrors.host_member_id && (
                    <p className="gst-registry__error" role="alert">{formErrors.host_member_id}</p>
                  )}
                </div>
              </div>

              {/* Guest name */}
              <div className="gst-registry__form-group">
                <label className="gst-registry__label">Nombre del Invitado *</label>
                <input
                  type="text"
                  value={form.guest_name}
                  onChange={(e) => updateField("guest_name", e.target.value)}
                  placeholder="Nombre completo"
                  className="gst-registry__input"
                  aria-invalid={!!formErrors.guest_name}
                />
                {formErrors.guest_name && (
                  <p className="gst-registry__error" role="alert">{formErrors.guest_name}</p>
                )}
              </div>

              {/* Contact row */}
              <div className="gst-registry__form-row" data-cols="3">
                <div className="gst-registry__form-group">
                  <label className="gst-registry__label">Email</label>
                  <input
                    type="email"
                    value={form.guest_email}
                    onChange={(e) => updateField("guest_email", e.target.value)}
                    placeholder="email@ejemplo.com"
                    className="gst-registry__input"
                  />
                </div>
                <div className="gst-registry__form-group">
                  <label className="gst-registry__label">Teléfono</label>
                  <input
                    type="tel"
                    value={form.guest_phone}
                    onChange={(e) => updateField("guest_phone", e.target.value)}
                    placeholder="+506 8888-0000"
                    className="gst-registry__input"
                  />
                </div>
                <div className="gst-registry__form-group">
                  <label className="gst-registry__label">Fecha de Visita *</label>
                  <input
                    type="date"
                    value={form.visit_date}
                    onChange={(e) => updateField("visit_date", e.target.value)}
                    className="gst-registry__input"
                    data-variant="mono"
                    aria-invalid={!!formErrors.visit_date}
                  />
                </div>
              </div>

              {/* Purpose */}
              <div className="gst-registry__form-group">
                <label className="gst-registry__label">Propósito</label>
                <select
                  value={form.purpose}
                  onChange={(e) => updateField("purpose", e.target.value)}
                  className="gst-registry__input"
                >
                  {PURPOSE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Privileges multi-select */}
              <div className="gst-registry__form-group">
                <label className="gst-registry__label">Privilegios de Acceso</label>
                <div className="gst-registry__priv-grid" role="group" aria-label="Seleccionar privilegios">
                  {Object.entries(PRIVILEGE_CONFIG).map(([key, cfg]) => {
                    const selected = form.privileges.includes(key);
                    return (
                      <Button
                        variant="unstyled"
                        key={key}
                        type="button"
                        onClick={() => togglePrivilege(key)}
                        className="gst-registry__priv-btn"
                        data-active={selected}
                        aria-pressed={selected}
                      >
                        {cfg.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div className="gst-registry__form-group">
                <label className="gst-registry__label">Notas</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  rows={2}
                  placeholder="Notas adicionales..."
                  className="gst-registry__input gst-registry__textarea"
                />
              </div>

              {/* HITL notice */}
              {guestLimitCount >= GUEST_LIMIT && (
                <div className="gst-registry__hitl-notice" role="alert">
                  <AlertTriangle className="gst-registry__hitl-icon" />
                  <p className="gst-registry__hitl-text">
                    Límite de {GUEST_LIMIT} invitados alcanzado para esta familia en esta fecha.
                    El registro será enviado a aprobación del administrador.
                  </p>
                </div>
              )}

              {/* Submit */}
              <div className="gst-registry__form-actions">
                <Button variant="ghost" onClick={() => { setShowForm(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={createMut.isPending}
                  icon={createMut.isPending ? undefined : <UserPlus className="w-4 h-4" />}
                >
                  {createMut.isPending ? "Registrando…" : "Registrar Invitado"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="gst-registry__filters">
        <div className="gst-registry__search-wrap">
          <Search className="gst-registry__search-icon" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar invitado…"
            className="gst-registry__filter-input"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="gst-registry__filter-select"
        >
          <option value="">Todos los estados</option>
          {STATUS_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* ── Guest List ── */}
      <div className="gst-registry__list">
        {filteredGuests.length === 0 ? (
          <EmptyState
            title="Sin invitados"
            description="No se encontraron invitados para los filtros seleccionados."
            icon={<UserPlus className="w-8 h-8" />}
            action={
              <Button
                variant="primary"
                onClick={() => setShowForm(true)}
                icon={<UserPlus className="w-4 h-4" />}
              >
                Registrar Invitado
              </Button>
            }
          />
        ) : (
          <div className="gst-registry__guest-list" role="list" aria-label="Invitados registrados">
            {filteredGuests.map((guest, i) => {
              const stCfg = GUEST_REGISTRY_STATUS_CONFIG[guest.status]
                ?? GUEST_REGISTRY_STATUS_CONFIG.registered;
              const isExpanded = expandedGuestId === guest.id;

              return (
                <div
                  key={guest.id}
                  className="gst-registry__guest-card"
                  data-status={guest.status}
                  role="listitem"
                  style={{ "--stagger-i": i } as React.CSSProperties}
                >
                  <div className="gst-registry__guest-row">
                    {/* Guest info */}
                    <div className="gst-registry__guest-main">
                      <div className="gst-registry__avatar" data-status={guest.status}>
                        <span className="gst-registry__avatar-text">{initials(guest.guest_name)}</span>
                      </div>
                      <div className="gst-registry__guest-info">
                        <p className="gst-registry__guest-name">{guest.guest_name}</p>
                        <p className="gst-registry__guest-meta">
                          Familia: {guest.family_id} · Anfitrión: {guest.host_member_id}
                        </p>
                      </div>
                    </div>

                    {/* Status + Date */}
                    <div className="gst-registry__guest-status-row">
                      <span
                        className="gst-registry__status-badge"
                        data-status={guest.status}
                        style={{
                          "--badge-color": stCfg.color,
                          "--badge-bg": stCfg.bgColor,
                        } as React.CSSProperties}
                      >
                        {stCfg.label}
                      </span>
                      <span className="gst-registry__guest-date">
                        <Clock className="gst-registry__date-icon" />
                        {guest.visit_date}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="gst-registry__guest-actions">
                      {guest.status === "registered" && (
                        <>
                          <Button
                            variant="secondary"
                            onClick={() => checkInMut.mutate({ action: "check_in", guest_id: guest.id })}
                            disabled={checkInMut.isPending}
                            icon={<LogIn className="w-3.5 h-3.5" />}
                          >
                            Check-in
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => cancelMut.mutate({ action: "cancel", guest_id: guest.id })}
                            disabled={cancelMut.isPending}
                            icon={<X className="w-3.5 h-3.5" />}
                          >
                            Cancelar
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        onClick={() => setExpandedGuestId(isExpanded ? null : guest.id)}
                        icon={<Shield className="w-3.5 h-3.5" />}
                        aria-expanded={isExpanded}
                      >
                        Privilegios
                      </Button>
                    </div>
                  </div>

                  {/* Privilege chips */}
                  {guest.privileges.length > 0 && (
                    <div className="gst-registry__priv-chips">
                      {guest.privileges.map((p) => {
                        const cfg = PRIVILEGE_CONFIG[p as keyof typeof PRIVILEGE_CONFIG];
                        return cfg ? (
                          <span key={p} className="gst-registry__priv-chip" data-privilege={p}>
                            {cfg.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}

                  {/* Expandable privilege manager */}
                  {isExpanded && (
                    <div className="gst-registry__priv-panel" data-expanded="true">
                      <p className="gst-registry__priv-panel-title">
                        Gestionar privilegios de {guest.guest_name}
                      </p>
                      <PrivilegePanel
                        guest={guest}
                        onToggle={(priv, hasIt) => handlePrivilegeToggle(guest, priv, hasIt)}
                        isToggling={assignPrivMut.isPending || revokePrivMut.isPending}
                      />
                    </div>
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