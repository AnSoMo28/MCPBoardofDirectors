/**
 * Member 360 Advisor — 18 rules × 5 layers.
 * Client-side intelligence: 0ms, 0 tokens, 0 API calls.
 * Consumes: Member360ProfileResponse + MemberHealthScoreResponse
 * Optional cross-domain: activity, social, churn, ltv
 */

import { useMemo } from "react";
import type {
  Member360ProfileResponse,
  MemberHealthScoreResponse,
  Member360AdvisorInsight,
} from "../types";
import { generateInsightId } from "@/shared/types/ai-intelligence";

interface Member360AdvisorContext {
  profile: Member360ProfileResponse | null | undefined;
  healthScore: MemberHealthScoreResponse | null | undefined;
}

export function useMember360Advisor(ctx: Member360AdvisorContext): Member360AdvisorInsight[] {
  return useMemo(() => {
    const { profile, healthScore } = ctx;
    if (!profile || !healthScore) return [];

    const insights: Member360AdvisorInsight[] = [];
    const member = profile.member;
    const tenure = member?.join_date
      ? Math.floor((Date.now() - new Date(member.join_date).getTime()) / 86400000)
      : 0;
    const eng = profile.engagement_score;
    const composite = healthScore.composite_score;
    const factors = healthScore.factors ?? [];
    const engFactor = factors.find((f) => f.name === "engagement");
    const socialFactor = factors.find((f) => f.name === "social");
    const financialFactor = factors.find((f) => f.name === "financial");

    // ── Layer 1: Health & Identity (4 rules) ─────────────────────────────

    // R1: health-critical
    if (composite < 40) {
      insights.push({
        id: generateInsightId("member_360", "health-critical"),
        layer: "health_identity",
        impact: "critical",
        confidence: 92,
        title: "Salud del socio en nivel crítico",
        reasoning: `Score compuesto ${composite.toFixed(0)}/100 — por debajo del umbral crítico (40). Todos los factores requieren atención.`,
        data: { composite, health_level: healthScore.health_level },
      });
    }

    // R2: health-declining
    if (
      healthScore.trend === "declining" &&
      composite < 60 &&
      composite >= 40
    ) {
      insights.push({
        id: generateInsightId("member_360", "health-declining"),
        layer: "health_identity",
        impact: "high",
        confidence: 85,
        title: "Tendencia de salud en descenso",
        reasoning: `Score ${composite.toFixed(0)}/100 con tendencia declinante. ${healthScore.trend_detail ?? ""}`,
        data: { composite, trend: healthScore.trend, previous: healthScore.previous_score },
      });
    }

    // R3: identity-tier-mismatch
    const tierExpectations: Record<string, number> = {
      vip: 85, platino: 75, oro: 65, premium: 60, plata: 50, bronce: 40, basic: 30,
    };
    const expected = tierExpectations[member?.tier ?? "basic"] ?? 40;
    if (eng < expected - 15 && tenure > 90) {
      insights.push({
        id: generateInsightId("member_360", "identity-tier-mismatch"),
        layer: "health_identity",
        impact: "medium",
        confidence: 75,
        title: `Engagement bajo para tier ${(member?.tier ?? "").toUpperCase()}`,
        reasoning: `Engagement ${eng.toFixed(0)}/100 vs expectativa de ${expected} para tier ${member?.tier}. Socio con ${tenure} días de antigüedad.`,
        data: { engagement: eng, expected, tier: member?.tier },
      });
    }

    // R4: identity-role-optimization
    if (member?.role === "dependent" && member?.age && member.age > 18 && (engFactor?.score ?? 0) < 30) {
      insights.push({
        id: generateInsightId("member_360", "identity-role-optimization"),
        layer: "health_identity",
        impact: "low",
        confidence: 60,
        title: "Dependiente adulto sin actividades propias",
        reasoning: `${member.first_name} tiene ${member.age} años y engagement de ${engFactor?.score ?? 0}/100. Considerar membresía independiente o actividades dirigidas.`,
      });
    }

    // ── Layer 2: Lifecycle Intelligence (4 rules) ────────────────────────

    const stage = profile.journey_stage;
    const daysInStage = profile.days_in_stage;

    // R5: lifecycle-stuck
    const avgStageDuration: Record<string, number> = {
      onboarding: 90, growing: 180, peak: 365, plateau: 180, at_risk: 60, dormant: 90, reactivated: 120,
    };
    const avgDays = avgStageDuration[stage] ?? 120;
    if (daysInStage > avgDays * 2) {
      insights.push({
        id: generateInsightId("member_360", "lifecycle-stuck"),
        layer: "lifecycle",
        impact: "high",
        confidence: 80,
        title: `Estancado en etapa "${stage}" por ${daysInStage} días`,
        reasoning: `Promedio para esta etapa: ${avgDays} días. Socio lleva ${daysInStage} — más del doble.`,
        data: { stage, daysInStage, avgDays },
      });
    }

    // R6: lifecycle-transition-ready
    if (composite > 80 && (healthScore.trend === "stable" || healthScore.trend === "improving")) {
      insights.push({
        id: generateInsightId("member_360", "lifecycle-transition-ready"),
        layer: "lifecycle",
        impact: "medium",
        confidence: 70,
        title: "Listo para transición de lifecycle",
        reasoning: `Score ${composite.toFixed(0)}/100 y tendencia ${healthScore.trend}. Socio consolidado — considerar nuevo nivel de engagement.`,
      });
    }

    // R7: lifecycle-onboarding-incomplete
    if (stage === "onboarding" && daysInStage > 30 && composite < 60) {
      insights.push({
        id: generateInsightId("member_360", "lifecycle-onboarding-incomplete"),
        layer: "lifecycle",
        impact: "high",
        confidence: 88,
        title: "Onboarding incompleto — 30+ días",
        reasoning: `${daysInStage} días en onboarding con score ${composite.toFixed(0)}/100. El socio no se está integrando.`,
        data: { daysInStage, composite },
        action: {
          label: "Activar plan de bienvenida",
          tool: "generate_member_engagement_proposals",
          params: { member_id: member?.member_id },
          approval: "auto",
        },
      });
    }

    // R8: lifecycle-reactivation-opportunity
    if (stage === "dormant" && tenure > 180) {
      const daysSinceActivity = profile.last_activity_date
        ? Math.floor((Date.now() - new Date(profile.last_activity_date).getTime()) / 86400000)
        : 999;
      if (daysSinceActivity < 30) {
        insights.push({
          id: generateInsightId("member_360", "lifecycle-reactivation-opportunity"),
          layer: "lifecycle",
          impact: "medium",
          confidence: 72,
          title: "Oportunidad de reactivación detectada",
          reasoning: `Socio dormido pero hubo actividad hace ${daysSinceActivity} días. Posible punto de reconexión.`,
        });
      }
    }

    // ── Layer 3: Financial Intelligence (3 rules) ────────────────────────

    // R9: financial-ltv-ascending
    if (profile.ltv_trend === "improving" && eng > 70) {
      insights.push({
        id: generateInsightId("member_360", "financial-ltv-ascending"),
        layer: "financial",
        impact: "low",
        confidence: 75,
        title: "LTV en ascenso",
        reasoning: `Tendencia LTV improving con engagement ${eng.toFixed(0)}/100. Socio de alto valor creciente.`,
        data: { ltv: profile.ltv_estimate, ltv_trend: profile.ltv_trend },
      });
    }

    // R10: financial-ltv-at-risk
    if (profile.ltv_trend === "declining") {
      insights.push({
        id: generateInsightId("member_360", "financial-ltv-at-risk"),
        layer: "financial",
        impact: "high",
        confidence: 82,
        title: "LTV en riesgo — gasto en descenso",
        reasoning: `LTV con tendencia declinante. Valor actual: ${profile.ltv_estimate.toLocaleString()}. Verificar causa raíz.`,
        data: { ltv: profile.ltv_estimate, ltv_trend: profile.ltv_trend },
      });
    }

    // R11: financial-payment-stress
    if (financialFactor && financialFactor.score < 50) {
      insights.push({
        id: generateInsightId("member_360", "financial-payment-stress"),
        layer: "financial",
        impact: "high",
        confidence: 78,
        title: "Estrés financiero detectado",
        reasoning: `Factor financiero en ${financialFactor.score}/100. ${financialFactor.details ?? "Posible retraso en pagos o bajo gasto."}`,
        data: { financial_score: financialFactor.score },
      });
    }

    // ── Layer 4: Engagement & Social (4 rules) ───────────────────────────

    const activeDomains = profile.active_domains?.length ?? 0;

    // R12: engagement-single-domain
    if (activeDomains === 1 && tenure > 90) {
      insights.push({
        id: generateInsightId("member_360", "engagement-single-domain"),
        layer: "engagement_social",
        impact: "medium",
        confidence: 75,
        title: "Actividad concentrada en un solo dominio",
        reasoning: `Solo ${profile.active_domains?.[0] ?? "desconocido"} activo con ${tenure} días de antigüedad. Riesgo de churn si pierde interés en ese dominio.`,
        data: { active_domains: profile.active_domains },
        action: {
          label: "Descubrir nuevos dominios",
          tool: "generate_member_engagement_proposals",
          params: { member_id: member?.member_id },
          approval: "auto",
        },
      });
    }

    // R13: engagement-cross-domain-star
    if (activeDomains >= 4) {
      insights.push({
        id: generateInsightId("member_360", "engagement-cross-domain-star"),
        layer: "engagement_social",
        impact: "low",
        confidence: 85,
        title: "Estrella cross-domain — activo en múltiples áreas",
        reasoning: `Participa en ${activeDomains} dominios diferentes. Socio altamente integrado — candidato a embajador.`,
        data: { active_domains: profile.active_domains, count: activeDomains },
      });
    }

    // R14: social-isolated
    if ((socialFactor?.score ?? 50) < 30 && tenure > 90) {
      insights.push({
        id: generateInsightId("member_360", "social-isolated"),
        layer: "engagement_social",
        impact: "high",
        confidence: 80,
        title: "Socialmente aislado",
        reasoning: `Social score ${socialFactor?.score ?? 0}/100 con ${profile.connections_count} conexiones y ${tenure} días de membresía.`,
        data: { social_score: socialFactor?.score, connections: profile.connections_count },
      });
    }

    // R15: social-ambassador
    if ((socialFactor?.score ?? 0) > 80 && profile.connections_count > 8) {
      insights.push({
        id: generateInsightId("member_360", "social-ambassador"),
        layer: "engagement_social",
        impact: "low",
        confidence: 88,
        title: "Candidato a Embajador del Club",
        reasoning: `Social score ${socialFactor?.score}/100 con ${profile.connections_count} conexiones. Socio con alta influencia social.`,
        data: { social_score: socialFactor?.score, connections: profile.connections_count },
      });
    }

    // ── Layer 5: Churn & Risk (3 rules) ──────────────────────────────────

    // R16: churn-imminent
    if (profile.churn_risk === "critical") {
      insights.push({
        id: generateInsightId("member_360", "churn-imminent"),
        layer: "churn_risk",
        impact: "critical",
        confidence: 90,
        title: "RIESGO CRÍTICO DE ABANDONO",
        reasoning: `Churn score ${profile.churn_score.toFixed(0)}/100 (crítico). Factores: ${(profile.top_risks ?? []).join(", ") || "múltiples señales de riesgo"}.`,
        data: { churn_score: profile.churn_score, risks: profile.top_risks },
        action: {
          label: "Plan de retención urgente",
          tool: "generate_member_engagement_proposals",
          params: { member_id: member?.member_id },
          approval: "auto",
        },
      });
    }

    // R17: churn-recoverable
    if (profile.churn_risk === "high" && composite > 40) {
      insights.push({
        id: generateInsightId("member_360", "churn-recoverable"),
        layer: "churn_risk",
        impact: "high",
        confidence: 78,
        title: "Riesgo alto pero recuperable",
        reasoning: `Churn risk alto pero health score ${composite.toFixed(0)}/100 indica que hay factores protectores. Intervención temprana puede revertir la tendencia.`,
        data: { churn_risk: profile.churn_risk, composite },
        action: {
          label: "Generar propuestas de engagement",
          tool: "generate_member_engagement_proposals",
          params: { member_id: member?.member_id },
          approval: "auto",
        },
      });
    }

    // R18: risk-cross-domain
    const lowFactors = factors.filter((f) => f.score < 45);
    if (lowFactors.length >= 3) {
      insights.push({
        id: generateInsightId("member_360", "risk-cross-domain"),
        layer: "churn_risk",
        impact: "high",
        confidence: 85,
        title: "Riesgo cross-domain — múltiples factores bajos",
        reasoning: `${lowFactors.length} factores por debajo de 45: ${lowFactors.map((f) => `${f.name}(${f.score})`).join(", ")}. Riesgo sistémico.`,
        data: { low_factors: lowFactors.map((f) => ({ name: f.name, score: f.score })) },
      });
    }

    // Sort by impact priority
    const impactOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    insights.sort(
      (a, b) =>
        (impactOrder[a.impact] ?? 4) - (impactOrder[b.impact] ?? 4) ||
        b.confidence - a.confidence
    );

    return insights;
  }, [ctx.profile, ctx.healthScore]);
}
