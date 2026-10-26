// ═══════════════════════════════════════════════════════════
// src/features/families/types.ts
// Phase 34+ Migration — Families Domain Types
// Level 6+ Agency · Production Grade
//
// Single source of truth for ALL Families type definitions.
// No functions. No config maps. No re-exports. Pure types.
//
// Config values        → ./config.ts
// AI intelligence      → ./ai-types.ts
// Social genome        → ./social-types.ts
// Barrel re-exports    → ./index.ts
// Helper functions     → ./lib/*
//
// PRE-WRITE VERIFICATION:
//   Family           → src/shared/mocks/contracts.ts ✅
//   FamilyMember     → src/shared/mocks/contracts.ts ✅
//   MemberRole       → Spanish canonical only ✅
//   SocialConnection → moved FROM social-types.ts (breaks circular dep) ✅
//   All union literals cross-verified with ai-types.ts ✅
//   All config interfaces cross-verified with config.ts sections ✅
//
// ANTI-PATTERNS REMOVED:
//   - TIER_CONFIG, STATUS_CONFIG, CHURN_CONFIG → config.ts §visual
//   - ROLE_LABELS, ROLE_BACKEND_MAP            → config.ts §roles
//   - INTEREST_PRESETS, CHANNEL_OPTIONS        → config.ts §preferences
//   - PRIVACY_OPTIONS                          → config.ts §preferences
//   - getDisplayTier()                         → lib/formatUtils.ts
//   - formatDate(), formatMonthYear()          → DELETED (deprecated)
//   - Re-exports (social-types, ai-types)      → index.ts barrel
//   - string props                             → union literals
//   - mutable interfaces                       → readonly
//   - English MemberRole variants              → Spanish canonical
//
// MIGRATION NOTES:
//   Files importing config maps from "../types" → change to "../config"
//   Files importing helpers from "../types"     → change to "../lib/*"
//   Files importing re-exports from "../types"  → change to ".." (barrel)
// ═══════════════════════════════════════════════════════════

import { type ReactNode } from "react";

// §0 ─── No imports. Self-contained type definitions. ──────

// ═══════════════════════════════════════════════════════════
// §1  UNION LITERALS / ENUMS
// ═══════════════════════════════════════════════════════════

export type FamilyStatus =
  | "active"
  | "inactive"
  | "suspended"
  | "pending_approval";

export type MemberTier =
  | "platino"
  | "oro"
  | "plata"
  | "bronce"
  | "basic"
  | "premium"
  | "vip";

export type ChurnRisk = "low" | "medium" | "high" | "critical";

/**
 * Spanish canonical. Backend sends English variants that get
 * normalized via ROLE_BACKEND_MAP in config.ts.
 */
export type MemberRole =
  | "titular"
  | "conyuge"
  | "hijo"
  | "dependiente"
  | "invitado_permanente";

export type MemberStatus = "active" | "inactive";

export type LifecycleStage =
  | "prospect"
  | "onboarding"
  | "growing"
  | "peak"
  | "plateau"
  | "at_risk"
  | "dormant"
  | "reactivated";

export type TemperatureZoneLevel =
  | "frozen"
  | "cold"
  | "warm"
  | "hot"
  | "burning";

export type PulseRhythm =
  | "steady"
  | "sporadic"
  | "accelerating"
  | "decelerating"
  | "flatline";

export type PrioritySlot =
  | "milestone_approaching"
  | "churn_warning"
  | "new_member_celebration"
  | "engagement_surge"
  | "financial_alert"
  | "social_opportunity"
  | "lifecycle_transition"
  | "anniversary";

export type RowSignal =
  | "high-value"
  | "at-risk"
  | "new"
  | "dormant"
  | "negative"
  | "none";

export type SortField =
  | "name"
  | "engagement"
  | "tier"
  | "lastActivity"
  | "churnRisk"
  | "balance"
  | "memberCount";

export type SortDir = "asc" | "desc";

export type NarrativeTone =
  | "observational"
  | "actionable"
  | "urgent"
  | "celebratory";

export type AgeJourneyStage = "child" | "teen" | "adult" | "senior";

export type PrivacyLevel = "open" | "normal" | "private" | "restricted";

/** ISO 639-1 — primary languages for Castillo Country Club demographics */
export type PreferredLanguage = "es" | "en" | "pt" | "fr";

export type NotificationChannel = "email" | "push" | "sms" | "whatsapp";

export type FamilyDashboardTab =
  | "overview"
  | "members"
  | "intelligence"
  | "social"
  | "memories"
  | "activity"
  | "communication";

export type ActivityType =
  | "reservation"
  | "event"
  | "charge"
  | "payment"
  | "communication"
  | "engagement"
  | "lifecycle_event"
  | "cross_domain_trigger"
  | "social_interaction"
  | "milestone";

export type TrendDirection = "up" | "down" | "stable";

export type AdvisorLayer =
  | "health"
  | "lifecycle"
  | "social"
  | "financial"
  | "engagement";

