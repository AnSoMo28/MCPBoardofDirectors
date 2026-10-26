/**
 * Event Designer Engine — §ED1-§ED5
 *
 * The shared creation engine that powers all 5 AI Creation Modals.
 * Takes operator INTENTION and produces a complete event design
 * enriched with client-side intelligence.
 *
 * The key insight: proposalEnricher takes BACKEND proposals and
 * enriches them. eventDesigner takes OPERATOR INTENTIONS and
 * generates proposals from scratch, then enriches them.
 *
 * Pipeline:
 *   Operator says "I want intimate jazz"
 *   → §ED1 captureIntention → DesignIntent
 *   → §ED2 generateEventProposal → CulturalProposal (synthetic)
 *   → enrichProposal (from proposalEnricher) → EnrichedProposal
 *   → §ED3 computeRealTimeImpact → ImpactDelta (on refinement)
 *   → §ED4 generateVariants → ProposalVariant[]
 *   → §ED5 assessProposalRisk → ProposalRisk[]
 *
 * Pure functions only — no hooks, no state, no side effects.
 *
 * @module cultural/lib/eventDesigner
 */

import type {
  CulturalProposal,
  ProposalCategory,
  FormalityLevel,
  CulturalCategory,
  ProposalImpact,
} from '../types';
import type {
  TasteProfile,
  CulturalDNA,
  VenuePersonality,
  CulturalGenreExtended,
  DemandForecast,
} from '../types';
import {
  EVENT_DESIGNER_CONFIG
} from '../config';
import {
  enrichProposal,
  computeRealTimeImpact as enricherComputeImpact,
  generateVariants as enricherGenerateVariants,
  assessProposalRisk as enricherAssessRisk,
  type EnrichedProposal,
  type ProposalChange,
  type ImpactDelta,
  type ProposalVariant,
  type ProposalRisk,
} from './proposalEnricher';

// ══════════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════════

/**
 * Parsed operator intention — the structured form of
 * "I want something intimate for jazz lovers."
 */
export interface DesignIntent {
  /** Free-text description from the operator. */
  rawInput: string;
  /** Detected event type. */
  eventType: DesignerEventType;
  /** Detected primary genre. */
  genre: CulturalGenreExtended;
  /** Backend category derived from genre. */
  category: CulturalCategory;
  /** Detected formality level. */
  formality: FormalityLevel;
  /** Detected vibe keywords. */
  vibes: string[];
  /** Target audience size (if detected). */
  targetSize?: number;
  /** Specific venue mentioned (if any). */
  mentionedVenue?: string;
  /** Specific date mentioned (if any). */
  mentionedDate?: string;
  /** Confidence in intent parsing (0-1). */
  confidence: number;
}

/**
 * Supported event types for the AI Creation Modals.
 */
export type DesignerEventType =
  | 'entertainment'
  | 'exhibition'
  | 'gala'
  | 'program'
  | 'social';

/**
 * Complete design context — everything the engine needs
 * to generate a proposal.
 */
export interface DesignContext {
  /** Taste profiles of target members. */
  tasteProfiles: TasteProfile[];
  /** Aggregated CulturalDNA of target audience. */
  dominantDNA: CulturalDNA;
  /** All available venue personalities. */
  venuePersonalities: VenuePersonality[];
  /** Current demand forecasts. */
  demandForecasts: DemandForecast[];
  /** Club ID for proposal generation. */
  clubId: string;
  /** Existing events to avoid conflicts. */
  existingEventDates?: string[];
}

/**
 * Complete design result — what the modal displays.
 */
export interface DesignResult {
  /** The parsed intent. */
  intent: DesignIntent;
  /** Synthetic CulturalProposal generated from intent. */
  proposal: CulturalProposal;
  /** Enriched proposal with all intelligence. */
  enriched: EnrichedProposal;
  /** Alternative variants. */
  variants: ProposalVariant[];
  /** Identified risks. */
  risks: ProposalRisk[];
  /** Whether the design is ready to execute. */
  readyToExecute: boolean;
  /** Blocking issues. */
  blockers: string[];
}

// ══════════════════════════════════════════════════════════
//  §ED1: CAPTURE INTENTION
// ══════════════════════════════════════════════════════════

