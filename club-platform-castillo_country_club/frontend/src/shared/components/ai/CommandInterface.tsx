// src/shared/components/ai/CommandInterface.tsx
// Fase 23 — Silver Tide Command Console
// Glass · Spotlight Input · Parsing Ceremony · Intelligence Artifacts
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Zap, Target, FileText,
  AlertTriangle, CheckCircle2, Clock, TrendingUp,
  TrendingDown, ArrowRight, Lightbulb, Shield,
  Loader2, Terminal, ChevronRight, History, Keyboard,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { formatCRC, formatPct } from "@/shared/lib/financial/format";
import { isLikelyCommand } from "@/shared/lib/advisor-engine/command-parser";
import type {
  ConversationTurn, CommandResponse,
  MetricValueData, InsightListData, SimulationResultData,
  ActionConfirmationData, RuleCreatedData, GoalCreatedData,
  ReportPreviewData, ErrorData, CommandType,
} from "@/shared/lib/advisor-engine/command-types";
import { COMMAND_TYPE_CONFIG } from "@/shared/lib/advisor-engine/command-types";
import './CommandInterface.css';

/* ──────────────────────────────────────
   Types
   ────────────────────────────────────── */

interface CommandInterfaceProps {
  turns: ConversationTurn[];
  isProcessing: boolean;
  onCommand: (text: string) => void;
  onFollowup: (text: string) => void;
  onAction?: (action: string, data?: unknown) => void;
}

/* ──────────────────────────────────────
   Example Commands — Categorized
   ────────────────────────────────────── */

const EXAMPLE_COMMANDS: Array<{
  text: string;
  type: CommandType;
  desc: string;
}> = [
  { text: "¿Cuál es el churn actual?", type: "query", desc: "Consulta métricas en tiempo real" },
  { text: "¿Qué pasa si aumento las cuotas 10%?", type: "simulation", desc: "Simula escenarios what-if" },
  { text: "¿Por qué bajó la satisfacción?", type: "analysis", desc: "Análisis causal profundo" },
  { text: "Generar reporte ejecutivo", type: "report", desc: "Crea briefings para la junta" },
  { text: "Cuando churn > 8%, alertar al gerente", type: "rule", desc: "Define reglas automáticas" },
  { text: "Reducir churn a 3% en 90 días", type: "goal", desc: "Establece objetivos medibles" },
];

/* ──────────────────────────────────────
   Parsing Ceremony
   ────────────────────────────────────── */

