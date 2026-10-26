// src/features/communications/lib/narrativeEngine.ts
// ═══════════════════════════════════════════════════════════
// Narrative Continuity Engine
// Castillo Country Club — Phase 31 "The Voice"
//
// Communication is not a series of isolated messages.
// It is a STORY that unfolds over months or years.
//
// Each message is a CHAPTER — it references what came before,
// sets up what comes next, and maintains the emotional arc
// of the member-club relationship.
//
// This engine composes intelligent messages that feel like
// they were written by a butler who has known the member
// for a decade.
//
// Pure functions only. No side effects.
// ═══════════════════════════════════════════════════════════

import type {
  NarrativeArc,
  NarrativeChapter,
  NarrativePhase,
  StoryHealth,
  SentimentLevel,
  CommunicationFingerprint,
  ResonantTone,
  ConversationMemoryNode,
} from "../types";

import {
  STORY_HEALTH_CONFIG
} from "../types";

import {
  buildNarrativeArc,
  buildConversationGraph
} from "./communicationIntelligence";
import { NARRATIVE_THREAD_KEYWORDS } from "../config";
// ═══════════════════════════════════════════════════════════
// EXPORTED TYPES
// ═══════════════════════════════════════════════════════════

/**
 * Continuity context — the bridge between past chapters
 * and the next message. Carries unresolved threads,
 * sentiment arc, and narrative phase awareness.
 */
export interface ContinuityContext {
  previousTopics: string[];
  unresolvedCommitments: string[];
  sentimentArc: SentimentLevel[];
  lastInteractionSummary: string;
  narrativePhase: NarrativePhase;
  suggestedCallbacks: string[];
}

/**
 * A fully composed message adapted to the member's
 * communication fingerprint. Each element is generated
 * independently so the UI can display/edit them separately.
 */
export interface ComposedMessage {
  subject: string;
  opening: string;
  body: string;
  closing: string;
  tone: ResonantTone;
  callbacksReferenced: string[];
  fullText: string;
}

/**
 * Narrative briefing — staff-facing summary of where
 * the communication story stands and how to approach
 * the next interaction.
 */
export interface NarrativeBriefing {
  arcSummary: string;
  currentChapter: string;
  storyHealthStatus: string;
  storyHealthDescription: string;
  openCallbacks: string[];
  recommendedApproach: string;
  momentumScore: number;
  keyMoments: string[];
}

// ═══════════════════════════════════════════════════════════
// PRIVATE HELPERS
// ═══════════════════════════════════════════════════════════

/** Sentiment labels for display. */
const SENTIMENT_LABELS: Record<SentimentLevel, string> = {
  very_positive: "Muy positivo",
  positive: "Positivo",
  neutral: "Neutro",
  negative: "Negativo",
  very_negative: "Muy negativo",
};

/** Tone-specific opening templates keyed by context. */
const TONE_OPENINGS: Record<ResonantTone, {
  returning: string;
  ongoing: string;
  celebration: string;
  followUp: string;
  urgent: string;
}> = {
  formal: {
    returning: "Estimado/a {name}, nos complace retomar contacto con usted.",
    ongoing: "Estimado/a {name}, en seguimiento a nuestra comunicación anterior.",
    celebration: "Estimado/a {name}, nos es grato reconocer este momento especial.",
    followUp: "Estimado/a {name}, tal como acordamos.",
    urgent: "Estimado/a {name}, le contactamos por un asunto que requiere su atención.",
  },
  warm: {
    returning: "¡Qué alegría saber de usted, {name}!",
    ongoing: "{name}, queríamos continuar nuestra conversación.",
    celebration: "¡{name}! Tenemos algo especial que celebrar con usted.",
    followUp: "{name}, como hablamos la vez pasada.",
    urgent: "{name}, necesitamos hablar sobre algo importante.",
  },
  direct: {
    returning: "{name}, retomamos contacto.",
    ongoing: "{name}, seguimiento: ",
    celebration: "{name}, felicitaciones — ",
    followUp: "{name}, acción pendiente: ",
    urgent: "{name}, atención inmediata requerida: ",
  },
  narrative: {
    returning: "Hay historias que merecen continuar, {name}. La suya con nosotros es una de ellas.",
    ongoing: "Cada capítulo de su historia en el club construye sobre el anterior, {name}.",
    celebration: "Hay momentos que definen una historia, {name}. Este es uno de ellos.",
    followUp: "En nuestro último capítulo, {name}, hablamos de algo importante.",
    urgent: "Hay momentos en toda historia que no pueden esperar, {name}.",
  },
};