// ═══════════════════════════════════════════════════════════
// §2  CORE DOMAIN TYPES
// ═══════════════════════════════════════════════════════════

export interface FamilyMember {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly dateOfBirth: string;
  readonly email: string;
  readonly phone: string;
  readonly role: MemberRole;
  readonly avatarUrl?: string;
  readonly engagementScore: number;
  readonly activities: readonly string[];
  readonly status: MemberStatus;
  readonly joinedAt: string;
}

export interface Family {
  readonly id: string;
  readonly familyName: string;
  readonly status: FamilyStatus;
  readonly tier: MemberTier;
  readonly since: string;
  readonly primaryContact: FamilyMember;
  readonly members: readonly FamilyMember[];
  readonly memberCount: number;
  readonly totalBalance: number;
  readonly engagementScore: number;
  readonly churnRisk: ChurnRisk;
  readonly lastActivity: string;
  readonly address?: string;
  readonly notes?: string;
}

/**
 * Core social connection between two families.
 * Extended by EnrichedSocialConnection in social-types.ts.
 *
 * Defined here (not in social-types.ts) to break circular dependency.
 * social-types.ts imports this and extends it. One-way dependency.
 */
export interface SocialConnection {
  readonly connectedFamilyId: string;
  readonly connectedFamilyName: string;
  readonly relationship: string;
  readonly strength: number;
}

// ═══════════════════════════════════════════════════════════
// §3  REQUEST / RESPONSE TYPES
// ═══════════════════════════════════════════════════════════

export interface FamilyListResponse {
  readonly families: readonly Family[];
  readonly total: number;
  readonly page: number;
  readonly totalPages: number;
  readonly limit: number;
}

export interface FamilyFilters {
  readonly search: string;
  readonly status: FamilyStatus | "";
  readonly tier: MemberTier | "";
  readonly churnRisk: ChurnRisk | "";
  readonly page: number;
  readonly limit: number;
}

export interface FamilyDetailResponse {
  readonly family: Family;
  readonly recentActivity: readonly ActivityRecord[];
  readonly financialSummary: FinancialSummary;
  readonly socialConnections: readonly SocialConnection[];
  readonly preferences?: FamilyPreferences;
}

export interface ActivityRecord {
  readonly id: string;
  readonly type: ActivityType;
  readonly description: string;
  readonly date: string;
  readonly amount?: number;
}

export interface FinancialSummary {
  readonly currentBalance: number;
  readonly creditLimit: number;
  readonly lastPaymentDate: string;
  readonly lastPaymentAmount: number;
  readonly ytdCharges: number;
  readonly ytdPayments: number;
}

// ═══════════════════════════════════════════════════════════
// §4  PREFERENCES TYPES
// ═══════════════════════════════════════════════════════════

export interface FamilyPreferences {
  readonly preferred_language: PreferredLanguage;
  readonly notification_channels: readonly NotificationChannel[];
  readonly interests: readonly string[];
  readonly privacy_level: PrivacyLevel;
  readonly dietary_notes?: string | null;
}

// ═══════════════════════════════════════════════════════════
// §5  DERIVED / INTELLIGENCE TYPES
// ═══════════════════════════════════════════════════════════

export interface Trend {
  readonly direction: TrendDirection;
  readonly delta: number;
  readonly period: string;
}

export interface EnrichedRowSignal {
  readonly type: RowSignal;
  readonly label: string;
  readonly color: string;
  readonly bgColor: string;
  readonly borderColor: string;
  readonly cssClass: string;
}

export interface EnrichedRow {
  readonly family: Family;
  readonly signal: EnrichedRowSignal;
  readonly trend: Trend;
  readonly sparklinePoints: readonly number[];
  readonly engagementColor: string;
}

export interface BatchStats {
  readonly count: number;
  readonly avgEngagement: number;
  readonly totalBalance: number;
  readonly dist: Readonly<{ high: number; medium: number; low: number }>;
  readonly tiers: ReadonlyArray<{
    readonly tier: MemberTier;
    readonly count: number;
  }>;
  readonly risks: Readonly<{ critical: number; high: number }>;
  readonly suggestion: string;
}

export interface GlanceInsight {
  readonly title: string;
  readonly text: string;
  readonly severity: "info" | "warning" | "critical" | "positive";
  readonly icon: string;
}

export interface ParsedSearch {
  readonly text: string;
  readonly autoFilters: {
    readonly tier?: MemberTier;
    readonly churn?: ChurnRisk;
    readonly status?: FamilyStatus;
  };
}

// ═══════════════════════════════════════════════════════════
// §6  DASHBOARD TYPES
// ═══════════════════════════════════════════════════════════

export interface FamilyDashboardState {
  readonly activeTab: FamilyDashboardTab;
  readonly selectedFamilyId: string | null;
  readonly isDetailOpen: boolean;
  readonly isFormOpen: boolean;
}

export interface FamilyTabConfig {
  readonly id: FamilyDashboardTab;
  readonly label: string;
  readonly icon: string;
  readonly description: string;
}

