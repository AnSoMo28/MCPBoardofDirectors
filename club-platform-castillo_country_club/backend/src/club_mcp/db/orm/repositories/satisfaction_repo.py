"""SatisfactionRepository async — los 3 dicts se vuelven 3 tablas.

Ola 2.1-septima (vertical satisfaction). Contrato EXACTO del módulo
in-memory que reemplaza (club_mcp.db.repositories.satisfaction_repo)
— mismos 10 métodos, mismas firmas, mismos Pydantic de salida, mismo
comportamiento de error (None / lista vacía / dict — el in-memory no
define excepciones custom y el ORM tampoco las inventa):

    save_survey / get_surveys_by_event / get_surveys_by_family /
    save_satisfaction_report / get_satisfaction_report /
    get_satisfaction_trends / get_health_score /
    get_satisfaction_intelligence / get_satisfaction_benchmarks /
    generate_engagement_proposals

Mismas decisiones que family/engagement/event/compliance/guest (§3.8 y
siguientes): engine por inyección · session_scope transaccional ·
devuelve Pydantic (SQLAlchemy no sube) · ids de la MISMA forma que el
in-memory (uuid4().hex[:8] SIN prefijo — el contrato no cambia ni un
byte).

La séptima es async-FIRST como la sexta (drop-in total): el
in-memory ya es 10/10 async y el agente YA awaited sus 13 call sites
(verificado por grep — 0 privados tocados: contrato limpio).

Semántica literal del in-memory que se preserva:
  * save_survey / save_satisfaction_report: INSERT puro (el in-memory
    reemplazaba por id — misma semántica de upsert por clave).
  * get_satisfaction_report: PRIMER reporte cuyo event_id calza (el
    in-memory iteraba .values() y devolvía el primero — mismo orden).
  * get_surveys_by_event / by_family: filtro por igualdad.
  * get_satisfaction_trends: filtro últimos N meses + ventana de 3
    meses (avg_last vs avg_first_half*1.03/0.97) — MISMA aritmética.
  * compute (health 5 factores · intelligence · benchmarks · P1-P5):
    MISMA aritmética byte a byte del in-memory, aplicada sobre los
    rows de las TABLAS en UNA sesión de lectura por método. Sin
    _event_metadata en memoria: lee satisfaction_event_metadata de la
    base (metadata sin filas → mismo contrato observable que el
    in-memory sin seed).
  * _BENCHMARKS CR: constante de CLASE del in-memory — se copia como
    constante de módulo (mismos valores, ni un decimal distinto).
"""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any
from uuid import uuid4

from sqlalchemy import select