function ParsingCeremony({
  text,
  reduced,
}: {
  text: string;
  reduced: boolean;
}) {
  const [phase, setPhase] = useState<"parsing" | "type" | "executing">("parsing");

  useEffect(() => {
    if (reduced) { setPhase("executing"); return; }
    const t1 = setTimeout(() => setPhase("type"), 300);
    const t2 = setTimeout(() => setPhase("executing"), 700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [reduced]);

  return (
    <motion.div
      className="glass-cmd__parsing"
      initial={reduced ? undefined : { opacity: 0, y: 6 }}
      animate={reduced ? undefined : { opacity: 1, y: 0 }}
    >
      <div className="glass-cmd__parsing-line">
        <motion.span
          className="glass-cmd__parsing-glow"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.4 }}
        />
        <Terminal className="w-3.5 h-3.5 text-[var(--color-gold-400)]" />
        <span className="glass-cmd__parsing-text">"{text}"</span>
      </div>

      <div className="glass-cmd__parsing-steps">
        <span className={cn("glass-cmd__parsing-step", phase !== "parsing" && "glass-cmd__parsing-step--done")}>
          {phase === "parsing" ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
          Parseando
        </span>
        <ChevronRight className="w-3 h-3 text-[var(--color-silver-600)]" />
        <span className={cn("glass-cmd__parsing-step", phase === "executing" && "glass-cmd__parsing-step--done")}>
          {phase === "type" ? <Loader2 className="w-3 h-3 animate-spin" /> : phase === "executing" ? <CheckCircle2 className="w-3 h-3" /> : <span className="w-3 h-3" />}
          Identificando
        </span>
        <ChevronRight className="w-3 h-3 text-[var(--color-silver-600)]" />
        <span className="glass-cmd__parsing-step">
          {phase === "executing" ? <Loader2 className="w-3 h-3 animate-spin" /> : <span className="w-3 h-3" />}
          Ejecutando
        </span>
      </div>
    </motion.div>
  );
}

/* ──────────────────────────────────────
   Type Badge
   ────────────────────────────────────── */

function TypeBadge({ type }: { type: CommandType }) {
  const cfg = COMMAND_TYPE_CONFIG[type];
  return (
    <span className="glass-cmd__type-badge" style={{ color: cfg.color, borderColor: cfg.color }}>
      {cfg.label}
    </span>
  );
}

/* ──────────────────────────────────────
   Followup Chips
   ────────────────────────────────────── */

function FollowupChips({
  followups,
  onFollowup,
  reduced,
}: {
  followups: string[];
  onFollowup: (text: string) => void;
  reduced: boolean;
}) {
  if (!followups.length) return null;
  return (
    <div className="glass-cmd__followups">
      {followups.map((f, i) => (
        <motion.button
          key={f}
          onClick={() => onFollowup(f)}
          className="glass-cmd__followup"
          initial={reduced ? undefined : { opacity: 0, y: 4 }}
          animate={reduced ? undefined : { opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.04 }}
          whileHover={reduced ? undefined : { scale: 1.02, y: -1 }}
        >
          <ChevronRight className="w-3 h-3 text-[var(--color-teal-400)]" />
          <span>{f}</span>
        </motion.button>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────
   Response Card: Metric Value — KPI Spotlight
   ────────────────────────────────────── */

function MetricValueCard({ data }: { data: MetricValueData }) {
  const displayValue = data.unit === "₡"
    ? formatCRC(data.value)
    : data.unit === "%"
      ? formatPct(data.value)
      : `${data.value.toLocaleString("es-CR")} ${data.unit}`;

  const trendColor = data.trend?.direction === "up"
    ? "var(--color-emerald-400)"
    : data.trend?.direction === "down"
      ? "var(--color-rose-400)"
      : "var(--color-silver-400)";

  return (
    <div className="glass-cmd__card glass-cmd__card--metric">
      <span className="glass-cmd__card-glow" style={{ background: trendColor }} />
      <div className="glass-cmd__metric-value">
        <span className="glass-cmd__metric-number">{displayValue}</span>
        {data.trend && (
          <div className="glass-cmd__metric-trend" style={{ color: trendColor }}>
            {data.trend.direction === "up" ? <TrendingUp className="w-5 h-5" /> : data.trend.direction === "down" ? <TrendingDown className="w-5 h-5" /> : null}
            <span>{data.trend.deltaPct > 0 ? "+" : ""}{data.trend.deltaPct.toFixed(1)}%</span>
          </div>
        )}
      </div>
      <div className="glass-cmd__metric-meta">
        <span className="glass-cmd__metric-name">{data.metricName}</span>
        <span className="glass-cmd__metric-domain">{data.domain}</span>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────
   Response Card: Insight List — Intelligence Briefing
   ────────────────────────────────────── */

function InsightListCard({ data }: { data: InsightListData }) {
  return (
    <div className="glass-cmd__card glass-cmd__card--insights">
      {data.insights.map((insight, i) => {
        const impactColor =
          insight.impact === "high" ? "var(--color-rose-400)"
          : insight.impact === "medium" ? "var(--color-amber-400)"
          : "var(--color-silver-400)";

        return (
          <motion.div
            key={insight.id}
            className="glass-cmd__insight"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <span className="glass-cmd__insight-bar" style={{ background: impactColor }} />
            <div className="min-w-0 flex-1">
              <p className="glass-cmd__insight-title">{insight.title}</p>
              <p className="glass-cmd__insight-desc">{insight.description}</p>
            </div>
            <div className="glass-cmd__insight-meta">
              <span className="glass-cmd__insight-impact" style={{ color: impactColor }}>{insight.impact}</span>
              <span className="glass-cmd__insight-conf">{insight.confidence}%</span>
            </div>
          </motion.div>
        );
      })}

      {data.causalChains && data.causalChains.length > 0 && (
        <div className="glass-cmd__chains">
          <span className="glass-cmd__chains-title">Cascadas detectadas</span>
          {data.causalChains.map((chain) => (
            <div key={chain.name} className="glass-cmd__chain-item">
              <ArrowRight className="w-3 h-3 text-[var(--color-amber-400)]" />
              <span>{chain.description}</span>
            </div>
          ))}
        </div>
      )}

      {data.totalCount > data.insights.length && (
        <span className="glass-cmd__more">+{data.totalCount - data.insights.length} más</span>
      )}
    </div>
  );
}

/* ──────────────────────────────────────
   Response Card: Simulation Result — Verdict Theater
   ────────────────────────────────────── */

function SimulationResultCard({ data }: {
  data: SimulationResultData;
  onAction?: (action: string, data?: unknown) => void;
}) {
  const vColor =
    data.verdictAssessment === "positive" ? "var(--color-emerald-400)"
    : data.verdictAssessment === "negative" ? "var(--color-rose-400)"
    : data.verdictAssessment === "mixed" ? "var(--color-amber-400)"
    : "var(--color-silver-400)";

  const vIcon =
    data.verdictAssessment === "positive" ? CheckCircle2
    : data.verdictAssessment === "negative" ? AlertTriangle
    : data.verdictAssessment === "mixed" ? AlertTriangle
    : Shield;

  const VIcon = vIcon;

  return (
    <div className="glass-cmd__card glass-cmd__card--simulation">
      {/* Verdict beacon */}
      <div className="glass-cmd__sim-verdict">
        <motion.div
          className="glass-cmd__sim-verdict-icon"
          style={{ color: vColor, borderColor: vColor }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <VIcon size={20} />
        </motion.div>
        <div>
          <p className="glass-cmd__sim-verdict-label" style={{ color: vColor }}>
            {data.verdictAssessment === "positive" ? "Resultado Positivo"
              : data.verdictAssessment === "negative" ? "Resultado Negativo"
              : data.verdictAssessment === "mixed" ? "Resultado Mixto"
              : "Resultado Neutro"}
          </p>
          <p className="glass-cmd__sim-verdict-name">{data.scenarioName}</p>
        </div>
      </div>

      <p className="glass-cmd__sim-verdict-text">{data.verdict}</p>

      {/* Predictions */}
      {data.predictions.length > 0 && (
        <div className="glass-cmd__sim-predictions">
          {data.predictions.map((pred) => (
            <div key={pred.metricName} className="glass-cmd__sim-pred">
              <span className="glass-cmd__sim-pred-name">{pred.metricName}</span>
              <span className="glass-cmd__sim-pred-from">
                {pred.unit === "₡" ? formatCRC(pred.current) : `${pred.current}${pred.unit}`}
              </span>
              <ArrowRight className="w-3 h-3 text-[var(--color-silver-600)]" />
              <span className="glass-cmd__sim-pred-to" style={{ color: pred.delta > 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)" }}>
                {pred.unit === "₡" ? formatCRC(pred.predicted) : `${pred.predicted}${pred.unit}`}
              </span>
              <span className="glass-cmd__sim-pred-conf">{pred.confidence}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Recommendation CTA */}
      <div className="glass-cmd__sim-rec">
        <span className={cn(
          "glass-cmd__sim-rec-badge",
          data.recommendation === "execute" && "glass-cmd__sim-rec-badge--positive",
          data.recommendation === "reject" && "glass-cmd__sim-rec-badge--negative",
        )}>
          {data.recommendation === "execute" ? "✓ Recomendado"
            : data.recommendation === "execute_with_monitoring" ? "⚠ Con monitoreo"
            : data.recommendation === "reject" ? "✗ No recomendado"
            : "↻ Reconsiderar"}
        </span>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────
   Response Card: Action Confirmation — Approval Gate
   ────────────────────────────────────── */

function ActionConfirmationCard({
  data,
  onAction,
}: {
  data: ActionConfirmationData;
  onAction?: (action: string, data?: unknown) => void;
}) {
  const levelColor =
    data.approvalLevel === "hitl" ? "var(--color-rose-400)"
    : data.approvalLevel === "semi" ? "var(--color-amber-400)"
    : "var(--color-emerald-400)";

  return (
    <div className="glass-cmd__card glass-cmd__card--action">
      <div className="glass-cmd__action-header">
        <Zap className="w-4 h-4" style={{ color: levelColor }} />
        <p className="glass-cmd__action-desc">{data.actionDescription}</p>
      </div>

      <div className="glass-cmd__action-meta">
        <span className="glass-cmd__action-level" style={{ color: levelColor, borderColor: levelColor }}>
          {data.approvalLevel.toUpperCase()}
        </span>
        <code className="glass-cmd__action-code">{data.server}.{data.tool}</code>
      </div>

      {data.status === "pending_approval" ? (
        <div className="glass-cmd__action-cta">
          <button onClick={() => onAction?.("approve_action", data)} className="glass-cmd__action-approve">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Aprobar</span>
          </button>
          <span className="glass-cmd__action-pending">Pendiente de aprobación</span>
        </div>
      ) : (
        <span className="glass-cmd__action-ready">
          <CheckCircle2 className="w-3 h-3" /> Lista para ejecutar
        </span>
      )}
    </div>
  );
}

/* ──────────────────────────────────────
   Response Card: Rule Created
   ────────────────────────────────────── */

function RuleCreatedCard({ data }: { data: RuleCreatedData }) {
  return (
    <div className="glass-cmd__card glass-cmd__card--rule">
      <div className="glass-cmd__rule-header">
        {data.valid
          ? <CheckCircle2 className="w-4 h-4 text-[var(--color-emerald-400)]" />
          : <AlertTriangle className="w-4 h-4 text-[var(--color-rose-400)]" />}
        <span>{data.valid ? "Regla creada" : "Regla con errores"}</span>
      </div>

      <code className="glass-cmd__rule-code">{data.ruleText}</code>

      {data.issues.length > 0 && (
        <div className="glass-cmd__rule-issues">
          {data.issues.map((issue, idx) => (
            <p key={idx} className={cn(
              "glass-cmd__rule-issue",
              issue.severity === "error" && "glass-cmd__rule-issue--error",
              issue.severity === "warning" && "glass-cmd__rule-issue--warning",
            )}>
              <span>•</span> {issue.message}
            </p>
          ))}
        </div>
      )}

      {data.ruleId && <span className="glass-cmd__rule-id">ID: {data.ruleId}</span>}
    </div>
  );
}

/* ──────────────────────────────────────
   Response Card: Goal Created
   ────────────────────────────────────── */

function GoalCreatedCard({
  data,
  onAction,
}: {
  data: GoalCreatedData;
  onAction?: (action: string, data?: unknown) => void;
}) {
  return (
    <div className="glass-cmd__card glass-cmd__card--goal">
      <div className="glass-cmd__goal-header">
        <Target className="w-4 h-4 text-[var(--color-gold-400)]" />
        <span>{data.title}</span>
      </div>

      <div className="glass-cmd__goal-flow">
        <span className="glass-cmd__goal-current">{data.currentValue}{data.unit}</span>
        <ArrowRight className="w-4 h-4 text-[var(--color-gold-400)]" />
        <span className="glass-cmd__goal-target">{data.targetValue}{data.unit}</span>
      </div>

      {data.deadline && (
        <div className="glass-cmd__goal-deadline">
          <Clock className="w-3 h-3" />
          <span>Plazo: {data.deadline}</span>
        </div>
      )}

      {onAction && data.status === "suggested" && (
        <button onClick={() => onAction?.("derive_goal", data)} className="glass-cmd__goal-derive">
          <Lightbulb className="w-3 h-3" /> Derivar meta
        </button>
      )}
    </div>
  );
}

/* ──────────────────────────────────────
   Response Card: Report Preview
   ────────────────────────────────────── */

function ReportPreviewCard({
  data,
  onAction,
}: {
  data: ReportPreviewData;
  onAction?: (action: string, data?: unknown) => void;
}) {
  return (
    <div className="glass-cmd__card glass-cmd__card--report">
      <div className="glass-cmd__report-header">
        <FileText className="w-4 h-4 text-[var(--color-silver-300)]" />
        <span>{data.title}</span>
      </div>

      {data.keyMetrics.length > 0 && (
        <div className="glass-cmd__report-metrics">
          {data.keyMetrics.map((m) => (
            <div key={m.name} className="glass-cmd__report-metric">
              <span className="glass-cmd__report-metric-name">{m.name}</span>
              <span className="glass-cmd__report-metric-value">{m.value}</span>
              {m.trend && <span className="glass-cmd__report-metric-trend">{m.trend}</span>}
            </div>
          ))}
        </div>
      )}

      {data.hasFullReport && onAction && (
        <button onClick={() => onAction?.("generate_report", data)} className="glass-cmd__report-generate">
          <FileText className="w-3 h-3" /> Generar reporte completo
        </button>
      )}
    </div>
  );
}

/* ──────────────────────────────────────
   Response Card: Error
   ────────────────────────────────────── */

function ErrorCard({ data }: { data: ErrorData }) {
  return (
    <div className="glass-cmd__card glass-cmd__card--error">
      <AlertTriangle className="w-4 h-4 text-[var(--color-rose-400)]" />
      <div>
        <p className="glass-cmd__error-msg">{data.errorMessage}</p>
        <p className="glass-cmd__error-suggestion">{data.suggestion}</p>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────
   Response Card Router
   ────────────────────────────────────── */

function ResponseCard({
  response,
  onAction,
}: {
  response: CommandResponse;
  onAction?: (action: string, data?: unknown) => void;
}) {
  const { cardType, data } = response;
  switch (cardType) {
    case "metric_value": return <MetricValueCard data={data as MetricValueData} />;
    case "insight_list": return <InsightListCard data={data as InsightListData} />;
    case "simulation_result": return <SimulationResultCard data={data as SimulationResultData} onAction={onAction} />;
    case "action_confirmation": return <ActionConfirmationCard data={data as ActionConfirmationData} onAction={onAction} />;
    case "rule_created": return <RuleCreatedCard data={data as RuleCreatedData} />;
    case "goal_created": return <GoalCreatedCard data={data as GoalCreatedData} onAction={onAction} />;
    case "report_preview": return <ReportPreviewCard data={data as ReportPreviewData} onAction={onAction} />;
    case "error": return <ErrorCard data={data as ErrorData} />;
    default: return (
      <div className="glass-cmd__card">
        <p className="glass-cmd__card-fallback">{response.textSummary}</p>
      </div>
    );
  }
}

/* ──────────────────────────────────────
   Main Orchestrator
   ────────────────────────────────────── */

export function CommandInterface({
  turns,
  isProcessing,
  onCommand,
  onFollowup,
  onAction,
}: CommandInterfaceProps) {
  const reduced = useReducedMotion();
  const [inputText, setInputText] = useState("");
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Auto-scroll */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns.length, isProcessing]);

  /* Focus input */
  useEffect(() => { inputRef.current?.focus(); }, []);

  /* Keyboard shortcut: Cmd/Ctrl+K to focus */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleSubmit = useCallback(() => {
    const text = inputText.trim();
    if (!text || isProcessing) return;
    setCmdHistory((prev) => [text, ...prev]);
    setHistoryIdx(-1);
    onCommand(text);
    setInputText("");
  }, [inputText, isProcessing, onCommand]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    /* History navigation */
    if (e.key === "ArrowUp" && !inputText) {
      e.preventDefault();
      const next = Math.min(historyIdx + 1, cmdHistory.length - 1);
      setHistoryIdx(next);
      setInputText(cmdHistory[next] || "");
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.max(historyIdx - 1, -1);
      setHistoryIdx(next);
      setInputText(next >= 0 ? cmdHistory[next] : "");
    }
  }, [handleSubmit, inputText, historyIdx, cmdHistory]);

  const isEmpty = turns.length === 0;
  const showHints = inputText.length > 0 && !isLikelyCommand(inputText);

  /* Rotating placeholder */
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setPlaceholderIdx((i) => (i + 1) % EXAMPLE_COMMANDS.length), 3000);
    return () => clearInterval(iv);
  }, []);

  const lastCommand = turns.length > 0 ? turns[0].userText : null;

  return (
    <div className="glass-cmd">
      {/* Ambient glow */}
      <span className="glass-cmd__glow" />

      {/* ═══ Header ═══ */}
      <div className="glass-cmd__header">
        <div className="glass-cmd__header-left">
          <div className="glass-cmd__header-icon">
            <Zap size={16} strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="glass-cmd__header-title">Comandos AI</h3>
            <p className="glass-cmd__header-sub">Sistema de comandos en lenguaje natural</p>
          </div>
        </div>
        <div className="glass-cmd__header-right">
          <span className="glass-cmd__header-hint">
            <Keyboard className="w-3 h-3" />
            ⌘K
          </span>
          {turns.length > 0 && (
            <span className="glass-cmd__header-count">
              <History className="w-3 h-3" />
              {turns.length}
            </span>
          )}
        </div>
      </div>

      {/* ═══ Messages Area ═══ */}
      <div ref={scrollRef} className="glass-cmd__messages">
        {/* Empty state */}
        {isEmpty && !isProcessing && (
          <motion.div
            className="glass-cmd__empty"
            initial={reduced ? undefined : { opacity: 0, y: 8 }}
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
          >
            <motion.div
              animate={reduced ? undefined : { scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Shield className="glass-cmd__empty-icon" />
            </motion.div>
            <h4 className="glass-cmd__empty-title">Consola de Inteligencia</h4>
            <p className="glass-cmd__empty-sub">Escribí un comando en español o elegí un ejemplo</p>

            <div className="glass-cmd__examples">
              {EXAMPLE_COMMANDS.map((ex, i) => {
                const cfg = COMMAND_TYPE_CONFIG[ex.type];
                return (
                  <motion.button
                    key={ex.text}
                    onClick={() => onCommand(ex.text)}
                    className="glass-cmd__example"
                    initial={reduced ? undefined : { opacity: 0, y: 6 }}
                    animate={reduced ? undefined : { opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                    whileHover={reduced ? undefined : { scale: 1.01, y: -2 }}
                  >
                    <span className="glass-cmd__example-type" style={{ color: cfg.color }}>{cfg.label}</span>
                    <span className="glass-cmd__example-text">{ex.text}</span>
                    <span className="glass-cmd__example-desc">{ex.desc}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Turn list */}
        <AnimatePresence>
          {[...turns].reverse().map((turn) => (
            <motion.div
              key={turn.id}
              className="glass-cmd__turn"
              initial={reduced ? undefined : { opacity: 0, y: 8 }}
              animate={reduced ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {/* User command */}
              <div className="glass-cmd__user">
                <Terminal className="w-3.5 h-3.5 text-[var(--color-gold-400)] flex-shrink-0" />
                <span className="glass-cmd__user-text">{turn.userText}</span>
              </div>

              {/* Response */}
              <div className="glass-cmd__response">
                <div className="glass-cmd__response-header">
                  <TypeBadge type={turn.intent.type} />
                  <span className="glass-cmd__response-meta">
                    {turn.response.executionMs}ms · {turn.response.parseStrategy === "deterministic" ? "determinístico" : "IA"}
                  </span>
                </div>

                <ResponseCard response={turn.response} onAction={onAction} />

                <FollowupChips
                  followups={turn.response.suggestedFollowups}
                  onFollowup={onFollowup}
                  reduced={reduced}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Parsing ceremony */}
        {isProcessing && lastCommand && (
          <ParsingCeremony text={lastCommand} reduced={reduced} />
        )}
        {isProcessing && !lastCommand && (
          <motion.div className="glass-cmd__processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Loader2 className="w-4 h-4 text-[var(--color-gold-400)] animate-spin" />
            <span>Procesando...</span>
          </motion.div>
        )}
      </div>

      {/* ═══ Command Bar ═══ */}
      <div className="glass-cmd__input-wrap">
        {showHints && (
          <motion.p
            className="glass-cmd__hint"
            initial={reduced ? undefined : { opacity: 0, y: 4 }}
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
          >
            No parece un comando. Probá: "¿Cuál es...", "Simula...", "Generar..."
          </motion.p>
        )}

        <div className="glass-cmd__input-bar">
          <Zap className="glass-cmd__input-icon" />
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => { setInputText(e.target.value); setHistoryIdx(-1); }}
            onKeyDown={handleKeyDown}
            placeholder={EXAMPLE_COMMANDS[placeholderIdx].text}
            disabled={isProcessing}
            className="glass-cmd__input"
            aria-label="Comando"
          />
          <button
            onClick={handleSubmit}
            disabled={!inputText.trim() || isProcessing}
            className="glass-cmd__send"
            aria-label="Enviar comando"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <div className="glass-cmd__input-footer">
          <span>Enter para enviar</span>
          <span>↑↓ historial</span>
          <span>⌘K focus</span>
        </div>
      </div>
    </div>
  );
}