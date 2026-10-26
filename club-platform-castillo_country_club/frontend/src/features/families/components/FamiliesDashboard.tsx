// ═══════════════════════════════════════════════════════════
// src/features/families/components/FamiliesDashboard.tsx
// Phase 34+ Migration — Families Dashboard
// Level 6+ Agency · Apple Production Grade · 2027 Intelligence
//
// "The Living Command Surface"
//
// NOT a grid. A fluid, priority-driven surface where cards
// float at depths determined by urgency. The background canvas
// responds to family data. The surface breathes with the family's
// pulse. Cards reposition with spring physics when urgency changes.
//
// PRE-WRITE VERIFICATION:
//   useFamilyDetail          → ../hooks/useFamilyDetail.ts ✅
//   useIntelligenceEngine    → ../hooks/useIntelligenceEngine.ts ✅
//   buildIntelligenceExperience → ../lib/intelligenceExperience.ts ✅
//   EngagementTemperature    → ../ai-types.ts §4 (current, history30d, zone) ✅
//   FamilyPulseVital         → ../ai-types.ts §3 (rhythm, bpm, amplitude) ✅
//   DashboardCanvas          → ./DashboardCanvas.tsx ✅
//   family-atoms.css         → ../family-atoms.css ✅
//
// 8 INNOVATIONS:
//   1. Canvas deep space background (mood-responsive)
//   2. Z-axis urgency positioning (translateZ)
//   3. Breathing surface (pulse rhythm → CSS animation)
//   4. Intelligence auras (glow per card severity)
//   5. Spring physics layout (cards drift to positions)
//   6. Time scrubber (30d history drag)
//   7. Ink dissolve family transition
//   8. Immersive command palette (Cmd+K)
// ═══════════════════════════════════════════════════════════

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import type { CSSProperties } from "react";
import {
  Search, Command, ChevronLeft, ChevronRight,
  Activity, Brain, Users, Calendar, Zap, AlertTriangle,
} from "lucide-react";

import { useFamilyDetail } from "../hooks/useFamilyDetail";
import { useIntelligenceEngine } from "../hooks/useIntelligenceEngine";
import { buildIntelligenceExperience } from "../lib/intelligenceExperience";
import type { AttentionPlacement } from "../lib/intelligenceExperience";

import { DashboardCanvas } from "./DashboardCanvas";

import "../family-atoms.css";
import "./FamiliesDashboard.css";
import type {
  FamilyHealthScore,
  EngagementTemperature,
  FamilyPulseVital
} from "../ai-types";

// ═══════════════════════════════════════════════════════════
// §1  Types
// ════════════════════════════════════════════════
interface FamiliesDashboardProps {
  readonly familyId: string;
  readonly onNavigateFamily?: (direction: "prev" | "next") => void;
  readonly onOpenFamily?: (familyId: string) => void;
  readonly allFamilyIds?: readonly string[];
}

/** A floating card with spring-animated position */
interface FloatingCard {
  readonly id: string;
  readonly label: string;
  readonly urgency: number;       // 0-1
  readonly placement: AttentionPlacement;
  readonly color: string;
  readonly icon: string;
}

/** Spring physics state per card */
interface SpringState {
  x: number;
  y: number;
  z: number;
  scale: number;
  vx: number;
  vy: number;
  vz: number;
  vscale: number;
}

// ═══════════════════════════════════════════════════════════
// §2  Spring Physics
// ═══════════════════════════════════════════════════════════

const SPRING_STIFFNESS = 0.06;
const SPRING_DAMPING = 0.82;

function springStep(
  current: number,
  target: number,
  velocity: number,
): { value: number; velocity: number } {
  const force = (target - current) * SPRING_STIFFNESS;
  const newVel = (velocity + force) * SPRING_DAMPING;
  return { value: current + newVel, velocity: newVel };
}

