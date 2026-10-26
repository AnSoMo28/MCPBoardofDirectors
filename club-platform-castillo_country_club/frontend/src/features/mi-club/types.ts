/**
 * @module features/mi-club/types (Fase 25 — NEW)
 * @note Types for the Mi Club landing system.
 *       Recommendation types, brief segments, predictive actions,
 *       agent activity, family stream, club pulse.
 */

import type { LucideIcon } from "lucide-react";

/* ═══════════════════════════════════════
   Recommendations (AI)
   ═══════════════════════════════════════ */

export interface FamilyRecommendation {
  id: string;
  recommendation_type: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  score: number;
  reasoning: string;
  action_label: string;
  action_route?: string;
  icon: string;
}

export interface FamilyRecommendationsResponse {
  status: string;
  message: string;
  recommendations: FamilyRecommendation[];
}

/* ═══════════════════════════════════════
   Contextual Brief
   ═══════════════════════════════════════ */

export type BriefEmphasis = "normal" | "highlight" | "urgent";

export interface BriefSegment {
  text: string;
  emphasis: BriefEmphasis;
  icon?: LucideIcon;
}

/* ═══════════════════════════════════════
   Predictive Actions
   ═══════════════════════════════════════ */

export interface PredictiveAction {
  id: string;
  icon: LucideIcon;
  label: string;
  description: string;
  color: string;
  priority: number; /* lower = shown first */
  route: string;
}

/* ═══════════════════════════════════════
   Agent Activity
   ═══════════════════════════════════════ */

export interface AgentActivityItem {
  id: string;
  label: string;
  accent: string;
  isActive: boolean;
  statusText: string;
  route: string;
}

/* ═══════════════════════════════════════
   Family Stream
   ═══════════════════════════════════════ */

export interface FamilyStreamItem {
  id: string;
  icon: LucideIcon;
  description: string;
  color: string;
  timestamp: string;
}

/* ═══════════════════════════════════════
   Club Pulse
   ═══════════════════════════════════════ */

export interface ClubPulseData {
  nextEvent: { title: string; time: string } | null;
  familyPointsThisMonth: number;
  familyPointsDelta: number | null;
}

/* ═══════════════════════════════════════
   Sections
   ═══════════════════════════════════════ */

export type SectionId =
  | "brief"
  | "predictive"
  | "stats"
  | "events"
  | "recommendations"
  | "stream"
  | "pulse"
  | "seed"
  | "links";