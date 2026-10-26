// ═══════════════════════════════════════════════════════════
// Castillo Country Club — Seasonal Financial Calendar
// Fase 19n REWRITE
//
// 6 innovations:
//   1. Cash Flow Net Line (profitability trajectory on chart)
//   2. Season Breathing Wave (organic annual rhythm)
//   3. 90-Day Focus Zone (auto-expand + highlight + strip)
//   4. Cash Cliff Detector (mini waterfall in summary)
//   5. Reserve Impact Simulator (interactive slider)
//   6. Event Impact Markers (on chart net line)
//
// Rules: #1 tokens, #3 chartTheme, #6 RC, #8 formatCurrency,
//   #12 touch, #14 EmptyState, #15 toast, #17 Button,
//   #18 reducedMotion, #20 breakpoint, #22 cn
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import {
  CalendarDays, ChevronDown, ChevronUp,
  Wrench, Lightbulb, DollarSign, TrendingUp, Clock, CheckCircle2,
  Layers, MapPin, BarChart3,
} from "lucide-react";
import { Skeleton, EmptyState } from "@/shared/components/ui";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { useBreakpoint } from "@/shared/hooks/useBreakpoint";
import { formatCurrency, cn } from "@/shared/lib/utils";
import {
  CHART, TOOLTIP_STYLE, AXIS_TICK,
} from "@/shared/lib/chartTheme";
import type {
  SeasonalCalendarData, SeasonalMonth, SeasonalEvent,
  SeasonalMaintenance, SeasonalObligation, SeasonalAction,
} from "../types";
import {
  SEASON_CONFIG, SEASONAL_LAYER_CONFIGS,
  SEASONAL_ACTION_CATEGORY_CONFIG,
} from "../types";
import './SeasonalCalendar.css';

/* ══════════════════════════════════════════════════════════
   Constants — HEX for SVG (Rule #3)
   ══════════════════════════════════════════════════════════ */

const SEASON_HEX: Record<string, string> = {
  high: "#3DAA70",
  low: "#C46470",
  transition: "#D4A840",
};

const BAR_HEX = {
  revenue: "#3DAA70",
  expenses: "#C46470",
};

const NET_LINE_HEX = "#C9A96E";

/* ══════════════════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════════════════ */

interface BarDataItem {
  label: string;
  projected_revenue: number;
  projected_expenses: number;
  net: number;
  season: string;
  hasEvents: boolean;
  hasHighEvents: boolean;
  eventCount: number;
}

/* ══════════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════════ */

function useMotion() {
  const reduced = useReducedMotion();
  return {
    container: reduced
      ? undefined
      : ({ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } } as const),
    item: reduced
      ? undefined
      : ({ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } } } as const),
  };
}

function actionCategoryIcon(cat: string) {
  switch (cat) {
    case "cost_saving": return <DollarSign size={14} />;
    case "revenue_opportunity": return <TrendingUp size={14} />;
    case "cash_management": return <Layers size={14} />;
    case "planning": return <MapPin size={14} />;
    default: return <CheckCircle2 size={14} />;
  }
}

function priorityConfig(p: string): { color: string; bgColor: string; label: string } {
  if (p === "high") return { color: "var(--color-rose-400)", bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)", label: "Alta" };
  if (p === "medium") return { color: "var(--color-amber-400)", bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)", label: "Media" };
  return { color: "var(--color-silver-400)", bgColor: "color-mix(in srgb, var(--color-silver-400) 12%, transparent)", label: "Baja" };
}

/* ══════════════════════════════════════════════════════════
   Season Breathing Wave (Propuesta 2)
   ══════════════════════════════════════════════════════════ */

