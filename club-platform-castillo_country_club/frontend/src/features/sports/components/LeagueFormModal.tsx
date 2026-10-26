// ═══════════════════════════════════════════════════════════
// src/features/sports/components/LeagueFormModal.tsx
// §B4.12 — League Form Modal V2
// Level 5+ Production Grade · Phase 33 "The Arena"
//
// REWRITE V1 → V2
// HITL approval form for league creation. Team builder,
// season picker, format selector, risk summary.
// Living Protocol: 4/7 (forms)
//
// VERIFIED TYPES:
//   SPORT_CONFIG → { label, icon, color, ... }
//   LEAGUE_FORMAT_CONFIG → { label, ... }
//   SportType → enum
//   LeagueFormat → enum
//
// CHANGES FROM V1:
//   ✗ cn() ×14 → BEM
//   ✗ Tailwind ×65 → BEM CSS
//   ✗ Button ×3 → BEM buttons
//   ✗ Loader2 → BEM spinner
//   ✗ useReducedMotion → window.matchMedia
//   ✗ animate-in fade-in-0 zoom-in-95 → BEM keyframes
//   ✗ animate-spin → BEM spin
//   ✗ Mixed import (SportType value+type) → separated
//   ✓ data-mode, data-has-error, data-hitl, data-submitting
//   ✓ Light mode, responsive
//
// @version 2.0.0
// @phase   33 — "The Arena"
// @component LeagueFormModal
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Users, Calendar, AlertTriangle, Plus, Trash2 } from "lucide-react";
import type { SportType, LeagueFormat, SportsDashboardMode } from "../types";
import { SPORT_CONFIG, LEAGUE_FORMAT_CONFIG } from "../types";
import "./LeagueFormModal.css";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

export interface LeagueFormModalProps {
  onClose: () => void;
  onSuccess: () => void;
  ambientMode?: SportsDashboardMode;
}

// ═══════════════════════════════════════════════════════════
// §2 — CONSTANTS
// ═══════════════════════════════════════════════════════════

const AVAILABLE_SPORTS: SportType[] = [
  "tennis", "golf", "padel", "football", "basketball", "volleyball",
] as SportType[];

const SEASON_OPTIONS = [
  "Verano 2026",
  "Invierno 2026",
  "Trimestral 2026-Q1",
  "Trimestral 2026-Q2",
  "Trimestral 2026-Q3",
  "Trimestral 2026-Q4",
  "Anual 2026",
];

const FORMAT_OPTIONS = Object.entries(LEAGUE_FORMAT_CONFIG).map(
  ([key, cfg]) => ({ value: key, label: cfg.label }),
);

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
    <div className="spt-lf__field">
      <label className="spt-lf__label">
        {icon}
        {label}
      </label>
      {children}
      {error && <p className="spt-lf__error">{error}</p>}
    </div>
  );
}

// ── §3.2 TeamBuilder ─────────────────────────────────────

