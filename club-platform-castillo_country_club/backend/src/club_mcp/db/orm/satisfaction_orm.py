"""Tablas del dominio Satisfaction — Ola 2.1-septima (vertical satisfaction).

Espejo 1:1 de club_mcp.models.satisfaction (Pydantic). Las 3 entidades
del repo in-memory (verificar contra satisfaction_repo.py):

    _surveys:         dict[str, SatisfactionSurvey]      → tabla satisfaction_surveys
    _reports:          dict[str, EventSatisfactionReport] → tabla satisfaction_reports
    _event_metadata:   dict[str, dict[str, str]]         → tabla satisfaction_event_metadata

Las preguntas de la encuesta (list[SurveyQuestion]) a JSONB por fila:
anexos del agregado, no entidades con identity propia — mismo criterio
que families.activities (§3.8-bis), engagement.favorite_activities
(§3.8-tris) y guests.privileges (§3.8-SEXTA).

`event_metadata`: el in-memory lo poblaba con `_seed_event_metadata`
SOLO con seed_demo_data=True (el runtime lo instancia sin seed). La
tabla existe para que el deploy real pueda cargarla (dataset demo UNA
fuente, criterio 0011 — mismo rol que guest_monthly_snapshots) y que
response_rate / best_event / worst_event / P3-SURVEY_FOLLOW_UP lean de
la base y no de una constante en memoria. Sin filas, el repositorio
devuelve el MISMO contrato observable que el in-memory sin seed
(metadata vacía → response_rate sobre max(attendees, 1)).

IDs: el in-memory genera uuid4().hex[:8] SIN prefijo en survey_id y
report_id (default_factory del modelo Pydantic); el repo ORM reproduce
la MISMA forma. Sin excepciones custom (el in-memory devuelve None /
listas vacías; el ORM idéntico).

submitted_at / generated_at: el in-memory persistía datetimes
tz-aware UTC; columnas DateTime(timezone=True) — el roundtrip es
pérdida cero. `questions` reconstruye SurveyQuestion (enum por
SatisfactionCategory(cat)) al leer — el contrato del agente pasa
enums; el repo guarda .value y reconstruye (mismo estilo que las 6
verticales previas).
"""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import JSON, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from club_mcp.db.orm.base import Base


def utcnow() -> datetime:
    """now tz-aware UTC (misma fuente que el modelo in-memory)."""
    return datetime.now(tz=UTC)


# JSONB en postgres, JSON en sqlite (dev/suite local): misma API.
JSONType = JSONB().with_variant(JSON(), "sqlite")


class SatisfactionSurveyORM(Base):
    """Encuesta post-evento — espejo de SatisfactionSurvey (Pydantic)."""

    __tablename__ = "satisfaction_surveys"

    survey_id: Mapped[str] = mapped_column(String(16), primary_key=True)
    event_id: Mapped[str] = mapped_column(String(64), nullable=False)
    family_id: Mapped[str] = mapped_column(String(64), nullable=False)
    event_type: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    event_name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    event_date: Mapped[str] = mapped_column(String(10), nullable=False, default="")
    questions: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    comment: Mapped[str] = mapped_column(Text, nullable=False, default="")
    ai_assisted_comment: Mapped[str] = mapped_column(
        Text, nullable=False, default=""
    )
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    overall_score: Mapped[float] = mapped_column(nullable=False, default=0.0)
    sentiment: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    sentiment_score: Mapped[float] = mapped_column(nullable=False, default=0.0)


class EventSatisfactionReportORM(Base):
    """Reporte de satisfacción por evento — espejo de EventSatisfactionReport."""

    __tablename__ = "satisfaction_reports"

    report_id: Mapped[str] = mapped_column(String(16), primary_key=True)
    event_id: Mapped[str] = mapped_column(String(64), nullable=False)
    event_name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    total_responses: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    response_rate_pct: Mapped[float] = mapped_column(nullable=False, default=0.0)
    overall_avg: Mapped[float] = mapped_column(nullable=False, default=0.0)
    category_averages: Mapped[dict[str, Any]] = mapped_column(
        JSONType, nullable=False, default=dict
    )
    sentiment_distribution: Mapped[dict[str, Any]] = mapped_column(
        JSONType, nullable=False, default=dict
    )
    sentiment_trend: Mapped[str] = mapped_column(String(24), nullable=False, default="")
    top_praises: Mapped[list[str]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    top_improvements: Mapped[list[str]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    ai_recommendations: Mapped[list[str]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    key_quotes: Mapped[list[str]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )


class SatisfactionEventMetadataORM(Base):
    """Metadata de eventos encuestados (name/type/date/attendees).

    El in-memory la poblaba como constante de seed (solo
    seed_demo_data=True); tabla para que el deploy cargue el dataset
    (criterio 0011) y response_rate/P3 lean de la base.
    """

    __tablename__ = "satisfaction_event_metadata"

    event_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    type: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    date: Mapped[str] = mapped_column(String(10), nullable=False, default="")
    attendees: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
