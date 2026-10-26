// src/features/communications/lib/analyticsIntelligence.ts
// ═══════════════════════════════════════════════════════════
// Analytics Intelligence — Pure computation functions
// Zero React dependencies. Only types + math.
// ═══════════════════════════════════════════════════════════

import type { CommunicationAnalyticsData } from "../types";

/* ══════════════════════════════════════════════════════════
   Config
   ══════════════════════════════════════════════════════════ */

export const PERIOD_OPTIONS = [
  { value: "current_month", label: "Este mes" },
  { value: "current_quarter", label: "Este trimestre" },
  { value: "last_30_days", label: "Últimos 30 días" },
  { value: "last_90_days", label: "Últimos 90 días" },
  { value: "ytd", label: "Año en curso" },
] as const;

export const TYPE_LABELS: Record<string, string> = {
  announcement: "Comunicados",
  announcement_publish: "Publicados",
  announcement_archive: "Archivados",
  personalized: "Personalizados",
  emergency: "Emergencias",
};

export const CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  push: "Push",
  sms: "SMS",
  whatsapp: "WhatsApp",
  in_app: "In-App",
};

export const PRIORITY_SORT: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export const SEVERITY_LABELS: Record<string, string> = {
  critical: "Crítico",
  high: "Alto",
  medium: "Medio",
  low: "Bajo",
};

export const VELOCITY_LABELS: Record<string, string> = {
  paused: "Pausado",
  low: "Bajo",
  normal: "Normal",
  elevated: "Elevado",
  intense: "Intenso",
};

/* ══════════════════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════════════════ */

export interface Anomaly {
  id: string;
  type: "delivery_drop" | "channel_dead" | "gap_detected" | "concentration" | "trend_decline";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  detail: string;
  metric?: string;
  suggestion: string;
}

export interface Suggestion {
  id: string;
  priority: "high" | "medium" | "low";
  title: string;
  detail: string;
  action: string;
}

export interface VelocityData {
  current: number;
  average: number;
  ratio: number;
  level: "paused" | "low" | "normal" | "elevated" | "intense";
}

export interface TrendData {
  direction: "ascending" | "descending" | "stable";
  slope: number;
  forecast: Array<{ day: number; predicted: number; lower: number; upper: number }>;
}

export interface PeriodDelta {
  delta: number;
  pctChange: number;
  direction: "up" | "down" | "flat";
}

export interface RadarResult {
  scores: number[];
  labels: string[];
}

export interface KPIData {
  key: string;
  label: string;
  value: string;
  sub: string;
  token: string;
}

/* ══════════════════════════════════════════════════════════
   Innovation 1: Anomaly Auto-Detection
   ══════════════════════════════════════════════════════════ */