/** Tone-specific closing templates. */
const TONE_CLOSINGS: Record<ResonantTone, {
  positive: string;
  neutral: string;
  urgent: string;
}> = {
  formal: {
    positive: "Quedamos atentos a sus comentarios. Atentamente,",
    neutral: "No dude en contactarnos para cualquier consulta. Cordialmente,",
    urgent: "Agradecemos su pronta respuesta. Atentamente,",
  },
  warm: {
    positive: "¡Estamos aquí para lo que necesite! Un abrazo del equipo.",
    neutral: "Cuente con nosotros siempre. Un cordial saludo.",
    urgent: "Su bienestar es nuestra prioridad. Estamos aquí.",
  },
  direct: {
    positive: "Saludos.",
    neutral: "Quedo pendiente.",
    urgent: "Responder a la brevedad.",
  },
  narrative: {
    positive: "Cada nuevo capítulo nos acerca más. Hasta el próximo,",
    neutral: "La historia continúa. Estamos aquí para escribirla juntos.",
    urgent: "Este capítulo requiere su voz. La esperamos.",
  },
};

/** Phase-specific approach recommendations. */
const PHASE_APPROACH: Record<NarrativePhase, string> = {
  setup: "Construir confianza — mensajes breves, tono cálido, sin presión. Establecer la relación.",
  development: "Profundizar conexión — contenido personalizado, mostrar conocimiento del socio. Mantener ritmo.",
  climax: "Momento decisivo — atención plena, acción inmediata, comunicación de alta calidad. No fallar.",
  resolution: "Cerrar con elegancia — reconocer la jornada, establecer nuevo equilibrio, sembrar futuro.",
};

/**
 * Select the appropriate opening context from the narrative arc.
 * Returns one of: "returning", "ongoing", "celebration", "followUp", "urgent".
 */
function selectOpeningContext(
  arc: NarrativeArc,
  silenceDays: number,
  hasCallbacks: boolean,
): "returning" | "ongoing" | "celebration" | "followUp" | "urgent" {
  if (arc.story_health === "breaking") return "urgent";
  if (silenceDays > 30) return "returning";
  if (hasCallbacks) return "followUp";
  if (arc.current_phase === "climax") return "urgent";

  // Check if recent chapter is celebratory
  const lastChapter = arc.chapters[arc.chapters.length - 1];
  if (lastChapter?.sentiment === "very_positive") return "celebration";

  return "ongoing";
}

/** Replace template placeholders with actual values. */
function fillTemplate(template: string, name: string): string {
  return template.replace("{name}", name);
}

// ═══════════════════════════════════════════════════════════
// §1  CONTINUITY CONTEXT
// ═══════════════════════════════════════════════════════════

/**
 * Build continuity context — the bridge between past and future.
 * Extracts unresolved threads, sentiment arc, and narrative
 * phase from the conversation memory.
 *
 * This is the "memory" that makes each new message feel
 * like a continuation, not a restart.
 */
export function buildContinuityContext(
  arc: NarrativeArc,
  nodes: ConversationMemoryNode[],
): ContinuityContext {
  // Previous topics from chapter summaries
  const previousTopics: string[] = [];
  for (const ch of arc.chapters) {
    // Extract topic from chapter title (before the " — " separator)
    const topic = ch.title.split(" — ")[0]?.trim();
    if (topic && !previousTopics.includes(topic)) {
      previousTopics.push(topic);
    }
  }

  // Unresolved commitments
  const unresolvedCommitments: string[] = [...arc.open_callbacks];

  // Pending nodes with commitments
  const pendingNodes = nodes.filter(
    (n: ConversationMemoryNode) =>
      n.outcome === "pending" && n.commitment !== null,
  );
  for (const node of pendingNodes) {
    if (node.commitment && !unresolvedCommitments.includes(node.commitment)) {
      unresolvedCommitments.push(node.commitment);
    }
  }

  // Sentiment arc from chapters
  const sentimentArc: SentimentLevel[] = arc.chapters.map(
    (ch: NarrativeChapter) => ch.sentiment,
  );

  // Last interaction summary
  const lastChapter = arc.chapters[arc.chapters.length - 1];
  const lastInteractionSummary = lastChapter?.summary ?? "Sin interacciones previas";

  // Suggested callbacks
  const suggestedCallbacks: string[] = [];
  if (unresolvedCommitments.length > 0) {
    suggestedCallbacks.push(`Cumplir compromiso: "${unresolvedCommitments[0]}"`);
  }
  if (arc.next_predicted_event) {
    suggestedCallbacks.push(`Preparar para: ${arc.next_predicted_event}`);
  }

  return {
    previousTopics,
    unresolvedCommitments,
    sentimentArc,
    lastInteractionSummary,
    narrativePhase: arc.current_phase,
    suggestedCallbacks,
  };
}

