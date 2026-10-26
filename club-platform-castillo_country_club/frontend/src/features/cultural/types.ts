/**
 * Cultural & Social — Source of Truth (F31)
 *
 * All types, enums, configs, and helpers for the Cultural domain.
 * Backend 1:1 match with cultural_social_agent.py + cultural_social models.
 *
 * RULES:
 * - Enums match backend Python enums exactly (string values)
 * - Entity types match backend Pydantic models exactly
 * - Config maps use Silver Tide tokens only
 * - Transform helpers go in this file, NOT in sub-components
 *
 * ARCHITECTURE NOTE (Phase 32):
 * - Sections 1-10: Backend 1:1 types (DO NOT MODIFY without backend change)
 * - Section 11: Client-side Intelligence Support Types (computed by engines)
 * - Section 12: Client-side Intelligence Output Types (engine return types)
 */

import { type ReactNode } from 'react';
import { CULTURAL_ENGAGEMENT_WEIGHTS, type CulturalDashboardMode } from './config';

// ══════════════════════════════════════════════════════════
//  1. DOMAIN ENUMS (9 existing + 6 new = 15)
// ══════════════════════════════════════════════════════════

/** Event types for social events and galas. Backend: EventType */
export type CulturalEventType =
  | 'gala'
  | 'dinner'
  | 'mixer'
  | 'cocktail'
  | 'brunch'
  | 'themed_party'
  | 'reception';

/** Event lifecycle status. Backend: EventStatus */
export type CulturalEventStatus =
  | 'planned'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

/** Entertainment act types. Backend: EntertainmentType */
export type EntertainmentType =
  | 'live_band'
  | 'dj'
  | 'comedian'
  | 'magician'
  | 'speaker'
  | 'cultural_performance'
  | 'dance_performance';

/** Cultural program categories. Backend: CulturalCategory */
export type CulturalCategory =
  | 'music'
  | 'visual_arts'
  | 'theater'
  | 'dance'
  | 'literature'
  | 'gastronomy'
  | 'heritage';

/** Venue types available at the club. Backend: VenueType */
export type VenueType =
  | 'ballroom'
  | 'garden'
  | 'terrace'
  | 'lounge'
  | 'auditorium'
  | 'poolside';

/** Formality levels for events. Backend: FormalityLevel */
export type FormalityLevel =
  | 'casual'
  | 'semi_formal'
  | 'formal'
  | 'black_tie'
  | 'white_tie';

/** Exhibition lifecycle status. Backend: ExhibitionStatus */
export type ExhibitionStatus =
  | 'scheduled'
  | 'setup'
  | 'active'
  | 'dismantled'
  | 'cancelled';

/** Entertainment act performance status. Backend: PerformanceStatus */
export type PerformanceStatus =
  | 'proposed'
  | 'contracted'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

/** Artist availability status. Backend: ArtistStatus */
export type ArtistStatus = 'available' | 'booked' | 'unavailable';

// ── F31 New Enums ──

/** Cultural program lifecycle. Backend: ProgramStatus */
export type ProgramStatus =
  | 'draft'
  | 'enrolling'
  | 'active'
  | 'completed'
  | 'cancelled';

/** 5 pillars of cultural engagement proposals. Backend: ProposalCategory */
export type ProposalCategory =
  | 'activity_proposal'
  | 'targeted_invitation'
  | 'group_cohesion'
  | 'space_activation'
  | 'lifestyle_integration';

/** Implementation effort level. Backend: ImplementationEffort */
export type ImplementationEffort = 'low' | 'medium' | 'high';

/** Suggested implementation timeline. Backend: SuggestedTimeline */
export type SuggestedTimeline =
  | 'immediate'
  | 'this_month'
  | 'this_season'
  | 'next_season';

/** Focus area for proposal generation. Backend: FocusArea */
export type ProposalFocusArea =
  | 'all'
  | 'lifestyle'
  | 'cohesion'
  | 'space'
  | 'events'
  | 'families';

/** Target demographic for proposals. Backend: TargetDemographic */
export type TargetDemographic =
  | 'all'
  | 'young_professionals'
  | 'families'
  | 'seniors';

// ══════════════════════════════════════════════════════════
//  2. ENTITY DATA TYPES (Backend 1:1)
// ══════════════════════════════════════════════════════════

export interface CulturalEvent {
  id: string;
  name: string;
  event_type: CulturalEventType;
  status: CulturalEventStatus;
  formality: FormalityLevel;
  venue: string;
  venue_type: VenueType;
  date: string;
  start_time: string;
  end_time: string;
  organizer_member_id: string;
  description: string;
  guest_count: number;
  budget: number;
  menu_theme: string;
  dress_code: string;
  entertainment_ids: string[];
  notes: string | null;
  created_at: string;
}

export interface EntertainmentAct {
  id: string;
  artist_name: string;
  entertainment_type: EntertainmentType;
  status: PerformanceStatus;
  genre: string;
  description: string;
  duration_minutes: number;
  cost: number;
  contact_person: string;
  contact_phone: string;
  requirements: string[];
  event_id: string | null;
  notes: string | null;
}

export interface CulturalProgram {
  id: string;
  name: string;
  category: CulturalCategory;
  description: string;
  season: string;
  start_date: string;
  end_date: string;
  coordinator_member_id: string;
  max_participants: number;
  current_participants: number;
  budget: number;
  status: ProgramStatus;
  event_ids: string[];
  notes: string | null;
}

