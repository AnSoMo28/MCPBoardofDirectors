// src/features/engagement/components/ReactivationCampaigns.tsx
// ═══════════════════════════════════════════════════════════
// Reactivation Campaigns — Campaign List + Create Wizard
// Castillo Country Club — Phase 31 "The Voice"
//
// CLEAN REWRITE of V1. Eliminates:
//   - framer-motion (motion, AnimatePresence)
//   - cn utility (Tailwind conditional classes)
//   - default export
//   - Tailwind inline classes
//   - EmptyState from wrong path
//   - EmptyState action as { label, onClick }
//   - Lucide style prop violations
//   - formatPercent (unverifiable — inlined)
//
// Replaces with:
//   - CSS keyframes (fadeUp, slideIn, fadeIn, progressGrow)
//   - data-status / data-selected / data-current / data-active / data-rate-level
//   - Named export
//   - Co-located CSS file
//   - EmptyState from @/shared/components/ui/EmptyState
//   - EmptyState action as ReactNode (<Button>)
//   - Lucide: size + className only
//
// Verified against types.ts:
//   ReactivationCampaign: id, name, description, status,
//     target_level_label, channel_label, start_date, end_date,
//     target_count, reached_count, reactivation_rate, reactivated_count
//   CampaignListResponse: campaigns, total
//   CampaignForm: all 9 fields
//   CAMPAIGN_STATUS_CONFIG, CAMPAIGN_CHANNEL_OPTIONS,
//   CAMPAIGN_TARGET_OPTIONS, OFFER_OPTIONS
//
// Glass namespace: glass-eng-rc
// Rules: R34, R35, R38, #62, checklist anti-recidiva
// ═══════════════════════════════════════════════════════════

import { useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import {
  Plus,
  ChevronRight,
  ChevronLeft,
  Users,
  MessageSquare,
  Calendar,
  Target,
  Gift,
  CheckCircle2,
  AlertCircle,
  Pause,
  Play,
  XCircle,
  Send,
  Sparkles,
} from "lucide-react";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { Card, Button, showToast } from "@/shared/components/ui";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { useMCPQuery, useMCPMutation } from "@/shared/hooks/useMCPQuery";
import {
  type ReactivationCampaign,
  type CampaignListResponse,
  type CampaignForm,
  CAMPAIGN_STATUS_CONFIG,
  CAMPAIGN_CHANNEL_OPTIONS,
  CAMPAIGN_TARGET_OPTIONS,
  OFFER_OPTIONS,
} from "./types";
import "./ReactivationCampaigns.css";


// ══════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════

const STEPS = [
  { key: "target", label: "Objetivo", Icon: Target },
  { key: "channel", label: "Canal", Icon: MessageSquare },
  { key: "message", label: "Mensaje", Icon: Users },
  { key: "review", label: "Revisar", Icon: CheckCircle2 },
] as const;


// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

/**
 * Reactivation Campaigns — campaign list view + 4-step create wizard.
 * Fetches campaigns via useMCPQuery (list_reactivation_campaigns).
 * Creates via useMCPMutation (create_reactivation_campaign).
 * Pause/resume/cancel via separate mutations.
 */
export function ReactivationCampaigns() {
  const [view, setView] = useState<"list" | "create">("list");
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Partial<CampaignForm>>({
    target_level: "at_risk",
    channel: "email",
    include_activity_suggestions: true,
    offer_type: "none",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Queries ──────────────────────────────────────────────
  const campaignsQ = useMCPQuery<CampaignListResponse>(
    "member_engagement",
    "design_reactivation_campaign",
    { action: "list" },
    { placeholderData: keepPreviousData },
  );

  // ── Mutations ────────────────────────────────────────────
  const createMut = useMCPMutation<unknown, CampaignForm>(
    "engagement",
    "create_reactivation_campaign",
    {
      onSuccess: () => {
        showToast({ type: "success", message: "Campaña creada exitosamente" });
        setView("list");
        resetForm();
      },
      onError: (err: unknown) => {
        showToast({
          type: "error",
          message: err instanceof Error ? err.message : "Error al crear campaña",
        });
      },
    },
  );

  const pauseMut = useMCPMutation<unknown, { id: string }>(
    "engagement",
    "pause_campaign",
    {
      onSuccess: () => showToast({ type: "success", message: "Campaña pausada" }),
      onError: (err: unknown) => {
        showToast({ type: "error", message: err instanceof Error ? err.message : "Error" });
      },
    },
  );

  const resumeMut = useMCPMutation<unknown, { id: string }>(
    "engagement",
    "resume_campaign",
    {
      onSuccess: () => showToast({ type: "success", message: "Campaña reanudada" }),
      onError: (err: unknown) => {
        showToast({ type: "error", message: err instanceof Error ? err.message : "Error" });
      },
    },
  );

  const cancelMut = useMCPMutation<unknown, { id: string }>(
    "engagement",
    "cancel_campaign",
    {
      onSuccess: () => showToast({ type: "success", message: "Campaña cancelada" }),
      onError: (err: unknown) => {
        showToast({ type: "error", message: err instanceof Error ? err.message : "Error" });
      },
    },
  );

  // ── Helpers ──────────────────────────────────────────────
  function resetForm() {
    setStep(0);
    setForm({
      target_level: "at_risk",
      channel: "email",
      include_activity_suggestions: true,
      offer_type: "none",
    });
    setErrors({});
  }

  function update<K extends keyof CampaignForm>(
    field: K,
    value: CampaignForm[K],
  ) {
    setForm((p: Partial<CampaignForm>) => ({ ...p, [field]: value }));
    setErrors((p: Record<string, string>) => {
      const n = { ...p };
      delete n[field as string];
      return n;
    });
  }

  function validateStep(s: number): boolean {
    const e: Record<string, string> = {};
    if (s === 0 && !form.name?.trim()) e.name = "Nombre requerido";
    if (s === 2) {
      if (!form.message_template?.trim()) e.message_template = "Mensaje requerido";
      if (!form.start_date) e.start_date = "Fecha inicio requerida";
      if (!form.end_date) e.end_date = "Fecha fin requerida";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function nextStep() {
    if (validateStep(step)) setStep((s: number) => Math.min(s + 1, 3));
  }

  function handleSubmit() {
    if (!validateStep(2)) return;
    createMut.mutate({
      name: form.name!,
      description: form.description ?? "",
      target_level: form.target_level as CampaignForm["target_level"],
      channel: form.channel as CampaignForm["channel"],
      message_template: form.message_template!,
      start_date: form.start_date!,
      end_date: form.end_date!,
      include_activity_suggestions: form.include_activity_suggestions ?? true,
      offer_type: form.offer_type as CampaignForm["offer_type"],
    });
  }

  const campaigns = campaignsQ.data?.campaigns ?? [];

  // ── Loading ──────────────────────────────────────────────
  if (campaignsQ.isLoading && !campaignsQ.data) {
    return (
      <PageContainer
        title="Campañas de Reactivación"
        subtitle="Reconectar con familias inactivas o en riesgo"
      >
        <div data-glass-eng-rc="" className="eng-rc">
          <div className="eng-rc__skeleton-list">
            {Array.from({ length: 3 }).map((_, i: number) => (
              <div
                key={i}
                className="eng-rc__skeleton"
                style={{ "--stagger-i": i } as React.CSSProperties}
              />
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }

  // ── Main render ──────────────────────────────────────────
  return (
    <PageContainer
      title="Campañas de Reactivación"
      subtitle="Reconectar con familias inactivas o en riesgo"
      actions={
        view === "list" ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setView("create")}
            icon={<Plus size={14} />}
          >
            Nueva Campaña
          </Button>
        ) : undefined
      }
    >
      <div data-glass-eng-rc="" className="eng-rc">

        {/* ═══════════ LIST VIEW ═══════════ */}
        {view === "list" && (
          <div className="eng-rc__list-view">
            {campaigns.length === 0 ? (
              <EmptyState
                icon={<Send size={28} className="eng-rc__empty-icon" />}
                title="Sin campañas"
                description="Creá tu primera campaña para reconectar con familias inactivas."
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setView("create")}
                  >
                    Crear Campaña
                  </Button>
                }
              />
            ) : (
              <div className="eng-rc__campaign-list">
                {campaigns.map((c: ReactivationCampaign, idx: number) => {
                  const stCfg = (CAMPAIGN_STATUS_CONFIG as Record<string, { label: string }>)[
                    c.status
                  ] ?? CAMPAIGN_STATUS_CONFIG.draft;

                  const rateLevel =
                    c.reactivation_rate >= 20 ? "good" :
                    c.reactivation_rate >= 10 ? "ok" : "low";

                  return (
                    <div
                      key={c.id}
                      className="eng-rc__campaign-animated"
                      style={{ "--stagger-i": idx } as React.CSSProperties}
                    >
                      <Card className="eng-rc__campaign-card">
                        <div className="eng-rc__campaign-row">
                          {/* ── Info ── */}
                          <div className="eng-rc__campaign-info">
                            <div className="eng-rc__campaign-header">
                              <h4 className="eng-rc__campaign-name">
                                {c.name}
                              </h4>
                              <span
                                className="eng-rc__status-badge"
                                data-status={c.status}
                              >
                                {stCfg.label}
                              </span>
                            </div>

                            {c.description && (
                              <p className="eng-rc__campaign-desc">
                                {c.description}
                              </p>
                            )}

                            <div className="eng-rc__campaign-meta">
                              <span className="eng-rc__meta-item">
                                <Users size={12} className="eng-rc__meta-icon" />
                                {c.target_level_label}
                              </span>
                              <span className="eng-rc__meta-item">
                                <MessageSquare size={12} className="eng-rc__meta-icon" />
                                {c.channel_label}
                              </span>
                              <span className="eng-rc__meta-item">
                                <Calendar size={12} className="eng-rc__meta-icon" />
                                {new Date(c.start_date).toLocaleDateString(
                                  "es-CR",
                                  { day: "numeric", month: "short" },
                                )}{" → "}
                                {new Date(c.end_date).toLocaleDateString(
                                  "es-CR",
                                  { day: "numeric", month: "short" },
                                )}
                              </span>
                            </div>
                          </div>

                          {/* ── Stats ── */}
                          <div className="eng-rc__stats">
                            <div className="eng-rc__stat">
                              <p className="eng-rc__stat-value">
                                {c.target_count}
                              </p>
                              <p className="eng-rc__stat-label">Objetivo</p>
                            </div>
                            <div className="eng-rc__stat">
                              <p className="eng-rc__stat-value eng-rc__stat-value--reached">
                                {c.reached_count}
                              </p>
                              <p className="eng-rc__stat-label">Alcanzados</p>
                            </div>
                            <div className="eng-rc__stat">
                              <p
                                className="eng-rc__stat-value eng-rc__rate-value"
                                data-rate-level={rateLevel}
                              >
                                {c.reactivation_rate.toFixed(1)}%
                              </p>
                              <p className="eng-rc__stat-label">Reactivación</p>
                            </div>
                          </div>

                          {/* ── Actions ── */}
                          {(c.status === "active" || c.status === "paused") && (
                            <div className="eng-rc__actions">
                              {c.status === "active" ? (
                                <Button
                                  variant="ghost"
                                  onClick={() => pauseMut.mutate({ id: c.id })}
                                  icon={<Pause size={14} />}
                                >
                                  Pausar
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  onClick={() => resumeMut.mutate({ id: c.id })}
                                  icon={<Play size={14} />}
                                >
                                  Reanudar
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                onClick={() => cancelMut.mutate({ id: c.id })}
                                icon={<XCircle size={14} />}
                              >
                                Cancelar
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* ── Progress bar ── */}
                        {c.status === "active" && c.target_count > 0 && (
                          <div className="eng-rc__progress-section">
                            <div className="eng-rc__progress-header">
                              <span>Progreso de reactivación</span>
                              <span className="eng-rc__progress-count">
                                {c.reactivated_count}/{c.target_count}
                              </span>
                            </div>
                            <div className="eng-rc__progress-track">
                              <div
                                className="eng-rc__progress-fill"
                                style={{
                                  "--progress": `${Math.min(100, (c.reactivated_count / c.target_count) * 100)}%`,
                                } as React.CSSProperties}
                              />
                            </div>
                          </div>
                        )}
                      </Card>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════ CREATE WIZARD ═══════════ */}
        {view === "create" && (
          <div className="eng-rc__wizard-view">
            {/* ── Step indicator ── */}
            <div className="eng-rc__steps">
              {STEPS.map((s, i: number) => (
                <div key={s.key} className="eng-rc__step-group">
                  <Button
                    variant="unstyled"
                    type="button"
                    onClick={() => i < step && setStep(i)}
                    disabled={i > step}
                    className="eng-rc__step-btn"
                    data-current={i === step}
                    data-completed={i < step}
                  >
                    <s.Icon size={14} className="eng-rc__step-icon" />
                    <span className="eng-rc__step-label">{s.label}</span>
                  </Button>
                  {i < STEPS.length - 1 && (
                    <ChevronRight size={14} className="eng-rc__step-separator" />
                  )}
                </div>
              ))}
            </div>

            <div className="eng-rc__wizard-body">
              <div key={step} className="eng-rc__step-animated">

                {/* ── Step 0: Target ── */}
                {step === 0 && (
                  <Card className="eng-rc__form-card">
                    <h3 className="eng-rc__form-title">
                      Configuración de la Campaña
                    </h3>
                    <div className="eng-rc__form-stack">
                      <div className="eng-rc__form-group">
                        <label className="eng-rc__form-label">
                          Nombre de la Campaña *
                        </label>
                        <input
                          type="text"
                          value={form.name ?? ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            update("name", e.target.value)
                          }
                          placeholder="Ej: Reactivación Verano 2025"
                          className="eng-rc__input"
                        />
                        {errors.name && (
                          <p className="eng-rc__input-error">{errors.name}</p>
                        )}
                      </div>

                      <div className="eng-rc__form-group">
                        <label className="eng-rc__form-label">
                          Descripción
                        </label>
                        <textarea
                          value={form.description ?? ""}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            update("description", e.target.value)
                          }
                          rows={2}
                          placeholder="Objetivo de la campaña..."
                          className="eng-rc__textarea"
                        />
                      </div>

                      <div className="eng-rc__form-group">
                        <label className="eng-rc__form-label">
                          Público Objetivo *
                        </label>
                        <div className="eng-rc__option-grid eng-rc__option-grid--3">
                          {CAMPAIGN_TARGET_OPTIONS.map(
                            (opt: { value: string; label: string }) => (
                              <Button
                                variant="unstyled"
                                key={opt.value}
                                type="button"
                                onClick={() =>
                                  update(
                                    "target_level",
                                    opt.value as CampaignForm["target_level"],
                                  )
                                }
                                data-selected={form.target_level === opt.value}
                                className="eng-rc__target-btn"
                              >
                                {opt.label}
                              </Button>
                            ),
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="eng-rc__nav">
                      <div />
                      <Button variant="primary" onClick={nextStep}>
                        Continuar
                        <ChevronRight size={14} />
                      </Button>
                    </div>
                  </Card>
                )}

                {/* ── Step 1: Channel + Offer ── */}
                {step === 1 && (
                  <Card className="eng-rc__form-card">
                    <h3 className="eng-rc__form-title">Canal y Oferta</h3>
                    <div className="eng-rc__form-stack">
                      <div className="eng-rc__form-group">
                        <label className="eng-rc__form-label">
                          Canal de Comunicación *
                        </label>
                        <div className="eng-rc__option-grid eng-rc__option-grid--2">
                          {CAMPAIGN_CHANNEL_OPTIONS.map(
                            (opt: { value: string; label: string }) => (
                              <Button
                                variant="unstyled"
                                key={opt.value}
                                type="button"
                                onClick={() =>
                                  update(
                                    "channel",
                                    opt.value as CampaignForm["channel"],
                                  )
                                }
                                data-selected={form.channel === opt.value}
                                className="eng-rc__channel-btn"
                              >
                                {opt.label}
                              </Button>
                            ),
                          )}
                        </div>
                      </div>

                      <div className="eng-rc__form-group">
                        <label className="eng-rc__form-label">Incentivo</label>
                        <div className="eng-rc__option-grid eng-rc__option-grid--2">
                          {OFFER_OPTIONS.map(
                            (opt: { value: string; label: string }) => (
                              <Button
                                variant="unstyled"
                                key={opt.value}
                                type="button"
                                onClick={() =>
                                  update(
                                    "offer_type",
                                    opt.value as CampaignForm["offer_type"],
                                  )
                                }
                                data-selected={form.offer_type === opt.value}
                                className="eng-rc__offer-btn"
                              >
                                <Gift
                                  size={14}
                                  className="eng-rc__offer-icon"
                                />
                                {opt.label}
                              </Button>
                            ),
                          )}
                        </div>
                      </div>

                      <div className="eng-rc__toggle-row">
                        <div className="eng-rc__toggle-text">
                          <p className="eng-rc__toggle-label">
                            Sugerir actividades
                          </p>
                          <p className="eng-rc__toggle-desc">
                            La IA recomienda actividades según el perfil
                          </p>
                        </div>
                        <Button
                          variant="unstyled"
                          type="button"
                          role="switch"
                          aria-checked={form.include_activity_suggestions}
                          onClick={() =>
                            update(
                              "include_activity_suggestions",
                              !form.include_activity_suggestions,
                            )
                          }
                          data-active={form.include_activity_suggestions}
                          className="eng-rc__toggle"
                        >
                          <span className="eng-rc__toggle-knob" />
                        </Button>
                      </div>
                    </div>

                    <div className="eng-rc__nav">
                      <Button variant="ghost" onClick={() => setStep(0)}>
                        <ChevronLeft size={14} />
                        Atrás
                      </Button>
                      <Button variant="primary" onClick={nextStep}>
                        Continuar
                        <ChevronRight size={14} />
                      </Button>
                    </div>
                  </Card>
                )}

                {/* ── Step 2: Message + Dates ── */}
                {step === 2 && (
                  <Card className="eng-rc__form-card">
                    <h3 className="eng-rc__form-title">Mensaje y Fechas</h3>
                    <div className="eng-rc__form-stack">
                      <div className="eng-rc__form-group">
                        <label className="eng-rc__form-label">
                          Plantilla de Mensaje *
                        </label>
                        <textarea
                          value={form.message_template ?? ""}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            update("message_template", e.target.value)
                          }
                          rows={6}
                          placeholder="Ej: Queremos verte de vuelta en el club..."
                          className="eng-rc__textarea"
                        />
                        {errors.message_template && (
                          <p className="eng-rc__input-error">
                            {errors.message_template}
                          </p>
                        )}
                      </div>

                      <div className="eng-rc__date-grid">
                        <div className="eng-rc__form-group">
                          <label className="eng-rc__form-label">
                            Fecha de Inicio *
                          </label>
                          <input
                            type="date"
                            value={form.start_date ?? ""}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              update("start_date", e.target.value)
                            }
                            className="eng-rc__input"
                          />
                          {errors.start_date && (
                            <p className="eng-rc__input-error">
                              {errors.start_date}
                            </p>
                          )}
                        </div>
                        <div className="eng-rc__form-group">
                          <label className="eng-rc__form-label">
                            Fecha de Fin *
                          </label>
                          <input
                            type="date"
                            value={form.end_date ?? ""}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              update("end_date", e.target.value)
                            }
                            className="eng-rc__input"
                          />
                          {errors.end_date && (
                            <p className="eng-rc__input-error">
                              {errors.end_date}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="eng-rc__nav">
                      <Button variant="ghost" onClick={() => setStep(1)}>
                        <ChevronLeft size={14} />
                        Atrás
                      </Button>
                      <Button variant="primary" onClick={nextStep}>
                        Revisar
                        <ChevronRight size={14} />
                      </Button>
                    </div>
                  </Card>
                )}

                {/* ── Step 3: Review ── */}
                {step === 3 && (
                  <Card className="eng-rc__form-card">
                    <h3 className="eng-rc__form-title">Confirmar Campaña</h3>

                    <div className="eng-rc__review-stack">
                      {[
                        { label: "Campaña", value: form.name ?? "" },
                        {
                          label: "Público",
                          value: (CAMPAIGN_TARGET_OPTIONS as Array<{ value: string; label: string }>).find(
                            (o) => o.value === form.target_level,
                          )?.label ?? "",
                        },
                        {
                          label: "Canal",
                          value: (CAMPAIGN_CHANNEL_OPTIONS as Array<{ value: string; label: string }>).find(
                            (o) => o.value === form.channel,
                          )?.label ?? "",
                        },
                        {
                          label: "Incentivo",
                          value: (OFFER_OPTIONS as Array<{ value: string; label: string }>).find(
                            (o) => o.value === form.offer_type,
                          )?.label ?? "Sin oferta",
                        },
                        {
                          label: "Período",
                          value: `${form.start_date ?? "—"} → ${form.end_date ?? "—"}`,
                        },
                        {
                          label: "Sugerir actividades",
                          value: form.include_activity_suggestions ? "Sí" : "No",
                        },
                      ].map((row: { label: string; value: string }) => (
                        <div key={row.label} className="eng-rc__review-row">
                          <span className="eng-rc__review-label">
                            {row.label}
                          </span>
                          <span className="eng-rc__review-value">
                            {row.value}
                          </span>
                        </div>
                      ))}

                      {/* Message preview */}
                      <div className="eng-rc__review-message">
                        <p className="eng-rc__review-label">Mensaje</p>
                        <p className="eng-rc__review-message-text">
                          {form.message_template}
                        </p>
                      </div>
                    </div>

                    {form.include_activity_suggestions && (
                      <div className="eng-rc__ai-banner">
                        <Sparkles size={14} className="eng-rc__ai-icon" />
                        <p className="eng-rc__ai-text">
                          La IA enriquecerá el mensaje con sugerencias
                          personalizadas de actividades para cada familia.
                        </p>
                      </div>
                    )}

                    {createMut.isError && (
                      <div className="eng-rc__error-banner">
                        <AlertCircle size={14} className="eng-rc__error-icon" />
                        <p className="eng-rc__error-text">
                          {createMut.error instanceof Error
                            ? createMut.error.message
                            : "Error al crear campaña"}
                        </p>
                      </div>
                    )}

                    <div className="eng-rc__nav">
                      <Button variant="ghost" onClick={() => setStep(2)}>
                        <ChevronLeft size={14} />
                        Atrás
                      </Button>
                      <Button
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={createMut.isPending}
                        icon={<CheckCircle2 size={14} />}
                      >
                        {createMut.isPending ? "Creando..." : "Crear Campaña"}
                      </Button>
                    </div>
                  </Card>
                )}

              </div>
            </div>
          </div>
        )}

      </div>
    </PageContainer>
  );
}