from club_mcp.db.orm.satisfaction_orm import (
    EventSatisfactionReportORM,
    SatisfactionEventMetadataORM,
    SatisfactionSurveyORM,
)
from club_mcp.db.orm.session import session_scope
from club_mcp.models.satisfaction import (
    CategoryScore,
    EventSatisfactionReport,
    EventTypeComparison,
    NPSSummary,
    SatisfactionBenchmark,
    SatisfactionBenchmarkReport,
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


if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncEngine

logger = logging.getLogger(__name__)

# CR private club benchmarks — constante de clase del in-memory (0 cambios).
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


def _gen_id() -> str:
    """MISMA generación que el in-memory (uuid4().hex[:8] sin prefijo)."""
    return uuid4().hex[:8]


# ── helpers de reconstrucción (ORM → Pydantic) ──


def _questions_from_json(raw: list[dict[str, Any]]) -> list[SurveyQuestion]:
    return [
        SurveyQuestion(
            category=q["category"],
            question_text=q.get("question_text", ""),
            rating=q.get("rating", 3),
            weight=q.get("weight", 1.0),
        )
        for q in (raw or [])
    ]


def _survey_from_orm(r: SatisfactionSurveyORM) -> SatisfactionSurvey:
    return SatisfactionSurvey(
        survey_id=r.survey_id,
        event_id=r.event_id,
        family_id=r.family_id,
        event_type=r.event_type or "",
        event_name=r.event_name or "",
        event_date=r.event_date or "",
        questions=_questions_from_json(r.questions),
        comment=r.comment or "",
        ai_assisted_comment=r.ai_assisted_comment or "",
        submitted_at=r.submitted_at,
        overall_score=r.overall_score,
        sentiment=r.sentiment or "",
        sentiment_score=r.sentiment_score,
    )


def _report_from_orm(r: EventSatisfactionReportORM) -> EventSatisfactionReport:
    return EventSatisfactionReport(
        report_id=r.report_id,
        event_id=r.event_id,
        event_name=r.event_name or "",
        total_responses=r.total_responses,
        response_rate_pct=r.response_rate_pct,
        overall_avg=r.overall_avg,
        category_averages=dict(r.category_averages or {}),
        sentiment_distribution=dict(r.sentiment_distribution or {}),
        sentiment_trend=r.sentiment_trend or "",
        top_praises=list(r.top_praises or []),
        top_improvements=list(r.top_improvements or []),
        ai_recommendations=list(r.ai_recommendations or []),
        key_quotes=list(r.key_quotes or []),
        generated_at=r.generated_at,
    )


def _compute_sentiment_static(score: float) -> tuple[str, float]:
    """MISMA función del in-memory (_compute_sentiment_static)."""
    if score >= 4.0:
        return "positive", min(1.0, (score - 3.0) / 2.0)
    if score >= 3.0:
        return "neutral", round((score - 3.0) / 2.0, 2)
    return "negative", max(-1.0, (score - 3.0) / 2.0)


async def _load_surveys(s: Any) -> list[SatisfactionSurveyORM]:
    return list(
        (await s.execute(select(SatisfactionSurveyORM))).scalars().all()
    )


async def _load_reports(s: Any) -> list[EventSatisfactionReportORM]:
    return list(
        (await s.execute(select(EventSatisfactionReportORM))).scalars().all()
    )


async def _load_metadata(s: Any) -> dict[str, dict[str, str]]:
    rows = (
        (await s.execute(select(SatisfactionEventMetadataORM))).scalars().all()
    )
    return {
        r.event_id: {
            "name": r.name or "",
            "type": r.type or "",
            "date": r.date or "",
            "attendees": str(r.attendees or 0),
        }
        for r in rows
    }


class SatisfactionRepository:
    """Repo ORM async — contrato EXACTO del in-memory (10 métodos)."""

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine

    # ── Surveys ──────────────────────────────────────────────

    async def save_survey(
        self, survey: SatisfactionSurvey
    ) -> SatisfactionSurvey:
        """INSERT (upsert por survey_id — misma semántica del dict)."""
        questions = [
            {
                "category": q.category.value
                if hasattr(q.category, "value")
                else q.category,
                "question_text": q.question_text,
                "rating": q.rating,
                "weight": q.weight,
            }
            for q in survey.questions
        ]
        record = SatisfactionSurveyORM(
            survey_id=survey.survey_id or _gen_id(),
            event_id=survey.event_id,
            family_id=survey.family_id,
            event_type=survey.event_type or "",
            event_name=survey.event_name or "",
            event_date=survey.event_date or "",
            questions=questions,
            comment=survey.comment or "",
            ai_assisted_comment=survey.ai_assisted_comment or "",
            submitted_at=survey.submitted_at,
            overall_score=survey.overall_score,
            sentiment=survey.sentiment or "",
            sentiment_score=survey.sentiment_score,
        )
        async with session_scope(self._engine) as s:
            existing = await s.get(
                SatisfactionSurveyORM, record.survey_id
            )
            if existing is not None:
                await s.delete(existing)
            s.add(record)
        return _survey_from_orm(record)

    async def get_surveys_by_event(
        self, event_id: str
    ) -> list[SatisfactionSurvey]:
        # ojo: el orden de inserción ES el orden del dict in-memory
        async with session_scope(self._engine) as s:
            rows = await _load_surveys(s)
            return [
                _survey_from_orm(r) for r in rows if r.event_id == event_id
            ]

    async def get_surveys_by_family(
        self, family_id: str
    ) -> list[SatisfactionSurvey]:
        async with session_scope(self._engine) as s:
            rows = await _load_surveys(s)
            return [
                _survey_from_orm(r) for r in rows if r.family_id == family_id
            ]

    # ── Reports ──────────────────────────────────────────────

    async def save_satisfaction_report(
        self, report: EventSatisfactionReport
    ) -> EventSatisfactionReport:
        record = EventSatisfactionReportORM(
            report_id=report.report_id or _gen_id(),
            event_id=report.event_id,
            event_name=report.event_name or "",
            total_responses=report.total_responses,
            response_rate_pct=report.response_rate_pct,
            overall_avg=report.overall_avg,
            category_averages=dict(report.category_averages or {}),
            sentiment_distribution=dict(report.sentiment_distribution or {}),
            sentiment_trend=report.sentiment_trend or "",
            top_praises=list(report.top_praises or []),
            top_improvements=list(report.top_improvements or []),
            ai_recommendations=list(report.ai_recommendations or []),
            key_quotes=list(report.key_quotes or []),
            generated_at=report.generated_at,
        )
        async with session_scope(self._engine) as s:
            existing = await s.get(
                EventSatisfactionReportORM, record.report_id
            )
            if existing is not None:
                await s.delete(existing)
            s.add(record)
        return _report_from_orm(record)

    async def get_satisfaction_report(
        self, event_id: str
    ) -> EventSatisfactionReport | None:
        async with session_scope(self._engine) as s:
            rows = await _load_reports(s)
            for r in rows:
                if r.event_id == event_id:
                    return _report_from_orm(r)
            return None

    # ── Trends (compute-on-read sobre TABLAS) ────────────────

    async def get_satisfaction_trends(
        self, months: int = 6
    ) -> dict[str, Any]:
        """MISMA aritmética del in-memory (filtro N meses + ventana 3)."""
        async with session_scope(self._engine) as s:
            surveys = [_survey_from_orm(r) for r in await _load_surveys(s)]

        by_month: dict[str, list[float]] = {}
        by_month_cats: dict[str, dict[str, list[float]]] = {}

        for survey in surveys:
            month_key = survey.submitted_at.strftime("%Y-%m")
            by_month.setdefault(month_key, []).append(survey.overall_score)
            for q in survey.questions:
                cat_m = by_month_cats.setdefault(month_key, {})
                cat_m.setdefault(q.category.value, []).append(q.rating)

        sorted_months = sorted(by_month.keys())
        filtered_months = sorted_months[-months:]
        filtered_averages = {
            m: round(sum(by_month[m]) / len(by_month[m]), 2)
            for m in filtered_months
            if m in by_month
        }

        category_trends: dict[str, list[float]] = {}
        for m in filtered_months:
            cats = by_month_cats.get(m, {})
            for cat, scores in cats.items():
                category_trends.setdefault(cat, []).append(
                    round(sum(scores) / len(scores), 2)
                )

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
            "total_surveys": len(surveys),
            "months_analyzed": len(filtered_averages),
            "months_requested": months,
        }

    # ── Intelligence (compute-on-read) ───────────────────────

    async def get_health_score(self) -> SatisfactionHealthScore:
        """MISMA aritmética: 5 factores ponderados + nivel + trend."""
        async with session_scope(self._engine) as s:
            surveys = [_survey_from_orm(r) for r in await _load_surveys(s)]
            metadata = await _load_metadata(s)

        factors = self._compute_health_factors(surveys, metadata)
        total = round(sum(f.weighted_score for f in factors), 1)
        level = (
            SatisfactionHealthLevel.EXCELLENT if total >= 85
            else SatisfactionHealthLevel.HEALTHY if total >= 65
            else SatisfactionHealthLevel.ATTENTION if total >= 45
            else SatisfactionHealthLevel.CRITICAL
        )
        trend = self._compute_satisfaction_trend(surveys)
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
        """MISMA aritmética del dashboard de inteligencia."""
        async with session_scope(self._engine) as s:
            surveys = [_survey_from_orm(r) for r in await _load_surveys(s)]
            metadata = await _load_metadata(s)

        if not surveys:
            return SatisfactionIntelligence()

        total = len(surveys)
        overall_avg = round(
            sum(sv.overall_score for sv in surveys) / total, 2
        )

        total_attendees = sum(
            int(m.get("attendees", 0)) for m in metadata.values()
        )
        response_rate = round(total / max(total_attendees, 1) * 100, 1)
        events_surveyed = len({sv.event_id for sv in surveys})

        # Category scores — MISMA lógica (trend por mitades de eventos)
        cat_data: dict[str, dict[str, Any]] = {}
        for sv in surveys:
            for q in sv.questions:
                entry = cat_data.setdefault(q.category.value, {
                    "scores": [], "events": {}, "best": ("", 0.0), "worst": ("", 5.0),
                })
                entry["scores"].append(q.rating)
                entry["events"].setdefault(sv.event_id, []).append(q.rating)

        category_scores: list[CategoryScore] = []
        for cat, data in cat_data.items():
            avg = round(sum(data["scores"]) / len(data["scores"]), 2)
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
                best_event=metadata.get(best_event[0], {}).get("name", best_event[0]),
                worst_event=metadata.get(worst_event[0], {}).get("name", worst_event[0]),
                vs_club_avg=round(avg - overall_avg, 2),
            ))

        # Event type comparison — MISMA lógica
        etype_data: dict[str, list[SatisfactionSurvey]] = {}
        for sv in surveys:
            etype_data.setdefault(sv.event_type, []).append(sv)

        event_type_comparisons: list[EventTypeComparison] = []
        etype_display = {
            "corporate": "Corporativo", "wedding": "Boda",
            "birthday": "Cumpleaños", "baptism": "Bautizo",
            "anniversary": "Aniversario", "quinceanera": "Quinceañera",
            "other": "Otro",
        }
        for etype, et_surveys in etype_data.items():
            avg = round(sum(sv.overall_score for sv in et_surveys) / len(et_surveys), 2)
            sent_dist = {"positive": 0, "neutral": 0, "negative": 0}
            for sv in et_surveys:
                if sv.sentiment in sent_dist:
                    sent_dist[sv.sentiment] += 1

            etype_cats: dict[str, list[float]] = {}
            for sv in et_surveys:
                for q in sv.questions:
                    etype_cats.setdefault(q.category.value, []).append(q.rating)
            best_cat = max(etype_cats.items(), key=lambda x: sum(x[1]) / len(x[1]))[0] if etype_cats else ""
            worst_cat = min(etype_cats.items(), key=lambda x: sum(x[1]) / len(x[1]))[0] if etype_cats else ""

            sorted_s = sorted(et_surveys, key=lambda sv: sv.submitted_at)
            mid = len(sorted_s) // 2
            first_avg = sum(sv.overall_score for sv in sorted_s[:mid]) / max(mid, 1)
            second_avg = sum(sv.overall_score for sv in sorted_s[mid:]) / max(len(sorted_s) - mid, 1)
            trend = "stable"
            if second_avg > first_avg * 1.05:
                trend = "improving"
            elif second_avg < first_avg * 0.95:
                trend = "declining"

            event_type_comparisons.append(EventTypeComparison(
                event_type=etype,
                display_name=etype_display.get(etype, etype),
                event_count=len({sv.event_id for sv in et_surveys}),
                avg_score=avg,
                total_responses=len(et_surveys),
                sentiment_breakdown=sent_dist,
                best_category=best_cat,
                worst_category=worst_cat,
                vs_club_avg=round(avg - overall_avg, 2),
                trend=trend,
            ))

        # Sentiment flow (monthly) — MISMA lógica
        by_month: dict[str, list[SatisfactionSurvey]] = {}
        for sv in surveys:
            month = sv.submitted_at.strftime("%Y-%m")
            by_month.setdefault(month, []).append(sv)

        sentiment_flow: list[SentimentFlowPoint] = []
        for month in sorted(by_month.keys()):
            ms = by_month[month]
            avg = sum(sv.overall_score for sv in ms) / len(ms)
            pos = sum(1 for sv in ms if sv.sentiment == "positive")
            neg = sum(1 for sv in ms if sv.sentiment == "negative")
            neu = sum(1 for sv in ms if sv.sentiment == "neutral")
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

        # NPS Summary — MISMA lógica
        promoters = sum(1 for sv in surveys if sv.overall_score >= 4.5)
        passives = sum(1 for s in surveys if 3.0 <= sv.overall_score < 4.5)
        detractors = sum(1 for sv in surveys if sv.overall_score < 3.0)
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

        # Cross-domain signals — MISMA lógica
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
        """MISMA aritmética: club avg vs _BENCHMARKS CR."""
        async with session_scope(self._engine) as s:
            surveys = [_survey_from_orm(r) for r in await _load_surveys(s)]
            metadata = await _load_metadata(s)

        if not surveys:
            return SatisfactionBenchmarkReport()

        overall_avg = sum(sv.overall_score for sv in surveys) / len(surveys)
        total_attendees = sum(int(m.get("attendees", 0)) for m in metadata.values())
        response_rate = len(surveys) / max(total_attendees, 1) * 100

        def _status(current: float, benchmark: float) -> str:
            ratio = current / max(benchmark, 0.1)
            if ratio >= 1.0:
                return "on_track"
            elif ratio >= 0.85:
                return "needs_attention"
            return "critical"

        overall_benchmarks = [
            SatisfactionBenchmark(
                metric="Satisfacción General",
                current_value=round(overall_avg, 2),
                club_average=round(overall_avg, 2),
                benchmark_value=_BENCHMARKS["overall"],
                vs_club=0.0,
                vs_benchmark=round(overall_avg - _BENCHMARKS["overall"], 2),
                status=_status(overall_avg, _BENCHMARKS["overall"]),
            ),
            SatisfactionBenchmark(
                metric="Tasa de Respuesta",
                current_value=round(response_rate, 1),
                club_average=round(response_rate, 1),
                benchmark_value=_BENCHMARKS["response_rate"],
                vs_club=0.0,
                vs_benchmark=round(response_rate - _BENCHMARKS["response_rate"], 1),
                status=_status(response_rate, _BENCHMARKS["response_rate"]),
            ),
        ]

        cat_scores: dict[str, list[float]] = {}
        for sv in surveys:
            for q in sv.questions:
                cat_scores.setdefault(q.category.value, []).append(q.rating)

        category_benchmarks: list[SatisfactionBenchmark] = []
        for cat, scores in cat_scores.items():
            avg = sum(scores) / len(scores)
            bm = _BENCHMARKS.get(cat, 4.0)
            category_benchmarks.append(SatisfactionBenchmark(
                metric=cat,
                current_value=round(avg, 2),
                club_average=round(overall_avg, 2),
                benchmark_value=bm,
                vs_club=round(avg - overall_avg, 2),
                vs_benchmark=round(avg - bm, 2),
                status=_status(avg, bm),
            ))

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

        etype_data: dict[str, list[float]] = {}
        for sv in surveys:
            etype_data.setdefault(sv.event_type, []).append(sv.overall_score)

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
                benchmark_value=_BENCHMARKS["overall"],
                vs_club=round(avg - overall_avg, 2),
                vs_benchmark=round(avg - _BENCHMARKS["overall"], 2),
                status=_status(avg, _BENCHMARKS["overall"]),
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
        """MISMA aritmética: propuestas P1-P5 sobre rows de TABLAS."""
        async with session_scope(self._engine) as s:
            surveys = [_survey_from_orm(r) for r in await _load_surveys(s)]
            metadata = await _load_metadata(s)

        proposals: list[SatisfactionEngagementProposal] = []

        if not surveys:
            return SatisfactionEngagementProposalList()

        # Category analysis
        cat_data: dict[str, dict[str, Any]] = {}
        for sv in surveys:
            for q in sv.questions:
                entry = cat_data.setdefault(q.category.value, {
                    "scores": [], "events": set(), "declining": True,
                })
                entry["scores"].append(q.rating)
                entry["events"].add(sv.event_id)

        # (overall_avg del in-memory se omitió: sin uso en este método — F841)

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
                        f"benchmark CR ({_BENCHMARKS['food']}). "
                        f"Afecta {len(food_data.get('events', set()))} eventos. "
                        f"Recomendación: evaluar proveedores de catering, "
                        f"revisar menú con chef, y considerar degustación previa."
                    ),
                    target_category="food",
                    priority="high",
                    impact="high",
                    confidence=0.90,
                    cross_domain_signals=[
                        f"Food avg: {food_avg:.1f}/5 (benchmark: {_BENCHMARKS['food']})",
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
        for sv in surveys:
            etype_scores.setdefault(sv.event_type, []).append(sv.overall_score)

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
        surveyed_events = {sv.event_id for sv in surveys}
        all_events = set(metadata.keys())
        unsurveyed = all_events - surveyed_events
        if unsurveyed:
            event_names = [
                metadata.get(eid, {}).get("name", eid)
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
        all_surveys_sorted = sorted(surveys, key=lambda sv: sv.submitted_at)
        recent = all_surveys_sorted[-10:]  # last 10 surveys
        recent_neg = [sv for sv in recent if sv.sentiment == "negative"]
        if recent_neg:
            proposals.append(SatisfactionEngagementProposal(
                proposal_type=SatisfactionProposalType.EVENT_REDESIGN,
                title=f"{len(recent_neg)} encuestas negativas recientes — acción de recuperación",
                description=(
                    f"Las {len(recent_neg)} encuestas negativas más recientes "
                    f"tienen un promedio de {sum(sv.overall_score for sv in recent_neg) / len(recent_neg):.1f}/5.0. "
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
                        "family_ids": list({sv.family_id for sv in recent_neg}),
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

    # ── Internal Helpers (MISMA aritmética, sobre rows) ──────

    def _compute_health_factors(
        self,
        surveys: list[SatisfactionSurvey],
        metadata: dict[str, dict[str, str]],
    ) -> list[SatisfactionHealthFactor]:
        """Compute 5 weighted health factors — MISMA aritmética."""
        factors: list[SatisfactionHealthFactor] = []

        if not surveys:
            return [SatisfactionHealthFactor(
                name="No Data", score=0, weight=1.0,
                weighted_score=0, impact="high", detail="Sin encuestas",
            )]

        total = len(surveys)
        overall_avg = sum(sv.overall_score for sv in surveys) / total

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
        cat_avgs: dict[str, list[float]] = {}
        for sv in surveys:
            for q in sv.questions:
                cat_avgs.setdefault(q.category.value, []).append(q.rating)
        cat_means = {c: sum(v) / len(v) for c, v in cat_avgs.items() if v}
        if cat_means:
            min_cat = min(cat_means.values())
            max_cat = max(cat_means.values())
            spread = max_cat - min_cat
            balance_score = round(max(0, 100 - spread * 30), 1)
        else:
            spread = 0.0
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
        pos = sum(1 for sv in surveys if sv.sentiment == "positive")
        neg = sum(1 for sv in surveys if sv.sentiment == "negative")
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
        total_attendees = sum(int(m.get("attendees", 0)) for m in metadata.values())
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
        sorted_m = sorted({sv.submitted_at.strftime("%Y-%m") for s in surveys})
        if len(sorted_m) >= 3:
            last_3 = sorted_m[-3:]
            monthly_avgs = []
            for m in last_3:
                ms = [sv for sv in surveys if sv.submitted_at.strftime("%Y-%m") == m]
                monthly_avgs.append(sum(sv.overall_score for sv in ms) / len(ms))
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

    def _compute_satisfaction_trend(
        self, surveys: list[SatisfactionSurvey]
    ) -> str:
        """3-month trend from monthly averages — MISMA aritmética."""
        months = sorted({sv.submitted_at.strftime("%Y-%m") for sv in surveys})
        if len(months) < 2:
            return "stable"
        last_3 = months[-3:] if len(months) >= 3 else months
        avgs = []
        for m in last_3:
            ms = [sv for sv in surveys if sv.submitted_at.strftime("%Y-%m") == m]
            avgs.append(sum(sv.overall_score for sv in ms) / len(ms))
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
        """Generate signals for cross-domain consumption — MISMA lógica."""
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
