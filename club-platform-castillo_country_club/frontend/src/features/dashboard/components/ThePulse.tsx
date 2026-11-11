// ═══════════════════════════════════════════════════════════
// Castillo Country Club — The Pulse: Club Vital Signs
//
// Premium enhancements:
// + Glass cards with domain-colored halos (breathe animation)
// + Critical halo (faster, more intense)
// + Hover glow per domain accent color
// + Gauge drop-shadow for critical + global
// + Critical badge pulse animation
// + Trend arrow bounce-in
// + Glass compact wrapper with breathing ambient
// + Glass separator for on-demand toggle
// + NeonBorder preserved (layers with halo)
// ═══════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { useBreakpoint } from "@/shared/hooks/useBreakpoint";
import { Button, Skeleton } from "@/shared/components/ui";
import { cn } from "@/shared/lib/utils";
import {
  DollarSign, CalendarDays, SmilePlus, UserPlus, Mail,
  Dumbbell, Users, Brain, ClipboardList, Heart,
  ChevronDown, ChevronUp, Activity,
  TrendingUp, TrendingDown, Minus, Link2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CausalChainViz } from "@/shared/components/ai/CausalChainViz";
import { PulseRadar } from "./PulseRadar";
import { NeonBorder } from "./NeonBorder";
import type { PulseVital, RadarRingData } from "@/shared/hooks/usePulseVitals";
import './ThePulse.css';
/* ══════════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════════ */

function getScoreHex(score: number | null): string {
  if (score == null) return "#3D4755";
  if (score >= 80) return "#3DAA70";
  if (score >= 65) return "#2A9AB5";
  if (score >= 45) return "#D4A840";
  return "#C46470";
}

/* ══════════════════════════════════════════════════════════
   CSS Keyframes
   ══════════════════════════════════════════════════════════ */

const PULSE_KEYFRAMES = `
@keyframes halo-breathe {
  0%, 100% { opacity: 0.40; transform: scale(1); }
  50% { opacity: 0.70; transform: scale(1.06); }
}
@keyframes critical-halo-breathe {
  0%, 100% { opacity: 0.50; transform: scale(1); }
  50% { opacity: 0.85; transform: scale(1.10); }
}
`;

/* ══════════════════════════════════════════════════════════
   Icon & Color Maps
   ══════════════════════════════════════════════════════════ */

const VITAL_ICONS: Record<string, LucideIcon> = {
  financial: DollarSign,
  events: CalendarDays,
  satisfaction: SmilePlus,
  guest: UserPlus,
  communications: Mail,
  sports: Dumbbell,
  family: Users,
  ml: Brain,
  recommendations: ClipboardList,
  global: Heart,
};

const VITAL_ACCENT_COLORS: Record<string, string> = {
  financial: "var(--color-gold-400)",
  events: "var(--color-teal-400)",
  satisfaction: "var(--color-teal-400)",
  guest: "var(--color-teal-400)",
  communications: "var(--color-amber-400)",
  sports: "var(--color-gold-400)",
  family: "var(--color-teal-400)",
  ml: "var(--color-gold-400)",
  recommendations: "var(--color-amber-400)",
  global: "var(--color-rose-400)",
};

/* ══════════════════════════════════════════════════════════
   VitalGauge — SVG arc with optional glow
   ══════════════════════════════════════════════════════════ */