/**
 * §ED1 — Parses raw operator input into a structured DesignIntent.
 *
 * Uses keyword detection to extract:
 * — Event type (entertainment, exhibition, gala, program, social)
 * — Primary genre (music, visual_arts, gastronomy, etc.)
 * — Formality level (casual, semi_formal, formal, black_tie)
 * — Vibe keywords (intimate, social, energetic, contemplative)
 * — Target size (if mentioned)
 * — Venue (if mentioned)
 * — Date (if mentioned)
 *
 * This is NOT NLP — it's keyword/phrase matching. The heavy
 * semantic parsing happens in the backend AI. This function
 * extracts enough structure to drive the client-side engines.
 *
 * @param rawInput — Free-text from the operator.
 * @param eventType — Which modal is calling.
 * @returns DesignIntent with extracted structure.
 */
export function captureIntention(
  rawInput: string,
  eventType: DesignerEventType,
): DesignIntent {
  const lower = rawInput.toLowerCase();

  // ── Genre detection ──
  const genre = detectGenre(lower);

  // ── Formality detection ──
  const formality = detectFormality(lower);

  // ── Vibe detection ──
  const vibes = detectVibes(lower);

  // ── Target size detection ──
  const targetSize = detectTargetSize(lower);

  // ── Venue detection ──
  const mentionedVenue = detectVenue(rawInput);

  // ── Date detection ──
  const mentionedDate = detectDate(rawInput);

  // ── Map genre to backend category ──
  const category = mapGenreToCategory(genre);

  // ── Confidence: higher if we detected more fields ──
  let confidence = 0.4; // base
  if (genre !== 'music') confidence += 0.1; // non-default genre detected
  if (formality !== 'semi_formal') confidence += 0.1;
  if (vibes.length > 0) confidence += 0.1;
  if (targetSize !== undefined) confidence += 0.1;
  if (mentionedVenue !== undefined) confidence += 0.1;
  if (mentionedDate !== undefined) confidence += 0.1;

  return {
    rawInput,
    eventType,
    genre,
    category,
    formality,
    vibes,
    targetSize,
    mentionedVenue,
    mentionedDate,
    confidence: Math.min(1, confidence),
  };
}

// ══════════════════════════════════════════════════════════
//  §ED2: GENERATE EVENT PROPOSAL
// ══════════════════════════════════════════════════════════

/**
 * §ED2 — Generates a complete event proposal from a DesignIntent
 * and DesignContext.
 *
 * Creates a synthetic CulturalProposal that mimics what the backend
 * AI would produce, then enriches it with client-side intelligence.
 *
 * The generated proposal includes:
 * — Title (auto-generated from genre + vibe)
 * — Venue recommendation (from venue matching)
 * — Expected impact estimates
 * — Action steps
 * — Cross-domain connections
 *
 * @param intent — Parsed operator intention.
 * @param context — Design context with taste/venue/demand data.
 * @returns DesignResult with proposal, enriched, variants, risks.
 */
export function generateEventProposal(
  intent: DesignIntent,
  context: DesignContext,
): DesignResult {
  // ── 1. Find best venue ──
  const bestVenue = findBestVenueForIntent(intent, context.venuePersonalities);

  // ── 2. Generate title ──
  const title = generateTitle(intent);

  // ── 3. Estimate attendance ──
  const attendanceEstimate = estimateAttendance(intent, context);

  // ── 4. Estimate revenue ──
  const revenueEstimate = estimateRevenue(intent, attendanceEstimate);

  // ── 5. Build synthetic CulturalProposal ──
  const proposal = buildSyntheticProposal(
    intent,
    title,
    bestVenue,
    attendanceEstimate,
    revenueEstimate,
    context,
  );

  // ── 6. Enrich with client-side intelligence ──
  const enriched = enrichProposal(
    proposal,
    context.tasteProfiles,
    context.venuePersonalities,
    context.dominantDNA,
  );

  // ── 7. Generate variants ──
  const variants = enricherGenerateVariants(
    enriched,
    context.venuePersonalities,
    context.tasteProfiles,
  );

  // ── 8. Assess risks ──
  const risks = enricherAssessRisk(enriched);

  // ── 9. Determine readiness ──
  const highRisks = risks.filter((r) => r.severity === 'high');
  const blockers: string[] = [];

  if (enriched.tasteMatchScore < 30) {
    blockers.push('Match de gusto crítico — el público objetivo probablemente no asistirá.');
  }
  if (bestVenue && bestVenue.matchScore < EVENT_DESIGNER_CONFIG.VENUE_MATCH_BLOCK) {
    blockers.push('No hay venue con match aceptable — buscar alternativa.');
  }

  return {
    intent,
    proposal,
    enriched,
    variants,
    risks,
    readyToExecute: blockers.length === 0 && highRisks.length === 0,
    blockers,
  };
}

