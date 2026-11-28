// ═══════════════════════════════════════════════════════════
// src/features/sports/components/TournamentFormModal.tsx
// §B4.14 — Tournament Form Modal V2
// Level 5+ Production Grade · Phase 33 "The Arena"
//
// REWRITE V1 → V2
// HITL approval form for tournament creation. Format preview
// with bracket visualization, prize structure builder, venue
// input, rules textarea, risk summary with financial impact.
// Living Protocol: 4/7 (forms)
//
// VERIFIED TYPES:
//   TOURNAMENT_FORMAT_CONFIG → { label, description, icon }
//   SPORT_CONFIG → { label, icon, color, ... }
//   SportType → enum
//   TournamentFormat → enum
//
// CHANGES FROM V1:
//   ✗ cn() ×16 → BEM
//   ✗ Tailwind ×70 → BEM CSS
//   ✗ Button ×3 → BEM buttons
//   ✗ Loader2 → BEM spinner
//   ✗ useReducedMotion → window.matchMedia
//   ✗ animate-in fade-in-0 zoom-in-95 → BEM keyframes
//   ✗ animate-spin → BEM spin
//   ✗ Mixed import (SportType value+type) → separated
//   ✓ data-mode, data-has-error, data-hitl, data-submitting,
//     data-format-type, data-terminal
//   ✓ Light mode, responsive
//
// @version 2.0.0
// @phase   33 — "The Arena"
// @component TournamentFormModal
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Trophy,
  Users,
  Calendar,
  MapPin,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import type { SportType, TournamentFormat, SportsDashboardMode } from "../types";
import { SPORT_CONFIG, TOURNAMENT_FORMAT_CONFIG } from "../types";
import "./TournamentFormModal.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

export interface TournamentFormModalProps {
  onClose: () => void;
  onSuccess: () => void;
  ambientMode?: SportsDashboardMode;
}

// ═══════════════════════════════════════════════════════════
// §2 — CONSTANTS
// ═══════════════════════════════════════════════════════════

const AVAILABLE_SPORTS: SportType[] = [
  "tennis", "golf", "padel", "swimming",
  "basketball", "volleyball", "football", "squash",
] as SportType[];

const FORMAT_OPTIONS = Object.entries(TOURNAMENT_FORMAT_CONFIG).map(
  ([key, cfg]) => ({
    value: key,
    label: cfg.label,
    description: cfg.description,
    icon: cfg.icon,
  }),
);

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function futureDateISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// ═══════════════════════════════════════════════════════════
// §3 — SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

// ── §3.1 FormField ───────────────────────────────────────

function FormField({
  label,
  error,
  children,
  icon,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="spt-trnf__field">
      <label className="spt-trnf__label">
        {icon}
        {label}
      </label>
      {children}
      {error && <p className="spt-trnf__error">{error}</p>}
    </div>
  );
}

// ── §3.2 FormatPreview ───────────────────────────────────

