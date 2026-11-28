"""ComplianceRepository async — los 3 dicts se vuelven 3 tablas.

Ola 2.1-quinqua (vertical compliance). Contrato EXACTO del módulo
in-memory que reemplaza (club_mcp.db.repositories.compliance_repo)
— mismos 14 métodos, mismas firmas, mismos Pydantic de salida, mismo
comportamiento de error (None / lista vacía — el in-memory no define
excepciones custom y el ORM tampoco las inventa):

    create_audit / get_audit / update_audit / list_audits /
    add_check_to_audit /
    add_document / get_document / list_documents /
    create_alert / resolve_alert / list_alerts /
    generate_report

Mismas decisiones que family/engagement/event (§3.8/-bis/-tris/
-CUATRO): engine por inyección · session_scope transaccional ·
devuelve Pydantic (SQLAlchemy no sube) · ids de la MISMA forma que
el in-memory ({prefix}_{uuid4().hex[:8]} — el contrato no cambia ni
un byte).

Semántica literal del in-memory que se preserva:
  * create_audit: id/created_at/updated_at los fija el REPO.
  * update_audit: solo claves con valor no-None (el dict.update del
    in-memory ignoraba None) + updated_at SIEMPRE.
  * add_check_to_audit: append del check (id chk_ + created_at del
    repo) + recuento total/passed/failed + score_pct redondeado a
    1 decimal (0.0 si total 0) — MISMA transacción.
  * list_audits: filtro area/status + orden por created_at DESC.
  * resolve_alert: status="resolved" + resolution (sin updated_at:
    el in-memory no lo tocaba — las alerts no tienen updated_at).
  * generate_report: PURA LECTURA (list_audits/list_documents/
    list_alerts ya ordenados/filtrados) — sin transacción de
    escritura; la aritmética del score es la del in-memory byte a
    byte (round(..., 1)).
"""
from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any
from uuid import uuid4

from sqlalchemy import select

from club_mcp.db.orm.compliance_orm import (
    ComplianceAlertORM,
    ComplianceAuditORM,
    ComplianceDocumentORM,
)
from club_mcp.db.orm.session import session_scope
from club_mcp.models.compliance import (
    AuditRecord,
    AuditStatus,
    CheckStatus,
    ComplianceAlert,
    ComplianceArea,
    ComplianceCheck,
    ComplianceDocument,
    ComplianceReport,
    DocumentStatus,
    RiskLevel,
)


if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncEngine

logger = logging.getLogger(__name__)

# ── update genérico (contrato: dict.update con claves del modelo) ──

_AUDIT_COLUMNS = {
    "title", "area", "status", "auditor", "date_from", "date_to",
    "summary", "checks", "total_checks", "passed_checks",
    "failed_checks", "score_pct",
}


def _gen_id(prefix: str) -> str:
    """MISMA generación que el in-memory ({prefix}_{uuid4().hex[:8]})."""
    return f"{prefix}_{uuid4().hex[:8]}"


def _plain(val: Any) -> Any:
    """Enum → .value (el in-memory guardaba el dict tal cual llegaba)."""
    if hasattr(val, "value") and not isinstance(val, (dict, list)):
        return val.value
    if isinstance(val, list):
        return [
            (v.value if hasattr(v, "value") and not isinstance(v, (dict, list)) else v)
            for v in val
        ]
    return val


def _check_to_dict(check: ComplianceCheck) -> dict[str, Any]:
    """model_dump(mode=json) del in-memory (enums a .value)."""
    d = check.model_dump(mode="json")
    return d


def _audit_from_orm(r: ComplianceAuditORM) -> AuditRecord:
    return AuditRecord(
        id=r.id,
        title=r.title,
        area=ComplianceArea(r.area),
        status=AuditStatus(r.status),
        auditor=r.auditor or "",
        date_from=r.date_from or "",
        date_to=r.date_to or "",
        summary=r.summary or "",
        checks=[ComplianceCheck(**c) for c in (r.checks or [])],
        total_checks=r.total_checks,
        passed_checks=r.passed_checks,
        failed_checks=r.failed_checks,
        score_pct=float(r.score_pct),
        created_at=r.created_at,
        updated_at=r.created_at,  # abajo: se ajusta si hay updated_at
    )


