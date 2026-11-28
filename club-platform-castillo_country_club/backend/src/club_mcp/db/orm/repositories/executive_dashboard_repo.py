"""ExecutiveDashboardRepository async — los 5 dicts se vuelven 5 tablas.

Ola 2.1-décima (vertical executive_dashboard). Contrato EXACTO del
módulo in-memory que reemplaza (club_mcp.db.repositories.
executive_dashboard_repo) — mismos 15 métodos, mismas firmas, mismos
Pydantic de salida, mismo comportamiento de error (None / lista
vacía — el in-memory no define excepciones custom y el ORM tampoco
las inventa).

La décima es async-FIRST como engagement/guest/satisfaction/
communication/cultural_social (drop-in total): el in-memory ya es
15/15 async y el agente YA awaited sus 9 call sites (verificado por
grep — 0 privados tocados: contrato limpio). get_summary /
list_summaries / get_board_report / list_anomalies / list_exports /
update_board_report / update_risk_matrix NO los usa el agente hoy
(los consume la suite del agente y el contrato público del repo):
se migran igual — el contrato no se recorta.

Mismas decisiones que las 9 verticales (§3.8..§3.8-NONA): engine por
inyección · session_scope transaccional · devuelve Pydantic
(SQLAlchemy no sube) · ids de la MISMA forma que el in-memory
(uuid4().hex[:8] SIN prefijo para board_reports/exports; summaries y
anomalies llegan con id PROPIO del agente).

Semántica literal del in-memory que se preserva:
  * save_summary / save_anomaly: INSERT puro por id — pero los ids
    de anomalía son DUPLICABLES entre runs (anom_<domain>_001): el
    dict hacía OVERWRITE de la clave; el ORM reproduce con
    select-then-update (upsert) — MISMO contrato observable.
  * create_board_report: id _gen_id · status "draft" · created_at/
    updated_at = now ISO.
  * update_board_report (updates: dict): record.update(updates) del
    dict plano — el ORM aplica setattr por clave conocida de
    columna (_UPDATABLE, id intocable) + updated_at=now; clave
    desconocida: el in-memory la guardaba en el dict (Pydantic la
    descartaba al reconstruir); el ORM la ignora — MISMO
    comportamiento observable.
  * risk_matrices: el in-memory indexa POR PERIOD (no por id) —
    create sobre período existente = overwrite completo (record
    nuevo con created_at fresh). Los contados derivados (total/
    critical/high/medium/low) NUNCA se almacenan stale: se
    recalculan al leer (compute-on-read — "derived counts never
    stored stale").
  * update_risk_matrix: items list (dict o RiskItem) → dicts planos
    + updated_at=now; devuelve el modelo recalculado.
  * create_export: id _gen_id · status "completed" · file_path
    f"/exports/{report_type}_{id}.{formato.value}" · created_at/
    updated_at = now.
  * get_*: None si no existe (sin excepciones).
  * list_*: filtros por igualdad EN Python sobre la tabla completa
    (chica) — MISMO orden de inserción, MISMO contrato observable
    que iterar .values() del in-memory (criterio sin-índice de
    communication §3.8-OCTAVA).
  * clear_anomalies: devuelve el count ANTES del DELETE ALL.
"""
from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any
from uuid import uuid4

from sqlalchemy import delete, select

from club_mcp.db.orm.executive_dashboard_orm import (
    ExecutiveAnomalyORM,
    ExecutiveBoardReportORM,
    ExecutiveExportORM,
    ExecutiveRiskMatrixORM,
    ExecutiveSummaryORM,
)
from club_mcp.db.orm.session import session_scope
from club_mcp.models.executive_dashboard import (
    Anomaly,
    AnomalyDomain,
    AnomalySeverity,
    BoardReport,
    CreateBoardReport,
    CreateRiskMatrix,
    DashboardPeriod,
    EngagementKPI,
    ExecutiveSummary,
    ExportFormat,
    ExportRequest,
    FinancialKPI,
    MembershipKPI,
    OperationalKPI,
    ReportAudience,
    ReportQuarter,
    RiskItem,
    RiskMatrix,
)


if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

logger = logging.getLogger(__name__)


def _gen_id() -> str:
    """MISMA generación que el in-memory (uuid4().hex[:8] sin prefijo)."""
    return uuid4().hex[:8]


def _utcnow_iso() -> str:
    """now ISO UTC — misma fuente que el in-memory (create_*)."""
    return datetime.now(tz=UTC).isoformat()


def _enum_val(v: Any) -> str:
    """Enum → .value; str pasa directo (mismo borde del in-memory)."""
    return v.value if hasattr(v, "value") else str(v)


