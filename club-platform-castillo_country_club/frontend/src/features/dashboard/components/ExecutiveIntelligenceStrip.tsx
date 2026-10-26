// src/features/dashboard/components/ExecutiveIntelligenceStrip.tsx
// ═══════════════════════════════════════════════════════════
// Executive Intelligence Strip — Castillo Country Club
//
// Premium enhancements:
// + Glass wrapper with gold bottom border
// + Glass metric cards with left border color coding
// + Health Score SVG gauge (animated arc)
// + Metric value counter animations (Apple Fitness)
// + Pending badge pulse animation
// + Hover glow per domain color
// + Briefing typewriter word reveal
// + Briefing button shimmer effect
// + Stagger entrance
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Activity, DollarSign, ClipboardCheck, Calendar,
  Sparkles, FileText, ChevronDown, ChevronUp,
} from "lucide-react";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { cn } from "@/shared/lib/utils";
import { Card, Button, Skeleton, showToast } from "@/shared/components/ui";
import type { AiFinancialReport } from "@/features/finance/types";
import './ExecutiveIntelligenceStrip.css';
/* ══════════════════════════════════════════════════════════
   Response types
   ══════════════════════════════════════════════════════════ */

interface ApprovalRequest { id: string; status: string }
interface ApprovalListResponse { requests: ApprovalRequest[] }
interface CalendarEvent { date: string }
interface CalendarResponse { events: CalendarEvent[] }
interface BriefingResponse {
  status?: string;
  briefing?: string;
  data?: { briefing?: string; summary?: string };
  message?: string;
}

/* ══════════════════════════════════════════════════════════
   Animated Counter
   ══════════════════════════════════════════════════════════ */