// ═══════════════════════════════════════════════════════════
// §3  Urgency → Layout Position
// ═══════════════════════════════════════════════════════════

function urgencyToTarget(
  urgency: number,
  index: number,
  total: number,
  containerW: number,
  containerH: number,
): { tx: number; ty: number; tz: number; ts: number } {
  // High urgency → top-left, high z, larger scale
  // Low urgency → bottom-right, low z, smaller scale
  const col = index % 2;
  const row = Math.floor(index / 2);

  const baseX = 20 + col * (containerW * 0.48);
  const baseY = 20 + row * 220;

  // Offset by urgency: high urgency pulls toward top-left
  const urgencyOffsetX = (1 - urgency) * 40;
  const urgencyOffsetY = (1 - urgency) * 30;

  const tx = baseX + urgencyOffsetX;
  const ty = baseY + urgencyOffsetY;

  // Z-axis: urgent cards float, calm cards recede
  const tz = urgency > 0.8 ? 40 : urgency > 0.5 ? 0 : -10;
  const ts = urgency > 0.8 ? 1.02 : urgency > 0.5 ? 1.0 : 0.97;

  return { tx, ty, tz, ts };
}

// ═══════════════════════════════════════════════════════════
// §4  Icon Map
// ═══════════════════════════════════════════════════════════

const ICON_MAP: Record<string, React.ComponentType<React.ComponentPropsWithoutRef<typeof Activity>>> = {
  Activity, Brain, Users, Calendar, Zap, AlertTriangle,
};

// ═══════════════════════════════════════════════════════════
// §5  Component
// ═══════════════════════════════════════════════════════════