# ── helpers de reconstrucción (ORM → Pydantic) ──


def _summary_from_orm(r: ExecutiveSummaryORM) -> ExecutiveSummary:
    return ExecutiveSummary(
        id=r.id,
        period=DashboardPeriod(r.period),
        date_from=r.date_from,
        date_to=r.date_to,
        membership=MembershipKPI(**dict(r.membership or {})),
        financial=FinancialKPI(**dict(r.financial or {})),
        operational=OperationalKPI(**dict(r.operational or {})),
        engagement=EngagementKPI(**dict(r.engagement or {})),
        trends=dict(r.trends or {}),
        created_at=r.created_at,
    )


def _anomaly_from_orm(r: ExecutiveAnomalyORM) -> Anomaly:
    return Anomaly(
        id=r.id,
        domain=AnomalyDomain(r.domain),
        severity=AnomalySeverity(r.severity),
        title=r.title,
        description=r.description,
        context=dict(r.context or {}),
        suggested_action=r.suggested_action,
        created_at=r.created_at,
    )


def _report_from_orm(r: ExecutiveBoardReportORM) -> BoardReport:
    return BoardReport(
        id=r.id,
        year=r.year,
        quarter=ReportQuarter(r.quarter),
        executive_summary=r.executive_summary,
        membership_analysis=r.membership_analysis,
        financial_performance=r.financial_performance,
        operational_excellence=r.operational_excellence,
        member_satisfaction=r.member_satisfaction,
        strategic_recommendations=list(r.strategic_recommendations or []),
        risk_assessment=list(r.risk_assessment or []),
        outlook=r.outlook,
        status=r.status,
        created_at=r.created_at,
        updated_at=r.updated_at,
    )


def _matrix_from_orm(r: ExecutiveRiskMatrixORM) -> RiskMatrix:
    """Compute-on-read: contados derivados recalculados, jamás stale."""
    items = [RiskItem(**i) for i in list(r.items or [])]
    levels: dict[str, int] = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for item in items:
        levels[item.level] = levels.get(item.level, 0) + 1
    return RiskMatrix(
        period=r.period,
        items=items,
        total_risks=len(items),
        critical=levels["critical"],
        high=levels["high"],
        medium=levels["medium"],
        low=levels["low"],
        created_at=r.created_at,
        updated_at=r.updated_at or r.created_at,
    )


def _export_from_orm(r: ExecutiveExportORM) -> ExportRequest:
    return ExportRequest(
        id=r.id,
        report_type=r.report_type,
        export_format=ExportFormat(r.export_format),
        audience=ReportAudience(r.audience),
        status=r.status,
        file_path=r.file_path,
        created_at=r.created_at,
        updated_at=r.updated_at,
    )


# ── updates dict (semántica record.update del in-memory) ──

_UPDATABLE: dict[str, set[str]] = {
    "board_report": {
        "year", "quarter", "executive_summary", "membership_analysis",
        "financial_performance", "operational_excellence",
        "member_satisfaction", "strategic_recommendations",
        "risk_assessment", "outlook", "status", "created_at",
        "updated_at",
    },
}


def _apply_updates(obj: Any, updates: dict[str, Any], key: str) -> None:
    """record.update(updates) del in-memory — setattr por clave de columna.

    Las claves que no calzan con una columna se ignoran (el dict del
    in-memory las guardaba pero Pydantic las descartaba al reconstruir:
    mismo comportamiento observable). id no se toca nunca.
    """
    allowed = _UPDATABLE[key]
    for k, v in (updates or {}).items():
        if k in allowed:
            setattr(obj, k, v)


async def _load_all(s: AsyncSession, cls: type[Any]) -> list[Any]:
    return list((await s.execute(select(cls))).scalars().all())


