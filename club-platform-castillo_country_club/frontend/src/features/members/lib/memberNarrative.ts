// ═══════════════════════════════════════════════════════════════════════
// Member360 Intelligence — Narrative Engine
// Phase 30 — Block 0.4: The Voice
// ═══════════════════════════════════════════════════════════════════════
//
// Generates AI-powered narratives from computed member intelligence.
// Not a data formatter — a STORYTELLER that turns numbers into meaning.
//
// Five narrative types, each for a different audience and moment:
//   1. Executive Brief   — 3-act drama for the director (typing effect)
//   2. Pulse Report      — Clinical vital signs for operations
//   3. Risk Alert        — Urgent intervention narrative
//   4. Opportunity Story — Growth/celebration narrative
//   5. Decision Brief    — Action-oriented with specific steps
//
// Each narrative is grounded in data, calibrated by urgency,
// and oriented toward action. Every sentence has a source signal.
//
// @rule Pure functions only — no side effects, no hooks, no state
// @rule Config-imported — no hardcoded values
// @rule Every function has JSDoc
// ═══════════════════════════════════════════════════════════════════════

import type {
  MemberState,
  MemberTemperature,
  VitalSign,
  DomainSignal,
  SignalResonance,
  EngagementDNAChannel,
  PredictiveWindow,
  Member360ProfileResponse,
  MemberHealthScoreResponse,
  MemberChurnPredictionResponse,
  MemberJourneyResponse,
} from "../types";

import {
  MEMBER_STATE_DISPLAY,
  TEMPERATURE_ZONE_DISPLAY,
} from "../types";

import {
  deriveDashboardMode
} from "../config";

import {
  daysSince,
  filterActionableSignals,
} from "./memberSignals";

// ═══════════════════════════════════════════════════════════════════════
// §1  NARRATIVE TYPES
// ═══════════════════════════════════════════════════════════════════════

export type NarrativeTone =
  | "clinical"      // Measured, factual, professional
  | "urgent"        // Fast, direct, action-oriented
  | "celebratory"   // Warm, recognizing, optimistic
  | "analytical"    // Deep, nuanced, data-rich
  | "decisive";     // Clear, commanding, step-by-step

export type NarrativeType =
  | "executive_brief"
  | "pulse_report"
  | "risk_alert"
  | "opportunity_story"
  | "decision_brief";

/** A single sentence in a narrative, grounded in data */
export interface GroundedSentence {
  text: string;
  source: string;
  confidence: number;
}

/** A complete narrative output */
export interface MemberNarrativeOutput {
  id: string;
  type: NarrativeType;
  tone: NarrativeTone;
  headline: string;
  subtitle: string;
  body: string;
  /** Sentences with source attribution for fact-checking */
  groundedSentences: GroundedSentence[];
  /** Recommended action */
  action?: {
    label: string;
    description: string;
    urgency: "immediate" | "today" | "this_week" | "this_month";
    tool?: string;
    params?: Record<string, unknown>;
  };
  /** Visual metadata for rendering */
  visual: {
    color: string;
    icon: string;
    /** CSS data-attribute value for styling */
    dataAttribute: string;
  };
  /** Priority for sorting in Intelligence Stream */
  priority: number;
  /** Typing speed override for rendering (chars/sec) */
  typingSpeedCPS: number;
  /** Whether this narrative should auto-play on load */
  autoPlay: boolean;
  /** When this narrative was generated */
  generatedAt: string;
  /** When this narrative expires */
  expiresAt: string;
}

/** Full briefing package for a member */
export interface MemberBriefingPackage {
  /** The primary narrative — the one that plays first */
  primary: MemberNarrativeOutput;
  /** Supporting narratives, sorted by priority */
  supporting: MemberNarrativeOutput[];
  /** All narratives combined, sorted by priority */
  all: MemberNarrativeOutput[];
  /** Overall confidence */
  confidence: number;
  /** Briefing metadata */
  generatedAt: string;
  expiresAt: string;
}