def _audit_from_orm_full(r: ComplianceAuditORM) -> AuditRecord:
    rec = _audit_from_orm(r)
    return rec.model_copy(
        update={"updated_at": r.updated_at if r.updated_at else r.created_at}
    )


def _doc_from_orm(r: ComplianceDocumentORM) -> ComplianceDocument:
    return ComplianceDocument(
        id=r.id,
        name=r.name,
        area=ComplianceArea(r.area),
        issuer=r.issuer or "",
        document_number=r.document_number or "",
        issue_date=r.issue_date or "",
        expiry_date=r.expiry_date or "",
        status=DocumentStatus(r.status),
        file_url=r.file_url or "",
        notes=r.notes or "",
        created_at=r.created_at,
    )


def _alert_from_orm(r: ComplianceAlertORM) -> ComplianceAlert:
    return ComplianceAlert(
        id=r.id,
        area=ComplianceArea(r.area),
        title=r.title,
        description=r.description or "",
        risk_level=RiskLevel(r.risk_level),
        status=r.status or "open",
        due_date=r.due_date or "",
        responsible=r.responsible or "",
        resolution=r.resolution or "",
        created_at=r.created_at,
    )


class ComplianceRepository:
    """Repo ORM async — contrato EXACTO del in-memory (14 métodos)."""

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine

    # ── Audits ─────────────────────────────────────────────

    async def create_audit(self, data: dict[str, Any]) -> AuditRecord:
        aid = _gen_id("aud")
        now = datetime.now(tz=UTC)
        d = dict(data)
        d["id"] = aid
        d.setdefault("created_at", now.isoformat())
        d.setdefault("updated_at", now.isoformat())
        record = ComplianceAuditORM(
            id=aid,
            title=d["title"],
            area=_plain(d["area"]),
            status=_plain(d.get("status", AuditStatus.DRAFT.value)),
            auditor=d.get("auditor", "") or "",
            date_from=d.get("date_from", "") or "",
            date_to=d.get("date_to", "") or "",
            summary=d.get("summary", "") or "",
            checks=[_plain(c) if not isinstance(c, dict) else c for c in d.get("checks", [])],
            total_checks=d.get("total_checks", 0) or 0,
            passed_checks=d.get("passed_checks", 0) or 0,
            failed_checks=d.get("failed_checks", 0) or 0,
            score_pct=float(d.get("score_pct", 0.0) or 0.0),
        )
        async with session_scope(self._engine) as s:
            s.add(record)
        return AuditRecord(
            id=aid,
            title=record.title,
            area=ComplianceArea(record.area),
            status=AuditStatus(record.status),
            auditor=record.auditor,
            date_from=record.date_from,
            date_to=record.date_to,
            summary=record.summary,
            checks=[ComplianceCheck(**c) for c in record.checks],
            total_checks=record.total_checks,
            passed_checks=record.passed_checks,
            failed_checks=record.failed_checks,
            score_pct=float(record.score_pct),
            created_at=now,
            updated_at=now,
        )

    async def get_audit(self, audit_id: str) -> AuditRecord | None:
        async with session_scope(self._engine) as s:
            r = await s.get(ComplianceAuditORM, audit_id)
            if r is None:
                return None
            return _audit_from_orm_full(r)

    async def update_audit(
        self, audit_id: str, updates: dict[str, Any]
    ) -> AuditRecord | None:
        async with session_scope(self._engine) as s:
            r = await s.get(ComplianceAuditORM, audit_id)
            if r is None:
                return None
            for key, val in updates.items():
                if key not in _AUDIT_COLUMNS:
                    continue
                if val is None:
                    continue
                setattr(r, key, _plain(val))
            r.updated_at = datetime.now(tz=UTC)
            return _audit_from_orm_full(r)

    async def list_audits(
        self,
        area: str | None = None,
        status: str | None = None,
    ) -> list[AuditRecord]:
        async with session_scope(self._engine) as s:
            stmt = select(ComplianceAuditORM)
            if area is not None:
                stmt = stmt.where(ComplianceAuditORM.area == area)
            if status is not None:
                stmt = stmt.where(ComplianceAuditORM.status == status)
            rows = (
                await s.execute(stmt.order_by(ComplianceAuditORM.created_at.desc()))
            ).scalars().all()
            return [_audit_from_orm_full(r) for r in rows]

    async def add_check_to_audit(
        self, audit_id: str, check: ComplianceCheck
    ) -> AuditRecord | None:
        async with session_scope(self._engine) as s:
            r = await s.get(ComplianceAuditORM, audit_id)
            if r is None:
                return None
            checks = list(r.checks or [])
            check_dict = _check_to_dict(check)
            check_dict["id"] = _gen_id("chk")
            check_dict["created_at"] = datetime.now(tz=UTC).isoformat()
            checks.append(check_dict)
            r.checks = checks
            r.total_checks = len(checks)
            r.passed_checks = sum(
                1 for c in checks if c.get("status") == CheckStatus.PASS.value
            )
            r.failed_checks = sum(
                1 for c in checks if c.get("status") == CheckStatus.FAIL.value
            )
            total = r.total_checks
            r.score_pct = (
                round(r.passed_checks / total * 100, 1) if total > 0 else 0.0
            )
            return _audit_from_orm_full(r)

    # ── Documents ──────────────────────────────────────────

    async def add_document(self, data: dict[str, Any]) -> ComplianceDocument:
        did = _gen_id("doc")
        now = datetime.now(tz=UTC)
        d = dict(data)
        d["id"] = did
        d.setdefault("created_at", now.isoformat())
        record = ComplianceDocumentORM(
            id=did,
            name=d["name"],
            area=_plain(d["area"]),
            issuer=d.get("issuer", "") or "",
            document_number=d.get("document_number", "") or "",
            issue_date=d.get("issue_date", "") or "",
            expiry_date=d.get("expiry_date", "") or "",
            status=_plain(d.get("status", DocumentStatus.CURRENT.value)),
            file_url=d.get("file_url", "") or "",
            notes=d.get("notes", "") or "",
        )
        async with session_scope(self._engine) as s:
            s.add(record)
        return ComplianceDocument(
            id=did,
            name=record.name,
            area=ComplianceArea(record.area),
            issuer=record.issuer,
            document_number=record.document_number,
            issue_date=record.issue_date,
            expiry_date=record.expiry_date,
            status=DocumentStatus(record.status),
            file_url=record.file_url,
            notes=record.notes,
            created_at=now,
        )

    async def get_document(self, doc_id: str) -> ComplianceDocument | None:
        async with session_scope(self._engine) as s:
            r = await s.get(ComplianceDocumentORM, doc_id)
            if r is None:
                return None
            return _doc_from_orm(r)

    async def list_documents(
        self,
        area: str | None = None,
        status: str | None = None,
    ) -> list[ComplianceDocument]:
        async with session_scope(self._engine) as s:
            stmt = select(ComplianceDocumentORM)
            if area is not None:
                stmt = stmt.where(ComplianceDocumentORM.area == area)
            if status is not None:
                stmt = stmt.where(ComplianceDocumentORM.status == status)
            rows = (
                await s.execute(stmt.order_by(ComplianceDocumentORM.created_at.desc()))
            ).scalars().all()
            return [_doc_from_orm(r) for r in rows]

    # ── Alerts ─────────────────────────────────────────────

    async def create_alert(self, data: dict[str, Any]) -> ComplianceAlert:
        alid = _gen_id("alrt")
        now = datetime.now(tz=UTC)
        d = dict(data)
        d["id"] = alid
        d.setdefault("created_at", now.isoformat())
        record = ComplianceAlertORM(
            id=alid,
            area=_plain(d["area"]),
            title=d["title"],
            description=d.get("description", "") or "",
            risk_level=_plain(d.get("risk_level", RiskLevel.MEDIUM.value)),
            status=d.get("status", "open") or "open",
            due_date=d.get("due_date", "") or "",
            responsible=d.get("responsible", "") or "",
            resolution=d.get("resolution", "") or "",
        )
        async with session_scope(self._engine) as s:
            s.add(record)
        return ComplianceAlert(
            id=alid,
            area=ComplianceArea(record.area),
            title=record.title,
            description=record.description,
            risk_level=RiskLevel(record.risk_level),
            status=record.status,
            due_date=record.due_date,
            responsible=record.responsible,
            resolution=record.resolution,
            created_at=now,
        )

    async def resolve_alert(
        self, alert_id: str, resolution: str
    ) -> ComplianceAlert | None:
        async with session_scope(self._engine) as s:
            r = await s.get(ComplianceAlertORM, alert_id)
            if r is None:
                return None
            r.status = "resolved"
            r.resolution = resolution
            return _alert_from_orm(r)

    async def list_alerts(
        self,
        area: str | None = None,
        status: str | None = None,
    ) -> list[ComplianceAlert]:
        async with session_scope(self._engine) as s:
            stmt = select(ComplianceAlertORM)
            if area is not None:
                stmt = stmt.where(ComplianceAlertORM.area == area)
            if status is not None:
                stmt = stmt.where(ComplianceAlertORM.status == status)
            rows = (
                await s.execute(stmt.order_by(ComplianceAlertORM.created_at.desc()))
            ).scalars().all()
            return [_alert_from_orm(r) for r in rows]

    # ── Reports ────────────────────────────────────────────

    async def generate_report(
        self,
        date_from: str,
        date_to: str,
    ) -> ComplianceReport:
        audits = await self.list_audits()
        documents = await self.list_documents()
        alerts = await self.list_alerts()

        completed = [a for a in audits if a.status == AuditStatus.COMPLETED]
        overall_score = (
            round(sum(a.score_pct for a in completed) / len(completed), 1)
            if completed
            else 0.0
        )

        area_scores: dict[str, list[float]] = {}
        for a in completed:
            area_val = a.area.value if hasattr(a.area, "value") else a.area
            area_scores.setdefault(area_val, []).append(a.score_pct)
        area_score_list: list[dict[str, Any]] = [
            {
                "area": k,
                "avg_score": round(sum(v) / len(v), 1),
                "audit_count": len(v),
            }
            for k, v in area_scores.items()
        ]

        open_alerts = [a for a in alerts if a.status == "open"]

        expiring = [
            d
            for d in documents
            if d.status in (DocumentStatus.EXPIRING_SOON, DocumentStatus.EXPIRED)
        ]

        compliant = sum(1 for s in area_score_list if s["avg_score"] >= 80)
        non_compliant = len(area_score_list) - compliant

        recent = [
            {"id": a.id, "title": a.title, "score": a.score_pct} for a in audits[:5]
        ]

        return ComplianceReport(
            period_start=date_from,
            period_end=date_to,
            overall_score=overall_score,
            total_areas=len(area_score_list),
            compliant_areas=compliant,
            non_compliant_areas=non_compliant,
            open_alerts=len(open_alerts),
            expiring_documents=len(expiring),
            area_scores=area_score_list,
            recent_audits=recent,
            summary=(
                f"📋 Cumplimiento general: {overall_score}%. "
                f"{compliant}/{len(area_score_list)} áreas conformes. "
                f"{len(open_alerts)} alertas abiertas. "
                f"{len(expiring)} documentos por vencer."
            ),
        )