class ExecutiveDashboardRepository:
    """Repo ORM async — contrato EXACTO del in-memory (15 métodos)."""

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine

    # ── Executive Summaries ────────────────────────────────────

    async def save_summary(
        self, summary: ExecutiveSummary
    ) -> ExecutiveSummary:
        record = summary.model_dump(mode="json")
        async with session_scope(self._engine) as s:
            existing = await s.get(ExecutiveSummaryORM, record["id"])
            if existing is None:
                existing = ExecutiveSummaryORM(
                    id=record["id"],
                    period=_enum_val(summary.period),
                    date_from=summary.date_from,
                    date_to=summary.date_to,
                    membership=record["membership"],
                    financial=record["financial"],
                    operational=record["operational"],
                    engagement=record["engagement"],
                    trends=record["trends"],
                    created_at=summary.created_at,
                )
                s.add(existing)
            else:
                # overwrite por id — misma semántica del dict plano
                existing.period = _enum_val(summary.period)
                existing.date_from = summary.date_from
                existing.date_to = summary.date_to
                existing.membership = record["membership"]
                existing.financial = record["financial"]
                existing.operational = record["operational"]
                existing.engagement = record["engagement"]
                existing.trends = record["trends"]
                existing.created_at = summary.created_at
        logger.info(
            "[dashboard_repo] Summary saved: %s (%s)",
            record["period"], record["id"],
        )
        return ExecutiveSummary(**record)

    async def get_summary(
        self, summary_id: str
    ) -> ExecutiveSummary | None:
        async with session_scope(self._engine) as s:
            record = await s.get(ExecutiveSummaryORM, summary_id)
            if record is None:
                return None
            return _summary_from_orm(record)

    async def list_summaries(
        self,
        period: str = "",
    ) -> list[ExecutiveSummary]:
        # ojo: el orden de inserción ES el orden del dict in-memory
        async with session_scope(self._engine) as s:
            rows = await _load_all(s, ExecutiveSummaryORM)
            return [
                _summary_from_orm(r)
                for r in rows
                if (not period or r.period == period)
            ]

    # ── Anomalies ──────────────────────────────────────────────

    async def save_anomaly(self, anomaly: Anomaly) -> Anomaly:
        record = anomaly.model_dump(mode="json")
        async with session_scope(self._engine) as s:
            existing = await s.get(ExecutiveAnomalyORM, record["id"])
            if existing is None:
                existing = ExecutiveAnomalyORM(
                    id=record["id"],
                    domain=_enum_val(anomaly.domain),
                    severity=_enum_val(anomaly.severity),
                    title=anomaly.title,
                    description=anomaly.description,
                    context=record["context"],
                    suggested_action=anomaly.suggested_action,
                    created_at=anomaly.created_at,
                )
                s.add(existing)
            else:
                # ids duplicables (anom_<domain>_001): el dict hacía
                # overwrite de la clave — MISMO contrato observable
                existing.domain = _enum_val(anomaly.domain)
                existing.severity = _enum_val(anomaly.severity)
                existing.title = anomaly.title
                existing.description = anomaly.description
                existing.context = record["context"]
                existing.suggested_action = anomaly.suggested_action
                existing.created_at = anomaly.created_at
        return Anomaly(**record)

    async def list_anomalies(
        self,
        domain: str = "",
        severity: str = "",
    ) -> list[Anomaly]:
        async with session_scope(self._engine) as s:
            rows = await _load_all(s, ExecutiveAnomalyORM)
            return [
                _anomaly_from_orm(r)
                for r in rows
                if (not domain or r.domain == domain)
                and (not severity or r.severity == severity)
            ]

    async def clear_anomalies(self) -> int:
        async with session_scope(self._engine) as s:
            rows = await _load_all(s, ExecutiveAnomalyORM)
            count = len(rows)
            await s.execute(delete(ExecutiveAnomalyORM))
        return count

    # ── Board Reports ──────────────────────────────────────────

    async def create_board_report(
        self, data: CreateBoardReport
    ) -> BoardReport:
        report_id = _gen_id()
        now = _utcnow_iso()
        record = {
            "id": report_id,
            **data.model_dump(),
            "status": "draft",
            "created_at": now,
            "updated_at": now,
        }
        async with session_scope(self._engine) as s:
            s.add(
                ExecutiveBoardReportORM(
                    id=report_id,
                    year=data.year,
                    quarter=_enum_val(data.quarter),
                    executive_summary=data.executive_summary,
                    membership_analysis=data.membership_analysis,
                    financial_performance=data.financial_performance,
                    operational_excellence=data.operational_excellence,
                    member_satisfaction=data.member_satisfaction,
                    strategic_recommendations=list(
                        data.strategic_recommendations
                    ),
                    risk_assessment=list(data.risk_assessment),
                    outlook=data.outlook,
                    status="draft",
                    created_at=now,
                    updated_at=now,
                )
            )
        logger.info(
            "[dashboard_repo] Board report created: %s %s (%s)",
            data.quarter.value, data.year, report_id,
        )
        return BoardReport(**record)

    async def get_board_report(
        self, report_id: str
    ) -> BoardReport | None:
        async with session_scope(self._engine) as s:
            record = await s.get(ExecutiveBoardReportORM, report_id)
            if record is None:
                return None
            return _report_from_orm(record)

    async def list_board_reports(
        self,
        year: int = 0,
        quarter: str = "",
    ) -> list[BoardReport]:
        async with session_scope(self._engine) as s:
            rows = await _load_all(s, ExecutiveBoardReportORM)
            return [
                _report_from_orm(r)
                for r in rows
                if (not year or r.year == year)
                and (not quarter or r.quarter == quarter)
            ]

    async def update_board_report(
        self, report_id: str, updates: dict[str, Any]
    ) -> BoardReport | None:
        async with session_scope(self._engine) as s:
            record = await s.get(ExecutiveBoardReportORM, report_id)
            if record is None:
                return None
            _apply_updates(record, updates, "board_report")
            record.updated_at = _utcnow_iso()
            await s.flush()
            return _report_from_orm(record)

    # ── Risk Matrix (B3) ───────────────────────────────────────

    async def create_risk_matrix(
        self, data: CreateRiskMatrix
    ) -> RiskMatrix:
        now = _utcnow_iso()
        items = [i.model_dump() for i in data.items]
        async with session_scope(self._engine) as s:
            existing = await s.get(ExecutiveRiskMatrixORM, data.period)
            if existing is None:
                existing = ExecutiveRiskMatrixORM(
                    period=data.period,
                    items=items,
                    created_at=now,
                    updated_at="",
                )
                s.add(existing)
            else:
                # keying por PERIOD: el in-memory REEMPLAZABA el dict
                # completo (created_at fresh, updated_at sin clave)
                existing.items = items
                existing.created_at = now
                existing.updated_at = ""
        logger.info(
            "[dashboard_repo] Risk matrix created: %s (%d items)",
            data.period, len(data.items),
        )
        # derived counts never stored stale: recompute on read
        return RiskMatrix(
            period=data.period,
            items=list(data.items),
            total_risks=len(items),
            **_level_counts(items),
            created_at=now,
            updated_at=now,
        )

    async def get_risk_matrix(
        self, period: str
    ) -> RiskMatrix | None:
        async with session_scope(self._engine) as s:
            record = await s.get(ExecutiveRiskMatrixORM, period)
            if record is None:
                return None
            return _matrix_from_orm(record)

    async def update_risk_matrix(
        self, period: str, items: list[RiskItem | dict[str, Any]]
    ) -> RiskMatrix | None:
        async with session_scope(self._engine) as s:
            record = await s.get(ExecutiveRiskMatrixORM, period)
            if record is None:
                return None
            record.items = [
                i if isinstance(i, dict) else i.model_dump() for i in items
            ]
            record.updated_at = _utcnow_iso()
            await s.flush()
            return _matrix_from_orm(record)

    # ── Exports ────────────────────────────────────────────────

    async def create_export(
        self,
        report_type: str,
        export_format: ExportFormat,
        audience: ReportAudience = ReportAudience.INTERNAL,
    ) -> ExportRequest:
        export_id = _gen_id()
        now = _utcnow_iso()
        record = {
            "id": export_id,
            "report_type": report_type,
            "export_format": export_format.value,
            "audience": audience.value,
            "status": "completed",
            "file_path": (
                f"/exports/{report_type}_{export_id}"
                f".{export_format.value}"
            ),
            "created_at": now,
            "updated_at": now,
        }
        async with session_scope(self._engine) as s:
            s.add(
                ExecutiveExportORM(
                    id=export_id,
                    report_type=report_type,
                    export_format=_enum_val(export_format),
                    audience=_enum_val(audience),
                    status="completed",
                    file_path=record["file_path"],
                    created_at=now,
                    updated_at=now,
                )
            )
        return ExportRequest(
            id=record["id"],
            report_type=record["report_type"],
            export_format=ExportFormat(record["export_format"]),
            audience=ReportAudience(record["audience"]),
            status=record["status"],
            file_path=record["file_path"],
            created_at=record["created_at"],
            updated_at=record["updated_at"],
        )

    async def list_exports(
        self,
        report_type: str = "",
    ) -> list[ExportRequest]:
        async with session_scope(self._engine) as s:
            rows = await _load_all(s, ExecutiveExportORM)
            return [
                _export_from_orm(r)
                for r in rows
                if (not report_type or r.report_type == report_type)
            ]


def _level_counts(items: list[dict[str, Any]]) -> dict[str, int]:
    """Contados por severidad — la MISMA aritmética del in-memory."""
    levels: dict[str, int] = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for item in items:
        levels[item["level"]] = levels.get(item["level"], 0) + 1
    return {
        "critical": levels["critical"],
        "high": levels["high"],
        "medium": levels["medium"],
        "low": levels["low"],
    }