// ══════════════════════════════════════════════════════════
//  §ED3: COMPUTE REAL-TIME IMPACT (delegates to enricher)
// ══════════════════════════════════════════════════════════

/**
 * §ED3 — Recalculates impact when the operator modifies a proposal.
 * Delegates to proposalEnricher.computeRealTimeImpact.
 *
 * @param enriched — Current enriched proposal.
 * @param change — The change made by the operator.
 * @param context — Design context.
 * @returns ImpactDelta with all deltas + AI commentary.
 */
export function computeRealTimeImpact(
  enriched: EnrichedProposal,
  change: ProposalChange,
  context: DesignContext,
): ImpactDelta {
  return enricherComputeImpact(
    enriched,
    change,
    context.venuePersonalities,
    context.tasteProfiles,
  );
}

// ══════════════════════════════════════════════════════════
//  §ED4: GENERATE VARIANTS (delegates to enricher)
// ══════════════════════════════════════════════════════════

/**
 * §ED4 — Generates N variants optimized for different outcomes.
 * Delegates to proposalEnricher.generateVariants.
 *
 * @param enriched — Current enriched proposal.
 * @param context — Design context.
 * @returns Array of ProposalVariant.
 */
export function generateVariants(
  enriched: EnrichedProposal,
  context: DesignContext,
): ProposalVariant[] {
  return enricherGenerateVariants(
    enriched,
    context.venuePersonalities,
    context.tasteProfiles,
  );
}

// ══════════════════════════════════════════════════════════
//  §ED5: ASSESS PROPOSAL RISK (delegates to enricher)
// ══════════════════════════════════════════════════════════

/**
 * §ED5 — Assesses risks for a proposal.
 * Delegates to proposalEnricher.assessProposalRisk.
 *
 * @param enriched — Enriched proposal.
 * @returns Array of ProposalRisk sorted by severity.
 */
export function assessProposalRisk(
  enriched: EnrichedProposal,
): ProposalRisk[] {
  return enricherAssessRisk(enriched);
}

// ══════════════════════════════════════════════════════════
//  FULL PIPELINE
// ══════════════════════════════════════════════════════════

/**
 * Runs the complete design pipeline: capture → generate → enrich.
 * This is the single entry point for useEventDesigner.
 *
 * @param rawInput — Free-text from the operator.
 * @param eventType — Which modal is calling.
 * @param context — Design context.
 * @returns DesignResult with everything the modal needs.
 */
export function designEvent(
  rawInput: string,
  eventType: DesignerEventType,
  context: DesignContext,
): DesignResult {
  const intent = captureIntention(rawInput, eventType);
  return generateEventProposal(intent, context);
}

// ══════════════════════════════════════════════════════════
//  INTERNAL HELPERS — INTENT DETECTION (not exported)
// ══════════════════════════════════════════════════════════

/** Genre keyword map. */
const GENRE_KEYWORDS: Array<{ keywords: string[]; genre: CulturalGenreExtended }> = [
  { keywords: ['jazz', 'música', 'music', 'banda', 'concierto', 'acoustic', 'dj', 'salsa', 'cumbia', 'clásica', 'sinfónica'], genre: 'music' },
  { keywords: ['arte', 'art', 'exhibición', 'galería', 'pintura', 'escultura', 'fotografía', 'visual'], genre: 'visual_arts' },
  { keywords: ['teatro', 'theater', 'obra', 'drama', 'comedia', 'musical'], genre: 'theater' },
  { keywords: ['danza', 'dance', 'ballet', 'tango', 'contemporáneo'], genre: 'dance' },
  { keywords: ['literatura', 'literature', 'libro', 'poesía', 'lectura', 'cuento', 'novela'], genre: 'literature' },
  { keywords: ['gastronomía', 'gastronomy', 'cena', 'cocina', 'chef', 'degustación', 'maridaje', 'food'], genre: 'gastronomy' },
  { keywords: ['patrimonio', 'heritage', 'histórico', 'tradición', 'cultura popular'], genre: 'heritage' },
  { keywords: ['vino', 'wine', 'whisky', 'cocktail', 'spirits', 'cerveza', 'sake'], genre: 'wine_spirits' },
  { keywords: ['charla', 'conferencia', 'lecture', 'talk', 'seminario', 'panel'], genre: 'lectures' },
  { keywords: ['taller', 'workshop', 'clase', 'curso', 'hands-on', 'práctico'], genre: 'workshops' },
  { keywords: ['contemporáneo', 'contemporary', 'experimental', 'moderno', 'urbano'], genre: 'contemporary' },
  { keywords: ['familia', 'family', 'niños', 'kids', 'familiar'], genre: 'family' },
  { keywords: ['temporada', 'seasonal', 'navidad', 'año nuevo', 'san valentín', 'halloween'], genre: 'seasonal' },
  { keywords: ['wellness', 'bienestar', 'spa', 'yoga', 'meditación', 'relajación'], genre: 'wellness_cultural' },
];