function useAnimatedCounter(target: number, duration = 1000) {
  const [value, setValue] = useState(0);
  const reduced = useReducedMotion();
  const ref = useRef<HTMLParagraphElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-20px" });
  const started = useRef(false);

  useEffect(() => {
    if (reduced || !isInView) {
      if (isInView) setValue(target);
      return;
    }
    if (started.current) return;
    started.current = true;

    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [target, duration, reduced, isInView]);

  return { value, ref };
}

/* ══════════════════════════════════════════════════════════
   Health Gauge — SVG arc
   ══════════════════════════════════════════════════════════ */

function HealthGauge({
  score,
  color,
  reduced,
}: {
  score: number;
  color: string;
  reduced: boolean;
}) {
  const size = 44;
  const r = 17;
  const circumference = 2 * Math.PI * r;
  const filled = (score / 100) * circumference;

  return (
    <div className="relative flex-shrink-0 glass-exec-gauge" style={{ "--metric-color": color } as React.CSSProperties}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={reduced ? { strokeDashoffset: circumference - filled } : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - filled }}
          transition={reduced ? { duration: 0 } : { duration: 1.2, ease: "easeOut", delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] font-bold font-[family-name:var(--font-mono)]" style={{ color }}>
          {Math.round(score)}
        </span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Metric Card — Glass with left border + glow + counter
   ══════════════════════════════════════════════════════════ */

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  numericValue?: number;
  subtext?: string;
  color: string;
  loading?: boolean;
  delay?: number;
  badge?: { text: string; pulse?: boolean };
  healthScore?: number;
}

function MetricCard({
  icon,
  label,
  value,
  numericValue,
  subtext,
  color,
  loading,
  delay = 0,
  badge,
  healthScore,
}: MetricCardProps) {
  const reduced = useReducedMotion();

  const counter = useAnimatedCounter(
    numericValue ?? 0,
    1000,
  );

  if (loading) {
    return <Skeleton className="h-24 rounded-xl" />;
  }

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : { duration: 0.4, delay, ease: "easeOut" }}
      className="glass-exec-metric"
      style={{ "--metric-color": color } as React.CSSProperties}
      role="status"
      aria-label={`${label}: ${value}`}
    >
      {/* Hover glow */}
      <div
        className="glass-exec-metric__glow"
        style={{ "--metric-glow": `color-mix(in srgb, ${color} 8%, transparent)` } as React.CSSProperties}
        aria-hidden="true"
      />

      <div className="relative z-[1]">
        {/* Icon + Label + Badge */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div
              className="p-1.5 rounded-md"
              style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
            >
              {icon}
            </div>
            <span className="text-[10px] font-medium text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] uppercase tracking-wider">
              {label}
            </span>
          </div>
          {badge && (
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full text-[9px] font-bold font-[family-name:var(--font-mono)]",
                badge.pulse && !reduced && "glass-exec-badge--pending",
              )}
              style={{
                backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
                color,
              }}
            >
              {badge.text}
            </span>
          )}
        </div>

        {/* Value — with optional gauge or counter */}
        <div className="flex items-center gap-2.5">
          {healthScore != null ? (
            <HealthGauge score={healthScore} color={color} reduced={reduced} />
          ) : null}
          <div>
            <p
              ref={numericValue != null ? counter.ref : undefined}
              className="text-lg font-bold font-[family-name:var(--font-display)]"
              style={{ color }}
            >
              {numericValue != null && !reduced
                ? value.replace(String(numericValue), String(counter.value))
                : value}
            </p>
            {subtext && (
              <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mt-0.5">
                {subtext}
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════
   Typewriter — Word-by-word reveal
   ══════════════════════════════════════════════════════════ */

function TypewriterReveal({ text, reduced }: { text: string; reduced: boolean }) {
  if (reduced) {
    return (
      <p className="text-sm text-[var(--color-silver-300)] font-[family-name:var(--font-body)] leading-relaxed whitespace-pre-wrap">
        {text}
      </p>
    );
  }

  const words = text.split(/(\s+)/);

  return (
    <p className="text-sm text-[var(--color-silver-300)] font-[family-name:var(--font-body)] leading-relaxed">
      {words.map((word, i) => (
        <span
          key={i}
          className="glass-exec-briefing-word"
          style={{ animationDelay: `${Math.min(i * 0.025, 2)}s` }}
        >
          {word}
        </span>
      ))}
    </p>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════ */

interface ExecutiveIntelligenceStripProps {
  period: string;
  kpiRevenue?: number;
  kpiRevenueChange?: number;
}

export function ExecutiveIntelligenceStrip({
  period,
  kpiRevenue,
  kpiRevenueChange,
}: ExecutiveIntelligenceStripProps) {
  const reduced = useReducedMotion();
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [briefingEnabled, setBriefingEnabled] = useState(false);

  /* ── Health Score (auto-load, 5min cache) ── */
  const healthQ = useMCPQuery<{ status: string; data: AiFinancialReport }>(
    "finance", "generate_ai_analysis",
    { scope: "financial", period },
    { staleTime: 300_000 },
  );
  const healthScore = healthQ.data?.data?.health_score;

  /* ── Pending approvals count ── */
  const approvalsQ = useMCPQuery<ApprovalListResponse>(
    "hitl", "get_pending_approvals", {},
    { staleTime: 60_000 },
  );
  const pendingCount = useMemo(() => {
    if (!approvalsQ.data?.requests) return 0;
    return approvalsQ.data.requests.filter((r) => r.status === "pending").length;
  }, [approvalsQ.data]);

  /* ── Events today ── */
  const todayStr = new Date().toISOString().split("T")[0];
  const calendarQ = useMCPQuery<CalendarResponse>(
    "events", "event_get_calendar",
    { month: todayStr.slice(0, 7) },
    { staleTime: 120_000 },
  );
  const eventsToday = useMemo(() => {
    if (!calendarQ.data?.events) return 0;
    return calendarQ.data.events.filter((e) => e.date === todayStr).length;
  }, [calendarQ.data, todayStr]);

  /* ── Board briefing (on-demand) ── */
  const briefingQ = useMCPQuery<BriefingResponse>(
    "finance", "finance_board_briefing",
    { period },
    { enabled: briefingEnabled, staleTime: 300_000 },
  );
  const briefingText = useMemo(() => {
    if (!briefingQ.data) return null;
    const d = briefingQ.data;
    return d.briefing ?? d.data?.briefing ?? d.data?.summary ?? d.message ?? null;
  }, [briefingQ.data]);

  const handleBriefing = () => {
    if (briefingEnabled) {
      briefingQ.refetch();
      showToast({ type: "info", message: "Regenerando briefing..." });
    } else {
      setBriefingEnabled(true);
    }
  };

  const hasBriefing = briefingText != null && briefingText.length > 0;

  /* ── Derived ── */
  const hsColor = useMemo(() => {
    if (!healthScore) return "var(--color-silver-400)";
    const s = healthScore.total;
    if (s >= 80) return "var(--color-emerald-400)";
    if (s >= 60) return "var(--color-gold-400)";
    if (s >= 40) return "var(--color-amber-400)";
    return "var(--color-rose-400)";
  }, [healthScore]);

  const hsSubtext = useMemo(() => {
    if (!healthScore) return undefined;
    const diff = healthScore.trend_vs_previous;
    const arrow = diff >= 0 ? "▲" : "▼";
    return `${arrow} ${Math.abs(diff).toFixed(1)} pts vs anterior`;
  }, [healthScore]);

  const approvalColor = pendingCount > 0 ? "var(--color-amber-400)" : "var(--color-emerald-400)";

  /* ── Revenue counter display ── */
  const revenueRaw = kpiRevenue ?? 0;
  const revenueM = revenueRaw / 1_000_000;
  const revenueDisplay = kpiRevenue != null ? `₡${revenueM.toFixed(1)}M` : "—";

  /* ── Briefing key (reset typewriter on new data) ── */
  const briefingKey = useMemo(() => {
    return briefingText ? briefingText.slice(0, 50) : "none";
  }, [briefingText]);

  return (
    <div className="space-y-4">
      {/* ── Glass wrapper ── */}
      <div className="glass-exec-strip">
        {/* 4-metric grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            icon={<Activity size={14} strokeWidth={1.5} />}
            label="Health Score"
            value={healthScore ? `${Math.round(healthScore.total)}/100` : "—"}
            subtext={hsSubtext}
            color={hsColor}
            loading={healthQ.isLoading}
            delay={0}
            healthScore={healthScore?.total}
          />

          <MetricCard
            icon={<DollarSign size={14} strokeWidth={1.5} />}
            label="Revenue MTD"
            value={revenueDisplay}
            numericValue={kpiRevenue != null ? Math.round(revenueM * 10) : undefined}
            subtext={
              kpiRevenueChange != null
                ? `${kpiRevenueChange >= 0 ? "+" : ""}${kpiRevenueChange.toFixed(1)}% vs anterior`
                : undefined
            }
            color="var(--color-gold-400)"
            delay={0.05}
          />

          <MetricCard
            icon={<ClipboardCheck size={14} strokeWidth={1.5} />}
            label="Aprobaciones"
            value={approvalsQ.isLoading ? "—" : String(pendingCount)}
            numericValue={approvalsQ.isLoading ? undefined : pendingCount}
            subtext={pendingCount > 0 ? "Requieren atención" : "Sin pendientes"}
            color={approvalColor}
            loading={approvalsQ.isLoading}
            delay={0.10}
            badge={pendingCount > 0 ? { text: `${pendingCount}`, pulse: true } : undefined}
          />

          <MetricCard
            icon={<Calendar size={14} strokeWidth={1.5} />}
            label="Eventos Hoy"
            value={calendarQ.isLoading ? "—" : String(eventsToday)}
            numericValue={calendarQ.isLoading ? undefined : eventsToday}
            subtext={eventsToday > 0 ? `${eventsToday} programado${eventsToday > 1 ? "s" : ""}` : "Sin eventos"}
            color="var(--color-teal-400)"
            loading={calendarQ.isLoading}
            delay={0.15}
          />
        </div>
      </div>

      {/* ── Briefing button ── */}
      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          onClick={handleBriefing}
          disabled={briefingQ.isLoading}
          icon={
            briefingQ.isLoading ? (
              <div className="w-4 h-4 border-2 border-[var(--color-abyss)]/30 border-t-[var(--color-abyss)] rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )
          }
          className="glass-exec-briefing-btn"
        >
          {briefingQ.isLoading ? "Generando..." : briefingEnabled ? "Regenerar Briefing" : "Generar Briefing Ejecutivo AI"}
        </Button>

        {hasBriefing && (
          <Button
            variant="ghost"
            onClick={() => setBriefingOpen(!briefingOpen)}
            icon={briefingOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          >
            {briefingOpen ? "Ocultar" : "Ver briefing"}
          </Button>
        )}
      </div>

      {/* ── Briefing card (collapsible + typewriter) ── */}
      <AnimatePresence>
        {hasBriefing && briefingOpen && (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: 12 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <Card className="p-5" hover={false} tone="gold">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-[var(--color-gold-400)]" />
                <h4 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                  Briefing Ejecutivo
                </h4>
              </div>
              <TypewriterReveal key={briefingKey} text={briefingText!} reduced={reduced} />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}