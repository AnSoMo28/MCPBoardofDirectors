// src/shared/components/layout/SignalBusDebugPanel.tsx
// Fase 21 — Silver Tide Signal Bus Debug Panel
// Glass · Visibility gate · Staggered entrance
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { Button } from "@/shared/components/ui";
import { signalBus } from "@/shared/lib/advisor-engine/signal-bus";
import type { DomainSignal } from "@/shared/lib/advisor-engine/types";
import { Activity, RefreshCw, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import './SignalBusDebugPanel.css';

/* ──────────────────────────────────────
   Domain + Severity maps
   ────────────────────────────────────── */

const DOMAIN_COLORS: Record<string, string> = {
  financial: "var(--color-gold-400)",
  events: "var(--color-teal-400)",
  communication: "var(--color-amber-400)",
  sports: "var(--color-gold-400)",
  family: "var(--color-teal-400)",
  engagement: "var(--color-amber-400)",
  satisfaction: "var(--color-teal-400)",
  ml_intelligence: "var(--color-gold-400)",
  global: "var(--color-rose-400)",
};

const SEVERITY_COLORS: Record<string, string> = {
  high: "var(--color-rose-400)",
  medium: "var(--color-amber-400)",
  low: "var(--color-silver-400)",
};

/* ──────────────────────────────────────
   Animation variants
   ────────────────────────────────────── */

const expandVariants: Variants = {
  hidden: { height: 0, opacity: 0 },
  visible: {
    height: "auto",
    opacity: 1,
    transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: { duration: 0.15 },
  },
};

const groupListVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const groupVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

const rowListVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.02 } },
};