function VitalGauge({
  score,
  color,
  size = 48,
  isLoading,
  delay = 0,
  glowClass,
}: {
  score: number | null;
  color: string;
  size?: number;
  isLoading: boolean;
  delay: number;
  glowClass?: string;
}) {
  const reduced = useReducedMotion();
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset =
    score !== null
      ? circumference - (score / 100) * circumference
      : circumference;

  if (isLoading) {
    return (
      <div className="rounded-full flex items-center justify-center" style={{ width: size, height: size }}>
        <Skeleton className="rounded-full w-full h-full" />
      </div>
    );
  }

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: delay * 0.06, ease: "easeOut" as const }}
      className={cn("relative flex items-center justify-center", glowClass)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-surface-3)" strokeWidth="2" />
        {score !== null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: reduced ? "none" : "stroke-dashoffset 0.8s var(--ease-apple)",
            }}
          />
        )}
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center font-[family-name:var(--font-mono)] font-bold"
        style={{
          fontSize: size < 50 ? "12px" : size < 60 ? "14px" : "16px",
          color: score !== null ? color : "var(--color-silver-600)",
        }}
      >
        {score !== null ? score : "\u2014"}
      </span>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════
   TrendArrow — with bounce-in animation
   ══════════════════════════════════════════════════════════ */