export interface ArtExhibition {
  id: string;
  title: string;
  artist_name: string;
  category: CulturalCategory;
  description: string;
  venue: string;
  venue_type: VenueType;
  start_date: string;
  end_date: string;
  status: ExhibitionStatus;
  num_pieces: number;
  curator_member_id: string;
  opening_reception: boolean;
  notes: string | null;
}

// ══════════════════════════════════════════════════════════
//  3. CREATE / UPDATE SCHEMAS
// ══════════════════════════════════════════════════════════

export interface CreateCulturalEventInput {
  name: string;
  event_type: CulturalEventType;
  formality?: FormalityLevel;
  venue: string;
  venue_type?: VenueType;
  date: string;
  start_time: string;
  end_time: string;
  organizer_member_id: string;
  description?: string;
  guest_count?: number;
  budget?: number;
  menu_theme?: string;
  dress_code?: string;
  notes?: string;
}

export interface CreateEntertainmentActInput {
  artist_name: string;
  entertainment_type: EntertainmentType;
  genre?: string;
  description?: string;
  duration_minutes?: number;
  cost?: number;
  contact_person: string;
  contact_phone?: string;
  requirements?: string[];
  notes?: string;
}

export interface CreateCulturalProgramInput {
  name: string;
  category: CulturalCategory;
  description: string;
  season: string;
  start_date: string;
  end_date: string;
  coordinator_member_id: string;
  max_participants?: number;
  budget?: number;
  notes?: string;
}

export interface CreateArtExhibitionInput {
  title: string;
  artist_name: string;
  category?: CulturalCategory;
  description?: string;
  venue: string;
  venue_type?: VenueType;
  start_date: string;
  end_date: string;
  num_pieces?: number;
  curator_member_id?: string;
  opening_reception?: boolean;
  notes?: string;
}

export interface UpdateCulturalEventInput {
  name?: string;
  event_type?: CulturalEventType;
  formality?: FormalityLevel;
  venue?: string;
  venue_type?: VenueType;
  date?: string;
  start_time?: string;
  end_time?: string;
  description?: string;
  guest_count?: number;
  budget?: number;
  menu_theme?: string;
  dress_code?: string;
  status?: CulturalEventStatus;
  notes?: string;
}

export interface UpdateCulturalProgramInput {
  name?: string;
  category?: CulturalCategory;
  description?: string;
  season?: string;
  start_date?: string;
  end_date?: string;
  coordinator_member_id?: string;
  max_participants?: number;
  budget?: number;
  status?: ProgramStatus;
  notes?: string;
}

// ══════════════════════════════════════════════════════════
//  4. CALENDAR TYPES (Enhanced F31)
// ══════════════════════════════════════════════════════════

export interface CalendarEventItem {
  type: 'event';
  title: string;
  event_type: CulturalEventType;
  date: string;
  start_time: string;
  end_time: string;
  venue: string;
  venue_type: VenueType;
  status: CulturalEventStatus;
  formality: FormalityLevel;
  description: string;
  guest_count: number;
  budget: number;
}

export interface CalendarExhibitionItem {
  type: 'exhibition';
  title: string;
  category: CulturalCategory;
  date: string;
  end_date: string;
  venue: string;
  venue_type: VenueType;
  status: ExhibitionStatus;
  description: string;
  artist: string;
  num_pieces: number;
  opening_reception: boolean;
}

export interface CalendarProgramItem {
  type: 'program';
  title: string;
  category: CulturalCategory;
  date: string;
  end_date: string;
  venue: string;
  status: ProgramStatus;
  description: string;
  season: string;
  enrollment: string;
  budget: number;
}

export type CalendarItem = CalendarEventItem | CalendarExhibitionItem | CalendarProgramItem;

export interface CalendarConflict {
  date: string;
  venue: string;
  items: string[];
  count: number;
}

export interface CalendarSummary {
  event: number;
  exhibition: number;
  program: number;
}

export interface CalendarResponse {
  status: string;
  message: string;
  calendar: CalendarItem[];
  total_items: number;
  summary: CalendarSummary;
  conflicts: CalendarConflict[];
  has_conflicts: boolean;
}

// ══════════════════════════════════════════════════════════
//  5. ANALYTICS TYPES (9 Dimensions)
// ══════════════════════════════════════════════════════════

export interface CategoryPerformanceData {
  category: string;
  event_count: number;
  total_attendance: number;
  avg_attendance: number;
  total_budget: number;
  avg_budget_per_event: number;
  engagement_score: number;
}

export interface VenueUtilizationData {
  venue: string;
  venue_type: string;
  total_bookings: number;
  total_guests: number;
  avg_guests: number;
  total_budget: number;
  utilization_rate: number;
}

export interface EntertainmentROIData {
  entertainment_type: string;
  total_acts: number;
  contracted: number;
  contracted_rate: number;
  total_cost: number;
  avg_cost: number;
  total_duration: number;
  cost_per_minute: number;
}

export interface SeasonalPatternData {
  season: string;
  program_count: number;
  total_budget: number;
  total_participants: number;
  max_participants: number;
  enrollment_rate: number;
  top_category: string;
}

export interface CulturalAnalytics {
  status: string;
  message: string;
  // D1
  category_performance: CategoryPerformanceData[];
  // D2
  venue_utilization: VenueUtilizationData[];
  // D3
  entertainment_roi: EntertainmentROIData[];
  // D4
  attendance_trend: 'up' | 'stable' | 'down';
  attendance_trend_pct: number;
  avg_attendance_30d: number;
  total_events_30d: number;
  // D5
  total_budget_planned: number;
  total_budget_spent: number;
  budget_utilization_pct: number;
  budget_variance_pct: number;
  // D6
  seasonal_patterns: SeasonalPatternData[];
  current_season: string;
  // D7
  total_programs: number;
  active_programs: number;
  avg_enrollment_pct: number;
  programs_below_threshold: number;
  // D8
  total_exhibitions: number;
  active_exhibitions: number;
  avg_exhibition_duration_days: number;
  exhibitions_with_reception_pct: number;
  // D9
  cross_domain_signals: string[];
}

