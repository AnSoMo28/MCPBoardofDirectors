"""ComplianceAgent — manages regulatory compliance, audits and certifications.

7 tools covering audits, document tracking, alerts, and compliance reports.
"""

from __future__ import annotations

from typing import Any

from club_mcp.agents.base import BaseAgent, MCPTool
from club_mcp.db.repositories.compliance_repo import ComplianceRepository
from club_mcp.hitl.approval_types import ApprovalLevel
from club_mcp.models.compliance import (
    AuditStatus,
    CheckStatus,
    ComplianceArea,
    ComplianceCheck,
    RiskLevel,
)


class ComplianceAgent(BaseAgent):
    """Agente de cumplimiento normativo."""

    agent_name = "compliance"
    description = "Gestión de cumplimiento normativo, auditorías y certificaciones"

    def __init__(
        self,
        compliance_repo: ComplianceRepository,
        approval_engine: Any = None,
        notifier: Any = None,
    ) -> None:
        super().__init__()
        self.repo = compliance_repo
        if approval_engine is not None:
            self.approval_engine = approval_engine
        self.notifier = notifier

    def _register_tools(self) -> None:
        pass

    # ─────────────────────────────────────────────────────────
    # Tool 1: compliance_audit_create  🔴 HITL
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "compliance_audit_create",
        "Crear una nueva auditoría de cumplimiento. Requiere aprobación.",
        approval=ApprovalLevel.HITL,
    )
    async def compliance_audit_create(
        self,
        title: str,
        area: str,
        auditor: str = "",
        date_from: str = "",
        date_to: str = "",
        summary: str = "",
    ) -> dict[str, Any]:
        """Create a new compliance audit (HITL)."""
        try:
            area_enum = ComplianceArea(area)
        except ValueError:
            valid = ", ".join(a.value for a in ComplianceArea)
            return {
                "status": "error",
                "message": f"Área '{area}' no válida. Opciones: {valid}",
            }

        if not title.strip():
            return {
                "status": "error",
                "message": "El título de la auditoría es obligatorio.",
            }

        audit_data = {
            "title": title,
            "area": area_enum.value,
            "auditor": auditor,
            "date_from": date_from,
            "date_to": date_to,
            "summary": summary,
        }

        request = await self.approval_engine.create_request(
            agent=self.agent_name,
            tool="compliance_audit_create",
            params=audit_data,
            requested_by="system",
            approval_level=ApprovalLevel.HITL,
        )

        return {
            "status": "pending_approval",
            "message": (
                f'🔍 Auditoría "{title}" para el área '
                f"{area_enum.value} creada. "
                f"Pendiente de aprobación. 🔔"
            ),
            "request_id": str(request.request_id),
            "title": title,
            "area": area_enum.value,
        }

    async def execute_audit_create(
        self, audit_data: dict[str, Any]
    ) -> dict[str, Any]:
        """Execute audit creation post-approval."""
        audit_data["status"] = AuditStatus.DRAFT.value
        audit = self.repo.create_audit(audit_data)

        return {
            "status": "success",
            "message": (
                f'✨ Auditoría "{audit.title}" creada. '
                f"Área: {audit.area.value}. ¡Lista para comenzar! 📋"
            ),
            "data": audit.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 2: compliance_check_run  🟡 SEMI-AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "compliance_check_run",
        "Ejecutar un chequeo de cumplimiento y agregarlo a una auditoría.",
        approval=ApprovalLevel.SEMI_AUTO,
    )
    async def compliance_check_run(
        self,
        audit_id: str,
        title: str,
        status: str,
        area: str,
        risk_level: str = "medium",
        description: str = "",
        findings: str = "",
        corrective_action: str = "",
        responsible: str = "",
        deadline: str = "",
    ) -> dict[str, Any]:
        """Run a compliance check and add it to an audit."""
        audit = self.repo.get_audit(audit_id)
        if not audit:
            return {
                "status": "error",
                "message": f"No encontramos la auditoría con ID {audit_id}. 🔍",
            }

        try:
            status_enum = CheckStatus(status)
        except ValueError:
            valid = ", ".join(s.value for s in CheckStatus)
            return {
                "status": "error",
                "message": f"Estado '{status}' no válido. Opciones: {valid}",
            }

        try:
            area_enum = ComplianceArea(area)
        except ValueError:
            valid = ", ".join(a.value for a in ComplianceArea)
            return {
                "status": "error",
                "message": f"Área '{area}' no válida. Opciones: {valid}",
            }

        try:
            risk_enum = RiskLevel(risk_level)
        except ValueError:
            valid = ", ".join(r.value for r in RiskLevel)
            return {
                "status": "error",
                "message": f"Nivel de riesgo '{risk_level}' no válido. Opciones: {valid}",
            }

        check = ComplianceCheck(
            area=area_enum,
            title=title,
            description=description,
            status=status_enum,
            risk_level=risk_enum,
            findings=findings,
            corrective_action=corrective_action,
            responsible=responsible,
            deadline=deadline,
        )

        updated_audit = self.repo.add_check_to_audit(audit_id, check)
        if updated_audit is None:
            return {
                "status": "error",
                "message": f"No encontramos la auditoría con ID {audit_id}. 🔍",
            }

        emoji = "✅" if status_enum == CheckStatus.PASS else "❌"

        return {
            "status": "success",
            "message": (
                f"{emoji} Chequeo '{title}': {status_enum.value}. "
                f"Auditoría: {updated_audit.score_pct}% "
                f"({updated_audit.passed_checks}/{updated_audit.total_checks} aprobados)."
            ),
            "data": updated_audit.model_dump(mode="json"),
            "check_status": status_enum.value,
            "audit_score": updated_audit.score_pct,
        }

    # ─────────────────────────────────────────────────────────
    # Tool 3: compliance_audit_get  🟢 AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "compliance_audit_get",
        "Obtener detalles de una auditoría de cumplimiento.",
        approval=ApprovalLevel.AUTO,
    )
    async def compliance_audit_get(
        self,
        audit_id: str,
    ) -> dict[str, Any]:
        """Get audit details."""
        audit = self.repo.get_audit(audit_id)
        if not audit:
            return {
                "status": "error",
                "message": f"No encontramos la auditoría con ID {audit_id}. 🔍",
            }

        emoji = "✅" if audit.score_pct >= 80 else "⚠️" if audit.score_pct >= 50 else "❌"

        return {
            "status": "success",
            "message": (
                f'{emoji} Auditoría "{audit.title}": '
                f"{audit.score_pct}% de cumplimiento "
                f"({audit.passed_checks}/{audit.total_checks} chequeos aprobados)."
            ),
            "data": audit.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 4: compliance_document_register  🔴 HITL
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "compliance_document_register",
        "Registrar un documento o certificado de cumplimiento. Requiere aprobación.",
        approval=ApprovalLevel.HITL,
    )
    async def compliance_document_register(
        self,
        name: str,
        area: str,
        issuer: str = "",
        document_number: str = "",
        issue_date: str = "",
        expiry_date: str = "",
        notes: str = "",
    ) -> dict[str, Any]:
        """Register a compliance document (HITL)."""
        try:
            area_enum = ComplianceArea(area)
        except ValueError:
            valid = ", ".join(a.value for a in ComplianceArea)
            return {
                "status": "error",
                "message": f"Área '{area}' no válida. Opciones: {valid}",
            }

        doc_data = {
            "name": name,
            "area": area_enum.value,
            "issuer": issuer,
            "document_number": document_number,
            "issue_date": issue_date,
            "expiry_date": expiry_date,
            "notes": notes,
        }

        request = await self.approval_engine.create_request(
            agent=self.agent_name,
            tool="compliance_document_register",
            params=doc_data,
            requested_by="system",
            approval_level=ApprovalLevel.HITL,
        )

        return {
            "status": "pending_approval",
            "message": (
                f'📄 Documento "{name}" ({area_enum.value}) '
                f"registrado. Pendiente de aprobación. 🔔"
            ),
            "request_id": str(request.request_id),
            "document_name": name,
            "area": area_enum.value,
        }

    async def execute_document_register(
        self, doc_data: dict[str, Any]
    ) -> dict[str, Any]:
        """Execute document registration post-approval."""
        # Auto-determine status based on expiry
        expiry = doc_data.get("expiry_date", "")
        if expiry:
            from datetime import date as date_type
            try:
                exp = date_type.fromisoformat(expiry)
                today = date_type.today()
                days_left = (exp - today).days
                if days_left < 0:
                    doc_data["status"] = "expired"
                elif days_left <= 30:
                    doc_data["status"] = "expiring_soon"
                else:
                    doc_data["status"] = "current"
            except ValueError:
                doc_data["status"] = "current"
        else:
            doc_data["status"] = "current"

        doc = self.repo.add_document(doc_data)

        return {
            "status": "success",
            "message": (
                f'✨ Documento "{doc.name}" registrado. '
                f"Estado: {doc.status.value}. 📄"
            ),
            "data": doc.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 5: compliance_alert_create  🟡 SEMI-AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "compliance_alert_create",
        "Crear una alerta de cumplimiento.",
        approval=ApprovalLevel.SEMI_AUTO,
    )
    async def compliance_alert_create(
        self,
        title: str,
        description: str,
        area: str,
        risk_level: str = "medium",
        due_date: str = "",
        responsible: str = "",
    ) -> dict[str, Any]:
        """Create a compliance alert."""
        try:
            area_enum = ComplianceArea(area)
        except ValueError:
            valid = ", ".join(a.value for a in ComplianceArea)
            return {
                "status": "error",
                "message": f"Área '{area}' no válida. Opciones: {valid}",
            }

        try:
            risk_enum = RiskLevel(risk_level)
        except ValueError:
            valid = ", ".join(r.value for r in RiskLevel)
            return {
                "status": "error",
                "message": f"Nivel de riesgo '{risk_level}' no válido. Opciones: {valid}",
            }

        alert = self.repo.create_alert({
            "title": title,
            "description": description,
            "area": area_enum.value,
            "risk_level": risk_enum.value,
            "due_date": due_date,
            "responsible": responsible,
        })

        risk_emoji = {
            "low": "🟢", "medium": "🟡", "high": "🟠", "critical": "🔴",
        }

        return {
            "status": "success",
            "message": (
                f'{risk_emoji.get(risk_enum.value, "⚠️")} Alerta creada: '
                f'"{title}" (riesgo {risk_enum.value}). '
                f"{'Vence: ' + due_date if due_date else ''}"
            ),
            "data": alert.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 6: compliance_alert_list  🟢 AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "compliance_alert_list",
        "Listar alertas de cumplimiento con filtros opcionales.",
        approval=ApprovalLevel.AUTO,
    )
    async def compliance_alert_list(
        self,
        area: str | None = None,
        status: str | None = None,
    ) -> dict[str, Any]:
        """List compliance alerts."""
        if area:
            try:
                ComplianceArea(area)
            except ValueError:
                valid = ", ".join(a.value for a in ComplianceArea)
                return {
                    "status": "error",
                    "message": f"Área '{area}' no válida. Opciones: {valid}",
                }

        alerts = self.repo.list_alerts(area=area, status=status)
        open_count = sum(1 for a in alerts if a.status == "open")
        critical = sum(
            1 for a in alerts
            if a.risk_level == RiskLevel.CRITICAL.value and a.status == "open"
        )

        return {
            "status": "success",
            "message": (
                f"🔔 {len(alerts)} alertas encontradas. "
                f"{open_count} abiertas."
                f"{' ⚠️ ' + str(critical) + ' críticas!' if critical else ''}"
            ),
            "data": [a.model_dump(mode="json") for a in alerts],
            "total": len(alerts),
            "open_count": open_count,
        }

    # ─────────────────────────────────────────────────────────
    # Tool 7: compliance_report_generate  🟢 AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "compliance_report_generate",
        "Generar un reporte general de cumplimiento.",
        approval=ApprovalLevel.AUTO,
    )
    async def compliance_report_generate(
        self,
        date_from: str,
        date_to: str,
    ) -> dict[str, Any]:
        """Generate an overall compliance report."""
        if not date_from or not date_to:
            return {
                "status": "error",
                "message": "Debe proporcionar fecha de inicio y fin.",
            }

        if date_from > date_to:
            return {
                "status": "error",
                "message": "La fecha de inicio debe ser anterior a la fecha de fin.",
            }

        report = self.repo.generate_report(date_from, date_to)
        emoji = "✅" if report.overall_score >= 80 else "⚠️"

        return {
            "status": "success",
            "message": report.summary,
            "data": report.model_dump(mode="json"),
            "overall_score": report.overall_score,
        }