export function FamiliesDashboard({
  familyId,
  onNavigateFamily,
  onOpenFamily,
  allFamilyIds,
}: FamiliesDashboardProps) {
  // ── Reduced motion ──
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // ── Mouse tracking for parallax ──
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    },
    [],
  );

  // ── Is light mode ──
  const [isLight, setIsLight] = useState(() =>
    document.documentElement.classList.contains("light"),
  );
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setIsLight(document.documentElement.classList.contains("light"));
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // ── Canvas dimensions ──
  const [dims, setDims] = useState({ w: 800, h: 600 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDims({
          w: Math.floor(entry.contentRect.width),
          h: Math.floor(entry.contentRect.height),
        });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ── Data Layer ──
  const detail = useFamilyDetail(familyId);

  const engine = useIntelligenceEngine({
    familyId,
    familyTier: detail.data?.family?.tier,
    familyEngagement: detail.temperature?.current,
    familyName: detail.data?.family?.familyName,
  });

  // Auto-analyze on mount
  useEffect(() => {
    if (engine.phase === "idle") engine.analyze();
  }, [engine.phase, engine.analyze]);

  // ── Intelligence Experience (P7) ──
  const experience = useMemo(
    () =>
      buildIntelligenceExperience(
        detail.advisor.insights,
        detail.data?.family ?? null,
      ),
    [detail.advisor.insights, detail.data?.family],
  );

  // ── Canvas mood data ──
  const canvasData = useMemo(() => ({
    temperature: detail.temperature?.current ?? 50,
    rhythm: detail.data?.family ? "steady" : "flat", // Default until pulse data wired
    urgency: engine.urgencyLevel || "moderate",
    // HealthScoreResult uses `score` (0-100). Normalize to 0-1 for canvas.
    healthScore: (detail.advisor.healthScore?.score ?? 50) / 100,
  }), [detail.temperature, detail.data?.family, engine.urgencyLevel, detail.advisor.healthScore]);

  // ── Floating cards from intelligence experience ──
  const cards = useMemo((): FloatingCard[] => {
    const result: FloatingCard[] = [];

    // Interrupts (critical)
    for (const slot of experience.interrupts) {
      result.push({
        id: `interrupt-${slot.base.id}`,
        label: slot.narrative,
        urgency: 0.9,
        placement: "interrupt",
        color: "var(--color-rose-400)",
        icon: "AlertTriangle",
      });
    }

    // Heroes (high)
    for (const slot of experience.heroes) {
      result.push({
        id: `hero-${slot.base.id}`,
        label: slot.narrative,
        urgency: 0.7,
        placement: "hero",
        color: "var(--color-gold-400)",
        icon: "Brain",
      });
    }

    // Inlines (medium)
    for (const slot of experience.inlines) {
      result.push({
        id: `inline-${slot.base.id}`,
        label: slot.narrative,
        urgency: 0.4,
        placement: "inline",
        color: "var(--color-teal-400)",
        icon: "Activity",
      });
    }

    // Always add these structural cards
    result.push({
      id: "temperature",
      label: "Temperatura",
      urgency: detail.temperature?.zone === "cold" || detail.temperature?.zone === "frozen" ? 0.8 : 0.3,
      placement: detail.temperature?.zone === "cold" || detail.temperature?.zone === "frozen" ? "hero" : "inline",
      color: "var(--color-gold-400)",
      icon: "Activity",
    });

    result.push({
      id: "members",
      label: "Miembros",
      urgency: 0.2,
      placement: "inline",
      color: "var(--color-silver-400)",
      icon: "Users",
    });

    return result;
  }, [experience, detail.temperature]);

  // ── Spring physics state ──
  const springsRef = useRef<Map<string, SpringState>>(new Map());
  const [, forceUpdate] = useState(0);

  // Initialize spring states
  useEffect(() => {
    for (const card of cards) {
      if (!springsRef.current.has(card.id)) {
        springsRef.current.set(card.id, {
          x: dims.w / 2,
          y: dims.h / 2,
          z: 0,
          scale: 0.8,
          vx: 0,
          vy: 0,
          vz: 0,
          vscale: 0,
        });
      }
    }
  }, [cards, dims]);

  // Spring animation loop
  useEffect(() => {
    if (reducedMotion) return;

    let running = true;
    const step = () => {
      if (!running) return;

      let needsUpdate = false;
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const spring = springsRef.current.get(card.id);
        if (!spring) continue;

        const target = urgencyToTarget(card.urgency, i, cards.length, dims.w, dims.h);

        const sx = springStep(spring.x, target.tx, spring.vx);
        const sy = springStep(spring.y, target.ty, spring.vy);
        const sz = springStep(spring.z, target.tz, spring.vz);
        const ss = springStep(spring.scale, target.ts, spring.vscale);

        spring.x = sx.value;
        spring.y = sy.value;
        spring.z = sz.value;
        spring.scale = ss.value;
        spring.vx = sx.velocity;
        spring.vy = sy.velocity;
        spring.vz = sz.velocity;
        spring.vscale = ss.velocity;

        if (
          Math.abs(spring.vx) > 0.01 ||
          Math.abs(spring.vy) > 0.01
        ) {
          needsUpdate = true;
        }
      }

      if (needsUpdate) forceUpdate((n) => n + 1);
      requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
    return () => { running = false; };
  }, [cards, dims, reducedMotion]);

  // ── Time Scrubber state ──
  const [scrubberDay, setScrubberDay] = useState(0); // 0 = today, -30 = 30d ago
  const history30d = detail.temperature?.history30d ?? [];

  const scrubberValue = useMemo(() => {
    if (history30d.length === 0) return detail.temperature?.current ?? 50;
    const idx = Math.max(0, Math.min(29, 29 + scrubberDay));
    return history30d[idx] ?? detail.temperature?.current ?? 50;
  }, [history30d, scrubberDay, detail.temperature]);

  // ── Breathing animation duration ──
  const breatheDuration = useMemo(() => {
    const rhythm = canvasData.rhythm;
    switch (rhythm) {
      case "rhythmic": return "1.5s";
      case "steady": return "3s";
      case "irregular": return "2s";
      case "fading": return "5s";
      case "flat": return "8s";
      default: return "3s";
    }
  }, [canvasData.rhythm]);

  // ── Command palette state ──
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
      if (e.key === "Escape" && paletteOpen) {
        setPaletteOpen(false);
        setPaletteQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [paletteOpen]);

  // ── Keyboard nav ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (paletteOpen) return;
      if (e.key === "ArrowLeft" && onNavigateFamily) onNavigateFamily("prev");
      if (e.key === "ArrowRight" && onNavigateFamily) onNavigateFamily("next");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [paletteOpen, onNavigateFamily]);

  // ── Loading state ──
  if (detail.isLoading) {
    return (
      <div className="fm-dash" data-testid="families-dashboard" data-state="loading">
        <div className="fm-dash__loading">
          <div className="fm-dash__loading-orb" />
          <p className="fm-dash__loading-text">Cargando inteligencia...</p>
        </div>
      </div>
    );
  }

  if (detail.isError) {
    return (
      <div className="fm-dash" data-testid="families-dashboard" data-state="error">
        <p className="fm-dash__error">
          Error cargando la familia.
        </p>
      </div>
    );
  }

  const familyName = detail.data?.family?.familyName ?? "Familia";

  return (
    <div
      ref={containerRef}
      className="fm-dash"
      data-testid="families-dashboard"
      data-urgency={engine.urgencyLevel || "moderate"}
      data-phase={engine.phase}
      style={
        {
          "--breathe-duration": breatheDuration,
          "--scrubber-value": scrubberValue,
        } as CSSProperties
      }
      onMouseMove={handleMouseMove}
    >
      {/* ══════ Layer 0: Canvas Deep Space ══════ */}
      <DashboardCanvas
        width={dims.w}
        height={dims.h}
        temperature={canvasData.temperature}
        rhythm={canvasData.rhythm}
        urgency={canvasData.urgency}
        healthScore={canvasData.healthScore}
        mouseX={mousePos.x}
        mouseY={mousePos.y}
        animate={!reducedMotion}
        isLight={isLight}
      />

      {/* ══════ Layer 1: Glass Surface ══════ */}
      <div className="fm-dash__surface" data-breathing={!reducedMotion}>

        {/* ── Command Bar ── */}
        <div className="fm-dash__command-bar">
          <div className="fm-dash__command-left">
            <button
              type="button"
              className="fm-dash__nav-btn"
              onClick={() => onNavigateFamily?.("prev")}
              aria-label="Familia anterior"
            >
              <ChevronLeft size={14} />
            </button>
            <h1 className="fm-dash__family-name">{familyName}</h1>
            <button
              type="button"
              className="fm-dash__nav-btn"
              onClick={() => onNavigateFamily?.("next")}
              aria-label="Siguiente familia"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="fm-dash__command-right">
            <button
              type="button"
              className="fm-dash__palette-trigger"
              onClick={() => setPaletteOpen(true)}
            >
              <Search size={12} />
              <span>Buscar</span>
              <kbd className="fm-dash__kbd">
                <Command size={10} />K
              </kbd>
            </button>

            {/* Composite score badge */}
            {engine.phase === "complete" && (
              <span
                className="fm-dash__score-badge"
                data-urgency={engine.urgencyLevel}
              >
                {engine.compositeScore}
              </span>
            )}
          </div>
        </div>

        {/* ── Floating Cards ── */}
        <div className="fm-dash__cards" style={{ perspective: "1200px" }}>
          {cards.map((card) => {
            const spring = springsRef.current.get(card.id);
            const sx = spring?.x ?? dims.w / 2;
            const sy = spring?.y ?? 40;
            const sz = spring?.z ?? 0;
            const ss = spring?.scale ?? 1;
            const Icon = ICON_MAP[card.icon] ?? Activity;

            return (
              <div
                key={card.id}
                className="fm-dash__card"
                data-placement={card.placement}
                data-urgency-level={
                  card.urgency > 0.8 ? "critical" :
                  card.urgency > 0.5 ? "high" :
                  card.urgency > 0.3 ? "medium" : "low"
                }
                style={
                  reducedMotion
                    ? undefined
                    : ({
                        "--card-x": `${sx}px`,
                        "--card-y": `${sy}px`,
                        "--card-z": `${sz}px`,
                        "--card-scale": ss,
                        transform: `translate3d(${sx}px, ${sy}px, ${sz}px) scale(${ss})`,
                      } as CSSProperties)
                }
              >
                <div className="fm-dash__card-header">
                  <Icon size={11} aria-hidden="true" style={{ color: card.color }} />
                  <span className="fm-dash__card-label">{card.label}</span>
                </div>
                <div className="fm-dash__card-body">
                  {/* Card content rendered by placement type */}
                  {card.id === "temperature" && detail.temperature && (
                    <div className="fm-dash__temp-widget">
                      <span className="fm-dash__temp-value">
                        {scrubberValue}°
                      </span>
                      <span className="fm-dash__temp-zone">
                        {detail.temperature.zone}
                      </span>
                    </div>
                  )}
                  {card.id === "members" && (
                    <span className="fm-dash__members-count">
                      {detail.tabCounts.members} miembros
                    </span>
                  )}
                  {card.placement === "interrupt" && (
                    <p className="fm-dash__card-narrative">{card.label}</p>
                  )}
                </div>
                {/* Aura glow — driven by urgency */}
                <div className="fm-dash__card-aura" data-placement={card.placement} />
              </div>
            );
          })}
        </div>

        {/* ── Intelligence Headline ── */}
        {experience.headline && (
          <div className="fm-dash__headline" data-urgent={experience.hasUrgent}>
            <p className="fm-dash__headline-text">{experience.headline}</p>
          </div>
        )}

        {/* ── Time Scrubber ── */}
        {history30d.length > 0 && (
          <div className="fm-dash__scrubber">
            <span className="fm-dash__scrubber-label">-30d</span>
            <input
              type="range"
              className="fm-dash__scrubber-input"
              min={-29}
              max={0}
              value={scrubberDay}
              onChange={(e) => setScrubberDay(Number(e.target.value))}
              aria-label="Explorar historia temporal"
            />
            <span className="fm-dash__scrubber-label">Hoy</span>
            <span className="fm-dash__scrubber-value">{scrubberValue}°</span>
          </div>
        )}

        {/* ── Keyboard hint ── */}
        <p className="fm-dash__keyboard-hint">
          ← → navegar · Cmd+K buscar · Esc cerrar
        </p>
      </div>

      {/* ══════ Command Palette Overlay ══════ */}
      {paletteOpen && (
        <div
          className="fm-dash__palette-overlay"
          role="dialog"
          aria-label="Paleta de comandos"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setPaletteOpen(false);
              setPaletteQuery("");
            }
          }}
        >
          <div className="fm-dash__palette">
            <div className="fm-dash__palette-input-wrapper">
              <Search size={14} className="fm-dash__palette-search-icon" />
              <input
                className="fm-dash__palette-input"
                placeholder="Buscar familia, acción, o navegación..."
                value={paletteQuery}
                onChange={(e) => setPaletteQuery(e.target.value)}
                autoFocus
              />
              <kbd className="fm-dash__kbd">Esc</kbd>
            </div>
            <div className="fm-dash__palette-results">
              <p className="fm-dash__palette-hint">
                Escribí el nombre de una familia o una acción
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══════ Screen Reader ══════ */}
      <div className="fm-dash__sr-only" aria-live="polite">
        Dashboard de {familyName}. Estado: {engine.phase}.
        {experience.hasUrgent && "Hay alertas urgentes."}
        Puntaje: {engine.compositeScore}/100.
      </div>
    </div>
  );
}