// ══════════════════════════════════════════════════════════
//  6. SUMMARY TYPE (Executive Dashboard Feed)
// ══════════════════════════════════════════════════════════

export interface CulturalHighlight {
  name: string;
  date?: string;
  venue?: string;
  formality?: string;
  guest_count?: number;
  title?: string;
  artist?: string;
  end_date?: string;
  category?: string;
  enrollment?: string;
}

export interface CulturalSummary {
  status: string;
  message: string;
  // KPIs
  upcoming_events_30d: number;
  active_exhibitions: number;
  active_programs: number;
  total_entertainment_acts: number;
  total_budget: number;
  budget_utilized_pct: number;
  // Health
  cultural_health_score: number;
  health_level: 'excepcional' | 'saludable' | 'atención' | 'crítico' | 'unknown';
  // Highlights
  next_gala: CulturalHighlight | null;
  featured_exhibition: CulturalHighlight | null;
  top_program: CulturalHighlight | null;
  // Alerts
  alerts: string[];
  // Calendar density
  events_this_week: number;
  events_next_week: number;
}

// ══════════════════════════════════════════════════════════
//  7. PROPOSAL TYPES — THE GAME CHANGER
// ══════════════════════════════════════════════════════════

export interface ProposalImpact {
  attendance_estimate: number;
  engagement_lift_pct: number;
  revenue_potential_crc: number;
}

export interface CrossDomainConnections {
  engagement_events: any;
  communication_messages: any;
  member_segments: any;
  finance_budget_estimate: number;
  communication_campaign_idea: string;
  related_events: string[];
  family_connection: string;
  wellness_integration: string;
}

export interface CulturalProposal {
  timeline: ReactNode;
  id: string;
  category: ProposalCategory;
  title: string;
  description: string;
  target_members: string[];
  target_families: string[];
  target_demographic: string;
  venue_recommendation: string;
  expected_impact: ProposalImpact;
  cross_domain: CrossDomainConnections;
  confidence: number;
  implementation_effort: ImplementationEffort;
  suggested_timeline: SuggestedTimeline;
  action_steps: string[];
}

export interface CulturalProposalsResponse {
  status: string;
  message: string;
  proposals: CulturalProposal[];
  engagement_score: number;
  total_proposals: number;
  focus_area: string;
  priority_ranking: string[];
}

// ══════════════════════════════════════════════════════════
//  8. HITL RESPONSE TYPE
// ══════════════════════════════════════════════════════════

export interface CulturalHITLResponse {
  status: string;
  request_id?: string;
  message: string;
  details?: Record<string, unknown>;
}

// ══════════════════════════════════════════════════════════
//  9. CONFIG MAPS (Visual Identity)
// ══════════════════════════════════════════════════════════

export interface EntityVisualConfig {
  icon: string;
  emoji: string;
  color: string;
  label: string;
}

export interface StatusConfig {
  label: string;
  color: string;
  bg: string;
  variant: 'default' | 'success' | 'warning' | 'error' | 'info' | 'premium';
}

export interface FormalityConfig {
  label: string;
  icon: string;
  color: string;
  badge: 'default' | 'info' | 'warning' | 'premium';
}

// ── Visual Identity per entity type ──
export const CULTURAL_ENTITY_CONFIG: Record<string, EntityVisualConfig> = {
  event:         { icon: 'Sparkles',   emoji: '🎭', color: 'var(--color-gold-400)',      label: 'Evento Social' },
  gala:          { icon: 'Crown',      emoji: '🎭', color: 'var(--color-gold-400)',      label: 'Gala Formal' },
  program:       { icon: 'Music',      emoji: '🎵', color: 'var(--color-teal-400)',      label: 'Programa Cultural' },
  entertainment: { icon: 'Mic',        emoji: '🎸', color: 'var(--color-emerald-400)',   label: 'Entretenimiento' },
  exhibition:    { icon: 'Frame',      emoji: '🖼️', color: 'var(--color-sage-400)',     label: 'Exposición de Arte' },
};

// ── Event Type config ──
export const EVENT_TYPE_CONFIG: Record<CulturalEventType, EntityVisualConfig> = {
  gala:          { icon: 'Crown',           emoji: '🎭', color: 'var(--color-gold-400)',        label: 'Gala Formal' },
  dinner:        { icon: 'UtensilsCrossed', emoji: '🍽️', color: 'var(--color-terracotta-400)', label: 'Cena' },
  mixer:         { icon: 'Users',           emoji: '🤝', color: 'var(--color-teal-400)',       label: 'Mixer' },
  cocktail:      { icon: 'Wine',            emoji: '🍸', color: 'var(--color-amber-400)',      label: 'Cóctel' },
  brunch:        { icon: 'Coffee',          emoji: '🥐', color: 'var(--color-emerald-400)',    label: 'Brunch' },
  themed_party:  { icon: 'PartyPopper',     emoji: '🎉', color: 'var(--color-terracotta-400)', label: 'Fiesta Temática' },
  reception:     { icon: 'Handshake',       emoji: '🥂', color: 'var(--color-gold-300)',       label: 'Recepción' },
};