// ═══════════════════════════════════════════════════════════
// §2  OPENING LINE GENERATION
// ═══════════════════════════════════════════════════════════

/**
 * Generate a context-aware opening line for the next message.
 * Selects the right template based on:
 * - Member's resonant tone (from fingerprint)
 * - Current narrative context (silence, callbacks, phase)
 * - Recent chapter sentiment
 *
 * The opening makes the member feel KNOWN, not targeted.
 */
export function generateOpeningLine(
  arc: NarrativeArc,
  fingerprint: CommunicationFingerprint,
  silenceDays: number,
  memberName?: string,
): string {
  const tone = fingerprint.resonant_tone;
  const hasCallbacks = arc.open_callbacks.length > 0;
  const context = selectOpeningContext(arc, silenceDays, hasCallbacks);
  const template = TONE_OPENINGS[tone][context];
  const name = memberName ?? "estimado/a miembro";

  return fillTemplate(template, name);
}

// ═══════════════════════════════════════════════════════════
// §3  TONE ADAPTATION
// ═══════════════════════════════════════════════════════════

/**
 * Adapt message text to match the member's resonant tone.
 * Adjusts formality, personal touch, and structure.
 *
 * This is psycho-linguistic adaptation — the AI composes
 * the message in the voice that the member responds to.
 */
export function adaptToneToProfile(
  text: string,
  currentTone: ResonantTone,
  targetTone: ResonantTone,
): string {
  if (currentTone === targetTone) return text;

  let adapted = text;

  // Formal → Warm: add personal touches
  if (currentTone === "formal" && targetTone === "warm") {
    adapted = adapted
      .replace(/Estimado\/a\s+\w+,?\s*/i, "")
      .replace(/Atentamente,?\s*$/i, "")
      .replace(/Cordialmente,?\s*$/i, "");
    adapted = adapted.trim();
  }

  // Warm → Formal: add structure
  if (currentTone === "warm" && targetTone === "formal") {
    if (!adapted.startsWith("Estimado")) {
      adapted = `Estimado/a miembro,\n\n${adapted}`;
    }
    if (!adapted.includes("Atentamente") && !adapted.includes("Cordialmente")) {
      adapted = `${adapted}\n\nAtentamente,`;
    }
  }

  // Any → Direct: shorten
  if (targetTone === "direct") {
    const sentences = adapted.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
    if (sentences.length > 3) {
      adapted = sentences.slice(0, 3).join(". ").trim() + ".";
    }
  }

  // Any → Narrative: add story language
  if (targetTone === "narrative" && currentTone !== "narrative") {
    adapted = adapted.replace(
      /Le informamos que/i,
      "En el desarrollo de su historia con nosotros,",
    );
    adapted = adapted.replace(
      /Queremos comunicarle/i,
      "Un nuevo capítulo se abre en su historia,",
    );
  }

  return adapted;
}

// ═══════════════════════════════════════════════════════════
// §4  CLOSING LINE GENERATION
// ═══════════════════════════════════════════════════════════

/**
 * Generate a closing line based on tone and narrative context.
 * Positive chapters get warmer closings, urgent ones get direct closings.
 */
export function generateClosingLine(
  fingerprint: CommunicationFingerprint,
  arc: NarrativeArc,
): string {
  const tone = fingerprint.resonant_tone;
  const closings = TONE_CLOSINGS[tone];

  if (arc.story_health === "breaking" || arc.current_phase === "climax") {
    return closings.urgent;
  }

  const lastChapter = arc.chapters[arc.chapters.length - 1];
  if (
    lastChapter &&
    (lastChapter.sentiment === "positive" || lastChapter.sentiment === "very_positive")
  ) {
    return closings.positive;
  }

  return closings.neutral;
}