export function detectAnomalies(a: CommunicationAnalyticsData): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // 1. Low delivery rate
  if (a.delivery_rate_pct < 80 && a.total_sent > 5) {
    anomalies.push({
      id: "delivery-low",
      type: "delivery_drop",
      severity: a.delivery_rate_pct < 60 ? "critical" : "high",
      title: "Tasa de entrega baja",
      detail: `${a.delivery_rate_pct.toFixed(1)}% — por debajo del 80% recomendado`,
      metric: `${a.status_breakdown.failed} fallidos`,
      suggestion: "Revisá la configuración de canales y la validez de los contactos.",
    });
  }

  // 2. Channel concentration
  if (a.channel_breakdown.length > 0) {
    const maxPct = Math.max(...a.channel_breakdown.map((c) => c.percentage));
    const dominant = a.channel_breakdown.find((c) => c.percentage === maxPct);
    if (maxPct > 70 && a.total_sent > 10) {
      anomalies.push({
        id: "concentration",
        type: "concentration",
        severity: maxPct > 85 ? "high" : "medium",
        title: "Alta concentración en un canal",
        detail: `${CHANNEL_LABELS[dominant?.channel ?? ""] ?? dominant?.channel} lleva ${maxPct}% del tráfico`,
        suggestion: "Diversificá los canales para mejorar alcance y resiliencia.",
      });
    }
  }

  // 3. Dead channels
  const allChannels = ["email", "push", "sms", "whatsapp", "in_app"];
  const activeChannels = a.channel_breakdown.filter((c) => c.count > 0).map((c) => c.channel);
  const deadChannels = allChannels.filter((ch) => !activeChannels.includes(ch));
  if (deadChannels.length >= 2 && a.total_sent > 10) {
    anomalies.push({
      id: "dead-channels",
      type: "channel_dead",
      severity: deadChannels.length >= 3 ? "medium" : "low",
      title: `${deadChannels.length} canales sin uso`,
      detail: `${deadChannels.map((ch) => CHANNEL_LABELS[ch] ?? ch).join(", ")} no se han utilizado`,
      suggestion: "Evaluá activar canales adicionales para mejorar el alcance.",
    });
  }

  // 4. Daily gaps
  if (a.daily_volume.length >= 7) {
    const sorted = [...a.daily_volume].sort((x, y) => x.date.localeCompare(y.date));
    let maxGap = 0;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].date);
      const curr = new Date(sorted[i].date);
      const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      if (diff > 1) maxGap = Math.max(maxGap, diff - 1);
    }
    if (maxGap >= 3) {
      anomalies.push({
        id: "gap-detected",
        type: "gap_detected",
        severity: maxGap >= 7 ? "high" : "medium",
        title: "Períodos sin actividad",
        detail: `Gap más largo: ${maxGap} días consecutivos sin comunicaciones`,
        suggestion: "Mantené una frecuencia consistente para no perder engagement.",
      });
    }
  }

  // 5. Trend decline
  if (a.daily_volume.length >= 7) {
    const counts = a.daily_volume.map((d) => d.count);
    const n = counts.length;
    const third = Math.floor(n / 3);
    if (third >= 2) {
      const earlyAvg = counts.slice(0, third).reduce((s, v) => s + v, 0) / third;
      const recentAvg = counts.slice(-third).reduce((s, v) => s + v, 0) / third;
      if (earlyAvg > 0 && recentAvg < earlyAvg * 0.5) {
        anomalies.push({
          id: "trend-decline",
          type: "trend_decline",
          severity: recentAvg < earlyAvg * 0.25 ? "critical" : "high",
          title: "Tendencia descendente",
          detail: `Volumen reciente: ${recentAvg.toFixed(1)}/día vs. inicio: ${earlyAvg.toFixed(1)}/día`,
          suggestion: "Evaluá si la baja es intencional o necesita atención.",
        });
      }
    }
  }

  return anomalies;
}

/* ══════════════════════════════════════════════════════════
   Innovation 5: Diversification (Shannon Entropy)
   ══════════════════════════════════════════════════════════ */

export function computeDiversification(
  channelBreakdown: CommunicationAnalyticsData["channel_breakdown"],
): number {
  const pcts = channelBreakdown.map((c) => c.percentage);
  const total = pcts.reduce((s, p) => s + p, 0);
  if (total === 0 || pcts.length === 0) return 0;

  const entropy = pcts.reduce((s, p) => {
    if (p === 0) return s;
    const pi = p / total;
    return s - pi * Math.log2(pi);
  }, 0);

  const maxEntropy = Math.log2(Math.max(pcts.length, 2));
  return maxEntropy > 0 ? Math.round((entropy / maxEntropy) * 100) : 0;
}

/* ══════════════════════════════════════════════════════════
   Innovation 9: Trend + Forecast
   ══════════════════════════════════════════════════════════ */

export function computeTrend(
  dailyVolume: CommunicationAnalyticsData["daily_volume"],
): TrendData {
  const counts = dailyVolume.map((d) => d.count);
  const n = counts.length;
  if (n < 3) return { direction: "stable", slope: 0, forecast: [] };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += counts[i];
    sumXY += i * counts[i];
    sumX2 += i * i;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { direction: "stable", slope: 0, forecast: [] };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const residuals = counts.map((y, i) => y - (slope * i + intercept));
  const mse = residuals.reduce((s, r) => s + r * r, 0) / Math.max(n - 2, 1);
  const stdErr = Math.sqrt(mse);

  const forecast = Array.from({ length: 7 }, (_, i) => {
    const day = n + i;
    const predicted = Math.max(0, slope * day + intercept);
    return {
      day,
      predicted: Math.round(predicted),
      lower: Math.max(0, Math.round(predicted - stdErr * 1.5)),
      upper: Math.round(predicted + stdErr * 1.5),
    };
  });

  const direction: TrendData["direction"] =
    slope > 0.1 ? "ascending" : slope < -0.1 ? "descending" : "stable";

  return { direction, slope, forecast };
}

