// ═══════════════════════════════════════════════════════════
// Age Group Dashboard — Neural Hub Hook
// Castillo Country Club — Silver Tide Glass UI (Fase 27)
//
// Orchestrates: useAgeGroupData → derived intelligence →
//   narrative ordering, prism data, system status.
//
// Proposals: P1 Neural Hub · P3 AI Concierge · P9 Single Source
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import { useAgeGroupData } from "./useAgeGroupData";
import type { UseAgeGroupDataOptions } from "./useAgeGroupData";
import {
  AGE_BRACKETS,
  getCohortIdentity,
  resolveBracketId,
} from "../config";
import type {
  AgeBracketId,
  AgingOutRisk,
} from "../types";
// ═══════════════════════════════════════════════════════════
// §1  Exported Types
// ═══════════════════════════════════════════════════════════

const DASHBOARD_TABS = [
  "demographics",
  "programs",
  "trends",
  "intelligence",
] as const;

export type DashboardTabId = (typeof DASHBOARD_TABS)[number];

export interface DashboardTabConfig {
  id: DashboardTabId;
  label: string;
  icon: string;
  promoted: boolean;
}

export type TidePhase = "peak" | "transition" | "calm";

export interface SeasonContext {
  label: string;
  isPeak: boolean;
  icon: string;
  tidePhase: TidePhase;
  month: number;
}

export interface SystemStatus {
  label: string;
  healthySources: number;
  totalSources: number;
  activeInsights: number;
  activeRisks: number;
  healthy: boolean;
}

export interface KPIEntry {
  label: string;
  value: number;
  range: string;
  bracketId: AgeBracketId | null;
  color: string;
  icon: string;
}

export interface PrismSegment {
  bracketId: AgeBracketId;
  label: string;
  icon: string;
  memberCount: number;
  percentage: number;
  color: string;
  gradient: [string, string];
  healthScore: number;
  hotspot: boolean;
  trend: "up" | "down" | "stable";
  energyAnimation: string;
  energySpeed: number;
  agingOut?: AgingOutRisk;
  rippleActive: boolean;
}

// ═══════════════════════════════════════════════════════════
// §2  Season Helper
// ═══════════════════════════════════════════════════════════

function getCurrentSeason(): SeasonContext {
  const month = new Date().getMonth() + 1;
  if (month >= 12 || month <= 4)
    return {
      label: "Temporada Alta",
      isPeak: true,
      icon: "sun",
      tidePhase: "peak",
      month,
    };
  if (month >= 5 && month <= 7)
    return {
      label: "Transición",
      isPeak: false,
      icon: "cloud-sun",
      tidePhase: "transition",
      month,
    };
  return {
    label: "Temporada Verde",
    isPeak: false,
    icon: "cloud-rain",
    tidePhase: "calm",
    month,
  };
}

// ═══════════════════════════════════════════════════════════
// §3  Tab → Rule Keyword Mapping (P3)
// ═══════════════════════════════════════════════════════════

const TAB_RULE_KEYWORDS: Record<DashboardTabId, string[]> = {
  demographics: [
    "TEEN", "DEMOGRAPHIC", "IMBALANCE", "BALANCE", "KIDS", "SENIOR",
  ],
  programs: [
    "PROGRAM", "RETENTION", "SATISFACTION", "ACTIVITIES",
  ],
  trends: [
    "TREND", "SEASONAL", "GROWING", "DECLINING",
  ],
  intelligence: [
    "CROSS", "RECOMMENDATION", "FAMILY",
  ],
};

const TAB_LABELS: Record<DashboardTabId, string> = {
  demographics: "Demografía",
  programs: "Programas",
  trends: "Tendencias",
  intelligence: "Inteligencia",
};

const TAB_ICONS: Record<DashboardTabId, string> = {
  demographics: "users",
  programs: "book-open",
  trends: "trending-up",
  intelligence: "brain",
};

// ═══════════════════════════════════════════════════════════
// §4  Hook
// ═══════════════════════════════════════════════════════════