// ═══════════════════════════════════════════════════════════
// §7  CONFIG TYPE DEFINITIONS
// Shapes of configuration maps. Actual values in config.ts.
// ═══════════════════════════════════════════════════════════

export type CohortId =
  | "all"
  | "premium-risk"
  | "dormant"
  | "new"
  | "negative-balance"
  | "high-engagement"
  | "critical-churn"
  | "pulse-flatline"
  | "pulse-accelerating"
  | "temp-frozen"
  | "temp-burning"
  | "lifecycle-at-risk"
  | "intervention-window";

export interface CohortDef {
  readonly id: CohortId;
  readonly label: string;
  readonly subtitle: string;
  readonly color: string;
  /** Core match — uses Family data only, no AI enrichment */
  readonly match: (f: Family) => boolean;
  /** Requires AI enrichment — checked at hook level */
  readonly requiresAI?: boolean;
  readonly icon: string;
}

export interface TemperatureZoneConfig {
  readonly emoji: ReactNode;
  readonly zone: TemperatureZoneLevel;
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly color: string;
  readonly glowColor: string;
  readonly bgGradient: string;
}

export interface PulseRhythmConfig {
  readonly rhythm: PulseRhythm;
  readonly label: string;
  readonly color: string;
  readonly animationClass: string;
  readonly description: string;
}

export interface PrioritySlotConfig {
  readonly slot: PrioritySlot;
  readonly label: string;
  readonly color: string;
  readonly bgColor: string;
  readonly icon: string;
  readonly weight: number;
}

export interface RowSignalConfig {
  readonly signal: RowSignal;
  readonly label: string;
  readonly color: string;
  readonly bgColor: string;
  readonly borderColor: string;
  readonly cssClass: string;
  readonly weight: number;
}

export interface LifecycleStageConfig {
  readonly stage: LifecycleStage;
  readonly label: string;
  readonly color: string;
  readonly bgColor: string;
  readonly description: string;
  readonly icon: string;
  readonly healthScore: number;
  readonly variant: "success" | "warning" | "danger" | "default";
}

export interface MemoryTypeConfig {
  readonly type: string;
  readonly label: string;
  readonly color: string;
  readonly icon: string;
}

export interface MilestoneTypeConfig {
  readonly type: string;
  readonly label: string;
  readonly color: string;
  readonly icon: string;
  readonly advanceDays: number;
}

export interface SeedToneConfig {
  readonly tone: string;
  readonly label: string;
  readonly color: string;
}

export interface SortOption {
  readonly field: SortField;
  readonly dir: SortDir;
  readonly label: string;
}

export interface ActivityCategoryConfig {
  readonly category: string;
  readonly label: string;
  readonly color: string;
  readonly bgColor: string;
  readonly icon: string;
  readonly keywords: readonly string[];
}

export interface AgeJourneyConfig {
  readonly stage: AgeJourneyStage;
  readonly label: string;
  readonly minAge: number;
  readonly maxAge: number;
  readonly color: string;
  readonly bgColor: string;
  readonly icon: string;
}

export interface VelocityWindow {
  readonly label: string;
  readonly days: number;
  readonly color: string;
}

export interface NarrativeTemplate {
  readonly tone: NarrativeTone;
  readonly icon: string;
  readonly color: string;
  readonly bgColor: string;
  readonly priority: number;
}

export interface RiskLevelConfig {
  readonly label: string;
  readonly variant: "success" | "warning" | "danger" | "default";
  readonly color: string;
}

export interface ActionCategoryConfig {
  readonly icon: string;
  readonly color: string;
  readonly label: string;
}

export interface IntelligenceDimensionConfig {
  readonly id: string;
  readonly label: string;
  readonly shortLabel: string;
  readonly icon: string;
  readonly color: string;
  readonly weight: number;
}

export interface UrgencyLevelConfig {
  readonly label: string;
  readonly color: string;
  readonly bgColor: string;
  readonly glowColor: string;
  readonly priority: number;
}

export interface AdvisorImpactConfig {
  readonly color: string;
  readonly bgColor: string;
  readonly label: string;
  readonly icon: string;
  readonly urgencyRank: number;
}

export interface AdvisorLayerConfig {
  readonly label: string;
  readonly icon: string;
  readonly color: string;
}

export interface SearchKeyword<T extends string> {
  readonly keywords: readonly string[];
  readonly value: T;
  readonly label: string;
}

// ═══════════════════════════════════════════════════════════
// §8  ADVISOR INTEGRATION REFERENCE TYPES
// Shapes used by advisor engine rules and hooks.
// ═══════════════════════════════════════════════════════════

export interface FamilyHealthFactorRef {
  readonly id: string;
  readonly label: string;
  readonly weight: number;
  readonly description: string;
}

/** Valid lifecycle transitions with trigger conditions */
export interface LifecycleTransition {
  readonly from: LifecycleStage;
  readonly to: LifecycleStage;
  readonly triggers: readonly string[];
  readonly estimatedDays: number;
  readonly isPositive: boolean;
} 