// ── Cultural Category config ──
export const CATEGORY_CONFIG: Record<CulturalCategory, EntityVisualConfig> = {
  music:       { icon: 'Music',    emoji: '🎵', color: 'var(--color-teal-400)',        label: 'Música' },
  visual_arts: { icon: 'Palette',  emoji: '🎨', color: 'var(--color-sage-400)',        label: 'Artes Visuales' },
  theater:     { icon: 'Theater',  emoji: '🎭', color: 'var(--color-gold-400)',        label: 'Teatro' },
  dance:       { icon: 'Activity', emoji: '💃', color: 'var(--color-emerald-400)',     label: 'Danza' },
  literature:  { icon: 'BookOpen', emoji: '📚', color: 'var(--color-amber-400)',       label: 'Literatura' },
  gastronomy:  { icon: 'ChefHat',  emoji: '🍽️', color: 'var(--color-terracotta-400)', label: 'Gastronomía' },
  heritage:    { icon: 'Landmark', emoji: '🏛️', color: 'var(--color-silver-400)',     label: 'Patrimonio' },
};

// ── Venue Type config ──
export const VENUE_CONFIG: Record<VenueType, { label: string; icon: string }> = {
  ballroom:   { label: 'Salón de Baile', icon: 'Building' },
  garden:     { label: 'Jardín',          icon: 'TreePine' },
  terrace:    { label: 'Terraza',         icon: 'Sun' },
  lounge:     { label: 'Lounge',          icon: 'Armchair' },
  auditorium: { label: 'Auditorio',       icon: 'Mic' },
  poolside:   { label: 'Piscina',         icon: 'Waves' },
};

// ── Formality Level config ──
export const FORMALITY_CONFIG: Record<FormalityLevel, FormalityConfig> = {
  casual:      { label: 'Casual',       icon: 'Shirt',     color: 'var(--color-silver-400)', badge: 'default' },
  semi_formal: { label: 'Semi-Formal',  icon: 'User',      color: 'var(--color-teal-400)',   badge: 'info' },
  formal:      { label: 'Formal',       icon: 'UserCheck', color: 'var(--color-amber-400)',  badge: 'warning' },
  black_tie:   { label: 'Black Tie',    icon: 'Crown',     color: 'var(--color-gold-400)',   badge: 'premium' },
  white_tie:   { label: 'White Tie',    icon: 'Sparkles',  color: 'var(--color-gold-300)',   badge: 'premium' },
};

// ── Entertainment Type config ──
export const ENTERTAINMENT_TYPE_CONFIG: Record<EntertainmentType, EntityVisualConfig> = {
  live_band:            { icon: 'Guitar',  emoji: '🎸', color: 'var(--color-emerald-400)',    label: 'Banda en Vivo' },
  dj:                   { icon: 'Disc3',   emoji: '🎧', color: 'var(--color-teal-400)',       label: 'DJ' },
  comedian:             { icon: 'Laugh',   emoji: '😂', color: 'var(--color-amber-400)',      label: 'Comediante' },
  magician:             { icon: 'Wand',    emoji: '🎩', color: 'var(--color-teal-400)',       label: 'Mago' },
  speaker:              { icon: 'Mic',     emoji: '🎤', color: 'var(--color-silver-300)',     label: 'Orador' },
  cultural_performance: { icon: 'Theater', emoji: '🎭', color: 'var(--color-gold-400)',       label: 'Performance Cultural' },
  dance_performance:    { icon: 'Music',   emoji: '💃', color: 'var(--color-terracotta-400)', label: 'Performance de Danza' },
};

// ── Status configs per entity ──
export const EVENT_STATUS_CONFIG: Record<CulturalEventStatus, StatusConfig> = {
  planned:     { label: 'Planificado',  color: 'var(--color-silver-400)',  bg: 'var(--color-silver-400)',  variant: 'default' },
  confirmed:   { label: 'Confirmado',   color: 'var(--color-teal-400)',    bg: 'var(--color-teal-bg)',     variant: 'info' },
  in_progress: { label: 'En Curso',     color: 'var(--color-emerald-400)', bg: 'var(--color-emerald-bg)',  variant: 'success' },
  completed:   { label: 'Completado',   color: 'var(--color-silver-500)',  bg: 'var(--color-surface-2)',   variant: 'default' },
  cancelled:   { label: 'Cancelado',    color: 'var(--color-rose-400)',    bg: 'var(--color-rose-bg)',     variant: 'error' },
};

export const PROGRAM_STATUS_CONFIG: Record<ProgramStatus, StatusConfig> = {
  draft:     { label: 'Borrador',      color: 'var(--color-silver-400)',  bg: 'var(--color-surface-2)',   variant: 'default' },
  enrolling: { label: 'Inscripciones', color: 'var(--color-teal-400)',    bg: 'var(--color-teal-bg)',     variant: 'info' },
  active:    { label: 'Activo',        color: 'var(--color-emerald-400)', bg: 'var(--color-emerald-bg)',  variant: 'success' },
  completed: { label: 'Completado',    color: 'var(--color-silver-500)',  bg: 'var(--color-surface-2)',   variant: 'default' },
  cancelled: { label: 'Cancelado',     color: 'var(--color-rose-400)',    bg: 'var(--color-rose-bg)',     variant: 'error' },
};

export const EXHIBITION_STATUS_CONFIG: Record<ExhibitionStatus, StatusConfig> = {
  scheduled:  { label: 'Programada',   color: 'var(--color-silver-400)',  bg: 'var(--color-surface-2)',   variant: 'default' },
  setup:      { label: 'Montaje',      color: 'var(--color-amber-400)',   bg: 'var(--color-amber-bg)',    variant: 'warning' },
  active:     { label: 'Activa',       color: 'var(--color-emerald-400)', bg: 'var(--color-emerald-bg)',  variant: 'success' },
  dismantled: { label: 'Desmontada',   color: 'var(--color-silver-500)',  bg: 'var(--color-surface-2)',   variant: 'default' },
  cancelled:  { label: 'Cancelada',    color: 'var(--color-rose-400)',    bg: 'var(--color-rose-bg)',     variant: 'error' },
};