// ═══════════════════════════════════════════════════════════
// §5  CALLBACK MANAGEMENT
// ═══════════════════════════════════════════════════════════

/**
 * Generate callback context — what to mention from past interactions.
 * Prioritizes: unresolved commitments > recent negative topics > milestones.
 * Returns up to 3 callbacks to weave into the next message.
 */
export function generateCallbackContext(
  arc: NarrativeArc,
  _nodes: ConversationMemoryNode[],
  maxCallbacks = 3,
): string[] {
  const callbacks: string[] = [];

  // Priority 1: Unresolved commitments
  for (const commitment of arc.open_callbacks) {
    if (callbacks.length >= maxCallbacks) break;
    callbacks.push(`Compromiso pendiente: ${commitment}`);
  }

  // Priority 2: Recent negative chapters that need acknowledgment
  const recentNegative = arc.chapters
    .filter(
      (ch: NarrativeChapter) =>
        ch.sentiment === "negative" || ch.sentiment === "very_negative",
    )
    .slice(-2);

  for (const ch of recentNegative) {
    if (callbacks.length >= maxCallbacks) break;
    callbacks.push(`Reconocer: ${ch.title}`);
  }

  // Priority 3: Recent positive milestones
  const recentPositive = arc.chapters
    .filter(
      (ch: NarrativeChapter) =>
        ch.sentiment === "very_positive" && ch.phase !== "setup",
    )
    .slice(-1);

  for (const ch of recentPositive) {
    if (callbacks.length >= maxCallbacks) break;
    const existing = callbacks.find((c: string) => c.includes(ch.title));
    if (!existing) {
      callbacks.push(`Celebrar: ${ch.title}`);
    }
  }

  return callbacks;
}

/**
 * Suggest when to honor a pending callback.
 * Returns recommended date and urgency level.
 */
export function suggestCallbackTiming(
  _commitment: string,
  chapterDate: string,
  fingerprint: CommunicationFingerprint,
): { recommendedDate: Date; urgency: "low" | "medium" | "high"; reason: string } {
  const chapterMs = new Date(chapterDate).getTime();
  const now = Date.now();
  const daysSince = Math.floor((now - chapterMs) / (1000 * 60 * 60 * 24));

  // Callbacks get stale — urgency increases with time
  if (daysSince > 14) {
    const recommended = new Date(now);
    recommended.setDate(recommended.getDate() + 1);
    recommended.setHours(10, 0, 0, 0);
    return {
      recommendedDate: recommended,
      urgency: "high",
      reason: `Compromiso pendiente hace ${daysSince} días — actuar de inmediato`,
    };
  }

  if (daysSince > 7) {
    const recommended = new Date(now);
    recommended.setDate(recommended.getDate() + 2);
    recommended.setHours(10, 0, 0, 0);
    return {
      recommendedDate: recommended,
      urgency: "medium",
      reason: `Compromiso pendiente hace ${daysSince} días — programar pronto`,
    };
  }

  // Schedule at next receptive window
  const optimalDays = fingerprint.optimal_frequency_days;
  const recommended = new Date(now);
  recommended.setDate(recommended.getDate() + Math.max(1, Math.floor(optimalDays / 2)));
  recommended.setHours(10, 0, 0, 0);

  return {
    recommendedDate: recommended,
    urgency: "low",
    reason: `Compromiso reciente (${daysSince} días) — programar en próximo ciclo`,
  };
}

// ═══════════════════════════════════════════════════════════
// §6  NARRATIVE MOMENTUM
// ═══════════════════════════════════════════════════════════

/**
 * Compute narrative momentum — how strong the story is.
 * Considers: chapter count, sentiment consistency, phase progression,
 * callback completion rate, and interaction frequency.
 *
 * Returns 0-100 score. High momentum = strong, coherent story.
 * Low momentum = fragmented, weakening relationship.
 */
