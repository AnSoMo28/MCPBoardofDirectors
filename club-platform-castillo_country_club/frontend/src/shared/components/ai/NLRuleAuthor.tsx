// src/shared/components/ai/NLRuleAuthor.tsx
// Fase 23 — Silver Tide NL Rule Forge
// Glass · Live Flow Diagram · Parse Ceremony · Code Highlighting · Living Library
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Zap, AlertTriangle, CheckCircle2, Info,
  Trash2, Pause, Play, HelpCircle, Loader2, Sparkles,
  ChevronDown, X, ArrowRight, Target,
  Shield, Lightbulb, Terminal
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { useBreakpoint } from "@/shared/hooks/useBreakpoint";
import { parseNLRule, getMetricByPath } from "@/shared/lib/advisor-engine/nl-rule-parser";
import { validateNLRule, isLikelyParseable } from "@/shared/lib/advisor-engine/nl-rule-validator";
import type {
  ParsedNLRule, NLRuleTemplate,
} from "@/shared/lib/advisor-engine/nl-rule-types";
import {
  NL_RULE_STATUS_CONFIG, PARSE_STRATEGY_CONFIG,
} from "@/shared/lib/advisor-engine/nl-rule-types";
import {
  saveCustomRule, getCustomRules, deleteCustomRule, toggleCustomRule,
} from "@/shared/lib/advisor-engine/nl-rule-store";
import './NLRuleAuthor.css';

/* ──────────────────────────────────────
   Constants
   ────────────────────────────────────── */

const EXAMPLE_PROMPTS = [
  { text: 'Cuando el churn supere 8%, alertar al gerente con prioridad alta', icon: AlertTriangle, difficulty: "Fácil" },
  { text: 'Si los ingresos bajan de ₡5,000,000, notificar al director financiero', icon: Target, difficulty: "Fácil" },
  { text: 'Cuando la satisfacción sea menor a 60 puntos, crear una alerta crítica', icon: AlertTriangle, difficulty: "Fácil" },
  { text: 'Si hay más de 5 anomalías esta semana, generar reporte ejecutivo', icon: MessageSquare, difficulty: "Medio" },
  { text: 'Cuando la ocupación baje de 40%, ajustar precios de eventos', icon: Zap, difficulty: "Medio" },
];

const NL_KEYWORDS = {
  metrics: ["churn", "ingresos", "satisfacción", "ocupación", "anomalías", "retención", "revenue"],
  operators: ["supere", "baje de", "sea menor a", "sea mayor a", "sea igual a", "exceda", "esté por debajo"],
  actions: ["alertar", "notificar", "generar", "crear", "ajustar", "enviar", "reportar"],
};

/* ──────────────────────────────────────
   Live Flow Diagram
   ────────────────────────────────────── */