export const PERFORMANCE_STATUS_CONFIG: Record<PerformanceStatus, StatusConfig> = {
  proposed:    { label: 'Propuesto',    color: 'var(--color-silver-400)',  bg: 'var(--color-surface-2)',   variant: 'default' },
  contracted:  { label: 'Contratado',   color: 'var(--color-teal-400)',    bg: 'var(--color-teal-bg)',     variant: 'info' },
  confirmed:   { label: 'Confirmado',   color: 'var(--color-emerald-400)', bg: 'var(--color-emerald-bg)',  variant: 'success' },
  in_progress: { label: 'En Curso',     color: 'var(--color-gold-400)',    bg: 'var(--color-gold-100)',    variant: 'premium' },
  completed:   { label: 'Completado',   color: 'var(--color-silver-500)',  bg: 'var(--color-surface-2)',   variant: 'default' },
  cancelled:   { label: 'Cancelado',    color: 'var(--color-rose-400)',    bg: 'var(--color-rose-bg)',     variant: 'error' },
};

// ── Proposal Category config (5 Pillars) ──
export const PROPOSAL_CATEGORY_CONFIG: Record<ProposalCategory, EntityVisualConfig & { pillar: string }> = {
  activity_proposal:     { icon: 'Lightbulb', emoji: '💡', color: 'var(--color-teal-400)',        label: 'Propuesta de Actividad',       pillar: 'Actividades' },
  targeted_invitation:   { icon: 'Send',      emoji: '📨', color: 'var(--color-gold-400)',        label: 'Invitación Dirigida',          pillar: 'Invitaciones' },
  group_cohesion:        { icon: 'Users',     emoji: '🤝', color: 'var(--color-emerald-400)',     label: 'Cohesión Grupal',              pillar: 'Cohesión' },
  space_activation:      { icon: 'Home',      emoji: '🏠', color: 'var(--color-amber-400)',       label: 'Activación de Espacio',        pillar: 'Espacios' },
  lifestyle_integration: { icon: 'Heart',     emoji: '🌟', color: 'var(--color-terracotta-400)', label: 'Integración de Estilo de Vida', pillar: 'Estilo de Vida' },
};

// ── Health Level config ──
export const HEALTH_LEVEL_CONFIG: Record<string, { label: string; color: string; min: number }> = {
  excepcional: { label: 'Excepcional', color: 'var(--color-emerald-400)', min: 85 },
  saludable:   { label: 'Saludable',   color: 'var(--color-teal-400)',    min: 65 },
  atención:    { label: 'Atención',     color: 'var(--color-amber-400)',   min: 45 },
  crítico:     { label: 'Crítico',      color: 'var(--color-rose-400)',    min: 0 },
  unknown:     { label: 'Sin datos',    color: 'var(--color-silver-500)',  min: -1 },
};

// ── Implementation Effort config ──
export const EFFORT_CONFIG: Record<ImplementationEffort, { label: string; color: string }> = {
  low:    { label: 'Bajo',    color: 'var(--color-emerald-400)' },
  medium: { label: 'Medio',   color: 'var(--color-amber-400)' },
  high:   { label: 'Alto',    color: 'var(--color-rose-400)' },
};

// ── Timeline config ──
export const TIMELINE_CONFIG: Record<SuggestedTimeline, { label: string; color: string }> = {
  immediate:   { label: 'Inmediato',       color: 'var(--color-emerald-400)' },
  this_month:  { label: 'Este mes',        color: 'var(--color-teal-400)' },
  this_season: { label: 'Esta temporada',  color: 'var(--color-amber-400)' },
  next_season: { label: 'Próx. temporada', color: 'var(--color-silver-400)' },
};

// ══════════════════════════════════════════════════════════
//  10. TRANSFORM HELPERS
// ══════════════════════════════════════════════════════════

export interface CulturalKPI {
  label: string;
  value: string | number;
  subValue?: string;
  icon: string;
  emoji: string;
  color: string;
  trend?: { value: number; direction: 'up' | 'down' | 'flat' };
}

/** Convert CulturalSummary → KPI cards data */
export function summaryToKPIs(summary: CulturalSummary): CulturalKPI[] {
  const healthConfig = HEALTH_LEVEL_CONFIG[summary.health_level] ?? HEALTH_LEVEL_CONFIG.unknown;
  return [
    {
      label: 'Eventos próximos',
      value: summary.upcoming_events_30d,
      icon: 'Sparkles',
      emoji: '🎭',
      color: 'var(--color-gold-400)',
    },
    {
      label: 'Exposiciones activas',
      value: summary.active_exhibitions,
      icon: 'Frame',
      emoji: '🖼️',
      color: 'var(--color-sage-400)',
    },
    {
      label: 'Programas activos',
      value: summary.active_programs,
      icon: 'Music',
      emoji: '🎵',
      color: 'var(--color-teal-400)',
    },
    {
      label: 'Health Score',
      value: summary.cultural_health_score,
      subValue: healthConfig.label,
      icon: 'Heart',
      emoji: '❤️',
      color: healthConfig.color,
    },
  ];
}

/** Get event type config with fallback */
export function getEventTypeConfig(eventType: string): EntityVisualConfig {
  return EVENT_TYPE_CONFIG[eventType as CulturalEventType]
    ?? CULTURAL_ENTITY_CONFIG.event;
}