function TrendArrow({
  trend,
  animate = true,
}: {
  trend: "improving" | "stable" | "declining" | null;
  animate?: boolean;
}) {
  const reduced = useReducedMotion();
  if (!trend) return null;

  const config = {
    improving: { icon: TrendingUp, color: "var(--color-teal-400)" },
    stable: { icon: Minus, color: "var(--color-silver-500)" },
    declining: { icon: TrendingDown, color: "var(--color-rose-400)" },
  };
  const { icon: Icon, color } = config[trend];

  if (animate && !reduced) {
    return (
      <motion.span
        initial={{ opacity: 0, scale: 0.5, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="inline-flex"
      >
        <Icon size={11} strokeWidth={2} style={{ color }} />
      </motion.span>
    );
  }

  return <Icon size={11} strokeWidth={2} style={{ color }} />;
}

/* ══════════════════════════════════════════════════════════
   VitalCard — Grid (glass + halo + glow) or Strip (compact)
   ══════════════════════════════════════════════════════════ */

function VitalCard({
  vital,
  index,
  isGlobal,
  cardMode = "strip",
}: {
  vital: PulseVital;
  index: number;
  isGlobal: boolean;
  cardMode?: "strip" | "grid";
}) {
  const reduced = useReducedMotion();
  const Icon = VITAL_ICONS[vital.id] ?? Activity;
  const accentColor = VITAL_ACCENT_COLORS[vital.id] ?? "var(--color-silver-400)";
  const [showWhy, setShowWhy] = useState(false);

  const isCritical = vital.score !== null && vital.score < 50;
  const isNotReady = vital.isOnDemand && !vital.isReady;
  const hasChain = !!vital.causalExplanation;

  // ── Expanded grid card ────────────────────────────────
  if (cardMode === "grid") {
    const neonHex = getScoreHex(vital.score);
    const haloColor = isCritical
      ? "rgba(196, 100, 112, 0.15)"
      : isGlobal
        ? "rgba(201, 169, 110, 0.12)"
        : `color-mix(in srgb, ${accentColor} 10%, transparent)`;

    return (
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: index * 0.06 }}
        className="relative"
      >
        {/* Halo glow — behind card */}
        {vital.score !== null && !isNotReady && !reduced && (
          <div
            className={cn(
              "glass-pulse-card__halo",
              isCritical && "glass-pulse-card__halo--critical",
            )}
            style={{ "--halo-color": haloColor } as React.CSSProperties}
            aria-hidden="true"
          />
        )}

        {/* Card */}
        <div
          className={cn(
            "glass-pulse-card relative z-[1]",
            "flex flex-col items-center gap-2.5 p-4",
            isGlobal && "glass-pulse-card--global",
            isCritical && !isNotReady && "glass-pulse-card--critical",
            isNotReady && "opacity-50",
          )}
          title={vital.detail}
        >
          {/* Hover glow (domain accent color) */}
          <div
            className="glass-pulse-card__hover-glow"
            style={{ "--glow-color": `color-mix(in srgb, ${accentColor} 8%, transparent)` } as React.CSSProperties}
            aria-hidden="true"
          />

          {/* Neon border (canvas-based, inside card) */}
          {vital.score !== null && !isNotReady && !reduced && (
            <NeonBorder
              color={neonHex}
              speed={isCritical ? 1.5 : 1}
              thickness={isCritical ? 4 : 3}
              glowSize={isCritical ? 20 : 16}
              borderRadius={16}
            />
          )}

          {/* Gauge — with drop-shadow for critical/global */}
          <div className="relative flex items-center justify-center" style={{ width: 72, height: 72 }}>
            <VitalGauge
              score={isNotReady ? null : vital.score}
              color={vital.color}
              size={64}
              isLoading={vital.isLoading && vital.isReady}
              delay={index}
              glowClass={isCritical ? "glass-pulse-gauge--critical" : isGlobal ? "glass-pulse-gauge--global" : undefined}
            />
          </div>

          {/* Label */}
          <div className="flex items-center gap-1.5 relative z-[1]">
            <Icon size={13} strokeWidth={1.5} style={{ color: accentColor }} />
            <span className="text-[13px] font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
              {vital.label}
            </span>
          </div>

          {/* Trend */}
          {vital.trend && (
            <div className="flex items-center gap-1.5 relative z-[1]">
              <TrendArrow trend={vital.trend} />
              <span
                className={cn(
                  "text-[11px] font-[family-name:var(--font-ui)]",
                  vital.trend === "improving" && "text-[var(--color-teal-400)]",
                  vital.trend === "stable" && "text-[var(--color-silver-500)]",
                  vital.trend === "declining" && "text-[var(--color-rose-400)]",
                )}
              >
                {vital.trend === "improving" ? "Mejorando" : vital.trend === "stable" ? "Estable" : "Declive"}
              </span>
            </div>
          )}

          {/* Detail */}
          {!isNotReady && (
            <p className="text-[12px] text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] text-center leading-snug px-1 relative z-[1]">
              {vital.detail}
            </p>
          )}

          {/* Causal link */}
          {hasChain && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowWhy((p) => !p)}
              className="text-[12px] gap-1 h-7 px-2 text-[var(--color-amber-400)] hover:text-[var(--color-amber-300)] relative z-[1]"
            >
              <Link2 size={11} strokeWidth={2} />
              {showWhy ? "Ocultar" : "¿Por qué?"}
            </Button>
          )}

          {hasChain && showWhy && (
            <div className="w-full mt-1 relative z-[1]">
              <CausalChainViz chains={[vital.causalExplanation!]} compact />
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // ── Compact strip card ────────────────────────────────
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={cn(
        "flex flex-col items-center gap-1.5 py-2 px-1 rounded-[var(--radius-md)] transition-colors duration-200",
        isGlobal && "bg-[color-mix(in srgb,var(--color-gold-400)6%,transparent)]",
        isCritical && !isNotReady && "bg-[color-mix(in srgb,var(--color-rose-400)8%,transparent)]",
      )}
      title={vital.detail}
    >
      <VitalGauge
        score={isNotReady ? null : vital.score}
        color={vital.color}
        size={isGlobal ? 56 : 48}
        isLoading={vital.isLoading && vital.isReady}
        delay={index}
        glowClass={isCritical ? "glass-pulse-gauge--critical" : isGlobal ? "glass-pulse-gauge--global" : undefined}
      />
      <div className="flex items-center gap-1">
        <Icon size={10} strokeWidth={1.5} style={{ color: accentColor }} />
        <span className="text-[10px] font-medium text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] leading-none whitespace-nowrap">
          {vital.label}
        </span>
        <TrendArrow trend={vital.trend} />
        {hasChain && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setShowWhy((p) => !p);
            }}
            className="ml-0.5 p-0 min-h-0 h-auto w-auto text-[var(--color-amber-400)] hover:text-[var(--color-amber-300)]"
            title="¿Por qué?"
            aria-label="Ver cadena causal"
          >
            <Link2 size={10} strokeWidth={2} />
          </Button>
        )}
      </div>
      {hasChain && showWhy && (
        <div className="w-full mt-1">
          <CausalChainViz chains={[vital.causalExplanation!]} compact />
        </div>
      )}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════ */