function FormatPreview({ format }: { format: string }) {
  const bracketSize = format === "round_robin" ? 4 : 8;

  if (format === "round_robin") {
    return (
      <div className="spt-trnf__format-preview" data-format-type="round_robin">
        <span className="spt-trnf__format-preview-icon">🔄</span>
        <div className="spt-trnf__format-preview-text">
          <p className="spt-trnf__format-preview-title">
            Todos contra Todos
          </p>
          <p className="spt-trnf__format-preview-desc">
            Cada equipo juega contra todos los demás. El de más puntos gana.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="spt-trnf__format-preview" data-format-type="bracket">
      <div className="spt-trnf__bracket">
        {[1, 2, 3].map((round) => (
          <div key={round} className="spt-trnf__bracket-round">
            <span className="spt-trnf__bracket-round-label">
              {round === 1 ? "R1" : round === 2 ? "SF" : "F"}
            </span>
            {Array.from({
              length: Math.max(
                1,
                Math.ceil(bracketSize / Math.pow(2, round)),
              ),
            }).map((_, i) => (
              <div
                key={i}
                className="spt-trnf__bracket-slot"
                data-round={round === 3 ? "final" : undefined}
              >
                <span className="spt-trnf__bracket-slot-text">
                  {round === 3 && i === 0 ? "🏆" : "?"}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── §3.3 PrizeTags ───────────────────────────────────────

function PrizeTags({
  prizes,
  onRemove,
}: {
  prizes: string[];
  onRemove: (idx: number) => void;
}) {
  if (prizes.length === 0) return null;

  return (
    <div className="spt-trnf__prize-tags">
      {prizes.map((prize, idx) => (
        <span key={`${prize}-${idx}`} className="spt-trnf__prize-tag">
          🏆 {prize}
          <Button
            variant="unstyled"
            type="button"
            className="spt-trnf__prize-remove"
            onClick={() => onRemove(idx)}
            aria-label={`Quitar premio ${prize}`}
          >
            ×
          </Button>
        </span>
      ))}
    </div>
  );
}

// ── §3.4 RiskSummary ─────────────────────────────────────

function RiskSummary({
  name,
  sport,
  format,
  maxParticipants,
  venue,
  entryFee,
}: {
  name: string;
  sport: string;
  format: string;
  maxParticipants: number;
  venue: string;
  entryFee: number;
}) {
  const items = [
    name && `Torneo: ${name}`,
    `Deporte: ${SPORT_CONFIG[sport as SportType]?.label ?? sport}`,
    `Formato: ${TOURNAMENT_FORMAT_CONFIG[format as TournamentFormat]?.label ?? format}`,
    `${maxParticipants} participantes máximos`,
    venue && `Sede: ${venue}`,
    entryFee > 0 && `Inscripción: ₡${entryFee.toLocaleString("es-CR")}`,
  ].filter(Boolean);

  return (
    <div className="spt-trnf__risk" data-hitl="true">
      <div className="spt-trnf__risk-header">
        <AlertTriangle className="spt-trnf__risk-icon" />
        <p className="spt-trnf__risk-title">Resumen de riesgo (HITL)</p>
      </div>
      <ul className="spt-trnf__risk-list">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
        {entryFee > 0 && (
          <li className="spt-trnf__risk-financial">
            Impacto financiero estimado: ₡
            {(entryFee * maxParticipants).toLocaleString("es-CR")} en
            inscripciones
          </li>
        )}
      </ul>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §4 — COMPONENT
// ═══════════════════════════════════════════════════════════

export function TournamentFormModal({
  onClose,
  onSuccess,
  ambientMode = "calm",
}: TournamentFormModalProps) {
  const rm =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const nameRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [sport, setSport] = useState<SportType>("tennis" as SportType);
  const [format, setFormat] = useState("single_elimination");
  const [startDate, setStartDate] = useState(futureDateISO(14));
  const [endDate, setEndDate] = useState(futureDateISO(16));
  const [registrationDeadline, setRegistrationDeadline] = useState(
    futureDateISO(10),
  );
  const [maxParticipants, setMaxParticipants] = useState(16);
  const [venue, setVenue] = useState("");
  const [entryFee, setEntryFee] = useState(0);
  const [prizes, setPrizes] = useState<string[]>([]);
  const [newPrize, setNewPrize] = useState("");
  const [rules, setRules] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Auto-focus ──
  useEffect(() => {
    const timer = setTimeout(() => nameRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  // ── Escape to close ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // ── Handlers ──
  const addPrize = useCallback(() => {
    const trimmed = newPrize.trim();
    if (trimmed && !prizes.includes(trimmed)) {
      setPrizes((prev) => [...prev, trimmed]);
      setNewPrize("");
    }
  }, [newPrize, prizes]);

  const removePrize = useCallback((idx: number) => {
    setPrizes((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const validate = useCallback((): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Ingresá el nombre del torneo";
    if (!venue.trim()) e.venue = "Ingresá la sede";
    if (!startDate) e.startDate = "Seleccioná fecha de inicio";
    if (!endDate) e.endDate = "Seleccioná fecha de fin";
    if (startDate && endDate && endDate < startDate) {
      e.endDate = "La fecha de fin debe ser posterior";
    }
    if (!registrationDeadline) {
      e.deadline = "Seleccioná fecha límite de inscripción";
    }
    if (maxParticipants < 4) {
      e.maxParticipants = "Mínimo 4 participantes";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [name, venue, startDate, endDate, registrationDeadline, maxParticipants]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;
      setIsSubmitting(true);
      await new Promise((r) => setTimeout(r, 800));
      setIsSubmitting(false);
      onSuccess();
    },
    [validate, onSuccess],
  );

  // ── Render ──
  return (
    <div
      className="spt-trnf__overlay"
      data-mode={ambientMode}
      data-prefers-reduced={rm}
      role="dialog"
      aria-modal="true"
      aria-label="Crear torneo deportivo"
    >
      {/* Backdrop */}
      <div className="spt-trnf__backdrop" onClick={onClose} aria-hidden />

      {/* Modal */}
      <div
        className="spt-trnf__modal"
        data-submitting={isSubmitting ? "true" : undefined}
      >
        {/* Header */}
        <div className="spt-trnf__header">
          <div>
            <h2 className="spt-trnf__title">🏆 Crear Torneo Deportivo</h2>
            <p className="spt-trnf__hitl-badge">
              <AlertTriangle className="spt-trnf__hitl-badge-icon" />
              Requiere aprobación del administrador (HITL)
            </p>
          </div>
          <Button
            variant="unstyled"
            type="button"
            className="spt-trnf__close-btn"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X className="spt-trnf__close-icon" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="spt-trnf__body">
          {/* Name */}
          <FormField label="Nombre del torneo *" error={errors.name}>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Copa Castillo Tennis 2026"
              className="spt-trnf__input"
              data-has-error={!!errors.name || undefined}
            />
          </FormField>

          {/* Sport + Format */}
          <div className="spt-trnf__row-2">
            <FormField label="Deporte *" icon={<Users className="spt-trnf__label-icon" />}>
              <select
                className="spt-trnf__select"
                value={sport}
                onChange={(e) => setSport(e.target.value as SportType)}
              >
                {AVAILABLE_SPORTS.map((s) => {
                  const cfg = SPORT_CONFIG[s];
                  return (
                    <option key={s} value={s}>
                      {cfg.icon} {cfg.label}
                    </option>
                  );
                })}
              </select>
            </FormField>

            <FormField label="Formato *">
              <select
                className="spt-trnf__select"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                {FORMAT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.icon} {f.label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {/* Format Preview */}
          <FormatPreview format={format} />

          {/* Dates */}
          <div className="spt-trnf__row-3">
            <FormField
              label="Inicio *"
              error={errors.startDate}
              icon={<Calendar className="spt-trnf__label-icon" />}
            >
              <input
                type="date"
                value={startDate}
                min={todayISO()}
                onChange={(e) => setStartDate(e.target.value)}
                className="spt-trnf__input"
                data-has-error={!!errors.startDate || undefined}
              />
            </FormField>

            <FormField
              label="Fin *"
              error={errors.endDate}
              icon={<Calendar className="spt-trnf__label-icon" />}
            >
              <input
                type="date"
                value={endDate}
                min={startDate || todayISO()}
                onChange={(e) => setEndDate(e.target.value)}
                className="spt-trnf__input"
                data-has-error={!!errors.endDate || undefined}
              />
            </FormField>

            <FormField label="Cierre inscr. *" error={errors.deadline}>
              <input
                type="date"
                value={registrationDeadline}
                max={startDate || undefined}
                onChange={(e) => setRegistrationDeadline(e.target.value)}
                className="spt-trnf__input"
                data-has-error={!!errors.deadline || undefined}
              />
            </FormField>
          </div>

          {/* Participants + Entry Fee */}
          <div className="spt-trnf__row-2">
            <FormField
              label="Máx. participantes *"
              error={errors.maxParticipants}
              icon={<Users className="spt-trnf__label-icon" />}
            >
              <input
                type="number"
                min={4}
                max={128}
                value={maxParticipants}
                onChange={(e) =>
                  setMaxParticipants(parseInt(e.target.value) || 4)
                }
                className="spt-trnf__input spt-trnf__input--mono"
                data-has-error={!!errors.maxParticipants || undefined}
              />
            </FormField>

            <FormField
              label="Inscripción (₡)"
              icon={<DollarSign className="spt-trnf__label-icon" />}
            >
              <input
                type="number"
                min={0}
                step={1000}
                value={entryFee}
                onChange={(e) => setEntryFee(parseInt(e.target.value) || 0)}
                className="spt-trnf__input spt-trnf__input--mono"
              />
            </FormField>
          </div>

          {/* Venue */}
          <FormField
            label="Sede *"
            error={errors.venue}
            icon={<MapPin className="spt-trnf__label-icon" />}
          >
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="Cancha Tennis 1 & 2"
              className="spt-trnf__input"
              data-has-error={!!errors.venue || undefined}
            />
          </FormField>

          {/* Prizes */}
          <FormField
            label="Premios"
            icon={<Trophy className="spt-trnf__label-icon spt-trnf__label-icon--gold" />}
          >
            <div className="spt-trnf__prize-row">
              <input
                type="text"
                value={newPrize}
                onChange={(e) => setNewPrize(e.target.value)}
                placeholder="₡150.000 Primer Lugar"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPrize();
                  }
                }}
                className="spt-trnf__input spt-trnf__input--compact"
              />
              <Button
                variant="unstyled"
                type="button"
                className="spt-trnf__add-btn"
                onClick={addPrize}
              >
                Agregar
              </Button>
            </div>
            <PrizeTags prizes={prizes} onRemove={removePrize} />
          </FormField>

          {/* Rules */}
          <FormField label="Reglas (opcional)">
            <textarea
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              rows={2}
              placeholder="Reglas especiales del torneo..."
              className="spt-trnf__textarea"
            />
          </FormField>

          {/* Risk Summary (HITL) */}
          <RiskSummary
            name={name}
            sport={sport}
            format={format}
            maxParticipants={maxParticipants}
            venue={venue}
            entryFee={entryFee}
          />

          {/* Actions */}
          <div className="spt-trnf__actions">
            <Button
              variant="unstyled"
              type="button"
              className="spt-trnf__cancel-btn"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              variant="unstyled"
              type="submit"
              className="spt-trnf__submit-btn"
              disabled={isSubmitting}
              data-submitting={isSubmitting ? "true" : undefined}
            >
              {isSubmitting ? (
                <>
                  <span className="spt-trnf__spinner" />
                  Enviando...
                </>
              ) : (
                "Enviar para Aprobación"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}