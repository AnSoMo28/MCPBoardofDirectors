// src/features/recommendations/components/ActivitySuggester.tsx
// Fase 10, B4 — CRUD activity suggestions + create HITL

import { useState, useCallback } from "react";
import {
  Lightbulb,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Tag,
  CheckCircle2,
} from "lucide-react";

import { useMCPQuery, useMCPMutation } from "@/shared/hooks/useMCPQuery";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { useBreakpoint } from "@/shared/hooks/useBreakpoint";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Input } from "@/shared/components/ui/Input";
import { FormField } from "@/shared/components/ui/FormField";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { showToast } from "@/shared/components/ui/Toast";
import { formatCurrency } from "@/shared/lib/utils";

import {
  SUGGESTION_STATUS_CONFIG,
  type ActivitySuggestion,
  type SuggestionsListResponse,
  type SuggestionsCreateResponse,
} from "../types";

// ── Main Component ─────────────────────────────────────────

export function ActivitySuggester() {
  const prefersReduced = useReducedMotion();
  useBreakpoint();

  // ── State ──
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Form state ──
  const [form, setForm] = useState({
    name: "",
    description: "",
    target_demographic: "",
    estimated_interest: "",
    estimated_cost: "",
    similar_clubs_offer: false,
    member_requests_count: "",
    tags: "",
  });

  // ── Level 1: List auto-load ──
  const {
    data: listData,
    isLoading,
  } = useMCPQuery<SuggestionsListResponse>(
    "proactive_recommendation",
    "suggest_new_activities",
    { action: "list" },
    { staleTime: 60_000 },
  );

  // ── Create mutation ──
  const createMutation = useMCPMutation<SuggestionsCreateResponse>(
    "proactive_recommendation",
    "suggest_new_activities",
    {
      onSuccess: (data) => {
        showToast({
          type: "success",
          message:
            data?.message ?? "Actividad propuesta. Esperando aprobación.",
        });
        resetForm();
      },
    },
  );

  // ── Handlers ──
  const resetForm = useCallback(() => {
    setForm({
      name: "",
      description: "",
      target_demographic: "",
      estimated_interest: "",
      estimated_cost: "",
      similar_clubs_offer: false,
      member_requests_count: "",
      tags: "",
    });
    setShowForm(false);
  }, []);

  const updateField = useCallback(
    (field: string, value: string | boolean) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const isFormValid =
    form.name.trim().length > 0 &&
    form.description.trim().length > 0 &&
    form.target_demographic.trim().length > 0;

  const handleSubmit = useCallback(() => {
    if (!isFormValid) return;
    createMutation.mutate({
      action: "create",
      name: form.name,
      description: form.description,
      target_demographic: form.target_demographic,
      estimated_interest: Number(form.estimated_interest) || 0,
      estimated_cost: Number(form.estimated_cost) || 0,
      similar_clubs_offer: form.similar_clubs_offer,
      member_requests_count: Number(form.member_requests_count) || 0,
      tags: form.tags,
    });
  }, [form, isFormValid, createMutation]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const suggestions = listData?.suggestions ?? [];

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48 rounded-[var(--radius-md)]" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-[var(--radius-md)]" />
        ))}
      </div>
    );
  }

  // ── Render ──
  return (
    <div
      className="space-y-5"
      role="region"
      aria-label="Sugerencias de nuevas actividades"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-silver-400)]">
          {suggestions.length} sugerencia
          {suggestions.length !== 1 ? "s" : ""} registrada
          {suggestions.length !== 1 ? "s" : ""}
        </p>
        <Button
          variant="primary"
          size="sm"
          icon={showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          onClick={() => setShowForm((prev) => !prev)}
        >
          {showForm ? "Cancelar" : "Nueva Sugerencia"}
        </Button>
      </div>

      {/* ── Create Form ── */}
      {showForm && (
        <Card
          className={`p-5 space-y-4 ${
            prefersReduced
              ? ""
              : "opacity-0 animate-[slideDown_0.3s_ease_forwards]"
          }`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Nombre de la Actividad" required>
              <Input
                placeholder="Paddle Surf"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
              />
            </FormField>

            <FormField label="Demografía Objetivo" required>
              <Input
                placeholder="Adultos 25-45"
                value={form.target_demographic}
                onChange={(e) =>
                  updateField("target_demographic", e.target.value)
                }
              />
            </FormField>

            <FormField label="Interés Estimado (0-100)">
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="78"
                value={form.estimated_interest}
                onChange={(e) =>
                  updateField("estimated_interest", e.target.value)
                }
              />
            </FormField>

            <FormField label="Costo Estimado (₡)">
              <Input
                type="number"
                min={0}
                placeholder="15000"
                value={form.estimated_cost}
                onChange={(e) =>
                  updateField("estimated_cost", e.target.value)
                }
              />
            </FormField>

            <FormField label="Solicitudes de Socios">
              <Input
                type="number"
                min={0}
                placeholder="23"
                value={form.member_requests_count}
                onChange={(e) =>
                  updateField("member_requests_count", e.target.value)
                }
              />
            </FormField>

            {/* Toggle: similar clubs offer */}
            <FormField label="Otros clubes lo ofrecen">
              <button
                type="button"
                role="switch"
                aria-checked={form.similar_clubs_offer}
                onClick={() =>
                  updateField(
                    "similar_clubs_offer",
                    !form.similar_clubs_offer,
                  )
                }
                className={`relative inline-flex h-10 w-20 items-center rounded-full
                           border transition-colors
                           focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]
                           ${
                             form.similar_clubs_offer
                               ? "bg-[var(--color-teal-400)] border-transparent"
                               : "bg-[var(--color-surface-1)] border-white/[0.08]"
                           }`}
              >
                <span
                  className={`inline-block h-7 w-7 transform rounded-full
                             bg-white shadow transition-transform
                             ${form.similar_clubs_offer ? "translate-x-10" : "translate-x-1.5"}`}
                />
              </button>
            </FormField>
          </div>

          {/* Description */}
          <FormField label="Descripción" required>
            <textarea
              placeholder="Describa la actividad, equipamiento necesario y beneficios..."
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 rounded-[var(--radius-md)]
                         bg-[var(--color-surface-1)] border border-white/[0.08]
                         text-sm font-ui text-[var(--color-silver-200)] placeholder:text-[var(--color-silver-500)]
                         resize-y min-h-[80px]
                         focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]"
            />
          </FormField>

          {/* Tags */}
          <FormField label="Etiquetas (separadas por coma)">
            <Input
              placeholder="acuático, fitness, outdoor"
              value={form.tags}
              onChange={(e) => updateField("tags", e.target.value)}
            />
          </FormField>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={resetForm}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              icon={<Lightbulb className="w-4 h-4"/>}
              onClick={handleSubmit}
              disabled={!isFormValid || createMutation.isPending}
            >
              {createMutation.isPending
                ? "Registrando..."
                : "Proponer Actividad"}
            </Button>
          </div>
        </Card>
      )}

      {/* ── Empty ── */}
      {suggestions.length === 0 && !showForm && (
        <EmptyState
          icon={
            <Lightbulb className="w-8 h-8 text-[var(--color-silver-500)]" />
          }
          title="Sin sugerencias de actividades"
          description="Proponga una nueva actividad para enviarla a aprobación."
          action={{
            label: "Nueva Sugerencia",
            onClick: () => setShowForm(true),
          }}
        />
      )}

      {/* ── Desktop table ── */}
      {suggestions.length > 0 && (
        <>
          <div className="hidden sm:block">
            <div className="rounded-[var(--radius-lg)] border border-white/[0.08] overflow-hidden">
              <table className="w-full text-sm" role="table">
                <thead>
                  <tr className="bg-[var(--color-surface-1)]">
                    <th className="px-4 py-3 text-left font-ui font-medium text-[var(--color-silver-400)] text-xs">
                      Actividad
                    </th>
                    <th className="px-4 py-3 text-left font-ui font-medium text-[var(--color-silver-400)] text-xs">
                      Demografía
                    </th>
                    <th className="px-4 py-3 text-right font-ui font-medium text-[var(--color-silver-400)] text-xs">
                      Interés
                    </th>
                    <th className="px-4 py-3 text-right font-ui font-medium text-[var(--color-silver-400)] text-xs">
                      Costo
                    </th>
                    <th className="px-4 py-3 text-right font-ui font-medium text-[var(--color-silver-400)] text-xs">
                      Solicitudes
                    </th>
                    <th className="px-4 py-3 text-left font-ui font-medium text-[var(--color-silver-400)] text-xs">
                      Estado
                    </th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {suggestions.map((s) => {
                    const isExpanded = expandedId === s.id;

                    return (
                      <tr
                        key={s.id}
                        className={`border-t border-white/[0.06] cursor-pointer
                                    hover:bg-[var(--color-surface-1)] transition-colors
                                    ${isExpanded ? "bg-[var(--color-surface-1)]" : ""}`}
                        onClick={() => toggleExpand(s.id)}
                        role="row"
                        aria-expanded={isExpanded}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {s.similar_clubs_offer && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-teal-400)] shrink-0" />
                            )}
                            <span className="font-ui font-semibold text-[var(--color-silver-100)]">
                              {s.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[var(--color-silver-400)] text-xs">
                          {s.target_demographic}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <InterestBar value={s.estimated_interest} />
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[var(--color-silver-300)]">
                          {formatCurrency(s.estimated_cost)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[var(--color-silver-300)]">
                          {s.member_requests_count}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              SUGGESTION_STATUS_CONFIG[s.status]?.variant ??
                              "default"
                            }
                            size="sm"
                          >
                            {SUGGESTION_STATUS_CONFIG[s.status]?.label ??
                              s.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-[var(--color-silver-500)]" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-[var(--color-silver-500)]" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Mobile cards ── */}
          <div className="sm:hidden space-y-3">
            {suggestions.map((s) => (
              <SuggestionCard
                key={s.id}
                suggestion={s}
                isExpanded={expandedId === s.id}
                onToggle={() => toggleExpand(s.id)}
                prefersReduced={prefersReduced}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Expanded detail ── */}
      {expandedId && (
        <SuggestionDetailPanel
          suggestion={
            suggestions.find((s) => s.id === expandedId) ?? null
          }
          prefersReduced={prefersReduced}
        />
      )}

      {/* Keyframes */}
      {!prefersReduced && (
        <style>{`
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      )}
    </div>
  );
}

// ── Interest Bar ───────────────────────────────────────────

function InterestBar({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value));
  const color =
    clamped >= 75
      ? "var(--color-emerald-400)"
      : clamped >= 50
        ? "var(--color-amber-400)"
        : "var(--color-rose-400)";

  return (
    <div className="flex items-center gap-2 justify-end">
      <div
        className="w-16 h-1.5 rounded-full overflow-hidden"
        style={{
          backgroundColor: `color-mix(in srgb, var(--color-silver-600) 30%, transparent)`,
        }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-mono text-[var(--color-silver-400)] w-8 text-right">
        {clamped}
      </span>
    </div>
  );
}

// ── Mobile Card ────────────────────────────────────────────

function SuggestionCard({ suggestion: s, isExpanded, onToggle }: {
  suggestion: ActivitySuggestion;
  isExpanded: boolean;
  onToggle: () => void;
  prefersReduced: boolean;
}) {
  return (
    <Card className="p-4 space-y-3" onClick={onToggle}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {s.similar_clubs_offer && (
            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-teal-400)] shrink-0" />
          )}
          <h4 className="font-ui font-semibold text-[var(--color-silver-100)] text-sm truncate">
            {s.name}
          </h4>
        </div>
        <Badge
          variant={SUGGESTION_STATUS_CONFIG[s.status]?.variant ?? "default"}
          size="sm"
        >
          {SUGGESTION_STATUS_CONFIG[s.status]?.label ?? s.status}
        </Badge>
      </div>

      <p className="text-xs text-[var(--color-silver-400)] line-clamp-2">
        {s.description}
      </p>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-[var(--color-silver-500)]">Demografía</p>
          <p className="text-[var(--color-silver-300)] truncate">
            {s.target_demographic}
          </p>
        </div>
        <div>
          <p className="text-[var(--color-silver-500)]">Costo</p>
          <p className="font-mono text-[var(--color-silver-300)]">
            {formatCurrency(s.estimated_cost)}
          </p>
        </div>
        <div>
          <p className="text-[var(--color-silver-500)]">Solicitudes</p>
          <p className="font-mono text-[var(--color-silver-300)]">
            {s.member_requests_count}
          </p>
        </div>
      </div>

      <InterestBar value={s.estimated_interest} />

      {isExpanded && s.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/[0.06]">
          {s.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]
                         font-ui bg-[var(--color-surface-0)] border border-white/[0.06]
                         text-[var(--color-silver-400)]"
            >
              <Tag className="w-2.5 h-2.5" />
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex justify-center">
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[var(--color-silver-500)]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--color-silver-500)]" />
        )}
      </div>
    </Card>
  );
}

// ── Detail Panel ───────────────────────────────────────────

function SuggestionDetailPanel({
  suggestion,
  prefersReduced,
}: {
  suggestion: ActivitySuggestion | null;
  prefersReduced: boolean;
}) {
  if (!suggestion) return null;

  return (
    <Card
      className={`p-5 space-y-4 ${
        prefersReduced
          ? ""
          : "opacity-0 animate-[slideDown_0.3s_ease_forwards]"
      }`}
      role="region"
      aria-label={`Detalle de ${suggestion.name}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-ui font-semibold text-[var(--color-silver-100)]">
            {suggestion.name}
          </h3>
          <p className="text-xs text-[var(--color-silver-500)] mt-0.5">
            {suggestion.target_demographic}
          </p>
        </div>
        <Badge
          variant={
            SUGGESTION_STATUS_CONFIG[suggestion.status]?.variant ?? "default"
          }
        >
          {SUGGESTION_STATUS_CONFIG[suggestion.status]?.label ??
            suggestion.status}
        </Badge>
      </div>

      <p className="text-sm text-[var(--color-silver-300)] leading-relaxed">
        {suggestion.description}
      </p>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--color-surface-1)] border border-white/[0.06]">
          <p className="text-[10px] text-[var(--color-silver-500)] mb-0.5">
            Interés Estimado
          </p>
          <p className="text-sm font-mono font-semibold text-[var(--color-silver-100)]">
            {suggestion.estimated_interest}%
          </p>
        </div>
        <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--color-surface-1)] border border-white/[0.06]">
          <p className="text-[10px] text-[var(--color-silver-500)] mb-0.5">
            Costo Estimado
          </p>
          <p className="text-sm font-mono font-semibold text-[var(--color-silver-100)]">
            {formatCurrency(suggestion.estimated_cost)}
          </p>
        </div>
        <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--color-surface-1)] border border-white/[0.06]">
          <p className="text-[10px] text-[var(--color-silver-500)] mb-0.5">
            Solicitudes
          </p>
          <p className="text-sm font-mono font-semibold text-[var(--color-silver-100)]">
            {suggestion.member_requests_count}
          </p>
        </div>
        <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--color-surface-1)] border border-white/[0.06]">
          <p className="text-[10px] text-[var(--color-silver-500)] mb-0.5">
            Otros Clubes
          </p>
          <p className="text-sm font-ui font-semibold text-[var(--color-silver-100)]">
            {suggestion.similar_clubs_offer ? "Sí" : "No"}
          </p>
        </div>
      </div>

      {/* Tags */}
      {suggestion.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestion.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]
                         font-ui bg-[var(--color-surface-0)] border border-white/[0.06]
                         text-[var(--color-silver-400)]"
            >
              <Tag className="w-2.5 h-2.5" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Dates */}
      <div className="flex justify-between text-[10px] text-[var(--color-silver-600)]">
        <span>
          Creado:{" "}
          {new Date(suggestion.created_at).toLocaleDateString("es-CR")}
        </span>
        {suggestion.updated_at && (
          <span>
            Actualizado:{" "}
            {new Date(suggestion.updated_at).toLocaleDateString("es-CR")}
          </span>
        )}
      </div>
    </Card>
  );
}
