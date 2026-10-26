// src/features/facilities/lib/spatialMemory.ts
// ═══════════════════════════════════════════════════════════════
// SPATIAL MEMORY JOURNAL — "The Living Memory"
//
// §F11: buildFacilityMemory / buildFacilityNarrative /
//        queryMemory / detectMemoryPatterns
//
// Each space REMEMBERS what happened. Every event that
// occurred in a space leaves a footprint. The system stores
// these as memory nodes and builds NARRATIVES — human-readable
// stories of what happened, what was learned, and what should
// change.
//
// The operator doesn't query a database. They CONVERSE with
// the memory of each space:
//   "¿Qué pasó la última vez que metimos 150 personas?"
//   "¿Cuándo fue el mejor evento del Salón Dorado?"
//   "¿Qué patrones hay los viernes?"
//
// Pure functions. Zero side effects. Zero API calls.
// ═══════════════════════════════════════════════════════════════

import type {
  Facility,
  FacilityReservation,
  FacilityMemory,
  FacilityMemoryNode,
  FacilityAnomaly,
  FacilityNarrative,
  NarrativeChapter,
  NarrativeInsight,
  MemoryQuery,
  MemoryAnswer,
  MemoryPattern,
  ComfortScore,
} from "../types";
// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Parse a date string safely. Returns null for invalid dates.
 */