function SeasonBreathingWave({ months, focusMonths }: {
  months: SeasonalMonth[];
  focusMonths: Set<number>;
}) {
  const w = 800;
  const h = 64;
  const baseY = h - 8;
  const maxFactor = Math.max(...months.map((m) => m.revenue_factor), 1);

  const pts = months.map((m, i) => ({
    x: (i / Math.max(months.length - 1, 1)) * (w - 20) + 10,
    y: baseY - (m.revenue_factor / maxFactor) * (h - 20),
    season: m.season,
    label: m.label.split(" ")[0] ?? "",
    month: m.month,
    factor: m.revenue_factor,
  }));

  const curveD = pts.map((p, i) => {
    if (i === 0) return `M ${p.x},${p.y}`;
    const prev = pts[i - 1]!;
    const cp = (p.x - prev.x) * 0.4;
    return `C ${prev.x + cp},${prev.y} ${p.x - cp},${p.y} ${p.x},${p.y}`;
  }).join(" ");

  const lastPt = pts[pts.length - 1]!;
  const firstPt = pts[0]!;
  const fillD = `${curveD} L ${lastPt.x},${baseY} L ${firstPt.x},${baseY} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full block" style={{ height: 64 }} role="img" aria-label="Ritmo estacional anual">
      <defs>
        <linearGradient id="seasonWaveGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-gold-400)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="var(--color-gold-400)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={fillD} fill="url(#seasonWaveGrad)" />
      <path d={curveD} fill="none" stroke="var(--color-gold-400)" strokeWidth="1.5" opacity="0.5" />
      <line x1={10} y1={baseY} x2={w - 10} y2={baseY} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
      {pts.map((p) => (
        <g key={p.month}>
          {focusMonths.has(p.month) && (
            <rect x={p.x - 14} y={2} width={28} height={h - 4} rx="4"
              fill="rgba(201,169,110,0.06)" stroke="rgba(201,169,110,0.12)" strokeWidth="1" />
          )}
          <circle cx={p.x} cy={p.y} r="4" fill={SEASON_HEX[p.season] ?? "#8A95A5"} />
          <text x={p.x} y={p.y - 8} textAnchor="middle"
            fill="var(--color-silver-500)" fontSize="7" fontFamily="var(--font-mono, monospace)">
            {p.factor.toFixed(1)}x
          </text>
          <text x={p.x} y={h - 1} textAnchor="middle"
            fill={focusMonths.has(p.month) ? "var(--color-gold-400)" : "var(--color-silver-500)"}
            fontSize="8" fontFamily="var(--font-mono, monospace)" fontWeight={focusMonths.has(p.month) ? "600" : "400"}>
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════
   Cash Flow Mini Waterfall (Propuesta 4)
   ══════════════════════════════════════════════════════════ */

function CashFlowMiniWaterfall({ months, criticalMonths }: {
  months: SeasonalMonth[];
  criticalMonths: Set<number>;
}) {
  const maxAbs = Math.max(...months.map((m) => Math.abs(m.projected_net)), 1);

  return (
    <div className="glass-seasonal-cliff">
      {months.map((m) => {
        const pct = (Math.abs(m.projected_net) / maxAbs) * 100;
        const positive = m.projected_net >= 0;
        const isCritical = criticalMonths.has(m.month);
        return (
          <div
            key={m.month}
            className="flex-1 flex flex-col justify-end"
            style={{ height: 32 }}
            title={`${m.label}: ${formatCurrency(m.projected_net)}`}
          >
            <div
              className={cn("glass-seasonal-cliff__bar w-full", isCritical && "glass-seasonal-cliff__bar--critical")}
              style={{
                height: `${Math.max(12, pct)}%`,
                backgroundColor: isCritical
                  ? "var(--color-rose-400)"
                  : positive
                    ? "var(--color-emerald-400)"
                    : "var(--color-amber-400)",
                opacity: isCritical ? 1 : 0.6,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Custom Tooltip (Rule #2: solid, no blur)
   Propuesta 1+6: Shows net line + event info
   ══════════════════════════════════════════════════════════ */

function SeasonalTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; fill: string; payload: BarDataItem }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const item = payload[0]?.payload;
  const season = item?.season;
  const eventCount = item?.eventCount ?? 0;

  return (
    <div style={TOOLTIP_STYLE} className="p-3 min-w-[180px]">
      <p className="text-xs font-bold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] mb-0.5">{label}</p>
      {season && (
        <p className="text-[10px] font-[family-name:var(--font-mono)] mb-2" style={{ color: SEASON_HEX[season] }}>
          {SEASON_CONFIG[season as keyof typeof SEASON_CONFIG]?.label ?? season}
        </p>
      )}
      {payload.map((entry) => {
        if (entry.dataKey === "net") return null;
        if (Number(entry.value) === 0) return null;
        return (
          <div key={entry.dataKey} className="flex items-center justify-between gap-3 mb-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill }} />
              <span className="text-[10px] text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
                {entry.dataKey === "projected_revenue" ? "Revenue" : "Gastos"}
              </span>
            </span>
            <span className="text-xs font-bold font-[family-name:var(--font-mono)]" style={{ color: entry.fill }}>
              {formatCurrency(entry.value)}
            </span>
          </div>
        );
      })}
      {/* Net line value */}
      {(() => {
        const netEntry = payload.find((e) => e.dataKey === "net");
        if (!netEntry) return null;
        const netVal = Number(netEntry.value);
        return (
          <div className="flex items-center justify-between gap-3 pt-1.5 mt-1.5 border-t border-white/[0.06]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: NET_LINE_HEX }} />
              <span className="text-[10px] text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">Neto</span>
            </span>
            <span className="text-xs font-bold font-[family-name:var(--font-mono)]"
              style={{ color: netVal >= 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)" }}>
              {formatCurrency(netVal)}
            </span>
          </div>
        );
      })()}
      {eventCount > 0 && (
        <p className="text-[10px] text-[var(--color-gold-400)] font-[family-name:var(--font-ui)] mt-1.5">
          {eventCount} evento{eventCount > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Month Detail Card (expandible) — Glass treatment
   ══════════════════════════════════════════════════════════ */

function MonthDetail({ month }: { month: SeasonalMonth }) {
  const motionV = useMotion();
  const seasonCfg = SEASON_CONFIG[month.season];

  return (
    <motion.div variants={motionV.item} initial="hidden" animate="visible" exit="hidden">
      <div className="glass-seasonal-panel p-5" style={{ borderLeft: `3px solid ${seasonCfg?.color ?? "var(--color-silver-500)"}` }}>
        <div className="relative z-[1]">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-base font-bold text-[var(--color-silver-200)] font-[family-name:var(--font-display)]">
                {month.label}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-[family-name:var(--font-mono)]"
                  style={{ color: seasonCfg?.color, backgroundColor: seasonCfg?.bgColor }}>
                  Temporada {seasonCfg?.label}
                </span>
                <span className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
                  Factor: {month.revenue_factor.toFixed(2)}x
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold font-[family-name:var(--font-mono)]"
                style={{ color: month.projected_net >= 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)" }}>
                {formatCurrency(month.projected_net)}
              </p>
              <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">neto proyectado</p>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "Revenue", value: formatCurrency(month.projected_revenue), color: "var(--color-emerald-400)" },
              { label: "Gastos", value: formatCurrency(month.projected_expenses), color: "var(--color-rose-400)" },
              { label: "Reserva req.", value: formatCurrency(month.cash_reserve_required), color: "var(--color-teal-400)" },
            ].map((kpi) => (
              <div key={kpi.label} className="p-2.5 rounded-lg bg-[var(--color-surface-2)]">
                <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">{kpi.label}</p>
                <p className="text-sm font-bold font-[family-name:var(--font-mono)]" style={{ color: kpi.color }}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Events */}
          {month.events.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-semibold text-[var(--color-silver-500)] uppercase tracking-wider font-[family-name:var(--font-ui)] mb-2">Eventos</p>
              <div className="space-y-1.5">
                {month.events.map((ev: SeasonalEvent, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-xs font-[family-name:var(--font-ui)]">
                    <CalendarDays size={12} className="flex-shrink-0 mt-0.5" style={{ color: ev.impact === "high" ? "var(--color-gold-400)" : ev.impact === "medium" ? "var(--color-silver-300)" : "var(--color-silver-500)" }} />
                    <span className="text-[var(--color-silver-300)]">{ev.name}</span>
                    <span className="ml-auto px-1 py-0.5 rounded text-[9px] font-medium font-[family-name:var(--font-mono)]"
                      style={{ color: ev.impact === "high" ? "var(--color-gold-400)" : ev.impact === "medium" ? "var(--color-silver-300)" : "var(--color-silver-500)" }}>
                      {ev.impact}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Maintenance */}
          {month.maintenance.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-semibold text-[var(--color-silver-500)] uppercase tracking-wider font-[family-name:var(--font-ui)] mb-2">Mantenimiento</p>
              <div className="space-y-1.5">
                {month.maintenance.map((m: SeasonalMaintenance, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-xs font-[family-name:var(--font-ui)]">
                    <Wrench size={12} className="flex-shrink-0 mt-0.5 text-[var(--color-amber-400)]" />
                    <span className="text-[var(--color-silver-300)]">{m.item}</span>
                    {m.impact !== "none" && (
                      <span className="ml-auto px-1 py-0.5 rounded text-[9px] font-medium text-[var(--color-amber-400)] font-[family-name:var(--font-mono)]">
                        {m.impact === "partial_closure" ? "Cierre parcial" : m.impact}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Obligations */}
          {month.obligations.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-semibold text-[var(--color-silver-500)] uppercase tracking-wider font-[family-name:var(--font-ui)] mb-2">Obligaciones financieras</p>
              <div className="space-y-1.5">
                {month.obligations.map((ob: SeasonalObligation, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs font-[family-name:var(--font-ui)]">
                    <span className="flex items-center gap-2">
                      <DollarSign size={12} className="text-[var(--color-rose-400)]" />
                      <span className="text-[var(--color-silver-300)]">{ob.item}</span>
                    </span>
                    {ob.amount > 0 && (
                      <span className="font-[family-name:var(--font-mono)] text-[var(--color-rose-400)] font-medium">
                        {formatCurrency(ob.amount)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Actions */}
          {month.recommended_actions.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-[var(--color-silver-500)] uppercase tracking-wider font-[family-name:var(--font-ui)] mb-2">Acciones recomendadas</p>
              <div className="space-y-2">
                {month.recommended_actions.map((a: SeasonalAction, i: number) => {
                  const catCfg = SEASONAL_ACTION_CATEGORY_CONFIG[a.category];
                  const priCfg = priorityConfig(a.priority);
                  return (
                    <div key={i} className="p-3 rounded-lg bg-[var(--color-surface-1)] border border-white/[0.04]">
                      <div className="flex items-start gap-2">
                        <span style={{ color: catCfg?.color }} className="flex-shrink-0 mt-0.5">{actionCategoryIcon(a.category)}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="text-xs font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">{a.action}</p>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-[family-name:var(--font-mono)]"
                              style={{ color: catCfg?.color, backgroundColor: catCfg?.bgColor }}>{catCfg?.label}</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-[family-name:var(--font-mono)]"
                              style={{ color: priCfg.color, backgroundColor: priCfg.bgColor }}>{priCfg.label}</span>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            {a.estimated_impact > 0 && (
                              <span className="text-[10px] font-medium font-[family-name:var(--font-mono)] text-[var(--color-emerald-400)]">
                                Impacto: {formatCurrency(a.estimated_impact)}
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                              <Clock size={10} /> {a.deadline}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════ */

export default function SeasonalCalendar() {
  const motionV = useMotion();
  const { isMobile } = useBreakpoint();

  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);
  const [hasAutoExpanded, setHasAutoExpanded] = useState(false);
  const [reserveTarget, setReserveTarget] = useState(0);
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(
    () => new Set(SEASONAL_LAYER_CONFIGS.filter((l) => l.defaultVisible).map((l) => l.id)),
  );

  /* ── Data ── */

  const calQ = useMCPQuery<{ status: string; data: SeasonalCalendarData }>(
    "finance",
    "finance_seasonal_calendar",
    {},
    { staleTime: 3_600_000 },
  );

  const cal = calQ.data?.data;

  /* ── 90-Day Focus (Propuesta 3) ── */

  const currentMonthIdx = useMemo(() => {
    if (!cal) return -1;
    const monthNum = new Date().getMonth() + 1;
    return cal.months.findIndex((m) => m.month === monthNum);
  }, [cal]);

  const focus90Months = useMemo(() => {
    if (!cal || currentMonthIdx < 0) return new Set<number>();
    const set = new Set<number>();
    for (let i = 0; i < 3; i++) {
      const idx = (currentMonthIdx + i) % cal.months.length;
      const m = cal.months[idx];
      if (m) set.add(m.month);
    }
    return set;
  }, [cal, currentMonthIdx]);

  // Auto-expand current month on first load
  useEffect(() => {
    if (cal && currentMonthIdx >= 0 && !hasAutoExpanded) {
      setExpandedMonth(cal.months[currentMonthIdx]!.month);
      setHasAutoExpanded(true);
    }
  }, [cal, currentMonthIdx, hasAutoExpanded]);

  // Initialize reserve target
  useEffect(() => {
    if (cal && reserveTarget === 0) {
      setReserveTarget(cal.annual_summary.recommended_reserve);
    }
  }, [cal, reserveTarget]);

  /* ── Dynamic Critical Months (Propuesta 5) ── */

  const dynamicCriticalMonths = useMemo(() => {
    if (!cal) return new Set<number>();
    let cumulative = 0;
    const critical = new Set<number>();
    for (const m of cal.months) {
      cumulative += m.projected_revenue - m.projected_expenses;
      const obligations = m.obligations.reduce((s, o) => s + o.amount, 0);
      cumulative -= obligations;
      if (cumulative < reserveTarget) {
        critical.add(m.month);
      }
    }
    return critical;
  }, [cal, reserveTarget]);

  /* ── Layer toggle ── */

  const toggleLayer = useCallback((id: string) => {
    setVisibleLayers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  /* ── Bar chart data + Net Line (Propuestas 1+6) ── */

  const barData = useMemo<BarDataItem[]>(() => {
    if (!cal) return [];
    return cal.months.map((m) => ({
      label: m.label.split(" ")[0]!,
      projected_revenue: visibleLayers.has("revenue") ? m.projected_revenue : 0,
      projected_expenses: visibleLayers.has("expenses") ? m.projected_expenses : 0,
      net: m.projected_net,
      season: m.season,
      hasEvents: m.events.length > 0,
      hasHighEvents: m.events.some((e) => e.impact === "high"),
      eventCount: m.events.length,
    }));
  }, [cal, visibleLayers]);

  /* ── All recommended actions ── */

  const allActions = useMemo(() => {
    if (!cal) return [];
    const actions: Array<SeasonalAction & { month_label: string }> = [];
    cal.months.forEach((m) => {
      m.recommended_actions.forEach((a) => {
        actions.push({ ...a, month_label: m.label });
      });
    });
    return actions.sort((a, b) => {
      const priOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return (priOrder[a.priority] ?? 2) - (priOrder[b.priority] ?? 2);
    });
  }, [cal]);

  const toggleMonth = useCallback((m: number) => {
    setExpandedMonth((prev) => (prev === m ? null : m));
  }, []);

  /* ── Net line custom dot renderer (Propuestas 1+6) ── */

  const renderNetDot = useCallback((dotProps: unknown) => {
    const { cx, cy, payload } = dotProps as { cx: number; cy: number; payload: BarDataItem };
    if (cx === undefined || cy === undefined || !payload) return <g />;
    const r = payload.hasHighEvents ? 5 : payload.hasEvents ? 4 : 2.5;
    const fill = payload.hasHighEvents
      ? "#D4A840"
      : payload.hasEvents
        ? "#A0A8B5"
        : SEASON_HEX[payload.season] ?? "#8A95A5";
    return <circle cx={cx} cy={cy} r={r} fill={fill} stroke="none" />;
  }, []);

  /* ── Loading / Empty ── */

  if (calQ.isLoading && !cal) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
      </div>
    );
  }

  if (!cal) {
    return <EmptyState icon={<CalendarDays className="w-10 h-10" />} title="Sin datos" description="No hay datos del calendario estacional" />;
  }

  const summary = cal.annual_summary;

  /* ── Render ── */

  return (
    <motion.div variants={motionV.container} initial={false} animate="visible" className="space-y-6">

      {/* ── Season Breathing Wave (Propuesta 2) ── */}
      <motion.div variants={motionV.item}>
        <div className="glass-seasonal-panel p-4">
          <div className="relative z-[1]">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays size={14} className="text-[var(--color-gold-400)]" />
              <h3 className="text-xs font-semibold text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] uppercase tracking-wider">
                Ritmo estacional
              </h3>
              <div className="flex items-center gap-3 ml-auto">
                {(["high", "transition", "low"] as const).map((s) => (
                  <span key={s} className="flex items-center gap-1 text-[10px] font-[family-name:var(--font-ui)]">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SEASON_HEX[s] }} />
                    <span className="text-[var(--color-silver-400)]">{SEASON_CONFIG[s].label}</span>
                  </span>
                ))}
              </div>
            </div>
            <SeasonBreathingWave months={cal.months} focusMonths={focus90Months} />
          </div>
        </div>
      </motion.div>

      {/* ── 90-Day Focus Strip (Propuesta 3) ── */}
      {focus90Months.size > 0 && (
        <motion.div variants={motionV.item}>
          <div className="glass-seasonal-panel p-3">
            <div className="relative z-[1] flex items-center gap-3 overflow-x-auto pb-0.5">
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Clock size={12} className="text-[var(--color-gold-400)]" />
                <span className="text-[10px] font-bold text-[var(--color-gold-400)] font-[family-name:var(--font-ui)] uppercase tracking-wider">
                  Próximos 90 días
                </span>
              </div>
              {cal.months
                .filter((m) => focus90Months.has(m.month))
                .map((m) => {
                  const urgentActions = m.recommended_actions.filter((a) => a.priority === "high");
                  const isCritical = dynamicCriticalMonths.has(m.month);
                  return (
                    <div key={m.month} className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg flex-shrink-0 border",
                      isCritical
                        ? "bg-[color-mix(in srgb,var(--color-rose-400)8%,transparent)] border-[color-mix(in srgb,var(--color-rose-400)20%,transparent)]"
                        : "bg-[var(--color-surface-2)] border-white/[0.04]",
                    )}>
                      <span className="text-xs font-bold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                        {m.label.split(" ")[0]}
                      </span>
                      <span className="text-xs font-[family-name:var(--font-mono)]"
                        style={{ color: m.projected_net >= 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)" }}>
                        {formatCurrency(m.projected_net)}
                      </span>
                      {urgentActions.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-[family-name:var(--font-mono)]
                          bg-[color-mix(in srgb,var(--color-amber-400)12%,transparent)] text-[var(--color-amber-400)]">
                          {urgentActions.length} urgente{urgentActions.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Annual Summary + Cliff Detector + Reserve Slider (Propuestas 4+5) ── */}
      <motion.div variants={motionV.item}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Summary KPIs */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: "Revenue alta temporada", value: formatCurrency(summary.high_season_revenue), color: "var(--color-emerald-400)" },
                { label: "Revenue baja temporada", value: formatCurrency(summary.low_season_revenue), color: "var(--color-rose-400)" },
                { label: "Brecha estacional", value: `${summary.seasonality_gap_pct.toFixed(1)}%`, color: "var(--color-amber-400)" },
                { label: "Total obligaciones", value: formatCurrency(summary.total_obligations), color: "var(--color-rose-400)" },
                { label: "Meses críticos", value: Array.from(dynamicCriticalMonths).map((m) => {
                  const found = cal.months.find((cm) => cm.month === m);
                  return found?.label.split(" ")[0] ?? `Mes ${m}`;
                }).join(", ") || "Ninguno", color: dynamicCriticalMonths.size > 0 ? "var(--color-amber-400)" : "var(--color-emerald-400)" },
                { label: "Reserva recomendada", value: formatCurrency(summary.recommended_reserve), color: "var(--color-teal-400)" },
              ].map((kpi) => (
                <div key={kpi.label} className="glass-seasonal-card p-4">
                  <div className="relative z-[1]">
                    <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mb-1">{kpi.label}</p>
                    <p className="text-lg font-bold font-[family-name:var(--font-display)]" style={{ color: kpi.color }}>{kpi.value}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Mini Waterfall (Propuesta 4) */}
            <div className="glass-seasonal-card p-4 mt-4">
              <div className="relative z-[1]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-[var(--color-silver-500)] uppercase tracking-wider font-[family-name:var(--font-ui)]">
                    Flujo neto mensual
                  </span>
                  <div className="flex items-center gap-2 text-[10px] font-[family-name:var(--font-ui)]">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--color-emerald-400)] opacity-60" />Positivo</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--color-rose-400)]" />Crítico</span>
                  </div>
                </div>
                <CashFlowMiniWaterfall months={cal.months} criticalMonths={dynamicCriticalMonths} />
              </div>
            </div>
          </div>

          {/* Reserve Impact Slider (Propuesta 5) */}
          <div className="glass-seasonal-card p-4 flex flex-col justify-center">
            <div className="relative z-[1]">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={14} className="text-[var(--color-gold-400)]" />
                <span className="text-xs font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                  Simulador de reserva
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">Nivel de reserva</span>
                <span className="text-sm font-bold font-[family-name:var(--font-mono)] text-[var(--color-gold-400)]">
                  {formatCurrency(reserveTarget)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={summary.recommended_reserve * 2}
                step={500_000}
                value={reserveTarget}
                onChange={(e) => setReserveTarget(Number(e.target.value))}
                className="glass-seasonal-slider"
                aria-label="Nivel de reserva"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">₡0</span>
                <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
                  {formatCurrency(summary.recommended_reserve * 2)}
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-white/[0.04] text-center">
                <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">Meses críticos con esta reserva</p>
                <p className="text-2xl font-bold font-[family-name:var(--font-display)] mt-1"
                  style={{ color: dynamicCriticalMonths.size > 0 ? "var(--color-rose-400)" : "var(--color-emerald-400)" }}>
                  {dynamicCriticalMonths.size}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Layer Toggles ── */}
      <motion.div variants={motionV.item}>
        <div className="glass-seasonal-panel p-4">
          <div className="relative z-[1]">
            <div className="flex items-center gap-2 mb-3">
              <Layers size={14} className="text-[var(--color-silver-400)]" />
              <h3 className="text-xs font-semibold text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] uppercase tracking-wider">Capas visibles</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {SEASONAL_LAYER_CONFIGS.map((layer) => {
                const isActive = visibleLayers.has(layer.id);
                return (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => toggleLayer(layer.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors min-h-[40px]",
                      "font-[family-name:var(--font-ui)] border",
                      isActive ? "border-white/[0.12] bg-[var(--color-surface-2)]" : "border-white/[0.04] bg-[var(--color-surface-1)] opacity-50",
                    )}
                    aria-pressed={isActive}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isActive ? layer.color : "var(--color-silver-600)" }} />
                    <span style={{ color: isActive ? layer.color : "var(--color-silver-600)" }}>{layer.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Revenue vs Expenses Chart + Net Line (Propuestas 1+6) ── */}
      {(visibleLayers.has("revenue") || visibleLayers.has("expenses")) && (
        <motion.div variants={motionV.item}>
          <div className="glass-seasonal-panel p-5">
            <div className="relative z-[1]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[var(--color-gold-400)]" />
                  <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                    Revenue vs Gastos — Proyección mensual
                  </h3>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {visibleLayers.has("revenue") && (
                    <span className="flex items-center gap-1 text-[10px] font-[family-name:var(--font-mono)]">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: BAR_HEX.revenue }} />
                      <span className="text-[var(--color-silver-400)]">Revenue</span>
                    </span>
                  )}
                  {visibleLayers.has("expenses") && (
                    <span className="flex items-center gap-1 text-[10px] font-[family-name:var(--font-mono)]">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: BAR_HEX.expenses }} />
                      <span className="text-[var(--color-silver-400)]">Gastos</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-[10px] font-[family-name:var(--font-mono)]">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: NET_LINE_HEX }} />
                    <span className="text-[var(--color-silver-400)]">Neto</span>
                  </span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={isMobile ? 240 : 320}>
                <ComposedChart data={barData} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
                  <CartesianGrid stroke={CHART.gridStroke} vertical={false} />
                  <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} />
                  <YAxis
                    tick={AXIS_TICK}
                    tickFormatter={(v: number) => {
                      if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                      if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
                      return `${v}`;
                    }}
                    axisLine={false}
                  />
                  <Tooltip content={<SeasonalTooltip />} cursor={{ fill: CHART.cursorFill }} />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
                  {visibleLayers.has("revenue") && (
                    <Bar dataKey="projected_revenue" fill={BAR_HEX.revenue} radius={[4, 4, 0, 0]} barSize={isMobile ? 14 : 22}>
                      {barData.map((entry, i) => (
                        <Cell key={`rev-${i}`} fill={SEASON_HEX[entry.season] ?? BAR_HEX.revenue} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  )}
                  {visibleLayers.has("expenses") && (
                    <Bar dataKey="projected_expenses" fill={BAR_HEX.expenses} radius={[4, 4, 0, 0]} barSize={isMobile ? 14 : 22} fillOpacity={0.6} />
                  )}
                  {/* Net Line (Propuesta 1) with Event Markers (Propuesta 6) */}
                  <Line
                    dataKey="net"
                    stroke={NET_LINE_HEX}
                    strokeWidth={2}
                    dot={renderNetDot}
                    activeDot={{ r: 5, fill: NET_LINE_HEX, stroke: "var(--color-surface-2)", strokeWidth: 2 }}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Timeline: 12 months with 90-day focus (Propuesta 3) ── */}
      <motion.div variants={motionV.item}>
        <div className="glass-seasonal-panel p-5">
          <div className="relative z-[1]">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays size={16} className="text-[var(--color-gold-400)]" />
              <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                Detalle mensual
              </h3>
            </div>
            <div className="space-y-2">
              {cal.months.map((m) => {
                const isExpanded = expandedMonth === m.month;
                const isFocus = focus90Months.has(m.month);
                const isCritical = dynamicCriticalMonths.has(m.month);
                const actionCount = m.recommended_actions.length;

                return (
                  <div key={m.month}>
                    <button
                      type="button"
                      onClick={() => toggleMonth(m.month)}
                      className={cn(
                        "glass-seasonal-month-row",
                        isExpanded && "glass-seasonal-month-row--expanded",
                        isFocus && "glass-seasonal-month-row--focus90",
                        isCritical && "glass-seasonal-month-row--critical",
                      )}
                      aria-expanded={isExpanded}
                    >
                      {/* Season dot */}
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: SEASON_HEX[m.season] }} />

                      {/* Month label */}
                      <span className="text-sm font-medium text-[var(--color-silver-200)] w-16 flex-shrink-0">
                        {m.label.split(" ")[0]}
                      </span>

                      {/* Net bar */}
                      <div className="flex-1 mx-2 hidden sm:block">
                        <div className="h-1.5 rounded-full bg-[var(--color-surface-3)] relative">
                          <div
                            className="absolute h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, Math.abs(m.projected_net) / 2_000_000 * 100)}%`,
                              backgroundColor: isCritical
                                ? "var(--color-rose-400)"
                                : m.projected_net >= 0
                                  ? "var(--color-emerald-400)"
                                  : "var(--color-amber-400)",
                              left: m.projected_net >= 0 ? 0 : "auto",
                              right: m.projected_net < 0 ? 0 : "auto",
                            }}
                          />
                        </div>
                      </div>

                      {/* Net value */}
                      <span className="text-xs font-bold font-[family-name:var(--font-mono)] w-24 text-right"
                        style={{ color: isCritical ? "var(--color-rose-400)" : m.projected_net >= 0 ? "var(--color-emerald-400)" : "var(--color-amber-400)" }}>
                        {formatCurrency(m.projected_net)}
                      </span>

                      {/* Badges */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isCritical && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-[family-name:var(--font-mono)]
                            bg-[color-mix(in srgb,var(--color-rose-400)12%,transparent)] text-[var(--color-rose-400)]">
                            Crítico
                          </span>
                        )}
                        {actionCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-[family-name:var(--font-mono)]
                            bg-[color-mix(in srgb,var(--color-gold-400)12%,transparent)] text-[var(--color-gold-400)]">
                            {actionCount} {actionCount === 1 ? "acción" : "acciones"}
                          </span>
                        )}
                        {m.events.length > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-[family-name:var(--font-mono)]
                            bg-[var(--color-surface-3)] text-[var(--color-silver-400)]">
                            {m.events.length} {m.events.length === 1 ? "evento" : "eventos"}
                          </span>
                        )}
                      </div>

                      {/* Chevron */}
                      {isExpanded
                        ? <ChevronUp size={16} className="text-[var(--color-silver-500)] flex-shrink-0" />
                        : <ChevronDown size={16} className="text-[var(--color-silver-500)] flex-shrink-0" />}
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const }}
                          className="overflow-hidden"
                        >
                          <div className="pt-2">
                            <MonthDetail month={m} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Actions Panel ── */}
      {visibleLayers.has("actions") && allActions.length > 0 && (
        <motion.div variants={motionV.item}>
          <div className="glass-seasonal-panel p-5">
            <div className="relative z-[1]">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb size={14} className="text-[var(--color-gold-400)]" />
                <h3 className="text-sm font-semibold text-[var(--color-gold-400)] font-[family-name:var(--font-ui)]">
                  Acciones recomendadas — {allActions.length} priorizadas
                </h3>
              </div>
              <div className="space-y-2">
                {allActions.map((a, i) => {
                  const catCfg = SEASONAL_ACTION_CATEGORY_CONFIG[a.category];
                  const priCfg = priorityConfig(a.priority);
                  return (
                    <div key={`${a.month_label}-${i}`} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--color-surface-1)] border border-white/[0.04]">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                        style={{ backgroundColor: catCfg?.bgColor, color: catCfg?.color }}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-sm font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">{a.action}</p>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-[family-name:var(--font-mono)]"
                            style={{ color: catCfg?.color, backgroundColor: catCfg?.bgColor }}>{catCfg?.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-[family-name:var(--font-mono)]"
                            style={{ color: priCfg.color, backgroundColor: priCfg.bgColor }}>{priCfg.label}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                            <CalendarDays size={10} className="inline mr-1" />{a.month_label}
                          </span>
                          {a.estimated_impact > 0 && (
                            <span className="text-[10px] font-medium font-[family-name:var(--font-mono)] text-[var(--color-emerald-400)]">
                              {formatCurrency(a.estimated_impact)}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                            <Clock size={10} /> {a.deadline}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}