/* ══════════════════════════════════════════════════════════
   Innovation 10: Velocity
   ══════════════════════════════════════════════════════════ */

export function computeVelocity(
  dailyVolume: CommunicationAnalyticsData["daily_volume"],
): VelocityData {
  if (dailyVolume.length < 2)
    return { current: 0, average: 0, ratio: 0, level: "normal" };

  const sorted = [...dailyVolume].sort((a, b) => a.date.localeCompare(b.date));
  const counts = sorted.map((d) => d.count);
  const average = counts.reduce((s, v) => s + v, 0) / counts.length;

  const recentDays = Math.min(7, counts.length);
  const recent = counts.slice(-recentDays);
  const current = recent.reduce((s, v) => s + v, 0) / recentDays;

  const ratio = average > 0 ? current / average : 0;
  const level: VelocityData["level"] =
    ratio > 2 ? "intense" : ratio > 1.3 ? "elevated" : ratio < 0.3 ? "paused" : ratio < 0.7 ? "low" : "normal";

  return {
    current: Math.round(current * 10) / 10,
    average: Math.round(average * 10) / 10,
    ratio: Math.round(ratio * 100) / 100,
    level,
  };
}

/* ══════════════════════════════════════════════════════════
   Innovation 4: Period Deltas
   ══════════════════════════════════════════════════════════ */

export function computePeriodDeltas(
  dailyVolume: CommunicationAnalyticsData["daily_volume"],
): PeriodDelta | null {
  if (dailyVolume.length < 6) return null;

  const sorted = [...dailyVolume].sort((a, b) => a.date.localeCompare(b.date));
  const n = sorted.length;
  const third = Math.floor(n / 3);
  if (third < 1) return null;

  const earlyAvg = sorted.slice(0, third).reduce((s, d) => s + d.count, 0) / third;
  const recentAvg = sorted.slice(-third).reduce((s, d) => s + d.count, 0) / third;

  const delta = recentAvg - earlyAvg;
  const pctChange = earlyAvg > 0 ? (delta / earlyAvg) * 100 : 0;

  return {
    delta: Math.round(delta * 10) / 10,
    pctChange: Math.round(pctChange),
    direction: delta > 0.5 ? "up" : delta < -0.5 ? "down" : "flat",
  };
}

/* ══════════════════════════════════════════════════════════
   Innovation 3: Radar Scores
   ══════════════════════════════════════════════════════════ */

export function computeRadarScores(
  a: CommunicationAnalyticsData,
  diversification: number,
): RadarResult {
  const delivery = a.delivery_rate_pct / 100;
  const diversif = diversification / 100;
  const reach = Math.min(a.avg_recipients_per_send / 50, 1);

  let consistency = 0.5;
  if (a.daily_volume.length >= 2) {
    const sorted = [...a.daily_volume].sort((x, y) => x.date.localeCompare(y.date));
    let gapDays = 0;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].date);
      const curr = new Date(sorted[i].date);
      const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      if (diff > 1) gapDays += diff - 1;
    }
    const totalDays = Math.round(
      (new Date(sorted[sorted.length - 1].date).getTime() - new Date(sorted[0].date).getTime()) / 86400000,
    ) + 1;
    consistency = totalDays > 0 ? Math.max(0, 1 - gapDays / totalDays) : 0.5;
  }

  const volume = Math.min(a.total_sent / (a.daily_volume.length * 10 + 1), 1);

  return {
    scores: [delivery, diversif, reach, consistency, volume].map((v) => Math.round(v * 100) / 100),
    labels: ["Entrega", "Diversif.", "Alcance", "Consist.", "Volumen"],
  };
}