export function useAgeGroupDashboard(
  options: UseAgeGroupDataOptions = {},
) {
  // ── Full data + intelligence cascade ──
  const data = useAgeGroupData(options);

  // ── Season ──
  const season = useMemo(() => getCurrentSeason(), []);

  // ── Prism Segments (shared by GenerationalPrism + CohortVitals) ──
  const prismSegments = useMemo((): PrismSegment[] => {
    if (!data.analytics) return [];

    const dist = data.analytics.age_distribution;
    const totalMembers = dist.reduce((s, e) => s + (e.count ?? 0), 0);

    return AGE_BRACKETS.map((bracket) => {
      const entries = dist.filter(
        (d) => resolveBracketId(d.age_range) === bracket.id,
      );
      const memberCount = entries.reduce((s, e) => s + (e.count ?? 0), 0);
      const health = data.cohortHealth.find(
        (c) => c.bracketId === bracket.id,
      );
      const identity = getCohortIdentity(bracket.id);
      const agingRisk = data.agingOutRisks.find(
        (r) => r.bracketId === bracket.id,
      );
      const rippleActive = data.ripples.some(
        (r) => r.source === bracket.id,
      );

      return {
        bracketId: bracket.id,
        label: bracket.label,
        icon: bracket.icon,
        memberCount,
        percentage:
          totalMembers > 0 ? (memberCount / totalMembers) * 100 : 0,
        color: identity?.color ?? bracket.color,
        gradient: identity?.gradient ?? bracket.gradient,
        healthScore: health?.healthScore ?? 50,
        hotspot: health?.hotspot ?? false,
        trend: health?.trend ?? "stable",
        energyAnimation: identity?.energyAnimation ?? "static",
        energySpeed: identity?.energySpeed ?? 4,
        agingOut: agingRisk,
        rippleActive,
      };
    });
  }, [
    data.analytics,
    data.cohortHealth,
    data.agingOutRisks,
    data.ripples,
  ]);

  // ── Intelligence Score (global 0-100) ──
  const intelligenceScore = useMemo(() => {
    if (!data.advisorReady) return 0;

    let score = 50;

    // Advisor activity bonus
    score += Math.min(data.advisorVitals.rulesMatched * 3, 15);

    // Average cohort health
    if (data.cohortHealth.length > 0) {
      const avg =
        data.cohortHealth.reduce((s, c) => s + c.healthScore, 0) /
        data.cohortHealth.length;
      score += (avg - 50) * 0.4;
    }

    // Urgent aging-out penalty
    score -=
      data.agingOutRisks.filter((r) => r.urgency === "act").length * 5;

    // Hotspot penalty
    score -= data.cohortHealth.filter((c) => c.hotspot).length * 8;

    return Math.max(0, Math.min(100, Math.round(score)));
  }, [
    data.advisorReady,
    data.advisorVitals,
    data.cohortHealth,
    data.agingOutRisks,
  ]);

  // ── Narrative Tab Ordering (P3 — AI Concierge) ──
  const narrativeOrder = useMemo((): DashboardTabId[] => {
    if (!data.advisorReady || data.totalInsights === 0) {
      return [...DASHBOARD_TABS];
    }

    const weights: Record<DashboardTabId, number> = {
      demographics: 0,
      programs: 0,
      trends: 0,
      intelligence: 0,
    };

    for (const insight of data.insights) {
      const ruleId = insight.id.split("_").slice(2).join("_");
      const sev =
        insight.severity === "critical"
          ? 3
          : insight.severity === "high"
            ? 2
            : 1;

      for (const [tab, keywords] of Object.entries(TAB_RULE_KEYWORDS)) {
        if (keywords.some((k) => ruleId.includes(k))) {
          weights[tab as DashboardTabId] += sev;
        }
      }
    }

    weights.intelligence += 1;

    return [...DASHBOARD_TABS].sort(
      (a, b) => weights[b] - weights[a],
    );
  }, [data.insights, data.advisorReady, data.totalInsights]);

  // ── Tab Configs with promotion flag ──
  const tabConfigs = useMemo((): DashboardTabConfig[] => {
    return narrativeOrder.map((id, idx) => ({
      id,
      label: TAB_LABELS[id],
      icon: TAB_ICONS[id],
      promoted: idx === 0 && data.totalInsights > 0,
    }));
  }, [narrativeOrder, data.totalInsights]);

  // ── System Status ──
  const systemStatus = useMemo((): SystemStatus => {
    const healthy = data.dataSourceHealth.filter(
      (d) => d.status === "healthy",
    ).length;
    const total = data.dataSourceHealth.length;

    return {
      label: `${healthy}/${total} fuentes activas`,
      healthySources: healthy,
      totalSources: total,
      activeInsights: data.totalInsights,
      activeRisks: data.agingOutRisks.filter(
        (r) => r.urgency === "act" || r.urgency === "plan",
      ).length,
      healthy: healthy === total,
    };
  }, [
    data.dataSourceHealth,
    data.totalInsights,
    data.agingOutRisks,
  ]);

  // ── KPIs ──
  const kpis = useMemo((): KPIEntry[] => {
    if (!data.analytics) return [];

    const childBracket = AGE_BRACKETS.find((b) => b.id === "child");
    const youthBracket = AGE_BRACKETS.find((b) => b.id === "youth");
    const seniorBracket = AGE_BRACKETS.find((b) => b.id === "senior");

    return [
      {
        label: "Niños",
        value: data.analytics.kids_enrolled,
        range: "0-12 años",
        bracketId: "child",
        color: childBracket?.color ?? "#fb923c",
        icon: "baby",
      },
      {
        label: "Teens",
        value: data.analytics.teens_enrolled,
        range: "13-17 años",
        bracketId: "youth",
        color: youthBracket?.color ?? "#facc15",
        icon: "zap",
      },
      {
        label: "Seniors",
        value: data.analytics.total_seniors_enrolled,
        range: "60+ años",
        bracketId: "senior",
        color: seniorBracket?.color ?? "#94a3b8",
        icon: "heart-pulse",
      },
      {
        label: "Programas",
        value: data.analytics.program_popularity.length,
        range: `${data.analytics.retention_rate}% retención`,
        bracketId: null,
        color: "#e8c547",
        icon: "calendar-days",
      },
    ];
  }, [data.analytics]);

  return {
    // Full data cascade
    ...data,
    // Dashboard intelligence
    season,
    intelligenceScore,
    prismSegments,
    narrativeOrder,
    tabConfigs,
    systemStatus,
    kpis,
  };
}