/** Get category config with fallback */
export function getCategoryConfig(category: string): EntityVisualConfig {
  return CATEGORY_CONFIG[category as CulturalCategory]
    ?? { icon: 'CircleDot', emoji: '📌', color: 'var(--color-silver-400)', label: category };
}

/** Get status config for an entity type */
export function getStatusConfig(
  entityType: 'event' | 'program' | 'exhibition' | 'performance',
  status: string,
): StatusConfig {
  const configs: Record<string, Record<string, StatusConfig>> = {
    event: EVENT_STATUS_CONFIG,
    program: PROGRAM_STATUS_CONFIG,
    exhibition: EXHIBITION_STATUS_CONFIG,
    performance: PERFORMANCE_STATUS_CONFIG,
  };
  return configs[entityType]?.[status]
    ?? { label: status, color: 'var(--color-silver-400)', bg: 'var(--color-surface-2)', variant: 'default' };
}

/** Get health score color */
export function getHealthColor(score: number): string {
  if (score >= 85) return 'var(--color-emerald-400)';
  if (score >= 65) return 'var(--color-teal-400)';
  if (score >= 45) return 'var(--color-amber-400)';
  return 'var(--color-rose-400)';
}

/**
 * Group calendar items by date for timeline rendering.
 *
 * FIX Phase 32: Changed from Map<string, CalendarItem[]> to
 * Record<string, CalendarItem[]> per project rule R42 (never use new Map).
 */
export function groupCalendarByDate(items: CalendarItem[]): Record<string, CalendarItem[]> {
  const grouped: Record<string, CalendarItem[]> = {};
  for (const item of items) {
    const date = item.date;
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(item);
  }
  return grouped;
}

/** Format enrollment string for programs */
export function formatEnrollment(current: number, max: number): string {
  if (max <= 0) return 'Sin límite';
  const pct = Math.round((current / max) * 100);
  return `${current}/${max} (${pct}%)`;
}

/**
 * Calculate engagement score from analytics.
 *
 * FIX Phase 32: Engagement weights now sourced from
 * CULTURAL_ENGAGEMENT_WEIGHTS in config.ts.
 */
export function calculateEngagementScore(analytics: CulturalAnalytics): number {
  const w = CULTURAL_ENGAGEMENT_WEIGHTS;

  const categoryScore = analytics.category_performance.length > 0
    ? Math.min(100, analytics.category_performance.reduce((s, c) => s + c.engagement_score, 0) / analytics.category_performance.length)
    : 0;
  const venueScore = analytics.venue_utilization.length > 0
    ? Math.min(100, analytics.venue_utilization.reduce((s, v) => s + v.utilization_rate, 0) / analytics.venue_utilization.length)
    : 0;
  const entScore = analytics.entertainment_roi.length > 0
    ? Math.min(100, analytics.entertainment_roi.reduce((s, e) => s + e.contracted_rate, 0) / analytics.entertainment_roi.length)
    : 0;
  const attendanceScore = analytics.attendance_trend === 'up' ? 80 : analytics.attendance_trend === 'stable' ? 60 : 30;
  const budgetScore = Math.max(0, 100 - Math.abs(analytics.budget_variance_pct));
  const programScore = analytics.avg_enrollment_pct;
  const exhibScore = analytics.exhibitions_with_reception_pct;

  return Math.round(
    categoryScore  * w.category +
    venueScore     * w.venue +
    entScore       * w.entertainment +
    attendanceScore * w.attendance +
    budgetScore    * w.budget +
    programScore   * w.programs +
    exhibScore     * w.exhibitions
  );
}

// ══════════════════════════════════════════════════════════
//  11. CLIENT-SIDE INTELLIGENCE SUPPORT TYPES
//  (Used by engines — NOT backend entities)
// ══════════════════════════════════════════════════════════

/**
 * Extended genre taxonomy for client-side taste profiling.
 *
 * The backend uses CulturalCategory (7 values) for CRUD.
 * This extends to 15 for richer intelligence modeling.
 * Config map lives in config.ts (CULTURAL_GENRE_EXTENDED).
 */
export type CulturalGenreExtended =
  | CulturalCategory
  | 'wine_spirits'
  | 'lectures'
  | 'workshops'
  | 'family'
  | 'seasonal'
  | 'wellness_cultural'
  | 'contemporary';

/**
 * Genre affinity data point — derived from attendance + feedback.
 * One per genre the member has interacted with.
 */
export interface GenreAffinity {
  genre: CulturalGenreExtended;
  affinityScore: number;        // 0-100
  eventCount: number;
  avgSatisfaction: number;      // 0-100
  lastAttended: string;         // ISO date
  trend: 'growing' | 'stable' | 'declining';
  depth: 'surface' | 'moderate' | 'deep' | 'expert';
  subGenres: Record<string, number>;
}

/**
 * Temporal pattern — derived from attendance timestamps.
 * Captures WHEN a member prefers cultural experiences.
 */
export interface CulturalTemporalPattern {
  dayOfWeek: number;            // 0-6
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'occasional';
  seasonalTendency: Record<string, number>;  // month → preference strength
  advanceBookingDays: number;
}

/**
 * Sensory preferences — derived from venue correlation + feedback.
 * WHAT kind of sensory experience the member gravitates toward.
 */
export interface SensoryPreferences {
  lightingMood: 'bright' | 'ambient' | 'dim' | 'dramatic';
  noiseLevel: 'quiet' | 'conversational' | 'energetic' | 'loud';
  spaceFeeling: 'intimate' | 'cozy' | 'spacious' | 'grand';
  formalityLevel: 'casual' | 'smart_casual' | 'formal' | 'black_tie';
}

