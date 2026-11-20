"""Tablas del dominio Executive Dashboard — Ola 2.1-décima
(vertical executive_dashboard).

Espejo 1:1 de club_mcp.models.executive_dashboard (Pydantic). Los 5
stores del repo in-memory (verificado contra executive_dashboard_repo.py):

    _summaries:     dict[str, dict] by id        → executive_summaries
    _anomalies:     dict[str, dict] by id        → executive_anomalies
    _board_reports: dict[str, dict] by id        → executive_board_reports
    _risk_matrices: dict[str, dict] by PERIOD    → executive_risk_matrices
    _exports:       dict[str, dict] by id        → executive_exports

OJO risk_matrices: el in-memory indexa POR PERIOD (no por id) — la
tabla usa period como primary key para reproducir el MISMO contrato
observable (create sobre período existente = overwrite, get por
período). Los contados derivados (total_risks/critical/high/medium/
low) NUNCA se almacenan: se recalculan al leer (compute-on-read —
"derived counts never stored stale", comentario literal del
in-memory).

Los enums del dominio (DashboardPeriod · ReportQuarter · ExportFormat
· ReportAudience · AnomalyDomain · AnomalySeverity · TrendDirection)
NO son constraint CHECK: el repo guarda .value en String(32) y
reconstruye el Pydantic enum al leer — el contrato del agente pasa
enums; un CHECK duplicaría la validación que Pydantic ya hace en el
borde (mismo estilo que las 9 verticales previas §3.8..§3.8-NONA).

Los KPIs anidados y listas de strings (membership/financial/
operational/engagement · strategic_recommendations · risk_assessment ·
context · top_revenue_sources · top_activities · items del risk) van a
JSONB por fila: anexos del agregado, no entidades con identity propia
— mismo criterio que families.activities (§3.8-bis) hasta
cultural_social.entertainment_ids (§3.8-NONA).

IDs: el in-memory genera uuid4().hex[:8] SIN prefijo (_gen_id
staticmethod) para board_reports y exports; summaries y anomalies
llegan con id PROPIO del agente (summary_id = timestamp
strftime; anom_<domain>_001 DUPLICABLE entre runs — el dict hacía
overwrite; el ORM reproduce con ON CONFLICT DO UPDATE). Sin
excepciones custom (el in-memory devuelve None / listas vacías; el
ORM idéntico).

created_at / updated_at / date_from / date_to / identified_at /
review_date: el in-memory persiste ISO strings; columnas Text que
guardan el MISMO string — roundtrip pérdida cero (el contrato del
agente compara strings, no datetimes).
"""
from __future__ import annotations

from typing import Any

from sqlalchemy import JSON, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from club_mcp.db.orm.base import Base


# JSONB en postgres, JSON en sqlite (dev/suite local): misma API.
# (idéntico a families §3.8-bis ... cultural_social §3.8-NONA).
JSONType = JSONB().with_variant(JSON(), "sqlite")


class ExecutiveSummaryORM(Base):
    """Snapshot de KPIs — espejo de ExecutiveSummary (Pydantic).

    Los 4 KPIs anidados (membership/financial/operational/engagement)
    y trends van a JSONB: el in-memory los guardaba como dicts planos
    del model_dump — mismas claves, mismo roundtrip.
    """

    __tablename__ = "executive_summaries"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    period: Mapped[str] = mapped_column(String(32), nullable=False)
    date_from: Mapped[str] = mapped_column(Text, nullable=False, default="")
    date_to: Mapped[str] = mapped_column(Text, nullable=False, default="")
    membership: Mapped[dict[str, Any]] = mapped_column(
        JSONType, nullable=False, default=dict
    )
    financial: Mapped[dict[str, Any]] = mapped_column(
        JSONType, nullable=False, default=dict
    )
    operational: Mapped[dict[str, Any]] = mapped_column(
        JSONType, nullable=False, default=dict
    )
    engagement: Mapped[dict[str, Any]] = mapped_column(
        JSONType, nullable=False, default=dict
    )
    trends: Mapped[dict[str, Any]] = mapped_column(
        JSONType, nullable=False, default=dict
    )
    created_at: Mapped[str] = mapped_column(Text, nullable=False, default="")


class ExecutiveAnomalyORM(Base):
    """Anomalía detectada — espejo de Anomaly (Pydantic).

    id DUPLICABLE entre runs (anom_<domain>_001): el dict in-memory
    hacia overwrite; el repo ORM reproduce con ON CONFLICT (id) DO
    UPDATE — MISMO contrato observable.
    """

    __tablename__ = "executive_anomalies"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    domain: Mapped[str] = mapped_column(String(32), nullable=False)
    severity: Mapped[str] = mapped_column(String(32), nullable=False)
    title: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    context: Mapped[dict[str, Any]] = mapped_column(
        JSONType, nullable=False, default=dict
    )
    suggested_action: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[str] = mapped_column(Text, nullable=False, default="")


class ExecutiveBoardReportORM(Base):
    """Informe de junta — espejo de BoardReport (Pydantic).

    list[str] (strategic_recommendations · risk_assessment) a JSONB:
    anexos del agregado (criterio families §3.8-bis).
    """

    __tablename__ = "executive_board_reports"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    quarter: Mapped[str] = mapped_column(String(32), nullable=False)
    executive_summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    membership_analysis: Mapped[str] = mapped_column(Text, nullable=False, default="")
    financial_performance: Mapped[str] = mapped_column(Text, nullable=False, default="")
    operational_excellence: Mapped[str] = mapped_column(Text, nullable=False, default="")
    member_satisfaction: Mapped[str] = mapped_column(Text, nullable=False, default="")
    strategic_recommendations: Mapped[list[str]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    risk_assessment: Mapped[list[str]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    outlook: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    created_at: Mapped[str] = mapped_column(Text, nullable=False, default="")
    updated_at: Mapped[str] = mapped_column(Text, nullable=False, default="")


class ExecutiveRiskMatrixORM(Base):
    """Matriz de riesgo 4x4 — espejo del store por PERIOD.

    PERIOD es la primary key (el in-memory indexa por período, no por
    id): create sobre período existente = overwrite. items va a JSONB
    (lista de RiskItem dicts); los contados derivados NO se almacenan
    — compute-on-read al reconstruir RiskMatrix.
    """

    __tablename__ = "executive_risk_matrices"

    period: Mapped[str] = mapped_column(String(64), primary_key=True)
    items: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    created_at: Mapped[str] = mapped_column(Text, nullable=False, default="")
    updated_at: Mapped[str] = mapped_column(Text, nullable=False, default="")


class ExecutiveExportORM(Base):
    """Solicitud de export — espejo de ExportRequest (Pydantic)."""

    __tablename__ = "executive_exports"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    report_type: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    export_format: Mapped[str] = mapped_column(String(32), nullable=False)
    audience: Mapped[str] = mapped_column(String(32), nullable=False, default="internal")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    file_path: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[str] = mapped_column(Text, nullable=False, default="")
    updated_at: Mapped[str] = mapped_column(Text, nullable=False, default="")