/** Member context for narrative generation */
export interface MemberNarrativeContext {
  profile: Member360ProfileResponse;
  healthScore?: MemberHealthScoreResponse | null;
  churnPrediction?: MemberChurnPredictionResponse | null;
  journey?: MemberJourneyResponse | null;
  temperature: MemberTemperature;
  vitalSigns: VitalSign[];
  signals: DomainSignal[];
  resonance: SignalResonance;
  dna: EngagementDNAChannel[];
  churnWindow?: PredictiveWindow | null;
  ltvWindow?: PredictiveWindow | null;
}

// ═══════════════════════════════════════════════════════════════════════
// §2  TONE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════

const TONE_CONFIG: Record<
  NarrativeTone,
  { color: string; icon: string; typingSpeedCPS: number }
> = {
  clinical:     { color: "var(--color-teal-400)",       icon: "📋", typingSpeedCPS: 40 },
  urgent:       { color: "var(--color-rose-400)",        icon: "🚨", typingSpeedCPS: 55 },
  celebratory:  { color: "var(--color-emerald-400)",     icon: "✦",  typingSpeedCPS: 35 },
  analytical:   { color: "var(--color-gold-400)",        icon: "📊", typingSpeedCPS: 45 },
  decisive:     { color: "var(--color-amber-400)",       icon: "⚡", typingSpeedCPS: 50 },
};

// ═══════════════════════════════════════════════════════════════════════
// §3  EXECUTIVE BRIEF — The 3-Act Drama
//
// This is the PRIMARY narrative. It plays on load with typing effect.
//
// Act I   — Context:   Who is this member? (measured, calm)
// Act II  — Tension:   What's at risk? (faster, urgent) — SKIPPED if thriving
// Act III — Resolution: What to do? (decisive, clear)
//
// The drama adapts to the member's state:
//   thriving    → Context + Celebration (no tension)
//   stable      → Context + Growth opportunity
//   drifting    → Context + Warning + Action plan
//   at_risk     → Context + Alert + Urgent action
//   disengaging → Context + Critical alert + Last stand
// ═══════════════════════════════════════════════════════════════════════

/**
 * Generate the executive brief — the primary 3-act narrative.
 * This is what the director sees first when opening a member's profile.
 *
 * @param ctx - Full member narrative context
 * @returns Executive brief narrative output
 */
