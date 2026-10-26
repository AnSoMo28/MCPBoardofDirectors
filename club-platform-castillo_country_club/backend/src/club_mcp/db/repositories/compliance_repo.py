"""In-memory compliance repository."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

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


def _gen_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


class ComplianceRepository:
    """In-memory repository for compliance data."""

    def __init__(self) -> None:
        self._audits: dict[str, dict[str, Any]] = {}
        self._documents: dict[str, dict[str, Any]] = {}
        self._alerts: dict[str, dict[str, Any]] = {}

    # ── Audits ─────────────────────────────────────────────

    def create_audit(self, data: dict[str, Any]) -> AuditRecord:
        aid = _gen_id("aud")
        now = datetime.now(timezone.utc)
        data["id"] = aid
        data["created_at"] = now.isoformat()
        data["updated_at"] = now.isoformat()
        self._audits[aid] = data
        return AuditRecord(**data)

    def get_audit(self, audit_id: str) -> AuditRecord | None:
        if audit_id not in self._audits:
            return None
        return AuditRecord(**self._audits[audit_id])

    def update_audit(self, audit_id: str, updates: dict[str, Any]) -> AuditRecord | None:
        if audit_id not in self._audits:
            return None
        rec = self._audits[audit_id]
        for k, v in updates.items():
            if v is not None:
                rec[k] = v
        rec["updated_at"] = datetime.now(timezone.utc).isoformat()
        return AuditRecord(**rec)

    def list_audits(
        self,
        area: str | None = None,
        status: str | None = None,
    ) -> list[AuditRecord]:
        out: list[AuditRecord] = []
        for rec in self._audits.values():
            if area and rec.get("area") != area:
                continue
            if status and rec.get("status") != status:
                continue
            out.append(AuditRecord(**rec))
        return sorted(out, key=lambda a: a.created_at, reverse=True)

    def add_check_to_audit(
        self, audit_id: str, check: ComplianceCheck
    ) -> AuditRecord | None:
        if audit_id not in self._audits:
            return None
        rec = self._audits[audit_id]
        checks = rec.get("checks", [])
        check_dict = check.model_dump(mode="json")
        check_dict["id"] = _gen_id("chk")
        check_dict["created_at"] = datetime.now(timezone.utc).isoformat()
        checks.append(check_dict)
        rec["checks"] = checks
        rec["total_checks"] = len(checks)
        rec["passed_checks"] = sum(
            1 for c in checks if c.get("status") == CheckStatus.PASS.value
        )
        rec["failed_checks"] = sum(
            1 for c in checks if c.get("status") == CheckStatus.FAIL.value
        )
        total = rec["total_checks"]
        rec["score_pct"] = (
            round(rec["passed_checks"] / total * 100, 1) if total > 0 else 0.0
        )
        return AuditRecord(**rec)

    # ── Documents ──────────────────────────────────────────

    def add_document(self, data: dict[str, Any]) -> ComplianceDocument:
        did = _gen_id("doc")
        now = datetime.now(timezone.utc)
        data["id"] = did
        data["created_at"] = now.isoformat()
        self._documents[did] = data
        return ComplianceDocument(**data)

    def get_document(self, doc_id: str) -> ComplianceDocument | None:
        if doc_id not in self._documents:
            return None
        return ComplianceDocument(**self._documents[doc_id])

    def list_documents(
        self,
        area: str | None = None,
        status: str | None = None,
    ) -> list[ComplianceDocument]:
        out: list[ComplianceDocument] = []
        for rec in self._documents.values():
            if area and rec.get("area") != area:
                continue
            if status and rec.get("status") != status:
                continue
            out.append(ComplianceDocument(**rec))
        return out

    # ── Alerts ─────────────────────────────────────────────

    def create_alert(self, data: dict[str, Any]) -> ComplianceAlert:
        alid = _gen_id("alrt")
        now = datetime.now(timezone.utc)
        data["id"] = alid
        data["created_at"] = now.isoformat()
        self._alerts[alid] = data
        return ComplianceAlert(**data)

    def resolve_alert(self, alert_id: str, resolution: str) -> ComplianceAlert | None:
        if alert_id not in self._alerts:
            return None
        rec = self._alerts[alert_id]
        rec["status"] = "resolved"
        rec["resolution"] = resolution
        return ComplianceAlert(**rec)

    def list_alerts(
        self,
        area: str | None = None,
        status: str | None = None,
    ) -> list[ComplianceAlert]:
        out: list[ComplianceAlert] = []
        for rec in self._alerts.values():
            if area and rec.get("area") != area:
                continue
            if status and rec.get("status") != status:
                continue
            out.append(ComplianceAlert(**rec))
        return out

    # ── Reports ────────────────────────────────────────────

    def generate_report(
        self,
        date_from: str,
        date_to: str,
    ) -> ComplianceReport:
        audits = self.list_audits()
        documents = self.list_documents()
        alerts = self.list_alerts()

        # Overall score from audits
        completed = [
            a for a in audits if a.status == AuditStatus.COMPLETED
        ]
        overall_score = (
            round(sum(a.score_pct for a in completed) / len(completed), 1)
            if completed else 0.0
        )

        # Area scores
        area_scores: dict[str, list[float]] = {}
        for a in completed:
            area_val = a.area.value if hasattr(a.area, "value") else a.area
            area_scores.setdefault(area_val, []).append(a.score_pct)
        area_score_list = [
            {
                "area": k,
                "avg_score": round(sum(v) / len(v), 1),
                "audit_count": len(v),
            }
            for k, v in area_scores.items()
        ]

        # Open alerts
        open_alerts = [a for a in alerts if a.status == "open"]

        # Expiring documents (within next 30 days simulation)
        expiring = [
            d for d in documents
            if d.status in (DocumentStatus.EXPIRING_SOON.value, DocumentStatus.EXPIRED.value)
        ]

        # Compliant vs non-compliant areas
        compliant = sum(
            1 for s in area_score_list if s["avg_score"] >= 80
        )
        non_compliant = len(area_score_list) - compliant

        # Recent audits
        recent = [
            {"id": a.id, "title": a.title, "score": a.score_pct}
            for a in audits[:5]
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