function RuleFlowDiagram({ parsed, reduced }: {
  parsed: ParsedNLRule | null;
  reduced: boolean;
  isMobile: boolean;
}) {
  const condition = parsed?.conditions[0];
  const action = parsed?.action;
  const hasCondition = !!condition;
  const hasAction = !!action;

  const conditionMetric = condition ? (getMetricByPath(condition.metric)?.names[0] ?? condition.metric) : "";
  const conditionOp = condition ? `${condition.operator} ${condition.threshold}${condition.unit}` : "";
  const actionVerb = action?.verb ?? "";
  const actionTarget = action?.target ?? "";

  return (
    <div className="glass-rule__flow">
      {/* Condition Node */}
      <motion.div
        className={cn("glass-rule__flow-node", hasCondition && "glass-rule__flow-node--active")}
        style={{ borderColor: hasCondition ? "var(--color-teal-400)" : undefined }}
        animate={hasCondition && !reduced ? { scale: [1, 1.03, 1] } : undefined}
        transition={{ duration: 0.3 }}
      >
        <div className="glass-rule__flow-node-header">
          <Target className="w-3.5 h-3.5" />
          <span>CONDICIÓN</span>
        </div>
        {hasCondition ? (
          <div className="glass-rule__flow-node-content">
            <span className="glass-rule__flow-metric">{conditionMetric}</span>
            <span className="glass-rule__flow-operator">{conditionOp}</span>
          </div>
        ) : (
          <p className="glass-rule__flow-placeholder">Escribí "Cuando..."</p>
        )}
      </motion.div>

      {/* Arrow connector */}
      <div className="glass-rule__flow-arrow">
        <span className="glass-rule__flow-line" />
        <ArrowRight className="w-4 h-4" />
        <span className="glass-rule__flow-line" />
        {hasCondition && hasAction && !reduced && (
          <motion.span
            className="glass-rule__flow-particle"
            animate={{ x: [0, 40, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
        )}
      </div>

      {/* Action Node */}
      <motion.div
        className={cn("glass-rule__flow-node", hasAction && "glass-rule__flow-node--active glass-rule__flow-node--action")}
        style={{ borderColor: hasAction ? "var(--color-gold-400)" : undefined }}
        animate={hasAction && !reduced ? { scale: [1, 1.03, 1] } : undefined}
        transition={{ duration: 0.3 }}
      >
        <div className="glass-rule__flow-node-header">
          <Zap className="w-3.5 h-3.5" />
          <span>ACCIÓN</span>
        </div>
        {hasAction ? (
          <div className="glass-rule__flow-node-content">
            <span className="glass-rule__flow-verb">{actionVerb}</span>
            <span className="glass-rule__flow-target">{actionTarget}</span>
          </div>
        ) : (
          <p className="glass-rule__flow-placeholder">...entonces [acción]</p>
        )}
      </motion.div>
    </div>
  );
}

/* ──────────────────────────────────────
   Confidence Gauge
   ────────────────────────────────────── */

function ConfidenceGauge({
  confidence,
  strategy,
  reduced,
}: {
  confidence: number;
  strategy: string;
  reduced: boolean;
}) {
  const pct = Math.round(confidence * 100);
  const color =
    pct >= 80 ? "var(--color-emerald-400)"
    : pct >= 60 ? "var(--color-amber-400)"
    : "var(--color-rose-400)";

  const stratCfg = PARSE_STRATEGY_CONFIG[strategy as keyof typeof PARSE_STRATEGY_CONFIG];

  return (
    <div className="glass-rule__confidence">
      <div className="glass-rule__confidence-gauge">
        <svg viewBox="0 0 36 36" className="glass-rule__confidence-svg">
          <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
          <motion.circle
            cx="18" cy="18" r="14"
            fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
            strokeDasharray={`${confidence * 88} 88`}
            transform="rotate(-90 18 18)"
            initial={reduced ? undefined : { strokeDasharray: "0 88" }}
            animate={reduced ? undefined : { strokeDasharray: `${confidence * 88} 88` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{ filter: `drop-shadow(0 0 3px ${color})` }}
          />
        </svg>
        <span className="glass-rule__confidence-pct" style={{ color }}>{pct}</span>
      </div>
      <div className="glass-rule__confidence-info">
        <span className="glass-rule__confidence-strategy" style={{ color: stratCfg?.color }}>
          {strategy === "deterministic" ? <Zap className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
          {stratCfg?.label ?? strategy}
        </span>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────
   Parse Ceremony
   ────────────────────────────────────── */

function ParseCeremony({ phase, reduced }: {
  text: string;
  phase: "idle" | "parsing" | "condition" | "action" | "validating" | "done";
  reduced: boolean;
}) {
  const steps = [
    { key: "parsing", label: "Leyendo tu regla", icon: Terminal },
    { key: "condition", label: "Detectando condición", icon: Target },
    { key: "action", label: "Reconociendo acción", icon: Zap },
    { key: "validating", label: "Validando", icon: Shield },
  ];

  const phaseOrder = ["idle", "parsing", "condition", "action", "validating", "done"];
  const currentIdx = phaseOrder.indexOf(phase);

  return (
    <motion.div
      className="glass-rule__ceremony"
      initial={reduced ? undefined : { opacity: 0, y: 4 }}
      animate={reduced ? undefined : { opacity: 1, y: 0 }}
    >
      {steps.map((step, _i) => {
        const stepIdx = phaseOrder.indexOf(step.key);
        const isDone = currentIdx > stepIdx;
        const isCurrent = phase === step.key;
        const StepIcon = step.icon;

        return (
          <span
            key={step.key}
            className={cn(
              "glass-rule__ceremony-step",
              isDone && "glass-rule__ceremony-step--done",
              isCurrent && "glass-rule__ceremony-step--current",
            )}
          >
            {isDone ? <CheckCircle2 className="w-3 h-3" />
              : isCurrent ? <Loader2 className="w-3 h-3 animate-spin" />
              : <StepIcon className="w-3 h-3" />}
            {step.label}
          </span>
        );
      })}
    </motion.div>
  );
}

/* ──────────────────────────────────────
   Rule Card — Library Item
   ────────────────────────────────────── */

function RuleCard({
  rule,
  onToggle,
  onDelete,
  reduced,
}: {
  rule: NLRuleTemplate;
  onToggle: () => void;
  onDelete: () => void;
  reduced: boolean;
}) {
  const statusCfg = NL_RULE_STATUS_CONFIG[rule.status];
  const isActive = rule.status === "active";

  return (
    <motion.div
      className={cn("glass-rule__card", !isActive && "glass-rule__card--paused")}
      layout
      initial={reduced ? undefined : { opacity: 0, y: 4 }}
      animate={reduced ? undefined : { opacity: 1, y: 0 }}
      exit={reduced ? undefined : { opacity: 0, x: -20 }}
    >
      {/* Status beacon */}
      <span className={cn("glass-rule__card-beacon", isActive && "glass-rule__card-beacon--active")} />

      <div className="min-w-0 flex-1">
        {/* Rule text */}
        <p className="glass-rule__card-text">{rule.text}</p>

        {/* Meta */}
        <div className="glass-rule__card-meta">
          <span className="glass-rule__card-status" style={{ color: statusCfg.color }}>
            {statusCfg.label}
          </span>
          <span className="glass-rule__card-domain">{rule.domain}</span>
          <span className="glass-rule__card-stats">
            {rule.evaluationCount} eval · {rule.triggerCount} trigger
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="glass-rule__card-actions">
        <button onClick={onToggle} className="glass-rule__card-toggle" aria-label={isActive ? "Pausar" : "Activar"}>
          {isActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
        </button>
        <button onClick={onDelete} className="glass-rule__card-delete" aria-label="Eliminar">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}

/* ──────────────────────────────────────
   Highlighted Textarea
   ────────────────────────────────────── */

function HighlightedTextarea({
  value,
  onChange,
  textareaRef,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  /* Build highlighted overlay */
  const highlighted = useMemo(() => {
    if (!value.trim()) return "";
    let html = value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    /* Highlight metrics */
    NL_KEYWORDS.metrics.forEach((m) => {
      const re = new RegExp(`(${m})`, "gi");
      html = html.replace(re, `<mark class="glass-rule__hl-metric">$1</mark>`);
    });
    /* Highlight operators */
    NL_KEYWORDS.operators.forEach((o) => {
      const re = new RegExp(`(${o})`, "gi");
      html = html.replace(re, `<mark class="glass-rule__hl-operator">$1</mark>`);
    });
    /* Highlight actions */
    NL_KEYWORDS.actions.forEach((a) => {
      const re = new RegExp(`(${a})`, "gi");
      html = html.replace(re, `<mark class="glass-rule__hl-action">$1</mark>`);
    });
    /* Highlight numbers */
    html = html.replace(/(\d[\d.,]*%?)/g, '<mark class="glass-rule__hl-number">$1</mark>');

    return html;
  }, [value]);

  return (
    <div className="glass-rule__editor">
      {/* Highlight overlay */}
      <div
        className="glass-rule__editor-highlight"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
      {/* Real textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        placeholder="Escribí tu regla aquí... Ej: Cuando el churn supere 8%, alertar al gerente"
        rows={3}
        className="glass-rule__editor-input"
        aria-label="Regla en lenguaje natural"
        spellCheck={false}
      />
    </div>
  );
}

/* ──────────────────────────────────────
   Main Orchestrator
   ────────────────────────────────────── */

export function NLRuleAuthor() {
  const reduced = useReducedMotion();
  const { isMobile } = useBreakpoint();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [inputText, setInputText] = useState("");
  const [savedRules, setSavedRules] = useState<NLRuleTemplate[]>(() => getCustomRules());
  const [showLibrary, setShowLibrary] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [parsePhase, setParsePhase] = useState<"idle" | "parsing" | "condition" | "action" | "validating" | "done">("idle");

  /* Parse pipeline */
  const parseResult = useMemo(() => {
    if (inputText.trim().length < 5) {
      return { parsed: null, validation: null, preCheck: { parseable: false, hints: [] } };
    }
    const preCheck = isLikelyParseable(inputText);
    const parsed = parseNLRule(inputText, "manager");
    const validation = parsed ? validateNLRule(parsed, savedRules) : null;
    return { parsed, validation, preCheck };
  }, [inputText, savedRules]);

  const { parsed, validation, preCheck } = parseResult;

  /* Parse ceremony effect */
  useEffect(() => {
    if (!inputText.trim() || inputText.trim().length < 5) {
      setParsePhase("idle");
      return;
    }
    if (reduced) { setParsePhase("done"); return; }

    setParsePhase("parsing");
    const t1 = setTimeout(() => setParsePhase(parsed?.conditions.length ? "condition" : "parsing"), 400);
    const t2 = setTimeout(() => setParsePhase(parsed?.action ? "action" : "parsing"), 800);
    const t3 = setTimeout(() => setParsePhase("validating"), 1200);
    const t4 = setTimeout(() => setParsePhase("done"), 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [inputText, parsed, reduced]);

  /* Auto-clear success */
  useEffect(() => {
    if (saveSuccess) {
      const t = setTimeout(() => setSaveSuccess(false), 3000);
      return () => clearTimeout(t);
    }
  }, [saveSuccess]);

  /* Handlers */
  const handleSave = useCallback(() => {
    if (!parsed || !validation?.valid) return;
    setIsSaving(true);
    try {
      const rule = saveCustomRule({
        text: inputText.trim(),
        domain: parsed.domain,
        createdBy: "manager",
        parseStrategy: parsed.strategy,
      });
      setSavedRules((prev) => [rule, ...prev]);
      setInputText("");
      setSaveSuccess(true);
      setParsePhase("idle");
    } catch (e) {
      if (import.meta.env.DEV) console.error("[NLRuleAuthor] Save failed:", e);
    } finally {
      setIsSaving(false);
    }
  }, [parsed, validation, inputText]);

  const handleDelete = useCallback((id: string) => {
    deleteCustomRule(id);
    setSavedRules((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleToggle = useCallback((id: string) => {
    toggleCustomRule(id);
    setSavedRules((prev) => prev.map((r) =>
      r.id === id ? { ...r, status: r.status === "active" ? "paused" : "active" } : r,
    ));
  }, []);

  const handleExampleClick = useCallback((text: string) => {
    setInputText(text);
    textareaRef.current?.focus();
  }, []);

  const hasContent = inputText.trim().length > 0;
  const activeCount = savedRules.filter((r) => r.status === "active").length;

  return (
    <div className="glass-rule">
      {/* Ambient glow */}
      <span className="glass-rule__glow" />

      {/* ═══ Header ═══ */}
      <div className="glass-rule__header">
        <div className="glass-rule__header-left">
          <div className="glass-rule__header-icon">
            <MessageSquare size={18} strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="glass-rule__header-title">Crear Regla en Lenguaje Natural</h3>
            <p className="glass-rule__header-sub">Escribí en español — el sistema interpreta tu regla</p>
          </div>
        </div>
        <button onClick={() => setShowHelp(!showHelp)} className="glass-rule__help-btn">
          <HelpCircle className="w-4 h-4" />
          <span>Ayuda</span>
        </button>
      </div>

      {/* ═══ Help Panel ═══ */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            className="glass-rule__help"
            initial={reduced ? undefined : { height: 0, opacity: 0 }}
            animate={reduced ? undefined : { height: "auto", opacity: 1 }}
            exit={reduced ? undefined : { height: 0, opacity: 0 }}
          >
            <p className="glass-rule__help-text">Escribí tu regla usando esta estructura:</p>
            <code className="glass-rule__help-template">
              "Cuando <span className="glass-rule__hl-metric">[métrica]</span>{" "}
              <span className="glass-rule__hl-operator">[operador]</span>{" "}
              <span className="glass-rule__hl-number">[valor]</span>,{" "}
              <span className="glass-rule__hl-action">[acción]</span>"
            </code>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Main Content: Editor + Flow ═══ */}
      <div className="glass-rule__main">
        {/* Editor Column */}
        <div className="glass-rule__editor-col">
          {/* Highlighted Textarea */}
          <HighlightedTextarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            textareaRef={textareaRef}
          />

          {/* Clear button */}
          {hasContent && (
            <button onClick={() => { setInputText(""); setParsePhase("idle"); }} className="glass-rule__clear">
              <X className="w-3 h-3" /> Limpiar
            </button>
          )}

          {/* Parse Ceremony */}
          {hasContent && inputText.trim().length >= 5 && (
            <ParseCeremony text={inputText} phase={parsePhase} reduced={reduced} />
          )}

          {/* Pre-parse hints */}
          {hasContent && !preCheck.parseable && preCheck.hints.length > 0 && (
            <div className="glass-rule__hints">
              {preCheck.hints.map((hint) => (
                <div key={hint} className="glass-rule__hint">
                  <Info className="w-3 h-3" />
                  <span>{hint}</span>
                </div>
              ))}
            </div>
          )}

          {/* Validation + Save */}
          {parsed && validation && (
            <motion.div
              className="glass-rule__validation-area"
              initial={reduced ? undefined : { opacity: 0, y: 6 }}
              animate={reduced ? undefined : { opacity: 1, y: 0 }}
            >
              {/* Confidence */}
              <ConfidenceGauge
                confidence={parsed.parseConfidence}
                strategy={parsed.strategy}
                reduced={reduced}
              />

              {/* Validation issues */}
              {validation.issues.length > 0 && (
                <div className="glass-rule__issues">
                  {validation.issues.map((issue, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "glass-rule__issue",
                        issue.severity === "error" && "glass-rule__issue--error",
                        issue.severity === "warning" && "glass-rule__issue--warning",
                        issue.severity === "info" && "glass-rule__issue--info",
                      )}
                    >
                      {issue.severity === "error" ? <AlertTriangle className="w-3.5 h-3.5" />
                        : issue.severity === "warning" ? <AlertTriangle className="w-3.5 h-3.5" />
                        : <Info className="w-3.5 h-3.5" />}
                      <span>{issue.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Suggestions */}
              {validation.suggestions.length > 0 && (
                <div className="glass-rule__suggestions">
                  {validation.suggestions.map((s, i) => (
                    <div key={i} className="glass-rule__suggestion">
                      <Lightbulb className="w-3 h-3" />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Save */}
              <div className="glass-rule__save-row">
                <button
                  onClick={handleSave}
                  disabled={!validation.valid || isSaving}
                  className="glass-rule__save-btn"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{isSaving ? "Guardando..." : "Guardar regla"}</span>
                </button>

                <AnimatePresence>
                  {saveSuccess && (
                    <motion.span
                      className="glass-rule__save-success"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Regla guardada y activa
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </div>

        {/* Flow Diagram Column (desktop only) */}
        {!isMobile && parsed && (
          <motion.div
            className="glass-rule__flow-col"
            initial={reduced ? undefined : { opacity: 0, x: 12 }}
            animate={reduced ? undefined : { opacity: 1, x: 0 }}
          >
            <RuleFlowDiagram parsed={parsed} reduced={reduced} isMobile={isMobile} />
          </motion.div>
        )}
      </div>

      {/* ═══ Mobile Flow Diagram ═══ */}
      {isMobile && parsed && (
        <motion.div
          className="glass-rule__flow-mobile"
          initial={reduced ? undefined : { opacity: 0, y: 6 }}
          animate={reduced ? undefined : { opacity: 1, y: 0 }}
        >
          <RuleFlowDiagram parsed={parsed} reduced={reduced} isMobile={isMobile} />
        </motion.div>
      )}

      {/* ═══ Template Gallery ═══ */}
      {!hasContent && (
        <motion.div
          className="glass-rule__templates"
          initial={reduced ? undefined : { opacity: 0, y: 6 }}
          animate={reduced ? undefined : { opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="glass-rule__templates-label">Templates — hacé clic para usar:</p>
          <div className="glass-rule__templates-grid">
            {EXAMPLE_PROMPTS.map((ex, i) => {
              const TIcon = ex.icon;
              return (
                <motion.button
                  key={i}
                  onClick={() => handleExampleClick(ex.text)}
                  className="glass-rule__template"
                  initial={reduced ? undefined : { opacity: 0, y: 4 }}
                  animate={reduced ? undefined : { opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.04 }}
                  whileHover={reduced ? undefined : { y: -2 }}
                >
                  <div className="glass-rule__template-header">
                    <TIcon className="w-3.5 h-3.5 text-[var(--color-gold-400)]" />
                    <span className="glass-rule__template-diff">{ex.difficulty}</span>
                  </div>
                  <p className="glass-rule__template-text">"{ex.text}"</p>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ═══ Rule Library ═══ */}
      {savedRules.length > 0 && (
        <div className="glass-rule__library">
          <button onClick={() => setShowLibrary(!showLibrary)} className="glass-rule__library-toggle">
            <div className="glass-rule__library-toggle-left">
              <MessageSquare className="w-4 h-4 text-[var(--color-teal-400)]" />
              <span>Mis Reglas</span>
              <span className="glass-rule__library-count">{savedRules.length}</span>
              <span className="glass-rule__library-active">
                <span className="glass-rule__library-active-dot" />
                {activeCount} activas
              </span>
            </div>
            <motion.div animate={{ rotate: showLibrary ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-4 h-4 text-[var(--color-silver-400)]" />
            </motion.div>
          </button>

          <AnimatePresence>
            {showLibrary && (
              <motion.div
                className="glass-rule__library-body"
                initial={reduced ? undefined : { height: 0, opacity: 0 }}
                animate={reduced ? undefined : { height: "auto", opacity: 1 }}
                exit={reduced ? undefined : { height: 0, opacity: 0 }}
              >
                <div className="glass-rule__library-list">
                  <AnimatePresence>
                    {savedRules.map((rule) => (
                      <RuleCard
                        key={rule.id}
                        rule={rule}
                        onToggle={() => handleToggle(rule.id)}
                        onDelete={() => handleDelete(rule.id)}
                        reduced={reduced}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}