export function generateExecutiveBrief(
  ctx: MemberNarrativeContext,
): MemberNarrativeOutput {
  const { profile, temperature, signals, resonance } = ctx;
  const member = profile.member;
  const name = member ? `${member.first_name} ${member.last_name}` : "Socio";
  const state = temperature.state;
  const mode = deriveDashboardMode(state, temperature.composite);

  // Build 3 acts
  const sentences: GroundedSentence[] = [];
  const bodyParts: string[] = [];

  // ── Act I: Context ──
  const contextSentences = buildContextSentences(ctx);
  sentences.push(...contextSentences);
  bodyParts.push(contextSentences.map(s => s.text).join(" "));

  // ── Act II: Tension (skip if thriving with positive resonance) ──
  const shouldSkipTension = state === "thriving" && resonance.sharedDirection === "positive";
  if (!shouldSkipTension) {
    const tensionSentences = buildTensionSentences(ctx);
    if (tensionSentences.length > 0) {
      sentences.push(...tensionSentences);
      bodyParts.push(tensionSentences.map(s => s.text).join(" "));
    }
  }

  // ── Act III: Resolution ──
  const resolutionSentences = buildResolutionSentences(ctx);
  sentences.push(...resolutionSentences);
  bodyParts.push(resolutionSentences.map(s => s.text).join(" "));

  // Compute tone from state
  const tone: NarrativeTone =
    state === "disengaging" || state === "at_risk" ? "urgent" :
    state === "drifting" ? "analytical" :
    state === "thriving" ? "celebratory" :
    "clinical";

  // Compute expiry
  const expiryMs = mode === "critical" ? 5 * 60_000 : mode === "alert" ? 10 * 60_000 : 15 * 60_000;
  const now = new Date();

  // Build action from strongest actionable signal
  const actionable = filterActionableSignals(signals, "high");
  const topAction = actionable[0];

  return {
    id: `exec-brief-${member?.member_id ?? "unknown"}`,
    type: "executive_brief",
    tone,
    headline: buildHeadline(name, state, temperature),
    subtitle: buildSubtitle(state, temperature, resonance),
    body: bodyParts.join("\n\n"),
    groundedSentences: sentences,
    action: topAction ? {
      label: deriveActionLabel(state),
      description: topAction.signal,
      urgency: state === "disengaging" ? "immediate" : state === "at_risk" ? "today" : state === "drifting" ? "this_week" : "this_month",
      tool: topAction.tool,
    } : undefined,
    visual: {
      color: MEMBER_STATE_DISPLAY[state].color,
      icon: MEMBER_STATE_DISPLAY[state].icon,
      dataAttribute: state,
    },
    priority: 0,
    typingSpeedCPS: TONE_CONFIG[tone].typingSpeedCPS,
    autoPlay: true,
    generatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + expiryMs).toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// §4  PULSE REPORT — Clinical Vital Signs Narrative
//
// Factual, measured, data-rich. For operations team.
// No drama — just the numbers and what they mean.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Generate a clinical pulse report from vital signs.
 * Measured tone, data-heavy, for operational monitoring.
 *
 * @param ctx - Member narrative context
 * @returns Pulse report narrative output
 */
export function generatePulseReport(
  ctx: MemberNarrativeContext,
): MemberNarrativeOutput {
  const { profile, temperature, vitalSigns, dna, resonance } = ctx;
  const member = profile.member;
  const name = member ? `${member.first_name} ${member.last_name}` : "Socio";
  const now = new Date();

  // Build clinical summary
  const sentences: GroundedSentence[] = [];

  // Temperature reading
  sentences.push({
    text: `Temperatura compuesta: ${temperature.composite}/100 (${temperature.zone}). Core: ${temperature.reading.core}, Superficie: ${temperature.reading.surface}, Ambiental: ${temperature.reading.ambient}.`,
    source: "temperature_engine",
    confidence: 0.95,
  });

  // Momentum
  sentences.push({
    text: `Velocidad: ${temperature.momentum.velocity > 0 ? "+" : ""}${temperature.momentum.velocity.toFixed(2)}. Masa térmica: ${temperature.momentum.thermalMass.toFixed(2)}. Trayectoria 30d: ${temperature.momentum.trajectory30d}.`,
    source: "momentum_engine",
    confidence: 0.8,
  });

  // Vital signs summary
  const sortedVitals = [...vitalSigns].sort((a, b) => b.value - a.value);
  const strongest = sortedVitals[0];
  const weakest = sortedVitals[sortedVitals.length - 1];

  sentences.push({
    text: `Dimensión más fuerte: ${strongest.name} (${strongest.value}/100, ${strongest.status}). Más débil: ${weakest.name} (${weakest.value}/100, ${weakest.status}).`,
    source: "vital_signs",
    confidence: 0.9,
  });

  // Critical vitals
  const criticals = vitalSigns.filter(vs => vs.status === "critical");
  if (criticals.length > 0) {
    sentences.push({
      text: `${criticals.length} dimensión${criticals.length > 1 ? "es" : ""} en estado crítico: ${criticals.map(c => `${c.name} (${c.value})`).join(", ")}.`,
      source: "vital_signs",
      confidence: 0.95,
    });
  }

  // Engagement DNA
  const activeChannels = dna.filter(ch => ch.recencyScore > 20);
  const preferred = dna.filter(ch => ch.preferred);
  sentences.push({
    text: `${activeChannels.length} canales activos de ${dna.length} totales. Preferidos: ${preferred.length > 0 ? preferred.map(p => p.domain).join(", ") : "ninguno identificado"}.`,
    source: "engagement_dna",
    confidence: 0.85,
  });

  // Resonance
  if (resonance.totalDomains > 0) {
    sentences.push({
      text: `Resonancia cross-domain: ${resonance.agreement} (${resonance.agreementCount}/${resonance.totalDomains} dominios). Confianza amplificada: ${Math.round(resonance.amplifiedConfidence * 100)}%.`,
      source: "signal_bus",
      confidence: resonance.amplifiedConfidence,
    });
  }

  const body = sentences.map(s => s.text).join(" ");

  return {
    id: `pulse-${member?.member_id ?? "unknown"}`,
    type: "pulse_report",
    tone: "clinical",
    headline: `Pulso de ${name} — ${temperature.composite}/100`,
    subtitle: `Estado: ${MEMBER_STATE_DISPLAY[temperature.state].label} | Zona: ${TEMPERATURE_ZONE_DISPLAY[temperature.zone].label}`,
    body,
    groundedSentences: sentences,
    visual: {
      color: "var(--color-teal-400)",
      icon: "📋",
      dataAttribute: "pulse",
    },
    priority: 3,
    typingSpeedCPS: TONE_CONFIG.clinical.typingSpeedCPS,
    autoPlay: false,
    generatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 15 * 60_000).toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// §5  RISK ALERT — Urgent Intervention Narrative
//
// Generated ONLY when there's actionable risk.
// Short, direct, focused on WHAT TO DO NOW.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Generate a risk alert narrative.
 * Only produced when there are critical/high severity signals.
 *
 * @param ctx - Member narrative context
 * @returns Risk alert or null if no significant risk
 */
export function generateRiskAlert(
  ctx: MemberNarrativeContext,
): MemberNarrativeOutput | null {
  const { profile, temperature, signals, churnWindow, resonance } = ctx;
  const member = profile.member;
  const name = member ? `${member.first_name} ${member.last_name}` : "Socio";

  // Only generate for at-risk, disengaging, or critical signals
  const criticalSignals = signals.filter(
    s => s.severity === "critical" || s.severity === "high"
  );
  if (criticalSignals.length === 0 && temperature.state !== "at_risk" && temperature.state !== "disengaging") {
    return null;
  }

  const sentences: GroundedSentence[] = [];
  const now = new Date();

  // Churn risk headline
  const churnScore = profile.churn_score ?? 0;
  if (churnScore >= 60) {
    sentences.push({
      text: `Score de abandono: ${churnScore}/100 — ${profile.churn_risk}.`,
      source: "churn_prediction",
      confidence: 0.9,
    });
  }

  // Intervention window
  if (churnWindow && churnWindow.daysRemaining !== undefined) {
    const daysLeft = churnWindow.daysRemaining;
    sentences.push({
      text: `Ventana de intervención: ${daysLeft <= 0 ? "CERRADA" : `${daysLeft} días restantes`}. ${churnWindow.interventionDeadline ? `Deadline: ${new Date(churnWindow.interventionDeadline).toLocaleDateString("es-CR")}.` : ""}`,
      source: "predictive_window",
      confidence: churnWindow.confidence,
    });
  }

  // Top critical signals
  for (const signal of criticalSignals.slice(0, 3)) {
    sentences.push({
      text: `[${signal.domain}] ${signal.signal}`,
      source: `domain_signal_${signal.domain}`,
      confidence: signal.confidence,
    });
  }

  // Resonance warning
  if (resonance.agreement === "unanimous" || resonance.agreement === "majority") {
    sentences.push({
      text: `${resonance.agreementCount} dominios confirman la tendencia negativa — alta certeza en el diagnóstico.`,
      source: "signal_resonance",
      confidence: resonance.amplifiedConfidence,
    });
  }

  const body = sentences.map(s => s.text).join(" ");

  return {
    id: `risk-${member?.member_id ?? "unknown"}`,
    type: "risk_alert",
    tone: "urgent",
    headline: `⚠ ${name} — Riesgo ${profile.churn_risk}`,
    subtitle: `${criticalSignals.length} señales críticas — ${resonance.agreementCount} dominios en alerta`,
    body,
    groundedSentences: sentences,
    action: {
      label: "Plan de retención",
      description: "Iniciar protocolo de intervención inmediata",
      urgency: temperature.state === "disengaging" ? "immediate" : "today",
      tool: "generate_member_engagement_proposals",
      params: { member_id: member?.member_id },
    },
    visual: {
      color: "var(--color-rose-400)",
      icon: "🚨",
      dataAttribute: "risk",
    },
    priority: temperature.state === "disengaging" ? -1 : 1,
    typingSpeedCPS: TONE_CONFIG.urgent.typingSpeedCPS,
    autoPlay: true,
    generatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 5 * 60_000).toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// §6  OPPORTUNITY STORY — Growth & Celebration
//
// Generated for thriving/stable members with positive signals.
// Warm tone, recognizing achievements, suggesting next steps.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Generate an opportunity story for members with positive trajectory.
 * Only produced for thriving/stable members or those with strong signals.
 *
 * @param ctx - Member narrative context
 * @returns Opportunity story or null if not applicable
 */
export function generateOpportunityStory(
  ctx: MemberNarrativeContext,
): MemberNarrativeOutput | null {
  const { profile, temperature, vitalSigns, signals, dna } = ctx;
  const member = profile.member;
  const name = member ? `${member.first_name} ${member.last_name}` : "Socio";

  // Only for thriving/stable or positive trajectory
  const isPositive = temperature.state === "thriving" || temperature.state === "stable";
  const hasPositiveSignals = signals.some(s => s.direction === "positive");

  if (!isPositive && !hasPositiveSignals) return null;

  const sentences: GroundedSentence[] = [];
  const now = new Date();

  // Achievement recognition
  if (temperature.state === "thriving") {
    sentences.push({
      text: `${name} es un activo excepcional del club — temperatura ${temperature.composite}/100 con tendencia ${temperature.trend}.`,
      source: "temperature_engine",
      confidence: 0.9,
    });
  }

  // Cross-domain star
  const activeDomains = profile.active_domains?.length ?? 0;
  if (activeDomains >= 4) {
    sentences.push({
      text: `Activo en ${activeDomains} dominios — socio altamente integrado y diversificado.`,
      source: "profile",
      confidence: 0.95,
    });
  }

  // Social influence
  const socialSign = signals.find(s => s.domain === "social" && s.direction === "positive");
  if (socialSign) {
    sentences.push({
      text: socialSign.signal,
      source: "social_domain",
      confidence: socialSign.confidence,
    });
  }

  // Strongest vital signs
  const topVitals = [...vitalSigns].sort((a, b) => b.value - a.value).slice(0, 2);
  for (const v of topVitals) {
    if (v.value >= 70) {
      sentences.push({
        text: `${v.name} excepcional: ${v.value}/100 (${v.status}).`,
        source: "vital_signs",
        confidence: 0.9,
      });
    }
  }

  // Engagement DNA strengths
  const preferredChannels = dna.filter(ch => ch.preferred);
  if (preferredChannels.length >= 2) {
    sentences.push({
      text: `${preferredChannels.length} canales preferidos: ${preferredChannels.map(ch => ch.domain).join(", ")}.`,
      source: "engagement_dna",
      confidence: 0.8,
    });
  }

  // If no meaningful sentences, skip
  if (sentences.length < 2) return null;

  const body = sentences.map(s => s.text).join(" ");

  return {
    id: `opp-${member?.member_id ?? "unknown"}`,
    type: "opportunity_story",
    tone: "celebratory",
    headline: `✦ ${name} — Oportunidad de crecimiento`,
    subtitle: temperature.state === "thriving"
      ? "Embajador potencial — reconocer y empoderar"
      : "Trayectoria positiva — ampliar participación",
    body,
    groundedSentences: sentences,
    action: {
      label: temperature.state === "thriving" ? "Programa de embajadores" : "Expandir engagement",
      description: temperature.state === "thriving"
        ? "Evaluar para programa de referidos y upgrade de tier"
        : "Presentar nuevas actividades alineadas con intereses",
      urgency: "this_month",
      tool: "generate_member_engagement_proposals",
      params: { member_id: member?.member_id },
    },
    visual: {
      color: "var(--color-emerald-400)",
      icon: "✦",
      dataAttribute: "opportunity",
    },
    priority: 4,
    typingSpeedCPS: TONE_CONFIG.celebratory.typingSpeedCPS,
    autoPlay: false,
    generatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 30 * 60_000).toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// §7  DECISION BRIEF — Action-Oriented Steps
//
// Step-by-step instructions for what to do RIGHT NOW.
// Generated for at-risk and disengaging members.
// Each step is grounded in a specific data point.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Generate a decision brief with step-by-step actions.
 * Only for members that need intervention.
 *
 * @param ctx - Member narrative context
 * @returns Decision brief or null if no intervention needed
 */
export function generateDecisionBrief(
  ctx: MemberNarrativeContext,
): MemberNarrativeOutput | null {
  const { profile, temperature, signals, churnWindow, vitalSigns, resonance } = ctx;
  const member = profile.member;
  const name = member ? `${member.first_name} ${member.last_name}` : "Socio";

  // Only for members that need action
  if (temperature.state === "thriving" || temperature.state === "stable") return null;

  const sentences: GroundedSentence[] = [];
  const steps: string[] = [];
  const now = new Date();

  // Step 1: Diagnose
  const weakest = [...vitalSigns].sort((a, b) => a.value - b.value)[0];
  steps.push(`1. DIAGNÓSTICO: Dimensión más débil: ${weakest.name} (${weakest.value}/100). ${weakest.detail ?? ""}`);
  sentences.push({
    text: steps[steps.length - 1],
    source: "vital_signs",
    confidence: 0.9,
  });

  // Step 2: Window
  if (churnWindow && churnWindow.daysRemaining !== undefined) {
    steps.push(`2. VENTANA: ${churnWindow.daysRemaining <= 0 ? "CERRADA — acción inmediata" : `${churnWindow.daysRemaining} días para intervenir`}.`);
    sentences.push({
      text: steps[steps.length - 1],
      source: "predictive_window",
      confidence: churnWindow.confidence,
    });
  }

  // Step 3: Actionable signals
  const actionable = filterActionableSignals(signals, "medium");
  if (actionable.length > 0) {
    const top = actionable[0];
    steps.push(`3. ACCIÓN PRIORITARIA: ${top.signal}.`);
    sentences.push({
      text: steps[steps.length - 1],
      source: `domain_signal_${top.domain}`,
      confidence: top.confidence,
    });
  }

  // Step 4: Cross-domain confirmation
  if (resonance.agreement === "unanimous" || resonance.agreement === "majority") {
    steps.push(`4. CONFIRMACIÓN: ${resonance.agreementCount}/${resonance.totalDomains} dominios respaldan este diagnóstico.`);
    sentences.push({
      text: steps[steps.length - 1],
      source: "signal_resonance",
      confidence: resonance.amplifiedConfidence,
    });
  }

  // Step 5: Recommended contact
  const contactMethod = temperature.state === "disengaging" ? "contacto ejecutivo directo"
    : temperature.state === "at_risk" ? "llamada personal del director"
    : "comunicación personalizada";
  steps.push(`5. CONTACTO: ${contactMethod}.`);
  sentences.push({
    text: steps[steps.length - 1],
    source: "decision_template",
    confidence: 0.85,
  });

  const body = steps.join("\n");

  return {
    id: `decision-${member?.member_id ?? "unknown"}`,
    type: "decision_brief",
    tone: "decisive",
    headline: `⚡ Plan de acción para ${name}`,
    subtitle: `${steps.length} pasos — prioridad ${temperature.state === "disengaging" ? "MÁXIMA" : "ALTA"}`,
    body,
    groundedSentences: sentences,
    action: {
      label: steps.length > 2 ? "Iniciar plan" : "Contactar ahora",
      description: steps[2]?.replace("3. ACCIÓN PRIORITARIA: ", "") ?? "Contactar socio",
      urgency: temperature.state === "disengaging" ? "immediate" : "today",
      tool: "generate_member_engagement_proposals",
      params: { member_id: member?.member_id },
    },
    visual: {
      color: "var(--color-amber-400)",
      icon: "⚡",
      dataAttribute: "decision",
    },
    priority: 2,
    typingSpeedCPS: TONE_CONFIG.decisive.typingSpeedCPS,
    autoPlay: temperature.state === "disengaging" || temperature.state === "at_risk",
    generatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 10 * 60_000).toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// §8  BRIEFING ASSEMBLY — The Complete Package
//
// Orchestrates all narrative generators and produces
// the final briefing package for the Intelligence Stream.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Generate the complete briefing package for a member.
 * Runs all narrative generators, sorts by priority, and
 * selects the primary narrative for auto-play.
 *
 * @param ctx - Full member narrative context
 * @returns Complete briefing package
 */
export function generateMemberBriefing(
  ctx: MemberNarrativeContext,
): MemberBriefingPackage {
  const narratives: MemberNarrativeOutput[] = [];
  const now = new Date();

  // Generate all narrative types
  const executiveBrief = generateExecutiveBrief(ctx);
  narratives.push(executiveBrief);

  const pulseReport = generatePulseReport(ctx);
  narratives.push(pulseReport);

  const riskAlert = generateRiskAlert(ctx);
  if (riskAlert) narratives.push(riskAlert);

  const opportunityStory = generateOpportunityStory(ctx);
  if (opportunityStory) narratives.push(opportunityStory);

  const decisionBrief = generateDecisionBrief(ctx);
  if (decisionBrief) narratives.push(decisionBrief);

  // Sort by priority (lower = higher priority)
  narratives.sort((a, b) => a.priority - b.priority);

  // Primary = highest priority that auto-plays
  const primary = narratives.find(n => n.autoPlay) ?? narratives[0];

  // Compute overall confidence
  const avgConfidence = narratives.reduce(
    (sum, n) => {
      const nConfidence = n.groundedSentences.length > 0
        ? n.groundedSentences.reduce((s, sent) => s + sent.confidence, 0) / n.groundedSentences.length
        : 0.5;
      return sum + nConfidence;
    },
    0,
  ) / narratives.length;

  // Compute shortest expiry
  const earliestExpiry = narratives.reduce(
    (earliest, n) => n.expiresAt < earliest ? n.expiresAt : earliest,
    narratives[0].expiresAt,
  );

  return {
    primary,
    supporting: narratives.filter(n => n.id !== primary.id),
    all: narratives,
    confidence: Math.round(avgConfidence * 100) / 100,
    generatedAt: now.toISOString(),
    expiresAt: earliestExpiry,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// §9  CONTEXT SENTENCE BUILDERS
//
// Internal functions that build grounded sentences for each act.
// Each sentence maps to a specific data source.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Build Act I sentences: Who is this member?
 */
function buildContextSentences(ctx: MemberNarrativeContext): GroundedSentence[] {
  const { profile, temperature, vitalSigns } = ctx;
  const member = profile.member;
  const sentences: GroundedSentence[] = [];

  // Identity
  const tier = member?.tier ?? "basic";
  const joinDays = daysSince(member?.join_date);
  const stage = profile.journey_stage;
  const stateLabel = MEMBER_STATE_DISPLAY[temperature.state].label;

  sentences.push({
    text: `${member?.first_name ?? "Socio"} ${member?.last_name ?? ""} — ${tier}, ${joinDays} días de membresía, etapa "${stage}", estado ${stateLabel}.`,
    source: "profile",
    confidence: 0.95,
  });

  // Temperature
  sentences.push({
    text: `Temperatura ${temperature.composite}/100 (${TEMPERATURE_ZONE_DISPLAY[temperature.zone].label}). Velocidad ${temperature.momentum.velocity > 0 ? "+" : ""}${temperature.momentum.velocity.toFixed(2)}.`,
    source: "temperature_engine",
    confidence: 0.9,
  });

  // Top vital sign
  const top = [...vitalSigns].sort((a, b) => b.value - a.value)[0];
  if (top) {
    sentences.push({
      text: `Fortaleza principal: ${top.name} (${top.value}/100).`,
      source: "vital_signs",
      confidence: 0.9,
    });
  }

  // Active domains
  const activeDomains = profile.active_domains?.length ?? 0;
  if (activeDomains > 0) {
    sentences.push({
      text: `Activo en ${activeDomains} dominio${activeDomains > 1 ? "s" : ""}.`,
      source: "profile",
      confidence: 0.9,
    });
  }

  return sentences;
}

/**
 * Build Act II sentences: What's at risk?
 */
function buildTensionSentences(ctx: MemberNarrativeContext): GroundedSentence[] {
  const { signals, resonance, churnWindow } = ctx;
  const sentences: GroundedSentence[] = [];

  // Negative signals
  const negativeSignals = signals.filter(
    s => s.direction === "negative" && (s.severity === "critical" || s.severity === "high")
  );

  if (negativeSignals.length > 0) {
    sentences.push({
      text: `${negativeSignals.length} señal${negativeSignals.length > 1 ? "es" : ""} de alerta: ${negativeSignals.slice(0, 2).map(s => s.signal).join(". ")}.`,
      source: "domain_signals",
      confidence: negativeSignals.reduce((sum, s) => sum + s.confidence, 0) / negativeSignals.length,
    });
  }

  // Weakest vital
  const weakest = [...ctx.vitalSigns].sort((a, b) => a.value - b.value)[0];
  if (weakest && weakest.value < 40) {
    sentences.push({
      text: `Dimensión crítica: ${weakest.name} (${weakest.value}/100) — ${weakest.detail ?? "requiere atención inmediata"}.`,
      source: "vital_signs",
      confidence: 0.9,
    });
  }

  // Churn window
  if (churnWindow && churnWindow.status !== "open") {
    const days = churnWindow.daysRemaining ?? 0;
    sentences.push({
      text: `Ventana de intervención ${churnWindow.status === "closed" ? "CERRADA" : `se cierra en ${days} día${days !== 1 ? "s" : ""}`}.`,
      source: "predictive_window",
      confidence: churnWindow.confidence,
    });
  }

  // Resonance amplification
  if (resonance.agreement === "unanimous" && negativeSignals.length > 0) {
    sentences.push({
      text: `${resonance.agreementCount} dominios confirman la tendencia — diagnóstico con alta certeza.`,
      source: "signal_resonance",
      confidence: resonance.amplifiedConfidence,
    });
  }

  return sentences;
}

/**
 * Build Act III sentences: What to do?
 */
function buildResolutionSentences(ctx: MemberNarrativeContext): GroundedSentence[] {
  const { temperature, signals } = ctx;
  const sentences: GroundedSentence[] = [];

  const actionable = filterActionableSignals(signals, "medium");

  switch (temperature.state) {
    case "thriving":
      sentences.push({
        text: "Recomendación: reconocer su compromiso, explorar programa de embajadores.",
        source: "decision_template",
        confidence: 0.85,
      });
      break;
    case "stable":
      sentences.push({
        text: "Sugerencia: presentar nuevas actividades para expandir participación.",
        source: "decision_template",
        confidence: 0.8,
      });
      break;
    case "drifting":
      sentences.push({
        text: "Ventana de re-engagement activa — contacto personalizado en los próximos 14 días.",
        source: "decision_template",
        confidence: 0.85,
      });
      break;
    case "at_risk":
      sentences.push({
        text: "Intervención prioritaria: contacto directo esta semana con plan de retención.",
        source: "decision_template",
        confidence: 0.9,
      });
      break;
    case "disengaging":
      sentences.push({
        text: "Última ventana: intervenir en 3 días o preparar estrategia win-back a 90 días.",
        source: "decision_template",
        confidence: 0.9,
      });
      break;
  }

  if (actionable.length > 0) {
    sentences.push({
      text: `${actionable.length} acción${actionable.length > 1 ? "es" : ""} disponible${actionable.length > 1 ? "s" : ""} desde ${actionable.map(a => a.domain).join(", ")}.`,
      source: "actionable_signals",
      confidence: actionable.reduce((sum, a) => sum + a.confidence, 0) / actionable.length,
    });
  }

  return sentences;
}

// ═══════════════════════════════════════════════════════════════════════
// §10 HEADLINE & SUBTITLE BUILDERS
// ═══════════════════════════════════════════════════════════════════════

function buildHeadline(
  name: string,
  state: MemberState,
  _temperature: MemberTemperature,
): string {
  switch (state) {
    case "thriving":
      return `✦ ${name} — Floreciente`;
    case "stable":
      return `${name} — Estable y comprometido`;
    case "drifting":
      return `◇ ${name} — A la deriva`;
    case "at_risk":
      return `◈ ${name} — En riesgo`;
    case "disengaging":
      return `● ${name} — Desvinculándose`;
  }
}

function buildSubtitle(
  _state: MemberState,
  temperature: MemberTemperature,
  resonance: SignalResonance,
): string {
  const tempStr = `${temperature.composite}/100`;
  const momStr = temperature.momentum.velocity > 0.1
    ? "↑ mejorando"
    : temperature.momentum.velocity < -0.1
      ? "↓ descendiendo"
      : "→ estable";

  const resStr = resonance.totalDomains > 0
    ? `${resonance.agreementCount}/${resonance.totalDomains} dominios`
    : "";

  return `${tempStr} ${momStr} — ${resStr}`;
}

function deriveActionLabel(state: MemberState): string {
  switch (state) {
    case "thriving": return "Programa de embajadores";
    case "stable": return "Expandir engagement";
    case "drifting": return "Re-engagement";
    case "at_risk": return "Plan de retención";
    case "disengaging": return "Última ventana — actuar ahora";
  }
}