interface ThePulseProps {
  mode?: "compact" | "expanded";
  vitals: PulseVital[];
  globalScore: number | null;
  criticalCount: number;
  warningCount?: number;
  loadedCount: number;
  totalCount: number;
  expandVitals: boolean;
  onToggleExpand: () => void;
  hasOnDemandVitals: boolean;
  radarRings?: RadarRingData[];
}

export function ThePulse({
  mode = "compact",
  vitals,
  globalScore,
  criticalCount,
  warningCount = 0,
  loadedCount,
  totalCount,
  expandVitals,
  onToggleExpand,
  hasOnDemandVitals,
  radarRings,
}: ThePulseProps) {
  const reduced = useReducedMotion();
  const { isMobile } = useBreakpoint();

  const autoVitals = useMemo(() => vitals.filter((v) => !v.isOnDemand), [vitals]);
  const onDemandVitals = useMemo(() => vitals.filter((v) => v.isOnDemand), [vitals]);
  const globalVital = useMemo(() => vitals.find((v) => v.id === "global"), [vitals]);

  const displayVitals = expandVitals
    ? vitals
    : [...autoVitals.filter((v) => v.id !== "global"), ...(globalVital ? [globalVital] : [])];

  /* ════════════════════════════════════════════════════════
     EXPANDED MODE
     ════════════════════════════════════════════════════════ */
  if (mode === "expanded") {
    return (
      <>
        {!reduced && <style>{PULSE_KEYFRAMES}</style>}

        <motion.section
          initial={reduced ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
          role="region"
          aria-label="Vital Signs del Club"
        >
          {/* ── Radar Section — glass-card ── */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={reduced || criticalCount === 0 ? {} : { scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Activity size={20} strokeWidth={1.5} className="text-[var(--color-gold-400)]" />
                </motion.div>
                <div>
                  <h2 className="text-base font-semibold text-[var(--color-silver-100)] font-[family-name:var(--font-display)]">
                    The Pulse
                  </h2>
                  <p className="text-[12px] text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
                    {loadedCount}/{totalCount} dominios evaluados
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {criticalCount > 0 && (
                  <span
                    className={cn(
                      "px-2.5 py-1 rounded-full bg-[color-mix(in srgb,var(--color-rose-400)15%,transparent)]",
                      "text-[12px] font-bold text-[var(--color-rose-400)] font-[family-name:var(--font-mono)]",
                      !reduced && "glass-pulse-badge--critical",
                    )}
                  >
                    {criticalCount} crítico{criticalCount > 1 ? "s" : ""}
                  </span>
                )}
                {warningCount > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-[color-mix(in srgb,var(--color-amber-400)12%,transparent)] text-[12px] font-bold text-[var(--color-amber-400)] font-[family-name:var(--font-mono)]">
                    {warningCount} alerta{warningCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            {radarRings && radarRings.length > 0 && (
              <div className="flex justify-center py-2">
                <PulseRadar rings={radarRings} centerScore={globalScore} />
              </div>
            )}
          </div>

          {/* ── Auto Vitals Grid ── */}
          <div>
            <h3 className="text-[12px] font-semibold text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] uppercase tracking-wider mb-3">
              Dominios activos
            </h3>
            <div
              className={cn(
                isMobile
                  ? "flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
                  : "grid grid-cols-5 gap-3",
              )}
              style={isMobile ? { scrollbarWidth: "thin", scrollbarColor: "var(--color-surface-3) transparent" } : undefined}
            >
              {autoVitals.map((vital, i) => (
                <VitalCard
                  key={vital.id}
                  vital={vital}
                  index={i}
                  isGlobal={vital.id === "global"}
                  cardMode={isMobile ? "strip" : "grid"}
                />
              ))}
            </div>
          </div>

          {/* ── On-Demand Toggle — glass separator ── */}
          {hasOnDemandVitals && (
            <>
              <Button
                variant="unstyled"
                type="button"
                onClick={onToggleExpand}
                className="glass-pulse-separator group"
              >
                <span className="glass-pulse-separator__line" />
                <span className="text-[13px] font-medium text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] group-hover:text-[var(--color-silver-200)] transition-colors flex items-center gap-1.5 whitespace-nowrap px-4">
                  Dominios adicionales
                  <span className="text-[var(--color-silver-600)]">&middot;</span>
                  {expandVitals ? "Contraer" : `${onDemandVitals.length} más`}
                  {expandVitals ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </span>
                <span className="glass-pulse-separator__line" />
              </Button>

              {expandVitals && (
                <motion.div
                  initial={reduced ? false : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    isMobile ? "flex gap-3 overflow-x-auto pb-2" : "grid grid-cols-5 gap-3",
                  )}
                >
                  {onDemandVitals.map((vital, i) => (
                    <VitalCard
                      key={vital.id}
                      vital={vital}
                      index={autoVitals.length + i}
                      isGlobal={false}
                      cardMode={isMobile ? "strip" : "grid"}
                    />
                  ))}
                  {globalVital && (
                    <VitalCard
                      key={globalVital.id}
                      vital={globalVital}
                      index={autoVitals.length + onDemandVitals.length}
                      isGlobal
                      cardMode={isMobile ? "strip" : "grid"}
                    />
                  )}
                </motion.div>
              )}
            </>
          )}
        </motion.section>
      </>
    );
  }

  /* ════════════════════════════════════════════════════════
     COMPACT MODE — glass wrapper + breathing ambient
     ════════════════════════════════════════════════════════ */
  return (
    <>
      {!reduced && <style>{PULSE_KEYFRAMES}</style>}

      <motion.section
        initial={reduced ? false : { opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="glass-pulse-compact"
        role="region"
        aria-label="Vital Signs del Club"
      >
        {/* Breathing ambient glow */}
        {!reduced && <div className="glass-pulse-compact__breath" aria-hidden="true" />}

        {/* Header */}
        <div className="relative z-[1] flex items-center justify-between px-4 py-2.5 border-b border-[rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-2">
            <motion.div
              animate={reduced || criticalCount === 0 ? {} : { scale: [1, 1.15, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
            >
              <Activity size={16} strokeWidth={1.5} className="text-[var(--color-gold-400)]" />
            </motion.div>
            <h3 className="text-xs font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] uppercase tracking-wider">
              The Pulse
            </h3>
            <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
              {loadedCount}/{totalCount}
            </span>
            {criticalCount > 0 && (
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full bg-[color-mix(in srgb,var(--color-rose-400)15%,transparent)]",
                  "text-[9px] font-bold text-[var(--color-rose-400)] font-[family-name:var(--font-mono)]",
                  !reduced && "glass-pulse-badge--critical",
                )}
              >
                {criticalCount} crítico{criticalCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
          {hasOnDemandVitals && (
            <Button variant="ghost" size="sm" onClick={onToggleExpand} className="text-[10px] gap-1 h-6 px-2">
              {expandVitals ? (
                <>Contraer <ChevronUp size={12} /></>
              ) : (
                <>{onDemandVitals.length} más <ChevronDown size={12} /></>
              )}
            </Button>
          )}
        </div>

        {/* Vitals strip */}
        <div
          className={cn("relative z-[1] flex gap-1 px-3 py-2 overflow-x-auto", isMobile && "scrollbar-thin")}
          style={{ scrollbarWidth: "thin", scrollbarColor: "var(--color-surface-3) transparent" }}
        >
          {displayVitals.map((vital, i) => (
            <VitalCard key={vital.id} vital={vital} index={i} isGlobal={vital.id === "global"} />
          ))}
        </div>
      </motion.section>
    </>
  );
}