function detectGenre(input: string): CulturalGenreExtended {
  for (const mapping of GENRE_KEYWORDS) {
    for (const keyword of mapping.keywords) {
      if (input.includes(keyword)) {
        return mapping.genre;
      }
    }
  }
  return 'music'; // default
}

/** Formality keyword map. */
const FORMALITY_KEYWORDS: Array<{ keywords: string[]; level: FormalityLevel }> = [
  { keywords: ['black tie', 'black-tie', 'gala', 'elegante', 'formal', 'traje'], level: 'black_tie' },
  { keywords: ['formal', 'sofisticado', 'premium', 'exclusivo'], level: 'formal' },
  { keywords: ['semi formal', 'semi-formal', 'smart casual', 'business casual'], level: 'semi_formal' },
  { keywords: ['casual', 'relajado', 'informal', 'tranquilo', 'familiar'], level: 'casual' },
];

function detectFormality(input: string): FormalityLevel {
  for (const mapping of FORMALITY_KEYWORDS) {
    for (const keyword of mapping.keywords) {
      if (input.includes(keyword)) {
        return mapping.level;
      }
    }
  }
  return 'semi_formal'; // default
}

/** Vibe keyword list. */
const VIBE_KEYWORDS = [
  'íntimo', 'intimate', 'social', 'energético', 'energetic',
  'contemplativo', 'contemplative', 'festivo', 'festive',
  'educativo', 'educational', 'experiencial', 'experiential',
  'relajado', 'relaxed', 'sofisticado', 'sophisticated',
  'divertido', 'fun', 'romántico', 'romantic',
];

function detectVibes(input: string): string[] {
  return VIBE_KEYWORDS.filter((v) => input.includes(v));
}

/** Detects target size from patterns like "para 50 personas", "group of 30". */
function detectTargetSize(input: string): number | undefined {
  const patterns = [
    /(\d+)\s*persona/i,
    /(\d+)\s*socio/i,
    /(\d+)\s*invitado/i,
    /group\s*of\s*(\d+)/i,
    /para\s*(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num > 0 && num < 10000) return num;
    }
  }

  return undefined;
}