export function computeNarrativeMomentum(arc: NarrativeArc): number {
  if (arc.chapters.length === 0) return 0;

  let score = 0;

  // Chapter count (more chapters = deeper story, up to a point)
  score += Math.min(arc.chapters.length * 5, 25);

  // Sentiment consistency — lower variance = more stable story
  const sentimentValues: Record<SentimentLevel, number> = {
    very_positive: 80,
    positive: 65,
    neutral: 50,
    negative: 35,
    very_negative: 20,
  };
  const scores = arc.chapters.map(
    (ch: NarrativeChapter) => sentimentValues[ch.sentiment] ?? 50,
  );
  const avg =
    scores.reduce((sum: number, s: number) => sum + s, 0) / scores.length;
  const variance =
    scores.reduce(
      (sum: number, s: number) => sum + (s - avg) ** 2,
      0,
    ) / scores.length;
  const consistency = Math.max(0, 30 - variance * 0.01);
  score += consistency;

  // Phase bonus — development and resolution are healthy
  const phaseBonus: Record<NarrativePhase, number> = {
    setup: 5,
    development: 20,
    climax: 10,
    resolution: 20,
  };
  score += phaseBonus[arc.current_phase] ?? 0;

  // Story health bonus
  const healthBonus: Record<StoryHealth, number> = {
    strong: 20,
    fragile: 5,
    breaking: -10,
  };
  score += healthBonus[arc.story_health] ?? 0;

  // Callback penalty — unresolved callbacks weaken momentum
  score -= arc.open_callbacks.length * 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ═══════════════════════════════════════════════════════════
// §7  FULL MESSAGE COMPOSITION
// ═══════════════════════════════════════════════════════════

/**
 * Compose a smart message — the full pipeline.
 * Takes a base message body and adapts it to the member's
 * communication fingerprint and narrative context.
 *
 * Pipeline:
 * 1. Build continuity context from arc
 * 2. Generate callbacks to reference
 * 3. Generate context-aware opening
 * 4. Adapt body tone to fingerprint
 * 5. Generate closing
 * 6. Assemble into ComposedMessage
 *
 * This is where the club's AI acquires VOZ.
 */
export function composeSmartMessage(
  arc: NarrativeArc,
  fingerprint: CommunicationFingerprint,
  baseBody: string,
  silenceDays: number,
  memberName?: string,
): ComposedMessage {
  // Step 1: Continuity context
  const nodes: ConversationMemoryNode[] = [];
  for (const ch of arc.chapters) {
    for (const nodeId of ch.node_ids) {
      nodes.push({
        id: nodeId,
        member_id: arc.member_id,
        date: ch.date,
        channel: fingerprint.preferred_channel,
        direction: "outbound",
        topic: ch.title.split(" — ")[0] ?? "general",
        subtopics: [],
        sentiment: ch.sentiment,
        sentiment_score: 50,
        summary: ch.summary,
        outcome: "resolved",
        callback_date: null,
        commitment: null,
        linked_nodes: [],
      });
    }
  }

  // Step 2: Callbacks to reference
  const callbacks = generateCallbackContext(arc, nodes);

  // Step 3: Opening line
  const opening = generateOpeningLine(arc, fingerprint, silenceDays, memberName);

  // Step 4: Adapt body tone
  // Infer current tone from body text characteristics
  const currentTone: ResonantTone =
    baseBody.includes("Estimado") || baseBody.includes("Cordialmente")
      ? "formal"
      : baseBody.length < 80
        ? "direct"
        : baseBody.includes("historia") || baseBody.includes("capítulo")
          ? "narrative"
          : "warm";

  const adaptedBody = adaptToneToProfile(baseBody, currentTone, fingerprint.resonant_tone);

  // Step 5: Closing line
  const closing = generateClosingLine(fingerprint, arc);

  // Step 6: Assemble
  const callbacksBlock =
    callbacks.length > 0
      ? `\n\n${callbacks.map((c: string) => `• ${c}`).join("\n")}`
      : "";

  const fullText = `${opening}\n\n${adaptedBody}${callbacksBlock}\n\n${closing}`;

  // Generate subject from context
  const lastChapter = arc.chapters[arc.chapters.length - 1];
  const subject =
    lastChapter?.title.split(" — ")[0] ?? "Comunicación del Club";

  return {
    subject,
    opening,
    body: adaptedBody,
    closing,
    tone: fingerprint.resonant_tone,
    callbacksReferenced: callbacks,
    fullText,
  };
}

// ═══════════════════════════════════════════════════════════
// §8  NARRATIVE BRIEFING
// ═══════════════════════════════════════════════════════════

/**
 * Generate a narrative briefing for staff.
 * Tells the story of the member-club relationship in a way
 * that enables any staff member to pick up the conversation
 * as if they had been there from the beginning.
 */
export function generateNarrativeBriefing(
  arc: NarrativeArc,
  nodes: ConversationMemoryNode[],
  silenceDays: number,
): NarrativeBriefing {
  // Arc summary
  const chapterCount = arc.chapters.length;
  const arcSummary =
    chapterCount === 0
      ? "Sin historial de comunicación registrado."
      : chapterCount === 1
        ? `1 interacción registrada. Relación en fase inicial.`
        : `${chapterCount} interacciones registradas. Narrativa ${STORY_HEALTH_CONFIG[arc.story_health].label.toLowerCase()}.`;

  // Current chapter
  const lastChapter = arc.chapters[arc.chapters.length - 1];
  const currentChapter = lastChapter
    ? `Último capítulo: "${lastChapter.title}" (${SENTIMENT_LABELS[lastChapter.sentiment]})`
    : "Sin capítulos registrados.";

  // Story health
  const healthConfig = STORY_HEALTH_CONFIG[arc.story_health];
  const storyHealthStatus = healthConfig.label;
  const storyHealthDescription = healthConfig.description;

  // Open callbacks
  const openCallbacks = [...arc.open_callbacks];
  const pendingNodes = nodes.filter(
    (n: ConversationMemoryNode) =>
      n.outcome === "pending" && n.commitment !== null,
  );
  for (const node of pendingNodes) {
    if (node.commitment && !openCallbacks.includes(node.commitment)) {
      openCallbacks.push(node.commitment);
    }
  }

  // Recommended approach
  let recommendedApproach = PHASE_APPROACH[arc.current_phase];

  if (silenceDays > 30) {
    recommendedApproach += " NOTA: Socio en silencio prolongado — reintroducción suave recomendada.";
  }
  if (arc.story_health === "breaking") {
    recommendedApproach += " ALERTA: Narrativa fragmentada — necesita intervención cuidadosa.";
  }

  // Momentum
  const momentumScore = computeNarrativeMomentum(arc);

  // Key moments — chapters with significant sentiment shifts
  const keyMoments: string[] = [];
  for (let i = 1; i < arc.chapters.length; i++) {
    const prev = arc.chapters[i - 1];
    const curr = arc.chapters[i];
    const sentimentValues: Record<SentimentLevel, number> = {
      very_positive: 80,
      positive: 65,
      neutral: 50,
      negative: 35,
      very_negative: 20,
    };
    const shift = (sentimentValues[curr.sentiment] ?? 50) - (sentimentValues[prev.sentiment] ?? 50);
    if (Math.abs(shift) >= 25) {
      const direction = shift > 0 ? "↑" : "↓";
      keyMoments.push(
        `${direction} ${curr.title} (${SENTIMENT_LABELS[curr.sentiment]})`,
      );
    }
  }

  if (keyMoments.length === 0 && arc.chapters.length > 0) {
    keyMoments.push(
      `Última interacción: ${arc.chapters[arc.chapters.length - 1].title}`,
    );
  }

  return {
    arcSummary,
    currentChapter,
    storyHealthStatus,
    storyHealthDescription,
    openCallbacks,
    recommendedApproach,
    momentumScore,
    keyMoments,
  };
}

// ═══════════════════════════════════════════════════════════
// §9  CONVENIENCE: BUILD ARC FROM HISTORY
// ═══════════════════════════════════════════════════════════

/**
 * Convenience function: build a complete Narrative Arc from
 * raw communication history. Combines buildConversationGraph
 * and buildNarrativeArc into a single call.
 */
export function buildArcFromHistory(
  memberId: string,
  history: import("../types").HistoryItem[],
): NarrativeArc {
  const nodes = buildConversationGraph(memberId, history);
  return buildNarrativeArc(memberId, nodes);
}
// ═══════════════════════════════════════════════════════════
// §10  NARRATIVE THREAD DETECTION
// ═══════════════════════════════════════════════════════════

/** Detected narrative thread with framing guidance. */
export interface NarrativeThread {
  label: string;
  token: string;
  framing: string;
}

/**
 * Detect the narrative thread from a campaign objective string.
 * Matches keywords against NARRATIVE_THREAD_KEYWORDS config.
 * Returns "General" with default framing when no match found.
 */
export function detectNarrativeThread(objective: string): NarrativeThread {
  const lower = objective.toLowerCase();
  for (const [keyword, ctx] of Object.entries(NARRATIVE_THREAD_KEYWORDS)) {
    if (lower.includes(keyword)) return ctx;
  }
  return {
    label: "General",
    token: "general",
    framing: "Narrativa estándar — mantener tono profesional y cercano",
  };
}