/**
 * Sensory profile — concrete configuration for a venue/event.
 * The "recipe" for how a space should feel during a specific event.
 */
export interface SensoryProfile {
  lighting: {
    baseLevel: number;          // 0-100 normalized
    mood: 'bright' | 'ambient' | 'dramatic' | 'intimate';
    colorTemperature: 'warm' | 'neutral' | 'cool';
    dynamicRange: boolean;      // can it change during event?
  };
  acoustics: {
    ambientNoise: number;       // 0-100 normalized
    reverberation: 'dead' | 'intimate' | 'moderate' | 'cathedral';
    soundIsolation: number;     // 0-100
    musicCapability: boolean;
  };
  temperature: {
    base: number;               // °C
    variability: number;        // ±°C acceptable
    ventilation: 'natural' | 'mixed' | 'controlled';
  };
  aroma: string;
  layout: {
    maxCapacity: number;
    configurations: string[];   // 'theater', 'banquet', 'cocktail', 'classroom'
    flexibility: number;        // 0-100
    stagePresence: boolean;
    flowPattern: 'linear' | 'circular' | 'open' | 'tiered';
  };
}

/**
 * Cultural companion — someone the member attends events with.
 * Used to model the social dimension of cultural engagement.
 */
export interface CulturalCompanion {
  companionId: string;
  relationship: 'spouse' | 'family' | 'friend' | 'colleague';
  sharedGenres: CulturalGenreExtended[];
  enjoymentMultiplier: number;  // 1.0 = neutral, >1 = enhanced, <1 = diminished
  frequency: number;            // how often they attend together
}

/**
 * Group dynamic — how group size affects enjoyment for this member.
 * Some people thrive in large groups; others prefer intimate settings.
 */
export interface GroupDynamic {
  groupSize: number;
  enjoymentModifier: number;    // -100 to +100
  preferredContext: CulturalGenreExtended[];
}

/**
 * Journey phase — one step in a curated cultural journey.
 * Phases progress from comfort → introduction → deepening → exploration → challenge.
 */
export interface JourneyPhase {
  startDate: ReactNode;
  phaseIndex: number;
  theme: string;
  duration: string;
  events: RecommendedEvent[];
  purpose: 'comfort' | 'introduction' | 'deepening' | 'exploration' | 'challenge';
  expectedOutcome: string;
}

/**
 * Recommended event — AI-curated event suggestion within a journey.
 * Each recommendation includes WHY (reason) and HOW RISKY (riskLevel).
 */
export interface RecommendedEvent {
  date: ReactNode;
  eventId: string;
  title: string;
  genre: CulturalGenreExtended;
  matchScore: number;           // 0-100
  reason: string;               // AI-generated explanation
  riskLevel: 'safe' | 'stretch' | 'adventurous';
  expectedResonance: number;    // 0-100
  socialContext: string;        // "Best experienced solo/with partner/group"
  venueFit: number;             // 0-100
}

/**
 * Journey key moment — milestone in a cultural journey.
 * The moments that matter: breakthroughs, expansions, celebrations.
 */
export interface JourneyKeyMoment {
  significance: string;
  date: string;
  description: string;
  type: 'milestone' | 'breakthrough' | 'expansion' | 'ritual' | 'celebration';
  eventId?: string;
}

/**
 * Post-event behavior — what the member did AFTER attending.
 * Used to compute experiential resonance.
 */
export interface PostEventBehavior {
  daysSinceEvent: number;
  referencedInConversation: boolean;
  attendedSimilarEvents: boolean;
  changedPreferences: boolean;
  broughtSomeone: boolean;
  sharedOnSocial: boolean;
  requestedRepeat: boolean;
}

/**
 * Social signal — social reaction to an event.
 * Did the member talk about it? Recommend it? Share it?
 */
export interface SocialSignal {
  type: 'recommendation' | 'social_share' | 'conversation' | 'referral';
  targetMemberId?: string;
  sentiment: number;            // -1 to 1
  daysAfterEvent: number;
}

/**
 * Demand forecast for a proposed event.
 * Predicts attendance, satisfaction, and revenue with confidence bands.
 */
export interface DemandForecast {
  eventTemplateId: string;
  predictedAttendance: {
    estimate: number;
    lower: number;
    upper: number;
    confidence: number;         // 0-1
  };
  predictedSatisfaction: {
    estimate: number;
    lower: number;
    upper: number;
    confidence: number;
  };
  predictedRevenue: {
    estimate: number;
    lower: number;
    upper: number;
    confidence: number;
  };
  optimalDate: string;
  optimalVenue: string;
  optimalCapacity: number;
  riskFactors: string[];
  demandDrivers: {
    driver: string;
    impact: number;             // -100 to +100
    confidence: number;         // 0-1
  }[];
  seasonalMultiplier: number;
  competitiveEvents: string[];
}

// ══════════════════════════════════════════════════════════
//  12. CLIENT-SIDE INTELLIGENCE OUTPUT TYPES
//  (Engine return types — computed from backend data)
// ══════════════════════════════════════════════════════════

/**
 * §C1 output — The Cultural Taste Genome.
 * Complete taste profile for a member, derived from attendance
 * history, feedback, exploration patterns, and temporal preferences.
 */