/** Detects venue mentions (capitalized words after "en", "venue", "salón"). */
function detectVenue(input: string): string | undefined {
  const patterns = [
    /(?:en|venue|salón|salon|terraza|galería|galeria)\s+([A-ZÁÉÍÓÚ][a-záéíóú]+(?:\s+[A-ZÁÉÍÓÚ][a-záéíóú]+)?)/i,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return undefined;
}

/** Detects date mentions (basic patterns). */
function detectDate(input: string): string | undefined {
  const patterns = [
    /(\d{1,2})\s*(?:de\s*)?(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i,
    /(viernes|sábado|sabado|domingo|lunes|martes|miércoles|miercoles|jueves)/i,
    /(próximo|proximo|next)\s*(viernes|sábado|sabado|domingo|lunes)/i,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return undefined;
}

// ══════════════════════════════════════════════════════════
//  INTERNAL HELPERS — PROPOSAL GENERATION (not exported)
// ══════════════════════════════════════════════════════════

/** Maps a CulturalGenreExtended to a backend CulturalCategory. */
function mapGenreToCategory(genre: CulturalGenreExtended): CulturalCategory {
  const backendCategories: CulturalCategory[] = [
    'music', 'visual_arts', 'theater', 'dance', 'literature', 'gastronomy', 'heritage',
  ];

  if (backendCategories.includes(genre as CulturalCategory)) {
    return genre as CulturalCategory;
  }

  const mappings: Record<string, CulturalCategory> = {
    wine_spirits: 'gastronomy',
    lectures: 'literature',
    workshops: 'visual_arts',
    contemporary: 'visual_arts',
    family: 'gastronomy',
    seasonal: 'heritage',
    wellness_cultural: 'dance',
  };

  return mappings[genre] ?? 'music';
}

/** Maps DesignIntent to ProposalCategory. */
function intentToProposalCategory(eventType: DesignerEventType): ProposalCategory {
  const mappings: Record<DesignerEventType, ProposalCategory> = {
    entertainment: 'activity_proposal',
    exhibition: 'space_activation',
    gala: 'group_cohesion',
    program: 'lifestyle_integration',
    social: 'group_cohesion',
  };
  return mappings[eventType];
}

/** Generates a title from intent. */
function generateTitle(intent: DesignIntent): string {
  const genreLabels: Record<string, string> = {
    music: 'Noche Musical',
    visual_arts: 'Experiencia Visual',
    theater: 'Velada Teatral',
    dance: 'Sesión de Danza',
    literature: 'Encuentro Literario',
    gastronomy: 'Experiencia Gastronómica',
    heritage: 'Encuentro Cultural',
    wine_spirits: 'Degustación Premium',
    lectures: 'Charla Cultural',
    workshops: 'Taller Creativo',
    contemporary: 'Experiencia Contemporánea',
    family: 'Evento Familiar',
    seasonal: 'Celebración Estacional',
    wellness_cultural: 'Sesión de Bienestar',
  };

  const base = genreLabels[intent.genre] ?? 'Evento Cultural';

  if (intent.vibes.length > 0) {
    const vibe = intent.vibes[0].charAt(0).toUpperCase() + intent.vibes[0].slice(1);
    return `${base} — ${vibe}`;
  }

  return base;
}

/** Finds the best venue for an intent from available venues. */
function findBestVenueForIntent(
  intent: DesignIntent,
  venues: VenuePersonality[],
): { venueId: string; venueName: string; matchScore: number } | null {
  if (venues.length === 0) return null;

  // If operator mentioned a specific venue, try to find it
  if (intent.mentionedVenue) {
    const mentioned = venues.find(
      (v) =>
        v.venueName.toLowerCase().includes(intent.mentionedVenue!.toLowerCase()) ||
        v.venueId.toLowerCase().includes(intent.mentionedVenue!.toLowerCase()),
    );
    if (mentioned) {
      return {
        venueId: mentioned.venueId,
        venueName: mentioned.venueName,
        matchScore: 85, // assume good match if explicitly mentioned
      };
    }
  }

  // Score each venue based on intent
  const scored = venues.map((venue) => {
    let score = 50; // base

    // Formality alignment
    const intentFormalityScore = formalityToNumber(intent.formality);
    const formalityDelta = Math.abs(intentFormalityScore - venue.formality);
    score += Math.max(0, 25 - formalityDelta * 0.5);

    // Genre alignment
    if (venue.bestGenres.includes(intent.genre)) {
      score += 20;
    }

    // Vibe alignment
    if (intent.vibes.includes('íntimo') || intent.vibes.includes('intimate')) {
      if (venue.intimacy >= 70) score += 15;
    }
    if (intent.vibes.includes('social')) {
      if (venue.sociality >= 60) score += 10;
    }
    if (intent.vibes.includes('energético') || intent.vibes.includes('energetic')) {
      if (venue.energy >= 60) score += 10;
    }

    // Capacity alignment
    if (intent.targetSize) {
      const optimal = venue.optimalCapacity;
      const ratio = intent.targetSize / Math.max(1, optimal);
      if (ratio >= 0.5 && ratio <= 1.0) {
        score += 15; // sweet spot
      } else if (ratio > 1.0 && ratio <= 1.5) {
        score += 5; // slightly over
      } else {
        score -= 10; // mismatch
      }
    }

    return {
      venueId: venue.venueId,
      venueName: venue.venueName,
      matchScore: clamp(Math.round(score), 0, 100),
    };
  });

  // Sort by match score descending
  scored.sort((a, b) => b.matchScore - a.matchScore);

  return scored[0] ?? null;
}

/** Converts formality level to numeric scale 0-100. */
function formalityToNumber(formality: FormalityLevel): number {
  const map: Record<FormalityLevel, number> = {
    casual: 20,
    semi_formal: 40,
    formal: 65,
    black_tie: 85,
    white_tie: 100,
  };
  return map[formality] ?? 40;
}

/** Estimates attendance based on intent and context. */
function estimateAttendance(
  intent: DesignIntent,
  context: DesignContext,
): number {
  // If operator specified a target size
  if (intent.targetSize) {
    return intent.targetSize;
  }

  // Base on taste profiles available
  const profileCount = context.tasteProfiles.length;

  // Base on event type
  const typeMultipliers: Record<DesignerEventType, number> = {
    entertainment: 0.3,
    exhibition: 0.4,
    gala: 0.6,
    program: 0.25,
    social: 0.2,
  };

  const multiplier = typeMultipliers[intent.eventType] ?? 0.3;

  // Estimate from target audience
  const estimated = Math.max(10, Math.round(profileCount * multiplier));

  // Adjust by formality (more formal = fewer attendees)
  const formalityFactor =
    intent.formality === 'black_tie' ? 0.6 :
    intent.formality === 'formal' ? 0.8 :
    intent.formality === 'casual' ? 1.2 :
    1.0;

  return Math.max(5, Math.round(estimated * formalityFactor));
}

/** Estimates revenue based on intent and attendance. */
function estimateRevenue(
  intent: DesignIntent,
  attendance: number,
): number {
  // Revenue per attendee by event type (CRC)
  const revenuePerHead: Record<DesignerEventType, number> = {
    entertainment: 15000,
    exhibition: 5000,
    gala: 85000,
    program: 25000,
    social: 8000,
  };

  const perHead = revenuePerHead[intent.eventType] ?? 15000;

  // Formality premium
  const formalityPremium =
    intent.formality === 'black_tie' ? 2.0 :
    intent.formality === 'formal' ? 1.5 :
    intent.formality === 'casual' ? 0.7 :
    1.0;

  return Math.round(attendance * perHead * formalityPremium);
}

/** Builds a synthetic CulturalProposal from intent and computed values. */
function buildSyntheticProposal(
  intent: DesignIntent,
  title: string,
  bestVenue: { venueId: string; venueName: string; matchScore: number } | null,
  attendanceEstimate: number,
  revenueEstimate: number,
  context: DesignContext,
): CulturalProposal {
  const proposalCategory = intentToProposalCategory(intent.eventType);
  const genreLabel = intent.genre.replace(/_/g, ' ');
  const vibeLabel = intent.vibes.length > 0 ? ` con enfoque ${intent.vibes.join(', ')}` : '';

  return {
    id: `designer-${intent.eventType}-${Date.now()}`,
    title,
    description: `Evento de ${genreLabel}${vibeLabel}. Diseñado por el AI Event Designer basado en: "${intent.rawInput.substring(0, 100)}"`,
    category: proposalCategory,
    confidence: intent.confidence,
    expected_impact: {
      attendance_estimate: attendanceEstimate,
      revenue_potential_crc: revenueEstimate,
      engagement_lift_pct: Math.round(intent.confidence * 30),
    } as ProposalImpact,
    // cross-domain summary is represented inside `cross_domain` below
    cross_domain: {
        communication_messages: [
            `Invitación personalizada para ${attendanceEstimate} socios con affinity > 60 en ${genreLabel}`,
        ],
        engagement_events: [
            `Evento cultural diseñado: ${title}`,
        ],
        finance_budget_estimate: Math.round(revenueEstimate * 0.6),
        member_segments: context.tasteProfiles.length > 0
            ? [`Cultural enthusiasts - ${genreLabel}`]
            : ['General membership'],
        communication_campaign_idea: '',
        related_events: [],
        family_connection: '',
        wellness_integration: ''
    },
    action_steps: [
        `Confirmar venue: ${bestVenue?.venueName ?? 'Por definir'}`,
        `Configurar perfil sensorial para ${genreLabel}`,
        `Enviar invitaciones personalizadas a ${attendanceEstimate} socios`,
        `Preparar experiencia ${intent.formality}`,
    ],
    timeline: intent.mentionedDate ?? 'Próximos 14 días',
    venue_recommendation: bestVenue?.venueName ?? 'Por definir',
    target_members: [],
    target_families: [],
    target_demographic: '',
    implementation_effort: 'high',
    suggested_timeline: 'immediate',
  };
}

/** Clamps a number between min and max. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}