function TeamBuilder({
  teams,
  maxTeams,
  newTeam,
  error,
  onNewTeamChange,
  onAddTeam,
  onRemoveTeam,
}: {
  teams: string[];
  maxTeams: number;
  newTeam: string;
  error?: string;
  onNewTeamChange: (v: string) => void;
  onAddTeam: () => void;
  onRemoveTeam: (idx: number) => void;
}) {
  const atCapacity = teams.length >= maxTeams;

  return (
    <div className="spt-lf__field">
      <label className="spt-lf__label">
        <Users className="spt-lf__label-icon" />
        Equipos ({teams.length}/{maxTeams})
      </label>

      <div className="spt-lf__team-row">
        <input
          type="text"
          value={newTeam}
          onChange={(e) => onNewTeamChange(e.target.value)}
          placeholder="Nombre del equipo"
          disabled={atCapacity}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAddTeam();
            }
          }}
          className="spt-lf__input spt-lf__input--compact"
        />
        <button
          type="button"
          className="spt-lf__add-btn"
          onClick={onAddTeam}
          disabled={atCapacity || !newTeam.trim()}
          aria-label="Agregar equipo"
        >
          <Plus className="spt-lf__add-icon" />
        </button>
      </div>

      {error && <p className="spt-lf__error">{error}</p>}

      {teams.length > 0 && (
        <div className="spt-lf__team-list">
          {teams.map((team, idx) => (
            <span key={`${team}-${idx}`} className="spt-lf__team-chip">
              {team}
              <button
                type="button"
                className="spt-lf__team-remove"
                onClick={() => onRemoveTeam(idx)}
                aria-label={`Quitar ${team}`}
              >
                <Trash2 className="spt-lf__team-remove-icon" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── §3.3 RiskSummary (HITL) ──────────────────────────────

function RiskSummary({
  name,
  sport,
  format,
  season,
  teamCount,
  maxTeams,
  startDate,
  endDate,
}: {
  name: string;
  sport: string;
  format: string;
  season: string;
  teamCount: number;
  maxTeams: number;
  startDate: string;
  endDate: string;
}) {
  return (
    <div className="spt-lf__risk" data-hitl="true">
      <div className="spt-lf__risk-header">
        <AlertTriangle className="spt-lf__risk-icon" />
        <p className="spt-lf__risk-title">Resumen de riesgo (HITL)</p>
      </div>
      <ul className="spt-lf__risk-list">
        {name && <li>Liga: {name}</li>}
        <li>Deporte: {SPORT_CONFIG[sport as SportType]?.label ?? sport}</li>
        <li>Formato: {LEAGUE_FORMAT_CONFIG[format as LeagueFormat]?.label ?? format}</li>
        <li>Temporada: {season}</li>
        <li>{teamCount} equipo(s) / máximo {maxTeams}</li>
        <li>Duración: {startDate} → {endDate}</li>
      </ul>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §4 — COMPONENT
// ═══════════════════════════════════════════════════════════

export function LeagueFormModal({
  onClose,
  onSuccess,
  ambientMode = "calm",
}: LeagueFormModalProps) {
  const rm =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const nameRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [sport, setSport] = useState<SportType>("tennis" as SportType);
  const [format, setFormat] = useState("round_robin");
  const [season, setSeason] = useState("Verano 2026");
  const [startDate, setStartDate] = useState(futureDateISO(14));
  const [endDate, setEndDate] = useState(futureDateISO(90));
  const [maxTeams, setMaxTeams] = useState(8);
  const [teams, setTeams] = useState<string[]>([]);
  const [newTeam, setNewTeam] = useState("");
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
  const addTeam = useCallback(() => {
    const trimmed = newTeam.trim();
    if (!trimmed || teams.includes(trimmed) || teams.length >= maxTeams) return;
    setTeams((prev) => [...prev, trimmed]);
    setNewTeam("");
  }, [newTeam, teams, maxTeams]);

  const removeTeam = useCallback((idx: number) => {
    setTeams((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const validate = useCallback((): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Ingresá el nombre de la liga";
    if (!startDate) e.startDate = "Seleccioná fecha de inicio";
    if (!endDate) e.endDate = "Seleccioná fecha de fin";
    if (startDate && endDate && endDate < startDate) {
      e.endDate = "La fecha de fin debe ser posterior";
    }
    if (teams.length < 2) e.teams = "Mínimo 2 equipos";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [name, startDate, endDate, teams]);

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
      className="spt-lf__overlay"
      data-mode={ambientMode}
      data-prefers-reduced={rm}
      role="dialog"
      aria-modal="true"
      aria-label="Crear liga deportiva"
    >
      {/* Backdrop */}
      <div
        className="spt-lf__backdrop"
        onClick={onClose}
        aria-hidden
      />

      {/* Modal */}
      <div className="spt-lf__modal" data-submitting={isSubmitting ? "true" : undefined}>
        {/* Header */}
        <div className="spt-lf__header">
          <div>
            <h2 className="spt-lf__title">⚽ Crear Liga Deportiva</h2>
            <p className="spt-lf__hitl-badge">
              <AlertTriangle className="spt-lf__hitl-badge-icon" />
              Requiere aprobación del administrador (HITL)
            </p>
          </div>
          <button
            type="button"
            className="spt-lf__close-btn"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X className="spt-lf__close-icon" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="spt-lf__body">
          {/* Name */}
          <FormField label="Nombre de la liga *" error={errors.name}>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Liga de Tennis Verano 2026"
              className="spt-lf__input"
              data-has-error={!!errors.name || undefined}
            />
          </FormField>

          {/* Sport + Format */}
          <div className="spt-lf__row-2">
            <FormField label="Deporte *" icon={<Users className="spt-lf__label-icon" />}>
              <select
                className="spt-lf__select"
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
                className="spt-lf__select"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                {FORMAT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {/* Season + Max Teams */}
          <div className="spt-lf__row-2">
            <FormField
              label="Temporada *"
              icon={<Calendar className="spt-lf__label-icon" />}
            >
              <select
                className="spt-lf__select"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
              >
                {SEASON_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </FormField>

            <FormField
              label="Máx. equipos *"
              icon={<Users className="spt-lf__label-icon" />}
            >
              <input
                type="number"
                min={2}
                max={32}
                value={maxTeams}
                onChange={(e) => setMaxTeams(parseInt(e.target.value) || 2)}
                className="spt-lf__input spt-lf__input--mono"
              />
            </FormField>
          </div>

          {/* Dates */}
          <div className="spt-lf__row-2">
            <FormField label="Inicio *" error={errors.startDate}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="spt-lf__input"
                data-has-error={!!errors.startDate || undefined}
              />
            </FormField>

            <FormField label="Fin *" error={errors.endDate}>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                className="spt-lf__input"
                data-has-error={!!errors.endDate || undefined}
              />
            </FormField>
          </div>

          {/* Team Builder */}
          <TeamBuilder
            teams={teams}
            maxTeams={maxTeams}
            newTeam={newTeam}
            error={errors.teams}
            onNewTeamChange={setNewTeam}
            onAddTeam={addTeam}
            onRemoveTeam={removeTeam}
          />

          {/* Risk Summary (HITL) */}
          <RiskSummary
            name={name}
            sport={sport}
            format={format}
            season={season}
            teamCount={teams.length}
            maxTeams={maxTeams}
            startDate={startDate}
            endDate={endDate}
          />

          {/* Actions */}
          <div className="spt-lf__actions">
            <button
              type="button"
              className="spt-lf__cancel-btn"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="spt-lf__submit-btn"
              disabled={isSubmitting}
              data-submitting={isSubmitting ? "true" : undefined}
            >
              {isSubmitting ? (
                <>
                  <span className="spt-lf__spinner" />
                  Enviando...
                </>
              ) : (
                "Enviar para Aprobación"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}