const rowVariants: Variants = {
  hidden: { opacity: 0, x: -6 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

/* ──────────────────────────────────────
   SignalRow sub-component
   ────────────────────────────────────── */

function SignalRow({ signal }: { signal: DomainSignal }) {
  const age = signal.timestamp
    ? Math.round((Date.now() - signal.timestamp) / 1000)
    : null;
  const ttl = signal.ttl ? Math.round(signal.ttl / 1000) : null;
  const remaining = ttl !== null && age !== null ? ttl - age : null;

  const domainColor = DOMAIN_COLORS[signal.sourceDomain] ?? "var(--color-silver-400)";
  const severityColor = SEVERITY_COLORS[signal.severity] ?? "var(--color-silver-400)";

  const ttlClass =
    remaining !== null
      ? remaining < 30
        ? "glass-signal-row__ttl--critical"
        : remaining < 120
          ? "glass-signal-row__ttl--warning"
          : "glass-signal-row__ttl"
      : "";

  return (
    <motion.div
      variants={rowVariants}
      className="glass-signal-row"
      style={{ borderLeftColor: domainColor }}
    >
      {/* Source domain badge */}
      <span
        className="glass-signal-domain-badge"
        style={{
          backgroundColor: `color-mix(in srgb, ${domainColor} 15%, transparent)`,
          color: domainColor,
        }}
      >
        {signal.sourceDomain}
      </span>

      {/* Arrow */}
      <span className="glass-signal-arrow">→</span>

      {/* Target domains */}
      <span className="glass-signal-targets">
        [{signal.targetDomains.join(", ")}]
      </span>

      {/* Signal name */}
      <span className="glass-signal-name">
        {signal.signalDefId}
      </span>

      {/* Severity */}
      <span className="glass-signal-severity" style={{ color: severityColor }}>
        {signal.severity}
      </span>

      {/* Value */}
      <span className="glass-signal-value">
        {Math.round(signal.value)}
      </span>

      {/* TTL remaining */}
      {remaining !== null && (
        <span className={ttlClass}>
          {remaining}s
        </span>
      )}
    </motion.div>
  );
}

/* ──────────────────────────────────────
   Main panel
   ────────────────────────────────────── */

export function SignalBusDebugPanel() {
  const [signals, setSignals] = useState<DomainSignal[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    setSignals([...signalBus.getAllSignals()]);
  }, []);

  /* ── Visibility-gated auto-refresh ── */
  useEffect(() => {
    refresh();
    if (!autoRefresh) return;

    let tabVisible = !document.hidden;
    let panelVisible = true;

    const onVisChange = () => {
      tabVisible = !document.hidden;
      if (tabVisible && panelVisible) refresh();
    };
    document.addEventListener("visibilitychange", onVisChange);

    const observer = new IntersectionObserver(
      ([entry]) => {
        panelVisible = entry.isIntersecting;
        if (panelVisible && tabVisible) refresh();
      },
      { threshold: 0.1 },
    );
    if (panelRef.current) observer.observe(panelRef.current);

    const interval = setInterval(() => {
      if (tabVisible && panelVisible) refresh();
    }, 2000);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisChange);
      observer.disconnect();
    };
  }, [autoRefresh, refresh]);

  const snapshot = signalBus.getDebugSnapshot();

  /* ── Group by source domain ── */
  const bySource = new Map<string, DomainSignal[]>();
  for (const s of signals) {
    const group = bySource.get(s.sourceDomain) ?? [];
    group.push(s);
    bySource.set(s.sourceDomain, group);
  }

  /* Only render in DEV */
  if (!import.meta.env.DEV) return null;

  return (
    <div ref={panelRef} className="glass-debug-panel">
      {/* ── Header (always visible) ── */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="glass-debug-panel__header"
        aria-expanded={isExpanded}
      >
        <div className="glass-debug-panel__header-left">
          <Activity size={14} strokeWidth={1.5} className="text-[var(--color-gold-400)]" />
          <span className="glass-debug-panel__title">Signal Bus</span>
          <span className="glass-debug-panel__count">
            {snapshot.totalSignals}
          </span>
        </div>
        <div className="glass-debug-panel__header-right">
          <span className="glass-debug-panel__meta">
            {Object.keys(snapshot.signalsBySource).length} sources ·{" "}
            {Object.keys(snapshot.signalsByTarget).length} targets
          </span>
          {isExpanded ? (
            <ChevronUp size={12} className="text-[var(--color-silver-500)]" />
          ) : (
            <ChevronDown size={12} className="text-[var(--color-silver-500)]" />
          )}
        </div>
      </button>

      {/* ── Expanded content ── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            variants={expandVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="glass-debug-panel__content"
          >
            {/* Controls */}
            <div className="glass-debug-panel__controls">
              <Button
                variant="ghost"
                size="sm"
                onClick={refresh}
                className="text-[10px] h-6 px-2 gap-1"
              >
                <RefreshCw size={10} /> Refresh
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`text-[10px] h-6 px-2 ${autoRefresh ? "text-[var(--color-teal-400)]" : "text-[var(--color-silver-500)]"}`}
              >
                Auto: {autoRefresh ? "ON" : "OFF"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  signalBus.clear();
                  refresh();
                }}
                className="text-[10px] h-6 px-2 gap-1 text-[var(--color-rose-400)]"
              >
                <Trash2 size={10} /> Clear
              </Button>
            </div>

            {/* Summary bar */}
            <div className="glass-debug-panel__summary">
              {Object.entries(snapshot.signalsBySource).map(([domain, count]) => (
                <span
                  key={domain}
                  className="glass-debug-panel__summary-item"
                  style={{
                    color: DOMAIN_COLORS[domain] ?? "var(--color-silver-400)",
                  }}
                >
                  {domain}: {count}
                </span>
              ))}
            </div>

            {/* Signal groups */}
            {signals.length === 0 ? (
              <p className="glass-debug-panel__empty">
                No active signals. Visit domain pages or load the Dashboard to seed signals.
              </p>
            ) : (
              <motion.div
                variants={groupListVariants}
                initial="hidden"
                animate="visible"
                className="space-y-3"
              >
                {Array.from(bySource.entries()).map(([domain, domainSignals]) => (
                  <motion.div
                    key={domain}
                    variants={groupVariants}
                  >
                    <div className="glass-debug-panel__group-header">
                      <span
                        className="glass-debug-panel__group-dot"
                        style={{
                          backgroundColor:
                            DOMAIN_COLORS[domain] ?? "var(--color-silver-400)",
                        }}
                      />
                      <span className="glass-debug-panel__group-label">
                        {domain}
                      </span>
                      <span className="glass-debug-panel__group-count">
                        ({domainSignals.length})
                      </span>
                    </div>

                    <motion.div
                      variants={rowListVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      {domainSignals.map((s) => (
                        <SignalRow
                          key={`${s.sourceDomain}:${s.signalDefId}`}
                          signal={s}
                        />
                      ))}
                    </motion.div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}