/* ══════════════════════════════════════════════════════════
   Innovation 8: Reach Suggestions
   ══════════════════════════════════════════════════════════ */

export function buildReachSuggestions(
  a: CommunicationAnalyticsData,
  diversification: number,
  velocity: VelocityData,
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  if (diversification < 40 && a.total_sent > 5) {
    suggestions.push({
      id: "diversify",
      priority: "high",
      title: "Diversificar canales",
      detail: `Score: ${diversification}/100. Tu comunicación depende de pocos canales.`,
      action: "Activá canales adicionales como SMS o WhatsApp para mejorar alcance.",
    });
  }

  if (velocity.level === "paused" || velocity.level === "low") {
    suggestions.push({
      id: "velocity-low",
      priority: "high",
      title: "Actividad por debajo del promedio",
      detail: `${velocity.current.toFixed(1)}/día vs. promedio ${velocity.average.toFixed(1)}/día.`,
      action: "Considerá enviar un comunicado para mantener el engagement.",
    });
  }

  if (velocity.level === "intense") {
    suggestions.push({
      id: "velocity-high",
      priority: "medium",
      title: "Alta frecuencia de envíos",
      detail: `${velocity.ratio.toFixed(1)}x el promedio. Posible fatiga.`,
      action: "Monitorizá la tasa de apertura para detectar saturación.",
    });
  }

  if (a.best_hour_to_send && a.hourly_distribution.length > 0) {
    const normalizedBest = a.best_hour_to_send.replace(/:00$/, "").padStart(2, "0");
    const bestData = a.hourly_distribution.find(
      (h) => h.hour.replace(/:00$/, "").padStart(2, "0") === normalizedBest,
    );
    const totalHourly = a.hourly_distribution.reduce((s, h) => s + h.count, 0);
    if (bestData && totalHourly > 10) {
      const pct = (bestData.count / totalHourly) * 100;
      if (pct < 15) {
        suggestions.push({
          id: "timing-underused",
          priority: "medium",
          title: "Mejor horario subutilizado",
          detail: `${a.best_hour_to_send} concentra solo ${pct.toFixed(0)}% de envíos.`,
          action: "Concentrá más envíos en este horario para mejorar engagement.",
        });
      }
    }
  }

  if (a.delivery_rate_pct < 90 && a.delivery_rate_pct >= 80 && a.total_sent > 10) {
    suggestions.push({
      id: "delivery-improve",
      priority: "low",
      title: "Mejorar tasa de entrega",
      detail: `${a.delivery_rate_pct.toFixed(1)}% — hay margen de mejora.`,
      action: "Verificá la calidad de las listas de distribución.",
    });
  }

  return suggestions;
}

/* ══════════════════════════════════════════════════════════
   KPI Builder
   ══════════════════════════════════════════════════════════ */

export function buildKPIs(a: CommunicationAnalyticsData): KPIData[] {
  return [
    {
      key: "total",
      label: "Total Enviados",
      value: a.total_sent.toLocaleString(),
      sub: `${a.total_recipients.toLocaleString()} dest.`,
      token: "teal",
    },
    {
      key: "rate",
      label: "Tasa Éxito",
      value: `${a.delivery_rate_pct.toFixed(0)}%`,
      sub: `${(a.status_breakdown.sent + a.status_breakdown.delivered).toLocaleString()} exitosos`,
      token: a.delivery_rate_pct >= 80 ? "emerald" : a.delivery_rate_pct >= 60 ? "amber" : "rose",
    },
    {
      key: "recipients",
      label: "Prom. Destinatarios",
      value: a.avg_recipients_per_send.toFixed(0),
      sub: "por envío",
      token: "silver",
    },
    {
      key: "best-day",
      label: "Mejor Día",
      value: a.best_day_to_send,
      sub: "para envíos",
      token: "gold",
    },
    {
      key: "best-hour",
      label: "Mejor Hora",
      value: a.best_hour_to_send,
      sub: a.best_day_to_send,
      token: "amber",
    },
  ];
}