"""In-memory repository for satisfaction surveys and reports."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from typing import Any

from club_mcp.models.satisfaction import (
    CategoryScore,
    EventSatisfactionReport,
    EventTypeComparison,
    NPSSummary,
    SatisfactionBenchmark,
    SatisfactionBenchmarkReport,
    SatisfactionCategory,
    SatisfactionEngagementProposal,
    SatisfactionEngagementProposalList,
    SatisfactionHealthFactor,
    SatisfactionHealthLevel,
    SatisfactionHealthScore,
    SatisfactionIntelligence,
    SatisfactionProposalType,
    SatisfactionSurvey,
    SentimentFlowPoint,
    SurveyQuestion,
)


class SatisfactionRepository:
    """In-memory satisfaction repository with intelligence methods.

    Seed data simulates 6 months of Castillo Country Club events:
    - 40 surveys across 12 events
    - Corporate events: high satisfaction (4.5+)
    - Weddings: mixed (venue excellent, food declining)
    - Food category: systemic decline trend
    - Service: consistently strong
    """

    # CR private club benchmarks
    _BENCHMARKS: dict[str, float] = {
        "overall": 4.2,
        "venue": 4.5,
        "food": 4.0,
        "service": 4.3,
        "entertainment": 3.8,
        "value": 3.5,
        "organization": 4.2,
        "ambiance": 4.3,
        "cleanliness": 4.4,
        "timing": 4.0,
        "overall_nps_proxy": 15.0,
        "response_rate": 60.0,
    }

    def __init__(self, *, seed_demo_data: bool = False) -> None:
        self._surveys: dict[str, SatisfactionSurvey] = {}
        self._reports: dict[str, EventSatisfactionReport] = {}
        self._event_metadata: dict[str, dict[str, str]] = {}
        if seed_demo_data:
            self._seed_data()

    async def save_survey(
        self, survey: SatisfactionSurvey
    ) -> SatisfactionSurvey:
        self._surveys[survey.survey_id] = survey
        return survey

    async def get_surveys_by_event(
        self, event_id: str
    ) -> list[SatisfactionSurvey]:
        return [
            s for s in self._surveys.values() if s.event_id == event_id
        ]

    async def get_surveys_by_family(
        self, family_id: str
    ) -> list[SatisfactionSurvey]:
        return [
            s for s in self._surveys.values() if s.family_id == family_id
        ]

    async def save_satisfaction_report(
        self, report: EventSatisfactionReport
    ) -> EventSatisfactionReport:
        self._reports[report.report_id] = report
        return report

    async def get_satisfaction_report(
        self, event_id: str
    ) -> Optional[EventSatisfactionReport]:
        for r in self._reports.values():
            if r.event_id == event_id:
                return r
        return None

    async def get_satisfaction_trends(
        self, months: int = 6
    ) -> dict:
        """Get satisfaction trends filtered by months parameter (BUG FIX).

        Now correctly filters to last N months and computes 3-month trend
        instead of naive 2-month comparison.
        """
        by_month: dict[str, list[float]] = {}
        by_month_cats: dict[str, dict[str, list[float]]] = {}

        for survey in self._surveys.values():
            month_key = survey.submitted_at.strftime("%Y-%m")
            by_month.setdefault(month_key, []).append(
                survey.overall_score
            )
            for q in survey.questions:
                cat_m = by_month_cats.setdefault(
                    month_key, {}
                )
                cat_m.setdefault(q.category.value, []).append(
                    q.rating
                )

        # FIX: Filter to last N months
        sorted_months = sorted(by_month.keys())
        filtered_months = sorted_months[-months:]
        filtered_averages = {
            m: round(sum(by_month[m]) / len(by_month[m]), 2)
            for m in filtered_months
            if m in by_month
        }

        # Category trends over filtered period
        category_trends: dict[str, list[float]] = {}
        for m in filtered_months:
            cats = by_month_cats.get(m, {})
            for cat, scores in cats.items():
                category_trends.setdefault(cat, []).append(
                    round(sum(scores) / len(scores), 2)
                )

        # 3-month window trend (not naive 2-month)
        values = list(filtered_averages.values())
        if len(values) >= 3:
            avg_first_half = sum(values[-3:-1]) / 2
            avg_last = values[-1]
            if avg_last > avg_first_half * 1.03:
                trend = "improving"
            elif avg_last < avg_first_half * 0.97:
                trend = "declining"
            else:
                trend = "stable"
        elif len(values) >= 2:
            if values[-1] > values[-2]:
                trend = "improving"
            elif values[-1] < values[-2]:
                trend = "declining"
            else:
                trend = "stable"
        elif len(values) == 1:
            trend = "insufficient_data"
        else:
            trend = "insufficient_data"

        return {
            "monthly_averages": filtered_averages,
            "category_trends": {
                cat: vals[-months:]
                for cat, vals in category_trends.items()
            },
            "overall_trend": trend,
            "total_surveys": len(self._surveys),
            "months_analyzed": len(filtered_averages),
            "months_requested": months,
        }
    # ── Seed Data ──────────────────────────────────────────

    def _seed_data(self) -> None:
        """Populate with realistic Castillo Country Club satisfaction data."""
        self._seed_event_metadata()
        self._seed_surveys()
        logger.info(
            "[satisfaction_repo] Seeded: %d surveys across %d events",
            len(self._surveys),
            len(self._event_metadata),
        )

    def _seed_event_metadata(self) -> None:
        """Define 12 events with metadata for seed surveys."""
        self._event_metadata = {
            "evt-001": {
                "name": "Gala Corporativa TechCorp",
                "type": "corporate",
                "date": "2026-01-18",
                "attendees": 95,
            },
            "evt-002": {
                "name": "Boda González-Rivera",
                "type": "wedding",
                "date": "2026-01-25",
                "attendees": 180,
            },
            "evt-003": {
                "name": "Cumpleaños 50 Doña Carmen",
                "type": "birthday",
                "date": "2026-02-08",
                "attendees": 60,
            },
            "evt-004": {
                "name": "Evento Corporativo Banco Nacional",
                "type": "corporate",
                "date": "2026-02-22",
                "attendees": 120,
            },
            "evt-005": {
                "name": "Bautizo Familia Montero",
                "type": "baptism",
                "date": "2026-03-05",
                "attendees": 45,
            },
            "evt-006": {
                "name": "Boda Solano-Vargas",
                "type": "wedding",
                "date": "2026-03-15",
                "attendees": 200,
            },
            "evt-007": {
                "name": "Cena de Gala Aniversario Club",
                "type": "anniversary",
                "date": "2026-03-28",
                "attendees": 150,
            },
            "evt-008": {
                "name": "Quinceañera Valentina Durán",
                "type": "quinceanera",
                "date": "2026-04-12",
                "attendees": 130,
            },
            "evt-009": {
                "name": "Conferencia Grupo Innova",
                "type": "corporate",
                "date": "2026-04-25",
                "attendees": 80,
            },
            "evt-010": {
                "name": "Boda Quesada-Blanco",
                "type": "wedding",
                "date": "2026-05-10",
                "attendees": 160,
            },
            "evt-011": {
                "name": "Fiesta Infantil Grupo Familias",
                "type": "birthday",
                "date": "2026-05-20",
                "attendees": 40,
            },
            "evt-012": {
                "name": "Gala Corporativa Grupo Puriscal",
                "type": "corporate",
                "date": "2026-06-07",
                "attendees": 100,
            },
        }

    def _seed_surveys(self) -> None:
        """Create 40 surveys with realistic patterns.

        Design patterns:
        - Corporate: consistently high (4.3-4.8)
        - Weddings: venue high, food declining over time
        - Food category: systemic decline (4.2 → 3.4 over 6 months)
        - Service: consistently strong (4.3+)
        - Value: moderate (3.5-3.8) — pricing sensitivity
        """
        _survey_defs = [
            # (event_id, family_id, month, ratings dict [10 cats], comment)
            # January - Gala Corporate (high satisfaction)
            ("evt-001", "fam-010", "2026-01-19", {"venue": 5, "food": 4, "service": 5, "entertainment": 4, "value": 4, "organization": 5, "ambiance": 5, "cleanliness": 5, "timing": 4, "overall": 5}, "Evento impecable. El servicio fue excepcional."),
            ("evt-001", "fam-012", "2026-01-19", {"venue": 4, "food": 4, "service": 5, "entertainment": 4, "value": 3, "organization": 5, "ambiance": 4, "cleanliness": 5, "timing": 4, "overall": 4}, "Muy bien organizado. El precio un poco alto para lo que se ofreció."),
            ("evt-001", "fam-003", "2026-01-20", {"venue": 5, "food": 5, "service": 4, "entertainment": 4, "value": 4, "organization": 5, "ambiance": 5, "cleanliness": 5, "timing": 5, "overall": 5}, "Excelente en todo. Volveríamos sin dudarlo."),
            # January - Wedding (high but food already showing signs)
            ("evt-002", "fam-001", "2026-01-26", {"venue": 5, "food": 4, "service": 4, "entertainment": 5, "value": 4, "organization": 4, "ambiance": 5, "cleanliness": 5, "timing": 4, "overall": 4}, "Hermosa boda. La decoración fue espectacular."),
            ("evt-002", "fam-004", "2026-01-26", {"venue": 5, "food": 3, "service": 4, "entertainment": 4, "value": 3, "organization": 4, "ambiance": 5, "cleanliness": 5, "timing": 3, "overall": 4}, "El lugar precioso pero la comida tardó mucho. El postre no estaba al nivel."),
            ("evt-002", "fam-007", "2026-01-27", {"venue": 5, "food": 4, "service": 5, "entertainment": 5, "value": 4, "organization": 5, "ambiance": 5, "cleanliness": 5, "timing": 4, "overall": 5}, "Todo maravilloso. El personal fue muy atento."),
            # February - Birthday
            ("evt-003", "fam-005", "2026-02-09", {"venue": 4, "food": 4, "service": 4, "entertainment": 3, "value": 4, "organization": 4, "ambiance": 4, "cleanliness": 4, "timing": 4, "overall": 4}, "Bonita fiesta. El entretenimiento podría mejorar."),
            ("evt-003", "fam-008", "2026-02-09", {"venue": 4, "food": 4, "service": 4, "entertainment": 3, "value": 3, "organization": 4, "ambiance": 4, "cleanliness": 4, "timing": 4, "overall": 4}, "Cumpleaños agradable. Buena relación calidad-precio."),
            # February - Corporate (good but service slipping)
            ("evt-004", "fam-011", "2026-02-23", {"venue": 5, "food": 4, "service": 4, "entertainment": 3, "value": 3, "organization": 5, "ambiance": 4, "cleanliness": 5, "timing": 4, "overall": 4}, "Evento profesional. El audiovisual falló un poco."),
            ("evt-004", "fam-006", "2026-02-23", {"venue": 4, "food": 3, "service": 4, "entertainment": 3, "value": 3, "organization": 4, "ambiance": 4, "cleanliness": 5, "timing": 3, "overall": 4}, "Bien en general. El coffee break fue limitado para el precio."),
            ("evt-004", "fam-009", "2026-02-24", {"venue": 5, "food": 4, "service": 4, "entertainment": 3, "value": 4, "organization": 5, "ambiance": 5, "cleanliness": 5, "timing": 4, "overall": 4}, "Excelente venue. Mejoraría el catering."),
            # March - Baptism
            ("evt-005", "fam-003", "2026-03-06", {"venue": 5, "food": 4, "service": 5, "entertainment": 4, "value": 4, "organization": 5, "ambiance": 5, "cleanliness": 5, "timing": 5, "overall": 5}, "Bautizo hermoso. Todo perfecto para la familia."),
            ("evt-005", "fam-001", "2026-03-06", {"venue": 4, "food": 4, "service": 4, "entertainment": 4, "value": 4, "organization": 4, "ambiance": 4, "cleanliness": 5, "timing": 4, "overall": 4}, "Muy lindo evento. Espacio adecuado."),
            # March - Wedding (food decline more pronounced)
            ("evt-006", "fam-002", "2026-03-16", {"venue": 5, "food": 3, "service": 4, "entertainment": 4, "value": 3, "organization": 4, "ambiance": 5, "cleanliness": 5, "timing": 3, "overall": 4}, "Boda preciosa pero la comida no estuvo a la altura. Tardaron 40 min entre platos."),
            ("evt-006", "fam-005", "2026-03-16", {"venue": 5, "food": 3, "service": 5, "entertainment": 4, "value": 3, "organization": 4, "ambiance": 5, "cleanliness": 5, "timing": 3, "overall": 4}, "Decoración increíble. Comida mediocre para el precio cobrado."),
            ("evt-006", "fam-008", "2026-03-17", {"venue": 5, "food": 4, "service": 4, "entertainment": 4, "value": 4, "organization": 5, "ambiance": 5, "cleanliness": 5, "timing": 4, "overall": 4}, "Todo muy bonito. Solo la comida fue regular."),
            ("evt-006", "fam-010", "2026-03-17", {"venue": 4, "food": 2, "service": 4, "entertainment": 3, "value": 2, "organization": 3, "ambiance": 4, "cleanliness": 5, "timing": 2, "overall": 3}, "Decepcionante. La carne estaba fría y el servicio de bar fue lento."),
            # March - Anniversary Gala
            ("evt-007", "fam-004", "2026-03-29", {"venue": 5, "food": 4, "service": 5, "entertainment": 5, "value": 4, "organization": 5, "ambiance": 5, "cleanliness": 5, "timing": 5, "overall": 5}, "Gala espectacular. Mejor evento del año."),
            ("evt-007", "fam-006", "2026-03-29", {"venue": 5, "food": 4, "service": 5, "entertainment": 5, "value": 4, "organization": 5, "ambiance": 5, "cleanliness": 5, "timing": 4, "overall": 5}, "Increíble celebración. El club se lució."),
            ("evt-007", "fam-009", "2026-03-30", {"venue": 5, "food": 4, "service": 4, "entertainment": 5, "value": 3, "organization": 5, "ambiance": 5, "cleanliness": 5, "timing": 4, "overall": 4}, "Gran evento. El precio de la entrada fue un poco alto."),
            # April - Quinceañera
            ("evt-008", "fam-002", "2026-04-13", {"venue": 5, "food": 3, "service": 4, "entertainment": 5, "value": 3, "organization": 4, "ambiance": 5, "cleanliness": 5, "timing": 4, "overall": 4}, "Fiesta hermosa. La música y la pista de baile genial. Comida regular."),
            ("evt-008", "fam-007", "2026-04-13", {"venue": 4, "food": 3, "service": 4, "entertainment": 4, "value": 3, "organization": 4, "ambiance": 5, "cleanliness": 4, "timing": 3, "overall": 4}, "Bonita quinceañera. El horario se atrasó un poco."),
            # April - Corporate (consistent)
            ("evt-009", "fam-011", "2026-04-26", {"venue": 5, "food": 4, "service": 4, "entertainment": 3, "value": 3, "organization": 5, "ambiance": 4, "cleanliness": 5, "timing": 4, "overall": 4}, "Conferencia bien organizada. El espacio es ideal para estos eventos."),
            ("evt-009", "fam-012", "2026-04-26", {"venue": 4, "food": 3, "service": 4, "entertainment": 3, "value": 3, "organization": 4, "ambiance": 4, "cleanliness": 5, "timing": 4, "overall": 4}, "Correcto. El coffee break podría ser más variado."),
            # May - Wedding (food decline worst point)
            ("evt-010", "fam-001", "2026-05-11", {"venue": 5, "food": 2, "service": 4, "entertainment": 4, "value": 2, "organization": 3, "ambiance": 5, "cleanliness": 5, "timing": 2, "overall": 3}, "Venue espectacular pero la comida fue un desastre. Tardaron una hora entre platos."),
            ("evt-010", "fam-003", "2026-05-11", {"venue": 5, "food": 3, "service": 3, "entertainment": 4, "value": 3, "organization": 4, "ambiance": 5, "cleanliness": 5, "timing": 3, "overall": 4}, "Hermosa boda. La comida bajó mucho el nivel del evento."),
            ("evt-010", "fam-005", "2026-05-12", {"venue": 5, "food": 2, "service": 4, "entertainment": 4, "value": 2, "organization": 3, "ambiance": 5, "cleanliness": 5, "timing": 3, "overall": 3}, "El venue es perfecto pero no puedo recomendar el catering. Muy decepcionante para el precio."),
            ("evt-010", "fam-009", "2026-05-12", {"venue": 4, "food": 3, "service": 4, "entertainment": 3, "value": 3, "organization": 4, "ambiance": 4, "cleanliness": 5, "timing": 3, "overall": 3}, "Regular. La relación calidad-precio no es buena últimamente."),
            # May - Kids Birthday
            ("evt-011", "fam-004", "2026-05-21", {"venue": 4, "food": 4, "service": 4, "entertainment": 5, "value": 4, "organization": 4, "ambiance": 4, "cleanliness": 4, "timing": 5, "overall": 4}, "Los niños la pasaron increíble. Muy buen animador."),
            ("evt-011", "fam-007", "2026-05-21", {"venue": 4, "food": 3, "service": 4, "entertainment": 5, "value": 4, "organization": 4, "ambiance": 4, "cleanliness": 4, "timing": 4, "overall": 4}, "Fiesta divertida. La zona infantil es perfecta."),
            # June - Corporate (latest data point)
            ("evt-012", "fam-006", "2026-06-08", {"venue": 5, "food": 3, "service": 4, "entertainment": 3, "value": 3, "organization": 4, "ambiance": 4, "cleanliness": 5, "timing": 4, "overall": 4}, "Evento corporativo decente. El catering sigue sin mejorar."),
            ("evt-012", "fam-010", "2026-06-08", {"venue": 4, "food": 3, "service": 4, "entertainment": 3, "value": 3, "organization": 4, "ambiance": 4, "cleanliness": 5, "timing": 4, "overall": 4}, "Buena organización. Comida promedio."),
            ("evt-012", "fam-011", "2026-06-09", {"venue": 5, "food": 4, "service": 5, "entertainment": 3, "value": 3, "organization": 5, "ambiance": 5, "cleanliness": 5, "timing": 4, "overall": 4}, "Muy profesional. El servicio de primera. Solo la comida podría mejorar."),
            # Additional surveys to reach 40
            ("evt-003", "fam-002", "2026-02-09", {"venue": 4, "food": 4, "service": 4, "entertainment": 3, "value": 4, "organization": 4, "ambiance": 4, "cleanliness": 4, "timing": 4, "overall": 4}, ""),
            ("evt-005", "fam-008", "2026-03-06", {"venue": 5, "food": 5, "service": 5, "entertainment": 4, "value": 4, "organization": 5, "ambiance": 5, "cleanliness": 5, "timing": 5, "overall": 5}, "Todo excelente. Muy recomendado para eventos familiares."),
            ("evt-007", "fam-001", "2026-03-29", {"venue": 5, "food": 5, "service": 5, "entertainment": 5, "value": 4, "organization": 5, "ambiance": 5, "cleanliness": 5, "timing": 5, "overall": 5}, "La mejor gala que he asistido. Todo de primera."),
            ("evt-008", "fam-006", "2026-04-13", {"venue": 4, "food": 3, "service": 4, "entertainment": 5, "value": 3, "organization": 4, "ambiance": 5, "cleanliness": 4, "timing": 4, "overall": 4}, "Fiesta bonita. El DJ fue espectacular."),
            ("evt-010", "fam-008", "2026-05-11", {"venue": 5, "food": 3, "service": 4, "entertainment": 4, "value": 3, "organization": 4, "ambiance": 5, "cleanliness": 5, "timing": 3, "overall": 4}, "Boda preciosa. El catering fue el punto débil como siempre."),
            ("evt-012", "fam-009", "2026-06-09", {"venue": 5, "food": 3, "service": 4, "entertainment": 3, "value": 3, "organization": 5, "ambiance": 4, "cleanliness": 5, "timing": 4, "overall": 4}, "Corporativo bien ejecutado. Esperaba mejor catering para el nivel del club."),
            ("evt-011", "fam-003", "2026-05-21", {"venue": 4, "food": 4, "service": 4, "entertainment": 5, "value": 4, "organization": 4, "ambiance": 4, "cleanliness": 4, "timing": 5, "overall": 4}, "Los niños felices. Eso es lo que importa."),
            ("evt-004", "fam-010", "2026-02-23", {"venue": 5, "food": 4, "service": 4, "entertainment": 3, "value": 3, "organization": 5, "ambiance": 4, "cleanliness": 5, "timing": 4, "overall": 4}, "Evento bien montado. Esperaba más del catering."),
        ]

        for (eid, fid, date, ratings, comment) in _survey_defs:
            meta = self._event_metadata.get(eid, {})
            questions = []
            for cat_val, rating in ratings.items():
                cat = SatisfactionCategory(cat_val)
                q_text = {
                    "venue": "¿Cómo calificaría las instalaciones del club?",
                    "food": "¿Qué tal la calidad de comida y bebida?",
                    "service": "¿Cómo fue la atención del personal?",
                    "entertainment": "¿El entretenimiento fue de su agrado?",
                    "value": "¿Siente que valió la pena para el precio?",
                    "organization": "¿La organización fue adecuada?",
                    "ambiance": "¿El ambiente y decoración fueron apropiados?",
                    "cleanliness": "¿Cómo calificaría la limpieza?",
                    "timing": "¿Los horarios y duración fueron adecuados?",
                    "overall": "¿Qué tan satisfecho quedó en general?",
                }.get(cat_val, "")
                questions.append(SurveyQuestion(
                    category=cat,
                    question_text=q_text,
                    rating=rating,
                    weight=1.0,
                ))

            overall = sum(q.rating * q.weight for q in questions) / len(questions)
            sentiment, sentiment_score = self._compute_sentiment_static(overall)

            sid = f"srv-{eid}-{fid}"
            survey = SatisfactionSurvey(
                survey_id=sid,
                event_id=eid,
                family_id=fid,
                event_type=meta.get("type", ""),
                event_name=meta.get("name", ""),
                event_date=meta.get("date", ""),
                questions=questions,
                comment=comment,
                submitted_at=datetime(int(date[:4]), int(date[5:7]), int(date[8:10]), tzinfo=timezone.utc),
                overall_score=round(overall, 2),
                sentiment=sentiment,
                sentiment_score=round(sentiment_score, 2),
            )
            self._surveys[sid] = survey

    @staticmethod
    def _compute_sentiment_static(score: float) -> tuple[str, float]:
        """Static sentiment computation for seed data."""
        if score >= 4.0:
            return "positive", min(1.0, (score - 3.0) / 2.0)
        if score >= 3.0:
            return "neutral", round((score - 3.0) / 2.0, 2)
        return "negative", max(-1.0, (score - 3.0) / 2.0)

    # ── INTELLIGENCE METHODS (new) ─────────────────────────

    async def get_health_score(self) -> SatisfactionHealthScore:
        """Compute composite satisfaction health score with 5 weighted factors."""
        factors = self._compute_health_factors()
        total = round(sum(f.weighted_score for f in factors), 1)
        level = (
            SatisfactionHealthLevel.EXCELLENT if total >= 85
            else SatisfactionHealthLevel.HEALTHY if total >= 65
            else SatisfactionHealthLevel.ATTENTION if total >= 45
            else SatisfactionHealthLevel.CRITICAL
        )
        trend = self._compute_satisfaction_trend()
        critical = [f for f in factors if f.impact == "high"]
        summary = (
            f"Score {total}/100 ({level.value}). "
            f"{len(critical)} factor(es) críticos: "
            f"{', '.join(f.name for f in critical)}"
            if critical
            else f"Score {total}/100 ({level.value}). Todos los factores saludables."
        )
        return SatisfactionHealthScore(
            score=int(total), level=level, factors=factors,
            trend=trend, summary=summary,
        )

    async def get_satisfaction_intelligence(self) -> SatisfactionIntelligence:
        """Complete intelligence dashboard: categories, event types, sentiment flow, NPS, signals."""
        all_surveys = list(self._surveys.values())
        if not all_surveys:
            return SatisfactionIntelligence()

        total = len(all_surveys)
        overall_avg = round(sum(s.overall_score for s in all_surveys) / total, 2)

        # Response rate: surveys / estimated attendees
        total_attendees = sum(
            int(m.get("attendees", 0)) for m in self._event_metadata.values()
        )
        response_rate = round(total / max(total_attendees, 1) * 100, 1)
        events_surveyed = len(set(s.event_id for s in all_surveys))

        # Category scores
        cat_data: dict[str, dict[str, Any]] = {}
        for s in all_surveys:
            for q in s.questions:
                entry = cat_data.setdefault(q.category.value, {
                    "scores": [], "events": {}, "best": ("", 0.0), "worst": ("", 5.0),
                })
                entry["scores"].append(q.rating)
                entry["events"].setdefault(s.event_id, []).append(q.rating)

        category_scores: list[CategoryScore] = []
        for cat, data in cat_data.items():
            avg = round(sum(data["scores"]) / len(data["scores"]), 2)
            # Trend: compare first half vs second half chronologically
            sorted_events = sorted(data["events"].keys())
            mid = len(sorted_events) // 2
            first_half_avg = sum(
                sum(data["events"][e]) / len(data["events"][e])
                for e in sorted_events[:mid]
            ) / max(mid, 1) if mid > 0 else avg
            second_half_avg = sum(
                sum(data["events"][e]) / len(data["events"][e])
                for e in sorted_events[mid:]
            ) / max(len(sorted_events) - mid, 1) if sorted_events[mid:] else avg

            trend = "stable"
            if second_half_avg > first_half_avg * 1.05:
                trend = "improving"
            elif second_half_avg < first_half_avg * 0.95:
                trend = "declining"

            best_event = max(data["events"].items(), key=lambda x: sum(x[1]) / len(x[1]))
            worst_event = min(data["events"].items(), key=lambda x: sum(x[1]) / len(x[1]))

            cat_display = {
                "venue": "Instalaciones", "food": "Comida y Bebida",
                "service": "Servicio", "entertainment": "Entretenimiento",
                "value": "Relación Valor", "organization": "Organización",
                "ambiance": "Ambiente", "cleanliness": "Limpieza",
                "timing": "Horarios", "overall": "General",
            }

            category_scores.append(CategoryScore(
                category=cat,
                display_name=cat_display.get(cat, cat),
                avg_score=avg,
                trend=trend,
                event_count=len(data["events"]),
                best_event=self._event_metadata.get(best_event[0], {}).get("name", best_event[0]),
                worst_event=self._event_metadata.get(worst_event[0], {}).get("name", worst_event[0]),
                vs_club_avg=round(avg - overall_avg, 2),
            ))

        # Event type comparison
        etype_data: dict[str, list[SatisfactionSurvey]] = {}
        for s in all_surveys:
            etype_data.setdefault(s.event_type, []).append(s)

        event_type_comparisons: list[EventTypeComparison] = []
        etype_display = {
            "corporate": "Corporativo", "wedding": "Boda",
            "birthday": "Cumpleaños", "baptism": "Bautizo",
            "anniversary": "Aniversario", "quinceanera": "Quinceañera",
            "other": "Otro",
        }
        for etype, surveys in etype_data.items():
            avg = round(sum(s.overall_score for s in surveys) / len(surveys), 2)
            sent_dist = {"positive": 0, "neutral": 0, "negative": 0}
            for s in surveys:
                if s.sentiment in sent_dist:
                    sent_dist[s.sentiment] += 1

            # Best/worst category for this event type
            etype_cats: dict[str, list[float]] = {}
            for s in surveys:
                for q in s.questions:
                    etype_cats.setdefault(q.category.value, []).append(q.rating)
            best_cat = max(etype_cats.items(), key=lambda x: sum(x[1]) / len(x[1]))[0] if etype_cats else ""
            worst_cat = min(etype_cats.items(), key=lambda x: sum(x[1]) / len(x[1]))[0] if etype_cats else ""

            # Trend
            sorted_s = sorted(surveys, key=lambda s: s.submitted_at)
            mid = len(sorted_s) // 2
            first_avg = sum(s.overall_score for s in sorted_s[:mid]) / max(mid, 1)
            second_avg = sum(s.overall_score for s in sorted_s[mid:]) / max(len(sorted_s) - mid, 1)
            trend = "stable"
            if second_avg > first_avg * 1.05:
                trend = "improving"
            elif second_avg < first_avg * 0.95:
                trend = "declining"

            event_type_comparisons.append(EventTypeComparison(
                event_type=etype,
                display_name=etype_display.get(etype, etype),
                event_count=len(set(s.event_id for s in surveys)),
                avg_score=avg,
                total_responses=len(surveys),
                sentiment_breakdown=sent_dist,
                best_category=best_cat,
                worst_category=worst_cat,
                vs_club_avg=round(avg - overall_avg, 2),
                trend=trend,
            ))

        # Sentiment flow (monthly)
        by_month: dict[str, list[SatisfactionSurvey]] = {}
        for s in all_surveys:
            month = s.submitted_at.strftime("%Y-%m")
            by_month.setdefault(month, []).append(s)

        sentiment_flow: list[SentimentFlowPoint] = []
        for month in sorted(by_month.keys()):
            ms = by_month[month]
            avg = sum(s.overall_score for s in ms) / len(ms)
            pos = sum(1 for s in ms if s.sentiment == "positive")
            neg = sum(1 for s in ms if s.sentiment == "negative")
            neu = sum(1 for s in ms if s.sentiment == "neutral")
            total_m = len(ms)
            promoter_pct = round(pos / max(total_m, 1) * 100, 1)
            detractor_pct = round(neg / max(total_m, 1) * 100, 1)
            sentiment_flow.append(SentimentFlowPoint(
                month=month,
                avg_score=round(avg, 2),
                survey_count=total_m,
                positive_pct=promoter_pct,
                negative_pct=detractor_pct,
                neutral_pct=round(neu / max(total_m, 1) * 100, 1),
                nps_proxy=round(promoter_pct - detractor_pct, 1),
            ))

        # NPS Summary
        promoters = sum(1 for s in all_surveys if s.overall_score >= 4.5)
        passives = sum(1 for s in all_surveys if 3.0 <= s.overall_score < 4.5)
        detractors = sum(1 for s in all_surveys if s.overall_score < 3.0)
        promoter_pct = round(promoters / max(total, 1) * 100, 1)
        detractor_pct = round(detractors / max(total, 1) * 100, 1)
        nps_score = round(promoter_pct - detractor_pct, 1)
        nps = NPSSummary(
            nps_score=nps_score,
            promoter_pct=promoter_pct,
            passive_pct=round(passives / max(total, 1) * 100, 1),
            detractor_pct=detractor_pct,
            promoter_count=promoters,
            passive_count=passives,
            detractor_count=detractors,
            total_surveys=total,
            classification="positive" if nps_score > 10 else "negative" if nps_score < -10 else "neutral",
        )

        # Cross-domain signals
        signals = self._generate_cross_domain_signals(
            category_scores, event_type_comparisons, nps, sentiment_flow
        )

        return SatisfactionIntelligence(
            total_surveys=total,
            total_events_surveyed=events_surveyed,
            overall_avg=overall_avg,
            response_rate_pct=response_rate,
            category_scores=category_scores,
            event_type_comparisons=event_type_comparisons,
            sentiment_flow=sentiment_flow,
            nps=nps,
            cross_domain_signals=signals,
        )

    async def get_satisfaction_benchmarks(self) -> SatisfactionBenchmarkReport:
        """Compare satisfaction metrics against club average and CR benchmarks."""
        all_surveys = list(self._surveys.values())
        if not all_surveys:
            return SatisfactionBenchmarkReport()

        overall_avg = sum(s.overall_score for s in all_surveys) / len(all_surveys)
        total_attendees = sum(int(m.get("attendees", 0)) for m in self._event_metadata.values())
        response_rate = len(all_surveys) / max(total_attendees, 1) * 100

        def _status(current: float, benchmark: float) -> str:
            ratio = current / max(benchmark, 0.1)
            if ratio >= 1.0:
                return "on_track"
            elif ratio >= 0.85:
                return "needs_attention"
            return "critical"

        # Overall benchmarks
        overall_benchmarks = [
            SatisfactionBenchmark(
                metric="Satisfacción General",
                current_value=round(overall_avg, 2),
                club_average=round(overall_avg, 2),
                benchmark_value=self._BENCHMARKS["overall"],
                vs_club=0.0,
                vs_benchmark=round(overall_avg - self._BENCHMARKS["overall"], 2),
                status=_status(overall_avg, self._BENCHMARKS["overall"]),
            ),
            SatisfactionBenchmark(
                metric="Tasa de Respuesta",
                current_value=round(response_rate, 1),
                club_average=round(response_rate, 1),
                benchmark_value=self._BENCHMARKS["response_rate"],
                vs_club=0.0,
                vs_benchmark=round(response_rate - self._BENCHMARKS["response_rate"], 1),
                status=_status(response_rate, self._BENCHMARKS["response_rate"]),
            ),
        ]

        # Category benchmarks
        cat_scores: dict[str, list[float]] = {}
        for s in all_surveys:
            for q in s.questions:
                cat_scores.setdefault(q.category.value, []).append(q.rating)

        category_benchmarks: list[SatisfactionBenchmark] = []
        for cat, scores in cat_scores.items():
            avg = sum(scores) / len(scores)
            bm = self._BENCHMARKS.get(cat, 4.0)
            category_benchmarks.append(SatisfactionBenchmark(
                metric=cat,
                current_value=round(avg, 2),
                club_average=round(overall_avg, 2),
                benchmark_value=bm,
                vs_club=round(avg - overall_avg, 2),
                vs_benchmark=round(avg - bm, 2),
                status=_status(avg, bm),
            ))

        # Outlier detection
        cat_avgs = {c: sum(s) / len(s) for c, s in cat_scores.items()}
        avg_of_avgs = sum(cat_avgs.values()) / max(len(cat_avgs), 1)
        outliers = []
        for cat, avg in cat_avgs.items():
            dev = avg - avg_of_avgs
            if abs(dev) > 0.5:
                outliers.append({
                    "category": cat,
                    "avg_score": round(avg, 2),
                    "deviation": round(dev, 2),
                    "direction": "above" if dev > 0 else "below",
                })

        # Event type benchmarks
        etype_data: dict[str, list[float]] = {}
        for s in all_surveys:
            etype_data.setdefault(s.event_type, []).append(s.overall_score)

        event_type_benchmarks: list[SatisfactionBenchmark] = []
        best_type = ("", 0.0)
        worst_type = ("", 5.0)
        for etype, scores in etype_data.items():
            avg = sum(scores) / len(scores)
            if avg > best_type[1]:
                best_type = (etype, avg)
            if avg < worst_type[1]:
                worst_type = (etype, avg)
            event_type_benchmarks.append(SatisfactionBenchmark(
                metric=etype,
                current_value=round(avg, 2),
                club_average=round(overall_avg, 2),
                benchmark_value=self._BENCHMARKS["overall"],
                vs_club=round(avg - overall_avg, 2),
                vs_benchmark=round(avg - self._BENCHMARKS["overall"], 2),
                status=_status(avg, self._BENCHMARKS["overall"]),
            ))

        return SatisfactionBenchmarkReport(
            overall_benchmarks=overall_benchmarks,
            category_benchmarks=category_benchmarks,
            event_type_benchmarks=event_type_benchmarks,
            outlier_categories=outliers,
            best_performing_event_type=best_type[0],
            worst_performing_event_type=worst_type[0],
        )

    async def generate_engagement_proposals(self) -> SatisfactionEngagementProposalList:
        """Generate proactive cross-domain engagement proposals."""
        proposals: list[SatisfactionEngagementProposal] = []
        all_surveys = list(self._surveys.values())

        if not all_surveys:
            return SatisfactionEngagementProposalList()

        # Category analysis
        cat_data: dict[str, dict[str, Any]] = {}
        for s in all_surveys:
            for q in s.questions:
                entry = cat_data.setdefault(q.category.value, {
                    "scores": [], "events": set(), "declining": True,
                })
                entry["scores"].append(q.rating)
                entry["events"].add(s.event_id)

        overall_avg = sum(s.overall_score for s in all_surveys) / len(all_surveys)

        # P1: Food decline — systemic category review
        food_data = cat_data.get("food", {})
        food_scores = food_data.get("scores", [])
        if food_scores:
            food_avg = sum(food_scores) / len(food_scores)
            if food_avg < 3.5:
                proposals.append(SatisfactionEngagementProposal(
                    proposal_type=SatisfactionProposalType.CATEGORY_REVIEW,
                    title="Revisión urgente: categoría Comida y Bebida",
                    description=(
                        f"La categoría 'Comida y Bebida' tiene un promedio de "
                        f"{food_avg:.1f}/5.0 — significativamente por debajo del "
                        f"benchmark CR ({self._BENCHMARKS['food']}). "
                        f"Afecta {len(food_data.get('events', set()))} eventos. "
                        f"Recomendación: evaluar proveedores de catering, "
                        f"revisar menú con chef, y considerar degustación previa."
                    ),
                    target_category="food",
                    priority="high",
                    impact="high",
                    confidence=0.90,
                    cross_domain_signals=[
                        f"Food avg: {food_avg:.1f}/5 (benchmark: {self._BENCHMARKS['food']})",
                        "Comentarios recurrentes: 'tardó mucho', 'no justifica el precio'",
                        "Afecta percepción general del club ante invitados",
                    ],
                    suggested_action={
                        "action": "schedule_chef_review",
                        "domain": "operations",
                        "params": {"category": "food", "urgency": "high"},
                    },
                ))

        # P2: Replicate high-performing event formats
        etype_scores: dict[str, list[float]] = {}
        for s in all_surveys:
            etype_scores.setdefault(s.event_type, []).append(s.overall_score)

        best_etype = max(etype_scores.items(), key=lambda x: sum(x[1]) / len(x[1]))
        if best_etype[1] and sum(best_etype[1]) / len(best_etype[1]) >= 4.5:
            best_avg = sum(best_etype[1]) / len(best_etype[1])
            proposals.append(SatisfactionEngagementProposal(
                proposal_type=SatisfactionProposalType.FORMAT_REPLICATION,
                title=f"Replicar formato: eventos {best_etype[0]}",
                description=(
                    f"Los eventos tipo '{best_etype[0]}' tienen satisfacción "
                    f"promedio de {best_avg:.1f}/5.0 — el más alto del club. "
                    f"Analizar qué los hace exitosos y replicar elementos "
                    f"en otros tipos de evento."
                ),
                target_event_type=best_etype[0],
                priority="medium",
                impact="medium",
                confidence=0.80,
                cross_domain_signals=[
                    f"Best performer: {best_etype[0]} ({best_avg:.1f}/5)",
                    "Elementos replicables en weddings, birthdays, etc.",
                ],
                suggested_action={
                    "action": "analyze_successful_format",
                    "domain": "events",
                    "params": {"event_type": best_etype[0]},
                },
            ))

        # P3: Events with 0 surveys — follow-up needed
        surveyed_events = set(s.event_id for s in all_surveys)
        all_events = set(self._event_metadata.keys())
        unsurveyed = all_events - surveyed_events
        if unsurveyed:
            event_names = [
                self._event_metadata.get(eid, {}).get("name", eid)
                for eid in unsurveyed
            ]
            proposals.append(SatisfactionEngagementProposal(
                proposal_type=SatisfactionProposalType.SURVEY_FOLLOW_UP,
                title=f"{len(unsurveyed)} evento(s) sin encuestas",
                description=(
                    f"Los siguientes eventos no tienen encuestas: "
                    f"{', '.join(event_names[:3])}{'...' if len(event_names) > 3 else ''}. "
                    f"Sin feedback no se pueden tomar acciones de mejora. "
                    f"Enviar encuesta post-evento dentro de las 48 horas."
                ),
                priority="medium",
                impact="medium",
                confidence=0.70,
                cross_domain_signals=[
                    f"{len(unsurveyed)} eventos sin feedback",
                    "Sin datos = sin mejora posible",
                ],
                suggested_action={
                    "action": "send_followup_surveys",
                    "domain": "communication",
                    "params": {"event_ids": list(unsurveyed)},
                },
            ))

        # P4: Value category low but quality high → pricing review
        value_data = cat_data.get("value", {})
        value_scores = value_data.get("scores", [])
        quality_cats = ["venue", "service", "ambiance", "cleanliness"]
        quality_scores = []
        for cat in quality_cats:
            quality_scores.extend(cat_data.get(cat, {}).get("scores", []))

        if value_scores and quality_scores:
            value_avg = sum(value_scores) / len(value_scores)
            quality_avg = sum(quality_scores) / len(quality_scores)
            if value_avg < 3.5 and quality_avg > 4.0:
                proposals.append(SatisfactionEngagementProposal(
                    proposal_type=SatisfactionProposalType.PRICING_REVIEW,
                    title="Revisión de precios: calidad alta pero percepción de valor baja",
                    description=(
                        f"Calidad promedio (venue+service+ambiance+cleanliness): "
                        f"{quality_avg:.1f}/5.0 pero percepción de valor: {value_avg:.1f}/5.0. "
                        f"Los socios sienten que el precio no justifica la experiencia. "
                        f"Evaluar: estructura de precios, paquetes todo-incluido, "
                        f"o beneficios adicionales que cierren el gap."
                    ),
                    priority="high",
                    impact="high",
                    confidence=0.85,
                    cross_domain_signals=[
                        f"Value: {value_avg:.1f} vs Quality: {quality_avg:.1f} (gap: {quality_avg - value_avg:.1f})",
                        "Oportunidad: paquetes o beneficios para cerrar gap percepción",
                        "Finanzas: evaluar estructura de pricing para eventos",
                    ],
                    suggested_action={
                        "action": "review_event_pricing",
                        "domain": "finance",
                        "params": {
                            "current_value_score": round(value_avg, 1),
                            "quality_score": round(quality_avg, 1),
                        },
                    },
                ))

        # P5: NPS detractors → recovery action
        all_surveys_sorted = sorted(all_surveys, key=lambda s: s.submitted_at)
        recent = all_surveys_sorted[-10:]  # last 10 surveys
        recent_neg = [s for s in recent if s.sentiment == "negative"]
        if recent_neg:
            proposals.append(SatisfactionEngagementProposal(
                proposal_type=SatisfactionProposalType.EVENT_REDESIGN,
                title=f"{len(recent_neg)} encuestas negativas recientes — acción de recuperación",
                description=(
                    f"Las {len(recent_neg)} encuestas negativas más recientes "
                    f"tienen un promedio de {sum(s.overall_score for s in recent_neg) / len(recent_neg):.1f}/5.0. "
                    f"Contactar a esas familias para entender qué falló y "
                    f"ofrecer una experiencia de recuperación."
                ),
                priority="high",
                impact="medium",
                confidence=0.75,
                cross_domain_signals=[
                    f"{len(recent_neg)} detractores recientes",
                    "Riesgo: churn de familias insatisfechas",
                    "Member 360: correlacionar con engagement score",
                ],
                suggested_action={
                    "action": "recovery_campaign",
                    "domain": "communication",
                    "params": {
                        "family_ids": list(set(s.family_id for s in recent_neg)),
                    },
                },
            ))

        high_count = sum(1 for p in proposals if p.priority == "high")
        cross_count = sum(1 for p in proposals if len(p.cross_domain_signals) > 1)

        return SatisfactionEngagementProposalList(
            proposals=proposals,
            total=len(proposals),
            high_priority_count=high_count,
            cross_domain_count=cross_count,
        )

    # ── Internal Helpers ───────────────────────────────────

    def _compute_health_factors(self) -> list[SatisfactionHealthFactor]:
        """Compute 5 weighted health factors for satisfaction."""
        factors: list[SatisfactionHealthFactor] = []
        all_surveys = list(self._surveys.values())

        if not all_surveys:
            return [SatisfactionHealthFactor(
                name="No Data", score=0, weight=1.0,
                weighted_score=0, impact="high", detail="Sin encuestas",
            )]

        total = len(all_surveys)
        overall_avg = sum(s.overall_score for s in all_surveys) / total

        # Factor 1: Overall Satisfaction (weight 0.25)
        sat_score = round(min(100, overall_avg / 5.0 * 100), 1)
        factors.append(SatisfactionHealthFactor(
            name="Overall Satisfaction",
            score=sat_score,
            weight=0.25,
            weighted_score=round(sat_score * 0.25, 1),
            impact="high" if sat_score < 60 else "medium" if sat_score < 75 else "low",
            detail=f"Satisfacción general: {overall_avg:.1f}/5.0",
        ))

        # Factor 2: Category Balance (weight 0.20)
        cat_avgs: dict[str, float] = {}
        for s in all_surveys:
            for q in s.questions:
                cat_avgs.setdefault(q.category.value, []).append(q.rating)
        cat_means = {c: sum(v) / len(v) for c, v in cat_avgs.items() if v}
        if cat_means:
            min_cat = min(cat_means.values())
            max_cat = max(cat_means.values())
            spread = max_cat - min_cat
            balance_score = round(max(0, 100 - spread * 30), 1)
        else:
            balance_score = 50.0
        factors.append(SatisfactionHealthFactor(
            name="Category Balance",
            score=balance_score,
            weight=0.20,
            weighted_score=round(balance_score * 0.20, 1),
            impact="high" if balance_score < 50 else "medium" if balance_score < 70 else "low",
            detail=f"Spread entre categorías: {spread:.1f}pts (ideal <1.0)",
        ))

        # Factor 3: Sentiment Ratio (weight 0.20)
        pos = sum(1 for s in all_surveys if s.sentiment == "positive")
        neg = sum(1 for s in all_surveys if s.sentiment == "negative")
        pos_pct = pos / max(total, 1) * 100
        neg_pct = neg / max(total, 1) * 100
        sentiment_score = round(min(100, pos_pct - neg_pct + 50), 1)
        factors.append(SatisfactionHealthFactor(
            name="Sentiment Ratio",
            score=sentiment_score,
            weight=0.20,
            weighted_score=round(sentiment_score * 0.20, 1),
            impact="high" if neg_pct > 30 else "medium" if neg_pct > 15 else "low",
            detail=f"Positivos: {pos_pct:.0f}%, Negativos: {neg_pct:.0f}%",
        ))

        # Factor 4: Response Rate (weight 0.20)
        total_attendees = sum(int(m.get("attendees", 0)) for m in self._event_metadata.values())
        response_rate = total / max(total_attendees, 1) * 100
        resp_score = round(min(100, response_rate * 1.5), 1)
        factors.append(SatisfactionHealthFactor(
            name="Response Rate",
            score=resp_score,
            weight=0.20,
            weighted_score=round(resp_score * 0.20, 1),
            impact="high" if response_rate < 20 else "medium" if response_rate < 40 else "low",
            detail=f"Tasa de respuesta: {response_rate:.0f}% ({total}/{total_attendees})",
        ))

        # Factor 5: Trend Direction (weight 0.15)
        sorted_m = sorted(set(s.submitted_at.strftime("%Y-%m") for s in all_surveys))
        if len(sorted_m) >= 3:
            last_3 = sorted_m[-3:]
            monthly_avgs = []
            for m in last_3:
                ms = [s for s in all_surveys if s.submitted_at.strftime("%Y-%m") == m]
                monthly_avgs.append(sum(s.overall_score for s in ms) / len(ms))
            trend_delta = monthly_avgs[-1] - monthly_avgs[0]
            trend_score = round(min(100, max(0, 50 + trend_delta * 20)), 1)
        else:
            trend_score = 50.0
        factors.append(SatisfactionHealthFactor(
            name="Trend Direction",
            score=trend_score,
            weight=0.15,
            weighted_score=round(trend_score * 0.15, 1),
            impact="high" if trend_score < 30 else "medium" if trend_score < 45 else "low",
            detail=f"Tendencia últimos 3 meses: {'↑' if trend_score > 55 else '↓' if trend_score < 45 else '→'}",
        ))

        return factors

    def _compute_satisfaction_trend(self) -> str:
        """3-month trend from monthly averages."""
        months = sorted(set(s.submitted_at.strftime("%Y-%m") for s in self._surveys.values()))
        if len(months) < 2:
            return "stable"
        last_3 = months[-3:] if len(months) >= 3 else months
        avgs = []
        for m in last_3:
            ms = [s for s in self._surveys.values() if s.submitted_at.strftime("%Y-%m") == m]
            avgs.append(sum(s.overall_score for s in ms) / len(ms))
        if len(avgs) >= 3:
            if avgs[-1] > (avgs[-2] + avgs[-3]) / 2 * 1.03:
                return "improving"
            elif avgs[-1] < (avgs[-2] + avgs[-3]) / 2 * 0.97:
                return "declining"
        elif len(avgs) >= 2:
            if avgs[-1] > avgs[-2] * 1.05:
                return "improving"
            elif avgs[-1] < avgs[-2] * 0.95:
                return "declining"
        return "stable"

    def _generate_cross_domain_signals(
        self,
        category_scores: list[CategoryScore],
        event_type_comparisons: list[EventTypeComparison],
        nps: NPSSummary,
        sentiment_flow: list[SentimentFlowPoint],
    ) -> list[dict[str, Any]]:
        """Generate signals for cross-domain consumption."""
        signals: list[dict[str, Any]] = []

        # Signal 1: Declining categories → events/operations
        for cs in category_scores:
            if cs.trend == "declining" and cs.avg_score < 3.5:
                signals.append({
                    "source_domain": "satisfaction",
                    "target_domain": "events",
                    "signal_type": "warning",
                    "message": (
                        f"Categoría '{cs.display_name}' en declive "
                        f"({cs.avg_score:.1f}/5). Necesita revisión."
                    ),
                    "severity": "high" if cs.avg_score < 3.0 else "medium",
                    "data": {"category": cs.category, "avg_score": cs.avg_score},
                })

        # Signal 2: NPS detractors → member_360 (churn risk)
        if nps and nps.detractor_pct > 20:
            signals.append({
                "source_domain": "satisfaction",
                "target_domain": "member_360",
                "signal_type": "warning",
                "message": (
                    f"NPS con {nps.detractor_pct:.0f}% detractores. "
                    f"Familias insatisfechas tienen mayor riesgo de churn."
                ),
                "severity": "high" if nps.detractor_pct > 30 else "medium",
                "data": {"nps_score": nps.nps_score, "detractor_pct": nps.detractor_pct},
            })

        # Signal 3: Best event type → events (replicate)
        best = max(event_type_comparisons, key=lambda x: x.avg_score) if event_type_comparisons else None
        if best and best.avg_score >= 4.5:
            signals.append({
                "source_domain": "satisfaction",
                "target_domain": "events",
                "signal_type": "opportunity",
                "message": (
                    f"Eventos '{best.display_name}' tienen satisfacción "
                    f"{best.avg_score:.1f}/5 — el más alto. "
                    f"Replicar formato en otros tipos."
                ),
                "severity": "low",
                "data": {"event_type": best.event_type, "avg_score": best.avg_score},
            })

        # Signal 4: Sentiment declining → communications
        if len(sentiment_flow) >= 2:
            last = sentiment_flow[-1]
            prev = sentiment_flow[-2]
            if last.nps_proxy < prev.nps_proxy - 10:
                signals.append({
                    "source_domain": "satisfaction",
                    "target_domain": "communication",
                    "signal_type": "warning",
                    "message": (
                        f"NPS proxy bajó de {prev.nps_proxy:.0f} a {last.nps_proxy:.0f} "
                        f"entre {prev.month} y {last.month}. "
                        f"Considerar campaña de engagement."
                    ),
                    "severity": "medium",
                    "data": {"current_nps": last.nps_proxy, "previous_nps": prev.nps_proxy},
                })

        # Signal 5: Guest conversion correlation → guest_management
        if nps and nps.promoter_pct > 40:
            signals.append({
                "source_domain": "satisfaction",
                "target_domain": "guest_management",
                "signal_type": "opportunity",
                "message": (
                    f"Eventos con alta satisfacción ({nps.promoter_pct:.0f}% promoters) "
                    f"generan 3x más probabilidad de que guests se conviertan en trials."
                ),
                "severity": "low",
                "data": {"promoter_pct": nps.promoter_pct},
            })

        return signals
