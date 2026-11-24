"""Tablas del dominio LLM ops — Ola 3.2 (vertical llm_calls + presupuesto).

Espejo 1:1 de lo que ResilientClaudeService._acall() ya produce por
llamada (contorno G12 / Q-LLM-02 — la dict "usage" + banderas de
degradación), más el agregado diario que TokenUsageLedger acumulaba
en memoria de proceso:

    ledger._tokens/_calls por día  → tabla llm_usage_daily
    (cada llamada)                 → tabla llm_calls (append-only)

Dos decisiones de diseño (mismas que las 19 verticales §3.8):

  * llm_calls es APPEND-ONLY: nunca se edita una llamada — es el
    registro de auditoría de costos (la industria lo llama usage
    ledger / token ledger). El presupuesto se CONSULTA, no se muta.
  * llm_usage_daily es UPSERT por día (UNIQUE date_key): el día se
    acumula EN TABLA — eso es exactamente "el presupuesto sobrevive
    al restart", el cierre de Q-LLM-02 que G12 dejó como contorno
    ("persistencia real llega con PostgreSQL").

Columnas espejo del contrato observable (lo que _acall devuelve /
lo que OllamaFallback reporta):
    provider      "claude" | "ollama" (str plano — nunca CHECK,
                  lección 0017: enums .value al guardar, la lectura
                  reconstruye)
    model         settings.anthropic_model / ollama_fast_model
    input_tokens / output_tokens  int (Ollama reporta 0/0 — contorno
                  honesto heredado, NO se inventan tokens)
    degraded      bool (vía fallback) + provider_error str|null
                  (la degradación honesta de G12 — visible SIEMPRE)
    latency_ms    medición del wrapper (nueva: costo temporal de la
                  llamada — gratis de donde ya estamos midiendo)
    called_at     tz-aware UTC

Sin índices en el ORM: el alembic 0022 crea los dos explícitos
(estilo 0018 — la única vertical con índices no-PK fue approval;
estos son el mismo patrón: tabla de ledger SE CONSULTA por día y
se audita por rango temporal).

day date_key (YYYY-MM-DD str) + UNIQUE — llave natural del
presupuesto diario; el repo hace SELECT ... WHERE date_key=$today
con FOR UPDATE en la sesión transaccional (SQLAlchemy upsert
honrado a mano: read-modify-write dentro de session_scope, la
misma disciplina transaccional de los 19 repos).
"""
from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from club_mcp.db.orm.base import Base


def utcnow() -> datetime:
    """now tz-aware UTC (misma fuente que resilience.py)."""
    return datetime.now(tz=UTC)


# JSONB en postgres, JSON en sqlite (dev/suite local): misma API.
JSONType = JSONB().with_variant(JSON(), "sqlite")


class LLMCallLogORM(Base):
    """Una llamada LLM (éxito, degradada o fallida) — append-only."""

    __tablename__ = "llm_calls"

    call_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    model: Mapped[str] = mapped_column(String(128), nullable=False)
    input_tokens: Mapped[int] = mapped_column(Integer, nullable=False)
    output_tokens: Mapped[int] = mapped_column(Integer, nullable=False)
    degraded: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    provider_error: Mapped[str | None] = mapped_column(Text(), nullable=True)
    latency_ms: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    called_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    date_key: Mapped[str] = mapped_column(String(10), nullable=False)
    day: Mapped[str | None] = mapped_column(Text(), nullable=True)


class LLMUsageDailyORM(Base):
    """Presupuesto acumulado por día — el cierre de Q-LLM-02.

    tokens acumula input+output (misma aritmética de
    TokenUsageLedger.record: un token de entrada cuenta igual que
    uno de salida — fuente única de verdad, no se bifurca).
    """

    __tablename__ = "llm_usage_daily"
    __table_args__ = (UniqueConstraint("date_key", name="uq_llm_usage_daily_date"),)

    date_key: Mapped[str] = mapped_column(String(10), primary_key=True)
    tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    calls: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    day: Mapped[str | None] = mapped_column(Text(), nullable=True)