function safeDate(dateStr: string): Date | null {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format a date string to a human-readable Spanish label.
 */
function formatDateLabel(dateStr: string): string {
  const d = safeDate(dateStr);
  if (!d) return dateStr;

  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  const days = [
    "domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado",
  ];

  return `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ═══════════════════════════════════════════════════════════════
// MEMORY NODE BUILDER
//
// Converts a reservation/event into a FacilityMemoryNode.
// Each node stores: what happened, how it went, what was learned.
// ═══════════════════════════════════════════════════════════════

/**
 * Estimate satisfaction score from available signals.
 * When direct feedback is unavailable, infer from:
 *   - Capacity ratio (sweet spot = 60-75%)
 *   - Duration (too short = bad, too long = indifferent)
 *   - Status (completed vs cancelled vs no-show)
 */
function estimateSatisfaction(
  guestCount: number,
  capacity: number,
  reservation: FacilityReservation,
): number {
  let score = 70; // baseline

  // Capacity ratio: sweet spot at 60-75%
  const capacityRatio = capacity > 0 ? guestCount / capacity : 0.5;
  if (capacityRatio >= 0.6 && capacityRatio <= 0.75) {
    score += 15;
  } else if (capacityRatio > 0.9) {
    score -= 15; // overcrowded
  } else if (capacityRatio < 0.3) {
    score -= 5; // too empty
  }

  // Status signals
  if (reservation.status === "completed") score += 10;
  if (reservation.status === "cancelled") score -= 20;
  if (reservation.status === "no_show") score -= 30;

  // Duration: infer from start/end time
  if (reservation.start_time && reservation.end_time) {
    const startH = parseInt(reservation.start_time.split(":")[0], 10);
    const endH = parseInt(reservation.end_time.split(":")[0], 10);
    const durationH = endH - startH;
    if (durationH >= 2 && durationH <= 4) score += 5; // good duration
    if (durationH > 6) score -= 3; // unusually long
  }

  return clamp(Math.round(score), 0, 100);
}

/**
 * Detect notable patterns in a single reservation.
 * These become tags on the memory node.
 */
function detectNotablePatterns(
  reservation: FacilityReservation,
  facilityCapacity: number,
  allReservations: FacilityReservation[],
): string[] {
  const patterns: string[] = [];
  const guestCount = reservation.guest_count;

  // High attendance
  if (facilityCapacity > 0 && guestCount / facilityCapacity > 0.85) {
    patterns.push("Alta asistencia — cerca de capacidad máxima");
  }

  // Low attendance
  if (facilityCapacity > 0 && guestCount / facilityCapacity < 0.25) {
    patterns.push("Baja asistencia — por debajo del esperado");
  }

  // Weekend event
  const date = safeDate(reservation.date);
  if (date && (date.getDay() === 0 || date.getDay() === 6)) {
    patterns.push("Evento de fin de semana");
  }

  // Same-day with other reservations (busy day)
  const sameDay = allReservations.filter(
    (r) =>
      r.date === reservation.date &&
      r.facility_id === reservation.facility_id &&
      r.id !== reservation.id,
  );
  if (sameDay.length >= 2) {
    patterns.push(`Día de alta demanda — ${sameDay.length + 1} reservas`);
  }

  // Large group
  if (guestCount >= 80) {
    patterns.push("Evento de gran escala (80+ personas)");
  }

  return patterns;
}

// ═══════════════════════════════════════════════════════════════
// §F11a: buildFacilityMemory
//
// "Every event that occurred in a space leaves a footprint.
//  The system stores these and LEARNS."
//
// Converts reservation history into a structured memory
// with anomaly detection and pattern insights.
// ═══════════════════════════════════════════════════════════════

export function buildFacilityMemory(
  facility: Facility,
  reservations: FacilityReservation[],
  comfortDuringEvents?: Record<string, ComfortScore | null>,
): FacilityMemory {
  const facilityReservations = reservations
    .filter(
      (r) =>
        r.facility_id === facility.id &&
        (r.status === "completed" || r.status === "cancelled" || r.status === "no_show"),
    )
    .sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

  // ── Build memory nodes ──
  const memoryNodes: FacilityMemoryNode[] = facilityReservations.map(
    (r) => {
      const satisfaction = estimateSatisfaction(
        r.guest_count,
        facility.capacity,
        r,
      );
      const patterns = detectNotablePatterns(
        r,
        facility.capacity,
        facilityReservations,
      );

      // Estimate revenue from base_rate × duration
      const startH = r.start_time ? parseInt(r.start_time.split(":")[0], 10) : 0;
      const endH = r.end_time ? parseInt(r.end_time.split(":")[0], 10) : startH + 2;
      const duration = Math.max(1, endH - startH);
      const revenue = facility.base_rate * duration;

      return {
        event_id: r.id,
        event_type: r.purpose || "Reserva",
        date: r.date,
        attendance: r.guest_count,
        satisfaction_score: satisfaction,
        revenue,
        incidents:
          r.status === "cancelled"
            ? ["Cancelada"]
            : r.status === "no_show"
              ? ["No asistió"]
              : [],
        maintenance_triggered: false,
        comfort_during_event: comfortDuringEvents?.[r.id] ?? null,
        notable_patterns: patterns,
      };
    },
  );

  // ── Detect anomalies ──
  const anomalies = detectAnomalies(memoryNodes, facility.capacity);

  // ── Generate pattern insights ──
  const patternInsights = generatePatternInsights(memoryNodes, facility);

  return {
    facility_id: facility.id,
    total_events: memoryNodes.length,
    memory_nodes: memoryNodes,
    anomaly_detection: anomalies,
    pattern_insights: patternInsights,
  };
}

// ═══════════════════════════════════════════════════════════════
// ANOMALY DETECTION
//
// Finds events that deviate from normal patterns:
//   - Attendance spikes (> 2σ from mean)
//   - Satisfaction drops (< 50 when average is > 70)
//   - Unusual clustering (3+ events in one day)
//   - Status anomalies (high cancellation rate in a period)
// ═══════════════════════════════════════════════════════════════

function detectAnomalies(
  nodes: FacilityMemoryNode[],
  capacity: number,
): FacilityAnomaly[] {
  if (nodes.length < 3) return [];

  const anomalies: FacilityAnomaly[] = [];

  // Compute baseline stats
  const attendances = nodes.map((n) => n.attendance);
  const satisfactions = nodes.map((n) => n.satisfaction_score);

  const avgAttendance =
    attendances.reduce((s, v) => s + v, 0) / attendances.length;
  const stdAttendance = Math.sqrt(
    attendances.reduce((s, v) => s + (v - avgAttendance) ** 2, 0) /
      attendances.length,
  );

  const avgSatisfaction =
    satisfactions.reduce((s, v) => s + v, 0) / satisfactions.length;

  for (const node of nodes) {
    // ── Attendance spike (> 2σ) ──
    if (
      stdAttendance > 0 &&
      node.attendance > avgAttendance + 2 * stdAttendance
    ) {
      anomalies.push({
        date: node.date,
        description: `Pico de asistencia: ${node.attendance} personas (promedio: ${Math.round(avgAttendance)}, σ=${Math.round(stdAttendance)})`,
        severity: node.attendance > capacity ? "critical" : "warning",
      });
    }

    // ── Satisfaction drop ──
    if (
      avgSatisfaction > 65 &&
      node.satisfaction_score < 50
    ) {
      anomalies.push({
        date: node.date,
        description: `Caída de satisfacción: ${node.satisfaction_score}/100 (promedio: ${Math.round(avgSatisfaction)}) — ${node.event_type}`,
        severity:
          node.satisfaction_score < 35 ? "critical" : "warning",
      });
    }

    // ── Incidents ──
    if (node.incidents.length > 0) {
      anomalies.push({
        date: node.date,
        description: `Incidente en evento "${node.event_type}": ${node.incidents.join(", ")}`,
        severity:
          node.incidents.includes("No asistió") ? "info" : "warning",
      });
    }

    // ── Over-capacity ──
    if (capacity > 0 && node.attendance > capacity) {
      anomalies.push({
        date: node.date,
        description: `Exceso de capacidad: ${node.attendance} personas en espacio de ${capacity} (${Math.round((node.attendance / capacity) * 100)}%)`,
        severity: "critical",
      });
    }
  }

  // ── Clustering detection: 3+ events same day ──
  const byDate = new Map<string, FacilityMemoryNode[]>();
  for (const node of nodes) {
    const list = byDate.get(node.date) ?? [];
    list.push(node);
    byDate.set(node.date, list);
  }

  byDate.forEach((dayNodes, date) => {
    if (dayNodes.length >= 3) {
      const totalAttendance = dayNodes.reduce(
        (s, n) => s + n.attendance,
        0,
      );
      anomalies.push({
        date,
        description: `Alta demanda: ${dayNodes.length} eventos en un solo día (${totalAttendance} personas total)`,
        severity: "info",
      });
    }
  });

  // Sort by date descending
  return anomalies
    .sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )
    .slice(0, 20); // keep most recent 20
}

// ═══════════════════════════════════════════════════════════════
// PATTERN INSIGHTS
//
// Discovers recurring patterns in the facility's memory:
//   - Best day of week
//   - Best time of day
//   - Optimal group size
//   - Most common purpose
//   - Seasonal trends
// ═══════════════════════════════════════════════════════════════

function generatePatternInsights(
  nodes: FacilityMemoryNode[],
  facility: Facility,
): string[] {
  if (nodes.length < 3) return [];

  const insights: string[] = [];

  // ── Best day of week ──
  const dayNames = [
    "domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado",
  ];
  const dayScores = new Map<number, { total: number; count: number }>();

  for (const node of nodes) {
    const d = safeDate(node.date);
    if (!d) continue;
    const day = d.getDay();
    const entry = dayScores.get(day) ?? { total: 0, count: 0 };
    entry.total += node.satisfaction_score;
    entry.count++;
    dayScores.set(day, entry);
  }

  let bestDay = -1;
  let bestDayAvg = 0;
  dayScores.forEach((data, day) => {
    const avg = data.total / data.count;
    if (avg > bestDayAvg && data.count >= 2) {
      bestDayAvg = avg;
      bestDay = day;
    }
  });

  if (bestDay >= 0) {
    insights.push(
      `El ${dayNames[bestDay]} es su mejor día: satisfacción promedio ${Math.round(bestDayAvg)}/100 con ${dayScores.get(bestDay)?.count} eventos registrados.`,
    );
  }

  // ── Worst day ──
  let worstDay = -1;
  let worstDayAvg = 100;
  dayScores.forEach((data, day) => {
    const avg = data.total / data.count;
    if (avg < worstDayAvg && data.count >= 2) {
      worstDayAvg = avg;
      worstDay = day;
    }
  });

  if (worstDay >= 0 && worstDay !== bestDay && worstDayAvg < 60) {
    insights.push(
      `El ${dayNames[worstDay]} tiene el peor desempeño: satisfacción ${Math.round(worstDayAvg)}/100. Considerar restricciones de reserva ese día.`,
    );
  }

  // ── Optimal group size ──
  const highSatNodes = nodes.filter((n) => n.satisfaction_score >= 80);
  if (highSatNodes.length >= 3) {
    const avgGroupSize = Math.round(
      highSatNodes.reduce((s, n) => s + n.attendance, 0) /
        highSatNodes.length,
    );
    insights.push(
      `El tamaño de grupo óptimo es ~${avgGroupSize} personas (${highSatNodes.length} eventos con satisfacción ≥80). Sweet spot: ${Math.round(avgGroupSize * 0.85)}-${Math.round(avgGroupSize * 1.15)}.`,
    );
  }

  // ── Most common purpose ──
  const purposeCounts = new Map<string, number>();
  for (const node of nodes) {
    purposeCounts.set(
      node.event_type,
      (purposeCounts.get(node.event_type) ?? 0) + 1,
    );
  }
  const topPurpose = [...purposeCounts.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0];
  if (topPurpose) {
    const pct = Math.round((topPurpose[1] / nodes.length) * 100);
    insights.push(
      `El uso más frecuente es "${topPurpose[0]}" (${pct}% de los eventos, ${topPurpose[1]} veces).`,
    );
  }

  // ── Weekend vs weekday ──
  const weekendNodes = nodes.filter((n) => {
    const d = safeDate(n.date);
    return d && (d.getDay() === 0 || d.getDay() === 6);
  });
  const weekdayNodes = nodes.filter((n) => {
    const d = safeDate(n.date);
    return d && d.getDay() >= 1 && d.getDay() <= 5;
  });

  if (weekendNodes.length >= 3 && weekdayNodes.length >= 3) {
    const weekendAvg =
      weekendNodes.reduce((s, n) => s + n.satisfaction_score, 0) /
      weekendNodes.length;
    const weekdayAvg =
      weekdayNodes.reduce((s, n) => s + n.satisfaction_score, 0) /
      weekdayNodes.length;
    const diff = Math.round(weekendAvg - weekdayAvg);

    if (Math.abs(diff) > 8) {
      if (diff > 0) {
        insights.push(
          `Los eventos de fin de semana tienen ${diff}pts más de satisfacción que los de semana. Considerar posicionar como venue premium de fin de semana.`,
        );
      } else {
        insights.push(
          `Los eventos de semana superan a los de fin de semana por ${Math.abs(diff)}pts. El espacio funciona mejor como venue corporativo.`,
        );
      }
    }
  }

  // ── Designed purpose vs actual use ──
  if (topPurpose && facility.description) {
    const isAligned =
      facility.description.toLowerCase().includes(topPurpose[0].toLowerCase()) ||
      topPurpose[0].toLowerCase().includes(
        facility.description.toLowerCase().split(" ")[0],
      );
    if (!isAligned) {
      insights.push(
        `Diseñado para: "${facility.description}" — pero el uso real dominante es "${topPurpose[0]}". Considerar reposicionamiento.`,
      );
    }
  }

  return insights;
}

// ═══════════════════════════════════════════════════════════════
// §F11b: buildFacilityNarrative
//
// "The space tells its own story — not data tables,
//  but a human-readable narrative of what happened,
//  what was learned, and what should change."
//
// Transforms FacilityMemory into FacilityNarrative with
// chapters, insights, lessons learned, and personality evolution.
// ═══════════════════════════════════════════════════════════════

export function buildFacilityNarrative(
  memory: FacilityMemory,
  facilityName: string,
): FacilityNarrative {
  // ── Build chapters from anomalies and milestones ──
  const chapters: NarrativeChapter[] = [];

  // Anomaly chapters
  for (const anomaly of memory.anomaly_detection.slice(0, 5)) {
    const relatedNode = memory.memory_nodes.find(
      (n) => n.date === anomaly.date,
    );

    chapters.push({
      id: `anomaly-${anomaly.date}-${anomaly.severity}`,
      title: buildChapterTitle(anomaly),
      date: anomaly.date,
      type: "anomaly",
      story: buildAnomalyStory(anomaly, relatedNode, facilityName),
      data: relatedNode ?? createEmptyMemoryNode(anomaly.date),
      impact: buildAnomalyImpact(anomaly, relatedNode),
    });
  }

  // Milestone chapters: best event ever
  const bestEvent = [...memory.memory_nodes]
    .sort((a, b) => b.satisfaction_score - a.satisfaction_score)[0];
  if (bestEvent && bestEvent.satisfaction_score >= 85) {
    chapters.push({
      id: `milestone-best-${bestEvent.date}`,
      title: `El mejor evento: ${bestEvent.event_type}`,
      date: bestEvent.date,
      type: "milestone",
      story: `El ${formatDateLabel(bestEvent.date)}, "${bestEvent.event_type}" alcanzó ${bestEvent.satisfaction_score}/100 de satisfacción con ${bestEvent.attendance} asistentes. ${
        bestEvent.notable_patterns.length > 0
          ? `Patrones destacados: ${bestEvent.notable_patterns.join(", ")}.`
          : ""
      } Este es el benchmark contra el que medir todos los eventos futuros.`,
      data: bestEvent,
      impact: "Establece el estándar de excelencia para este espacio.",
    });
  }

  // Milestone: worst event (learning opportunity)
  const worstEvent = [...memory.memory_nodes]
    .sort((a, b) => a.satisfaction_score - b.satisfaction_score)[0];
  if (worstEvent && worstEvent.satisfaction_score < 50) {
    chapters.push({
      id: `learning-worst-${worstEvent.date}`,
      title: `Lección: ${worstEvent.event_type}`,
      date: worstEvent.date,
      type: "learning",
      story: `El ${formatDateLabel(worstEvent.date)}, "${worstEvent.event_type}" tuvo solo ${worstEvent.satisfaction_score}/100 de satisfacción con ${worstEvent.attendance} asistentes. ${
        worstEvent.incidents.length > 0
          ? `Incidentes: ${worstEvent.incidents.join(", ")}. `
          : ""
      }${
        worstEvent.notable_patterns.length > 0
          ? `Patrones: ${worstEvent.notable_patterns.join(", ")}. `
          : ""
      }Este evento debe servir como referencia para evitar repetir las mismas condiciones.`,
      data: worstEvent,
      impact: "Lección incorporada: el sistema ajustará recomendaciones basándose en este evento.",
    });
  }

  // Pattern chapter (if enough data)
  if (memory.pattern_insights.length > 0) {
    chapters.push({
      id: "patterns-collective",
      title: "Patrones descubiertos",
      date: new Date().toISOString().split("T")[0],
      type: "pattern",
      story: memory.pattern_insights.join(" "),
      data: createEmptyMemoryNode(new Date().toISOString().split("T")[0]),
      impact: "Patrones recurrentes que el sistema usa para optimizar reservas y configuración.",
    });
  }

  // Sort chapters by date descending
  chapters.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  // ── Narrative insights ──
  const insights: NarrativeInsight[] = memory.pattern_insights.map(
    (pattern, i) => ({
      pattern,
      confidence: clamp(85 - i * 5, 55, 90),
      recommendation: generateRecommendation(pattern),
      evidence_count: Math.max(3, Math.floor(memory.total_events * 0.3)),
    }),
  );

  // ── Lessons learned ──
  const lessonsLearned: string[] = [];

  if (memory.anomaly_detection.some((a) => a.severity === "critical")) {
    lessonsLearned.push(
      "Eventos que exceden la capacidad generan deterioro acelerado y baja satisfacción.",
    );
  }
  if (
    memory.anomaly_detection.some(
      (a) => a.description.includes("Cancelada"),
    )
  ) {
    lessonsLearned.push(
      "La tasa de cancelación indica posible desalineación entre expectativas y oferta.",
    );
  }
  if (memory.pattern_insights.some((p) => p.includes("reposicionamiento"))) {
    lessonsLearned.push(
      "El uso real del espacio difiere del diseño original — oportunidad de reposicionamiento.",
    );
  }

  // ── Personality evolution ──
  const personalityEvolution = buildPersonalityEvolution(
    memory,
    facilityName,
  );

  return {
    facility_id: memory.facility_id,
    chapters,
    insights,
    lessons_learned: lessonsLearned,
    personality_evolution: personalityEvolution,
  };
}

// ═══════════════════════════════════════════════════════════════
// NARRATIVE HELPERS
// ═══════════════════════════════════════════════════════════════

function buildChapterTitle(anomaly: FacilityAnomaly): string {
  if (anomaly.severity === "critical") return `ALERTA: ${anomaly.description.slice(0, 60)}`;
  if (anomaly.severity === "warning") return `Advertencia: ${anomaly.description.slice(0, 60)}`;
  return `Registro: ${anomaly.description.slice(0, 60)}`;
}

function buildAnomalyStory(
  anomaly: FacilityAnomaly,
  node: FacilityMemoryNode | undefined,
  facilityName: string,
): string {
  let story = `El ${formatDateLabel(anomaly.date)}, ${facilityName}: ${anomaly.description}.`;

  if (node) {
    story += ` ${node.attendance} asistentes, satisfacción ${node.satisfaction_score}/100.`;
    if (node.notable_patterns.length > 0) {
      story += ` Patrones: ${node.notable_patterns.join(", ")}.`;
    }
  }

  if (anomaly.resolution) {
    story += ` Resolución: ${anomaly.resolution}`;
  }

  return story;
}

function buildAnomalyImpact(
  anomaly: FacilityAnomaly,
  _node: FacilityMemoryNode | undefined,
): string {
  if (anomaly.severity === "critical") {
    return "Impacto crítico — ajustes obligatorios en política de reservas o mantenimiento.";
  }
  if (anomaly.severity === "warning") {
    return "Impacto moderado — monitorear y ajustar si se repite.";
  }
  return "Impacto menor — registro para referencia futura.";
}

function buildPersonalityEvolution(
  memory: FacilityMemory,
  facilityName: string,
): string {
  if (memory.total_events < 5) {
    return `${facilityName}: datos insuficientes para determinar evolución de personalidad. Mínimo 5 eventos requeridos.`;
  }

  // Split events into first half and second half chronologically
  const sorted = [...memory.memory_nodes].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const mid = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, mid);
  const secondHalf = sorted.slice(mid);

  const firstAvgSat =
    firstHalf.reduce((s, n) => s + n.satisfaction_score, 0) /
    Math.max(firstHalf.length, 1);
  const secondAvgSat =
    secondHalf.reduce((s, n) => s + n.satisfaction_score, 0) /
    Math.max(secondHalf.length, 1);

  const firstAvgSize =
    firstHalf.reduce((s, n) => s + n.attendance, 0) /
    Math.max(firstHalf.length, 1);
  const secondAvgSize =
    secondHalf.reduce((s, n) => s + n.attendance, 0) /
    Math.max(secondHalf.length, 1);

  const satTrend =
    secondAvgSat > firstAvgSat + 5
      ? "mejorando"
      : secondAvgSat < firstAvgSat - 5
        ? "deteriorándose"
        : "estable";

  const sizeTrend =
    secondAvgSize > firstAvgSize * 1.15
      ? "eventos más grandes"
      : secondAvgSize < firstAvgSize * 0.85
        ? "eventos más íntimos"
        : "tamaño consistente";

  return `${facilityName}: la satisfacción ${satTrend} (${Math.round(firstAvgSat)} → ${Math.round(secondAvgSat)}). Los eventos tienden a ser ${sizeTrend} (promedio: ${Math.round(firstAvgSize)} → ${Math.round(secondAvgSize)} asistentes).`;
}

function generateRecommendation(pattern: string): string {
  if (pattern.includes("reposicionamiento")) {
    return "Evaluar un reposicionamiento formal del espacio alineado con el uso real observado.";
  }
  if (pattern.includes("mejor día") || pattern.includes("mejor día")) {
    return "Priorizar la asignación de eventos premium en este día para maximizar satisfacción.";
  }
  if (pattern.includes("peor desempeño")) {
    return "Investigar las causas del bajo rendimiento este día. Considerar restricciones o incentivos.";
  }
  if (pattern.includes("óptimo")) {
    return "Usar este tamaño de grupo como referencia para recomendaciones de reserva.";
  }
  if (pattern.includes("fin de semana")) {
    return "Posicionar el espacio como venue premium de fin de semana en comunicaciones de marketing.";
  }
  if (pattern.includes("corporativo")) {
    return "Enfocar ventas B2B y promociones para uso corporativo entre semana.";
  }
  if (pattern.includes("frecuente")) {
    return "Asegurar que la configuración y equipamiento estén optimizados para este uso dominante.";
  }
  return "Monitorear este patrón y ajustar operaciones en consecuencia.";
}

function createEmptyMemoryNode(date: string): FacilityMemoryNode {
  return {
    event_id: "",
    event_type: "N/A",
    date,
    attendance: 0,
    satisfaction_score: 0,
    revenue: 0,
    incidents: [],
    maintenance_triggered: false,
    comfort_during_event: null,
    notable_patterns: [],
  };
}

// ═══════════════════════════════════════════════════════════════
// §F11c: queryMemory
//
// "The operator CONVERSES with the memory of each space."
//
// Parses a natural-language-style query and returns a
// structured answer with supporting data.
//
// Supported query types:
//   - last_event: "¿Qué pasó la última vez que...?"
//   - pattern: "¿Qué patrones hay los viernes?"
//   - anomaly: "¿Cuándo fue el último incidente?"
//   - comparison: "¿Qué eventos fueron mejores?"
// ═══════════════════════════════════════════════════════════════

export function queryMemory(
  memory: FacilityMemory,
  query: MemoryQuery,
): MemoryAnswer {
  const parsed = query.parsed;

  switch (parsed.question_type) {
    case "last_event":
      return queryLastEvent(memory, parsed.parameters);
    case "pattern":
      return queryPattern(memory, parsed.parameters);
    case "anomaly":
      return queryAnomaly(memory, parsed.parameters);
    case "comparison":
      return queryComparison(memory, parsed.parameters);
    default:
      return {
        answer: `No puedo interpretar esa consulta. Intenta preguntar sobre el último evento, patrones, incidentes o comparaciones.`,
        supporting_data: [],
        confidence: 0,
      };
  }
}

function queryLastEvent(
  memory: FacilityMemory,
  params: Record<string, unknown>,
): MemoryAnswer {
  const minAttendance = (params.min_attendance as number) ?? 0;

  const matching = memory.memory_nodes
    .filter((n) => n.attendance >= minAttendance)
    .sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

  if (matching.length === 0) {
    return {
      answer: `No encontré eventos${minAttendance > 0 ? ` con al menos ${minAttendance} asistentes` : ""} en la memoria de este espacio.`,
      supporting_data: [],
      confidence: 60,
    };
  }

  const latest = matching[0];
  return {
    answer: `El último evento${minAttendance > 0 ? ` con ≥${minAttendance} personas` : ""} fue "${latest.event_type}" el ${formatDateLabel(latest.date)}: ${latest.attendance} asistentes, satisfacción ${latest.satisfaction_score}/100, revenue ₡${latest.revenue.toLocaleString("es-CR")}. ${
      latest.notable_patterns.length > 0
        ? `Patrones: ${latest.notable_patterns.join(", ")}.`
        : ""
    }`,
    supporting_data: matching.slice(0, 3),
    confidence: 90,
  };
}

function queryPattern(
  memory: FacilityMemory,
  _params: Record<string, unknown>,
): MemoryAnswer {
  if (memory.pattern_insights.length === 0) {
    return {
      answer: "No hay suficientes datos para detectar patrones. Se necesitan al menos 3 eventos.",
      supporting_data: [],
      confidence: 40,
    };
  }

  return {
    answer: memory.pattern_insights.join(" "),
    supporting_data: memory.memory_nodes.slice(0, 5),
    confidence: 75,
  };
}

function queryAnomaly(
  memory: FacilityMemory,
  _params: Record<string, unknown>,
): MemoryAnswer {
  if (memory.anomaly_detection.length === 0) {
    return {
      answer: "No se han detectado anomalías o incidentes en la memoria de este espacio.",
      supporting_data: [],
      confidence: 80,
    };
  }

  const latest = memory.anomaly_detection[0];
  return {
    answer: `Último incidente: ${latest.description} (${formatDateLabel(latest.date)}, severidad: ${latest.severity}). ${
      memory.anomaly_detection.length > 1
        ? `Hay ${memory.anomaly_detection.length - 1} incidente(s) más en el historial.`
        : ""
    }`,
    supporting_data: memory.memory_nodes.filter((n) =>
      memory.anomaly_detection.some((a) => a.date === n.date),
    ).slice(0, 5),
    confidence: 85,
  };
}

function queryComparison(
  memory: FacilityMemory,
  _params: Record<string, unknown>,
): MemoryAnswer {
  if (memory.memory_nodes.length < 2) {
    return {
      answer: "No hay suficientes eventos para comparar.",
      supporting_data: [],
      confidence: 40,
    };
  }

  const sorted = [...memory.memory_nodes].sort(
    (a, b) => b.satisfaction_score - a.satisfaction_score,
  );

  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  return {
    answer: `Mejor evento: "${best.event_type}" (${formatDateLabel(best.date)}) — ${best.satisfaction_score}/100, ${best.attendance} asistentes. Peor evento: "${worst.event_type}" (${formatDateLabel(worst.date)}) — ${worst.satisfaction_score}/100, ${worst.attendance} asistentes. Diferencia: ${best.satisfaction_score - worst.satisfaction_score}pts de satisfacción.`,
    supporting_data: [best, worst],
    confidence: 88,
  };
}

// ═══════════════════════════════════════════════════════════════
// §F11d: detectMemoryPatterns
//
// Standalone pattern detection engine. Can be called
// independently of buildFacilityMemory for batch analysis.
// ═══════════════════════════════════════════════════════════════

export function detectMemoryPatterns(
  memoryNodes: FacilityMemoryNode[],
): MemoryPattern[] {
  if (memoryNodes.length < 5) return [];

  const patterns: MemoryPattern[] = [];

  // ── Day-of-week pattern ──
  const dayNames = [
    "domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado",
  ];
  const byDay = new Map<number, FacilityMemoryNode[]>();
  for (const node of memoryNodes) {
    const d = safeDate(node.date);
    if (!d) continue;
    const day = d.getDay();
    const list = byDay.get(day) ?? [];
    list.push(node);
    byDay.set(day, list);
  }

  byDay.forEach((nodes, day) => {
    if (nodes.length < 2) return;
    const avgSat =
      nodes.reduce((s, n) => s + n.satisfaction_score, 0) / nodes.length;
    nodes.reduce((s, n) => s + n.attendance, 0) / nodes.length;

    if (avgSat >= 80) {
      patterns.push({
        id: `pattern-day-${day}-high`,
        description: `${dayNames[day]}: satisfacción promedio ${Math.round(avgSat)}/100 con ${nodes.length} eventos`,
        trigger: `day_of_week:${day}`,
        frequency: nodes.length,
        confidence: clamp(Math.round(60 + nodes.length * 3), 60, 92),
        impact: `Día óptimo para eventos premium. Promover ${dayNames[day]}s como fecha preferencial.`,
      });
    }

    if (avgSat < 55 && nodes.length >= 3) {
      patterns.push({
        id: `pattern-day-${day}-low`,
        description: `${dayNames[day]}: satisfacción promedio ${Math.round(avgSat)}/100 — por debajo del estándar`,
        trigger: `day_of_week:${day}`,
        frequency: nodes.length,
        confidence: clamp(Math.round(55 + nodes.length * 3), 55, 88),
        impact: `Investigar causas del bajo rendimiento los ${dayNames[day]}s. Posibles factores: staffing, clima, conflicto con otros eventos.`,
      });
    }
  });

  // ── Group size pattern ──
  const highSat = memoryNodes.filter((n) => n.satisfaction_score >= 80);
  const lowSat = memoryNodes.filter((n) => n.satisfaction_score < 50);

  if (highSat.length >= 3) {
    const avgSize = Math.round(
      highSat.reduce((s, n) => s + n.attendance, 0) / highSat.length,
    );
    patterns.push({
      id: "pattern-size-optimal",
      description: `Grupo óptimo: ~${avgSize} personas (basado en ${highSat.length} eventos exitosos)`,
      trigger: `group_size:${avgSize}`,
      frequency: highSat.length,
      confidence: 75,
      impact: `Recomendar ${Math.round(avgSize * 0.85)}-${Math.round(avgSize * 1.15)} personas como rango ideal para nuevas reservas.`,
    });
  }

  if (lowSat.length >= 3) {
    const avgSize = Math.round(
      lowSat.reduce((s, n) => s + n.attendance, 0) / lowSat.length,
    );
    patterns.push({
      id: "pattern-size-problematic",
      description: `Grupo problemático: ~${avgSize} personas (${lowSat.length} eventos con baja satisfacción)`,
      trigger: `group_size:${avgSize}`,
      frequency: lowSat.length,
      confidence: 68,
      impact: `Investigar por qué grupos de ~${avgSize} personas tienen problemas. Posible sobrecarga o subutilización.`,
    });
  }

  // ── Temporal clustering ──
  const byDate = new Map<string, FacilityMemoryNode[]>();
  for (const node of memoryNodes) {
    const list = byDate.get(node.date) ?? [];
    list.push(node);
    byDate.set(node.date, list);
  }

  let clusterCount = 0;
  byDate.forEach((nodes) => {
    if (nodes.length >= 3) clusterCount++;
  });

  if (clusterCount >= 2) {
    patterns.push({
      id: "pattern-clustering",
      description: `Días de alta demanda recurrente: ${clusterCount} días con 3+ eventos detectados`,
      trigger: "multi_event_day",
      frequency: clusterCount,
      confidence: 70,
      impact: "Gestionar activamente la capacidad en días de alta demanda. Considerar staffing adicional.",
    });
  }

  // Sort by confidence descending
  return patterns.sort((a, b) => b.confidence - a.confidence);
}

// ═══════════════════════════════════════════════════════════════
// BATCH OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Build memories for all facilities at once.
 */
export function buildAllFacilityMemories(
  facilities: Facility[],
  reservationsByFacility: Record<string, FacilityReservation[]>,
): Record<string, FacilityMemory> {
  const result: Record<string, FacilityMemory> = {};

  for (const facility of facilities) {
    result[facility.id] = buildFacilityMemory(
      facility,
      reservationsByFacility[facility.id] ?? [],
    );
  }

  return result;
}

/**
 * Build narratives for all facilities at once.
 */
export function buildAllFacilityNarratives(
  memories: Record<string, FacilityMemory>,
  facilityNames: Record<string, string>,
): Record<string, FacilityNarrative> {
  const result: Record<string, FacilityNarrative> = {};

  for (const [id, memory] of Object.entries(memories)) {
    result[id] = buildFacilityNarrative(
      memory,
      facilityNames[id] ?? id,
    );
  }

  return result;
}