export interface TasteProfile {
  memberId: string;
  genrePreferences: Record<CulturalGenreExtended, GenreAffinity>;
  culturalDNA: CulturalDNA;
  temporalPatterns: CulturalTemporalPattern[];
  socialPreference: 'solo' | 'couple' | 'small_group' | 'large_group' | 'varies';
  tasteVelocity: number;        // -100 to +100 (contracting → expanding)
  explorationIndex: number;     // 0-100 (comfort zone → explorer)
  depthVsBreadth: number;       // 0-100 (deep specialist → broad generalist)
  sensoryPreferences: SensoryPreferences;
  profileConfidence: number;    // 0-1 (how much data supports this)
  dataPoints: number;           // total interactions analyzed
}

/**
 * §C2 output — 6-dimension CulturalDNA.
 * Psychographic dimensions of how a member experiences culture.
 */
export interface CulturalDNA {
  openness: number;             // 0-100 — willing to try new genres
  depth: number;                // 0-100 — engages deeply vs surface
  sociality: number;            // 0-100 — cultural experience as social vs personal
  adventurousness: number;      // 0-100 — seeks novelty vs comfort
  ritualism: number;            // 0-100 — values tradition/ritual vs spontaneity
  aesthetic_sensitivity: number; // 0-100 — notices and values aesthetic detail
  cultural_maturity: number;    // weighted composite
  engagement_intensity: number; // how deeply they engage when they attend
}

/**
 * §C3 output — Experiential Resonance Score.
 * How much an event REVERBERATED in a member — not just
 * whether they enjoyed it, but whether it CHANGED them.
 */
export interface ResonanceScore {
  eventId: string;
  memberId: string;
  immediateScore: number;       // 0-100 (did they enjoy it?)
  talkAboutIt: boolean;         // mentioned to others within 7 days
  recommendToOthers: boolean;   // recommended or brought someone
  seekRepeat: boolean;          // looked for similar events
  shareOnSocial: boolean;       // shared on social media
  identityIntegration: number;  // 0-100 (became part of who they are?)
  resonanceDuration: number;    // days the effect lasted
  echoCount: number;            // how many times referenced
  totalResonance: number;       // 0-100 weighted composite
}

/**
 * §C5 output — Cultural Journey.
 * A multi-phase curated sequence of cultural experiences
 * designed to expand the member's taste gradually.
 */
export interface CulturalJourney {
  startDate: string | number | Date;
  endDate: string | number | Date;
  purpose: ReactNode;
  memberId: string;
  horizon: '1_month' | '3_months' | '6_months' | '1_year';
  phases: JourneyPhase[];
  totalExperiences: number;
  diversityTarget: number;      // 0-100
  expansionRate: number;        // how fast to push boundaries
  predictedSatisfaction: number;
  predictedExplorationIndex: number;
  keyMoments: JourneyKeyMoment[];
}

/**
 * §C6 output — Taste Mutation.
 * A DISCONTINUITY in a member's taste pattern that signals
 * a new interest, an abandoned genre, or a shift in style.
 */
export interface TasteMutation {
  id: string;
  detectedDate: string;
  type: 'discovery' | 'abandonment' | 'shift' | 'deepening' | 'broadening';
  fromGenre?: CulturalGenreExtended;
  toGenre?: CulturalGenreExtended;
  trigger: string;              // what event/experience caused it
  confidence: number;           // 0-1
  magnitude: number;            // 0-100
  predictedStability: 'fad' | 'emerging_interest' | 'permanent_shift';
}

/**
 * §C4/§C7 output — Cultural Social Graph.
 * Maps the social dimension of cultural engagement:
 * who the member attends with, and how social context affects enjoyment.
 */
export interface CulturalSocialGraph {
  socialInfluenceScore: ReactNode;
  isolationRisk: number;
  avgAffinity: ReactNode;
  networkSize: ReactNode;
  connections: any;
  memberId: string;
  preferredCompanions: CulturalCompanion[];
  soloPreference: number;       // 0-100 (how much they enjoy solo cultural)
  socialAmplification: number;  // 0-100 (how much social context improves enjoyment)
  culturalInfluence: number;    // 0-100 (how much they influence others' choices)
  groupDynamics: GroupDynamic[];
}

/**
 * §C8 output — Venue Personality.
 * Each venue has an emergent "personality" derived from how it's been used.
 * Not a static label — a living characterization that evolves.
 */
export interface VenuePersonality {
  venueId: string;
  venueName: string;
  intimacy: number;             // 0-100
  energy: number;               // 0-100
  sociality: number;            // 0-100  
  formality: number;            // 0-100
  exclusivity: number;          // 0-100  
  versatility: number;          // 0-100
  bestGenres: CulturalGenreExtended[];
  optimalCapacity: number;
  bestTimeOfDay: string;
  avgOccupancy: number;         // 0-100
  avgSatisfaction: number;      // 0-100
  utilizationTrend: 'increasing' | 'stable' | 'declining';
  sensoryProfile: SensoryProfile;
}

/**
 * Ambient state for the Cultural dashboard breathing background.
 * Derives from overall cultural activity level.
 */
export interface CulturalAmbientState {
  mode: CulturalDashboardMode;
  activityLevel: 'dormant' | 'calm' | 'active' | 'vibrant';
  intensity: number;            // 0-100
  dominantGenre: CulturalGenreExtended | null;
}

/**
 * Stream signal for the Cultural Intelligence Stream.
 * A priority-sorted insight from any source.
 */
export interface CulturalStreamSignal {
  timestamp: string;
  id: string;
  source: 'advisor' | 'proposal' | 'mutation' | 'resonance' | 'calendar' | 'cross_domain';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action?: {
    label: string;
    route?: string;
    server?: string;
    tool?: string;
    params?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
}

export type { CulturalDashboardMode };
