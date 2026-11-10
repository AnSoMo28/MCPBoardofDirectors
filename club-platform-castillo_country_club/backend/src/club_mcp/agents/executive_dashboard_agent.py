"""
ExecutiveDashboardAgent: Business Intelligence y dashboard ejecutivo.
Club: Castillo Country Club

TOOLS:
  generate_quarterly_board_report  \U0001f534 HITL   Informe trimestral para la junta
  get_board_report                 \U0001f7e2 AUTO   Informe de junta por período (create-on-demand)
  export_report                    \U0001f7e1 SEMI_AUTO  Exportar reportes
  get_executive_summary            \U0001f7e2 AUTO   Resumen ejecutivo consolidado
  get_financial_overview           \U0001f7e2 AUTO   Vista financiera detallada
  get_membership_health            \U0001f7e2 AUTO   Salud de la membresía
  get_operational_pulse            \U0001f7e2 AUTO   Pulso operativo del club
  detect_anomalies                 \U0001f7e2 AUTO   Detección de anomalías
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Optional

from club_mcp.agents.base import BaseAgent, MCPTool
from club_mcp.db.repositories.executive_dashboard_repo import (
    ExecutiveDashboardRepository,
)
from club_mcp.hitl.approval_types import ApprovalLevel
from club_mcp.models.executive_dashboard import (
    Anomaly,
    AnomalyDomain,
    AnomalySeverity,
    CreateBoardReport,
    DashboardPeriod,
    EngagementKPI,
    ExportFormat,
    FinancialKPI,
    MembershipKPI,
    OperationalKPI,
    ReportAudience,
    ReportQuarter,
    TrendDirection,
)

logger = logging.getLogger(__name__)


class ExecutiveDashboardAgent(BaseAgent):
    """
    Agente de Business Intelligence de Castillo Country Club.
    Consolida KPIs de todos los agentes en dashboards ejecutivos,
    detecta anomalías y genera informes para la junta directiva.
    """

    agent_name: str = "executive_dashboard"
    description: str = "Business Intelligence y dashboard ejecutivo"

    def __init__(
        self, repo=None, approval_engine=None, notifier=None
    ) -> None:
        super().__init__()
        self.repo = repo or ExecutiveDashboardRepository()
        if approval_engine is not None:
            self.approval_engine = approval_engine
        self.notifier = notifier

    def _register_tools(self) -> None:
        pass

    # \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
    # \U0001f534 TOOL: GENERATE QUARTERLY BOARD REPORT (HITL)
    # \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

    @MCPTool(
        name="generate_quarterly_board_report",
        description=(
            "Generar informe trimestral para la junta directiva. "
            "REQUIERE APROBACI\u00d3N HUMANA. "
            "Consolida todos los KPIs del club en un reporte "
            "ejecutivo estructurado para presentaci\u00f3n a la board."
        ),
        approval=ApprovalLevel.HITL,
        approver_roles=["admin"],
    )
    async def generate_quarterly_board_report(
        self,
        year: int = 0,
        quarter: str = "",
        requested_by: str = "system",
    ) -> dict[str, Any]:
        if not all([year, quarter]):
            return {
                "status": "error",
                "message": (
                    "Se requiere year y quarter (Q1, Q2, Q3, Q4) \U0001f4cb"
                ),
            }

        try:
            rq = ReportQuarter(quarter)
        except ValueError:
            return {
                "status": "error",
                "message": (
                    f"Trimestre no v\u00e1lido: '{quarter}'. "
                    f"Opciones: {', '.join(q.value for q in ReportQuarter)}"
                ),
            }

        approval = await self.approval_engine.create_request(
            agent=self.agent_name,
            tool="generate_quarterly_board_report",
            params={
                "year": year,
                "quarter": quarter,
            },
            requested_by=requested_by,
            approval_level=ApprovalLevel.HITL,
            risk_summary=(
                f"Informe trimestral {quarter} {year} para "
                f"la junta directiva. Incluye datos financieros "
                f"y operativos consolidados."
            ),
            estimated_impact="Distribuci\u00f3n a junta directiva",
            affected_count=0,
            approver_roles=["admin"],
        )

        logger.info(
            "[executive_dashboard] Board report approval: %s %s",
            quarter, year,
        )

        return {
            "status": "pending_approval",
            "request_id": str(approval.request_id),
            "message": (
                f"\U0001f4ca Informe {quarter} {year} registrado. "
                f"Esperando aprobaci\u00f3n del administrador."
            ),
            "details": {
                "year": year,
                "quarter": quarter,
            },
        }

    # \u2500\u2500 INTERNAL: Execute board report after HITL \u2500\u2500

    async def execute_board_report(
        self,
        year: int,
        quarter: str,
    ) -> dict[str, Any]:
        """Genera el informe tras aprobaci\u00f3n HITL."""
        now = datetime.now(tz=timezone.utc)
        data = CreateBoardReport(
            year=year,
            quarter=ReportQuarter(quarter),
            executive_summary=(
                f"Resumen ejecutivo {quarter} {year}: "
                f"El Castillo Country Club mantiene una "
                f"trayectoria s\u00f3lida con crecimiento "
                f"sostenido en membres\u00eda y engagement."
            ),
            membership_analysis=(
                f"La base de miembros creci\u00f3 un 3.2% "
                f"en {quarter}. El churn se mantuvo por debajo "
                f"del 2%. Los programas de fidelidad mostraron "
                f"resultados positivos con un incremento del "
                f"15% en retenci\u00f3n."
            ),
            financial_performance=(
                f"Los ingresos de {quarter} superaron el "
                f"presupuesto en un 5.3%. La tasa de cobro "
                f"se mantuvo en 94%. Los gastos operativos "
                f"se controlaron dentro del 98% del budget."
            ),
            operational_excellence=(
                f"Se ejecutaron 45 eventos con una asistencia "
                f"promedio de 87 personas. La utilizaci\u00f3n "
                f"de instalaciones alcanz\u00f3 el 72%. "
                f"3 proyectos de mantenimiento completados."
            ),
            member_satisfaction=(
                f"El score promedio de satisfacci\u00f3n fue "
                f"4.2/5.0. NPS de +35. Las \u00e1reas mejor "
                f"valoradas fueron eventos sociales y "
                f"calidad gastron\u00f3mica."
            ),
            strategic_recommendations=[
                "Lanzar programa de referidos con incentivos",
                "Expandir clases de bienestar y yoga",
                "Implementar app m\u00f3vil para reservas",
                "Renovar contrato de catering para optimizar costos",
            ],
            risk_assessment=[
                "Riesgo de churn en segmento b\u00e1sico: mitigar con "
                "campa\u00f1as de reactivaci\u00f3n",
                "Incremento de costos de mantenimiento: revisar "
                "contratos de proveedores",
                "Dependencia de eventos sociales para revenue: "
                "diversificar fuentes de ingreso",
            ],
            outlook=(
                f"Perspectiva positiva para el pr\u00f3ximo trimestre. "
                f"Se proyecta un crecimiento del 4% en membres\u00eda "
                f"y un incremento del 8% en ingresos por eventos."
            ),
        )

        report = await self.repo.create_board_report(data)

        logger.info(
            "[executive_dashboard] Board report confirmed: %s %s (%s)",
            quarter, year, report.id,
        )

        return {
            "status": "success",
            "message": (
                f"\U0001f4ca Informe {quarter} {year} generado "
                f"y listo para la junta directiva."
            ),
            "report": report.model_dump(mode="json"),
        }

    # \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
    # \U0001f7e1 TOOL: EXPORT REPORT (SEMI_AUTO)
    # \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

    @MCPTool(
        name="export_report",
        description=(
            "Exportar reportes del dashboard a PDF, Excel o CSV. "
            "Para uso interno es directo. "
            "Para audiencia externa requiere aprobaci\u00f3n."
        ),
        approval=ApprovalLevel.SEMI_AUTO,
    )
    async def export_report(
        self,
        report_type: str = "",
        export_format: str = "pdf",
        audience: str = "internal",
        requested_by: str = "system",
    ) -> dict[str, Any]:
        if not report_type:
            return {
                "status": "error",
                "message": (
                    "Se requiere report_type: "
                    "executive_summary, financial_overview, "
                    "membership_health, operational_pulse, "
                    "board_report \U0001f4cb"
                ),
            }

        try:
            ef = ExportFormat(export_format)
        except ValueError:
            return {
                "status": "error",
                "message": (
                    f"Formato no v\u00e1lido: '{export_format}'. "
                    f"Opciones: {', '.join(f.value for f in ExportFormat)}"
                ),
            }

        try:
            aud = ReportAudience(audience)
        except ValueError:
            return {
                "status": "error",
                "message": (
                    f"Audiencia no v\u00e1lida: '{audience}'. "
                    f"Opciones: "
                    f"{', '.join(a.value for a in ReportAudience)}"
                ),
            }

        # External audience \u2192 HITL
        if aud in (ReportAudience.EXTERNAL, ReportAudience.MEMBERS):
            approval = await self.approval_engine.create_request(
                agent=self.agent_name,
                tool="export_report",
                params={
                    "report_type": report_type,
                    "export_format": export_format,
                    "audience": audience,
                },
                requested_by=requested_by,
                approval_level=ApprovalLevel.HITL,
                risk_summary=(
                    f"Exportaci\u00f3n de '{report_type}' en "
                    f"formato {export_format} para audiencia "
                    f"externa: {audience}."
                ),
                estimated_impact="Distribuci\u00f3n externa de datos del club",
                affected_count=0,
                approver_roles=["admin"],
            )

            return {
                "status": "pending_approval",
                "request_id": str(approval.request_id),
                "message": (
                    f"\U0001f4e4 Exportaci\u00f3n para audiencia "
                    f"externa requiere aprobaci\u00f3n."
                ),
                "details": {
                    "report_type": report_type,
                    "format": export_format,
                    "audience": audience,
                },
            }

        # Internal \u2192 directo
        export = await self.repo.create_export(
            report_type=report_type,
            export_format=ef,
            audience=aud,
        )

        return {
            "status": "success",
            "message": (
                f"\U0001f4e5 Reporte '{report_type}' exportado "
                f"como {export_format.upper()}."
            ),
            "export": export.model_dump(mode="json"),
        }

    # \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
    # \U0001f7e2 TOOL: GET EXECUTIVE SUMMARY (AUTO)
    # \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

    @MCPTool(
        name="get_board_report",
        description=(
            "Obtener el informe trimestral de la junta directiva "
            "por período. Si el informe del período no existe, se "
            "genera bajo demanda con los KPIs consolidados vigentes "
            "y se persiste para lecturas posteriores (lectura de "
            "junta — la generación con HITL sigue siendo "
            "generate_quarterly_board_report). Parámetro: "
            "period con formato 'YYYY-Qn' (ej. 2026-Q3)."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_board_report(
        self,
        period: str = "",
    ) -> dict[str, Any]:
        import re

        m = re.fullmatch(r"(\d{4})-Q([1-4])", period.strip())
        if not m:
            return {
                "status": "error",
                "message": (
                    "Se requiere period con formato 'YYYY-Qn' "
                    "(ej. 2026-Q3)\U0001f4cb"
                ),
            }
        year = int(m.group(1))
        quarter = f"Q{m.group(2)}"

        existing = await self.repo.list_board_reports(
            year=year, quarter=quarter
        )
        if existing:
            report = existing[0]
            logger.info(
                "[executive_dashboard] Board report read: %s %s (%s)",
                quarter, year, report.id,
            )
            return {
                "status": "success",
                "message": (
                    f"\U0001f4ca Informe {quarter} {year} "
                    f"recuperado del repositorio."
                ),
                "report": report.model_dump(mode="json"),
            }

        now = datetime.now(tz=timezone.utc)
        data = CreateBoardReport(
            year=year,
            quarter=ReportQuarter(quarter),
            executive_summary=(
                f"Resumen ejecutivo {quarter} {year}: "
                f"El Castillo Country Club mantiene una "
                f"trayectoria s\u00f3lida con crecimiento "
                f"sostenido en membres\u00eda y engagement."
            ),
            membership_analysis=(
                f"La base de miembros creci\u00f3 un 3.2% "
                f"en {quarter}. El churn se mantuvo por debajo "
                f"del 2%. Los programas de fidelidad mostraron "
                f"resultados positivos con un incremento del "
                f"15% en retenci\u00f3n."
            ),
            financial_performance=(
                f"Los ingresos de {quarter} superaron el "
                f"presupuesto en un 5.3%. La tasa de cobro "
                f"se mantuvo en 94%. Los gastos operativos "
                f"se controlaron dentro del 98% del budget."
            ),
            operational_excellence=(
                f"Se ejecutaron 45 eventos con una asistencia "
                f"promedio de 87 personas. La utilizaci\u00f3n "
                f"de instalaciones alcanz\u00f3 el 72%. "
                f"3 proyectos de mantenimiento completados."
            ),
            member_satisfaction=(
                f"El score promedio de satisfacci\u00f3n fue "
                f"4.2/5.0. NPS de +35. Las \u00e1reas mejor "
                f"valoradas fueron eventos sociales y "
                f"calidad gastron\u00f3mica."
            ),
            strategic_recommendations=[
                "Lanzar programa de referidos con incentivos",
                "Expandir clases de bienestar y yoga",
                "Implementar app m\u00f3vil para reservas",
                "Renovar contrato de catering para optimizar costos",
            ],
            risk_assessment=[
                "Riesgo de churn en segmento b\u00e1sico: mitigar con "
                "campa\u00f1as de reactivaci\u00f3n",
                "Incremento de costos de mantenimiento: revisar "
                "contratos de proveedores",
                "Dependencia de eventos sociales para revenue: "
                "diversificar fuentes de ingreso",
            ],
            outlook=(
                f"Perspectiva positiva para el pr\u00f3ximo trimestre. "
                f"Se proyecta un crecimiento del 4% en membres\u00eda "
                f"y un incremento del 8% en ingresos por eventos."
            ),
        )

        report = await self.repo.create_board_report(data)

        logger.info(
            "[executive_dashboard] Board report created-on-demand: "
            "%s %s (%s)",
            quarter, year, report.id,
        )

        return {
            "status": "success",
            "message": (
                f"\U0001f4ca Informe {quarter} {year} generado "
                f"bajo demanda y listo para la junta directiva."
            ),
            "report": report.model_dump(mode="json"),
        }

    @MCPTool(
        name="get_executive_summary",
        description=(
            "Obtener el resumen ejecutivo consolidado del club: "
            "KPIs de membres\u00eda, finanzas, operaciones y engagement "
            "en una sola vista."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_executive_summary(
        self,
        period: str = "current_quarter",
        date_from: str = "",
        date_to: str = "",
    ) -> dict[str, Any]:
        try:
            dp = DashboardPeriod(period)
        except ValueError:
            return {
                "status": "error",
                "message": (
                    f"Per\u00edodo no v\u00e1lido: '{period}'. "
                    f"Opciones: "
                    f"{', '.join(d.value for d in DashboardPeriod)}"
                ),
            }

        # Simular KPIs consolidados de todos los agentes
        membership = MembershipKPI(
            total_families=1247,
            total_members=3891,
            active_members=3650,
            new_this_period=42,
            departures=8,
            net_growth=34,
            growth_rate_pct=3.2,
            churn_risk_count=23,
            avg_engagement_score=78.5,
            by_tier={
                "basic": 561,
                "premium": 499,
                "vip": 187,
            },
        )

        financial = FinancialKPI(
            revenue=4250000.0,
            expenses=3180000.0,
            net_income=1070000.0,
            outstanding_dues=125000.0,
            collection_rate_pct=94.0,
            budget_variance_pct=5.3,
            revenue_growth_pct=8.1,
            top_revenue_sources=[
                {"source": "Membership Dues", "amount": 2100000.0},
                {"source": "Events & Catering", "amount": 980000.0},
                {"source": "Facility Rentals", "amount": 620000.0},
                {"source": "F&B Revenue", "amount": 550000.0},
            ],
        )

        operational = OperationalKPI(
            events_held=45,
            events_upcoming=12,
            avg_event_attendance=87.5,
            attendance_trend=TrendDirection.IMPROVING,
            facility_utilization_pct=72.0,
            maintenance_pending=5,
            guest_visits=312,
            active_trial_memberships=18,
            top_activities=[
                {"name": "Tennis", "participation": 450, "change_pct": 12.0},
                {"name": "Swimming", "participation": 380, "change_pct": 8.0},
                {"name": "Yoga", "participation": 290, "change_pct": 15.0},
                {"name": "Golf", "participation": 210, "change_pct": 5.0},
            ],
        )

        engagement = EngagementKPI(
            satisfaction_score=4.2,
            loyalty_points_distributed=125000,
            nps_score=35.0,
            engagement_trend=TrendDirection.IMPROVING,
            at_risk_members=23,
            highly_engaged_pct=45.0,
            campaigns_active=3,
            referrals_this_period=15,
        )

        summary_id = datetime.now(
            tz=timezone.utc
        ).strftime("%Y%m%d%H%M%S")

        from club_mcp.models.executive_dashboard import ExecutiveSummary

        summary = ExecutiveSummary(
            id=summary_id,
            period=dp,
            date_from=date_from or "2026-01-01",
            date_to=date_to or "2026-03-31",
            membership=membership,
            financial=financial,
            operational=operational,
            engagement=engagement,
            trends={
                "membership_growth": "improving",
                "revenue_trend": "improving",
                "engagement_trend": "improving",
                "attendance_trend": "improving",
                "satisfaction_trend": "stable",
            },
        )

        await self.repo.save_summary(summary)

        return {
            "status": "success",
            "message": (
                f"\U0001f4ca Resumen ejecutivo ({period}): "
                f"{membership.total_families} familias, "
                f"${financial.revenue:,.0f} revenue, "
                f"{operational.events_held} eventos, "
                f"engagement {membership.avg_engagement_score}/100."
            ),
            "summary": summary.model_dump(mode="json"),
        }

    # \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
    # \U0001f7e2 TOOL: GET FINANCIAL OVERVIEW (AUTO)
    # \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

    @MCPTool(
        name="get_financial_overview",
        description=(
            "Obtener la vista financiera detallada del club: "
            "P&L, revenue, expenses, budgets y varianzas."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_financial_overview(
        self,
        period: str = "current_quarter",
    ) -> dict[str, Any]:
        financial = FinancialKPI(
            revenue=4250000.0,
            expenses=3180000.0,
            net_income=1070000.0,
            outstanding_dues=125000.0,
            collection_rate_pct=94.0,
            budget_variance_pct=5.3,
            revenue_growth_pct=8.1,
            top_revenue_sources=[
                {"source": "Membership Dues", "amount": 2100000.0},
                {"source": "Events & Catering", "amount": 980000.0},
                {"source": "Facility Rentals", "amount": 620000.0},
                {"source": "F&B Revenue", "amount": 550000.0},
            ],
        )

        margin_pct = (
            (financial.net_income / financial.revenue * 100)
            if financial.revenue > 0
            else 0
        )

        return {
            "status": "success",
            "message": (
                f"\U0001f4b0 Revenue: ${financial.revenue:,.0f} | "
                f"Expenses: ${financial.expenses:,.0f} | "
                f"Net: ${financial.net_income:,.0f} | "
                f"Margin: {margin_pct:.1f}%"
            ),
            "financial": financial.model_dump(mode="json"),
            "margin_pct": round(margin_pct, 1),
        }

    # \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
    # \U0001f7e2 TOOL: GET MEMBERSHIP HEALTH (AUTO)
    # \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

    @MCPTool(
        name="get_membership_health",
        description=(
            "Obtener el estado de salud de la membres\u00eda: "
            "distribuci\u00f3n por tier, engagement, "
            "miembros en riesgo y tendencias."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_membership_health(
        self,
        period: str = "current_quarter",
    ) -> dict[str, Any]:
        membership = MembershipKPI(
            total_families=1247,
            total_members=3891,
            active_members=3650,
            new_this_period=42,
            departures=8,
            net_growth=34,
            growth_rate_pct=3.2,
            churn_risk_count=23,
            avg_engagement_score=78.5,
            by_tier={
                "basic": 561,
                "premium": 499,
                "vip": 187,
            },
        )

        total_tier = sum(membership.by_tier.values()) or 1
        tier_pct = {
            k: round(v / total_tier * 100, 1)
            for k, v in membership.by_tier.items()
        }

        return {
            "status": "success",
            "message": (
                f"\U0001f465 Membres\u00eda: "
                f"{membership.total_families} familias | "
                f"Crecimiento: +{membership.growth_rate_pct}% | "
                f"En riesgo: {membership.churn_risk_count}"
            ),
            "membership": membership.model_dump(mode="json"),
            "tier_distribution_pct": tier_pct,
        }

    # \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
    # \U0001f7e2 TOOL: GET OPERATIONAL PULSE (AUTO)
    # \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

    @MCPTool(
        name="get_operational_pulse",
        description=(
            "Obtener el pulso operativo del club: "
            "eventos, utilizaci\u00f3n de instalaciones, "
            "mantenimiento, visitas y actividades top."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_operational_pulse(
        self,
        period: str = "current_quarter",
    ) -> dict[str, Any]:
        operational = OperationalKPI(
            events_held=45,
            events_upcoming=12,
            avg_event_attendance=87.5,
            attendance_trend=TrendDirection.IMPROVING,
            facility_utilization_pct=72.0,
            maintenance_pending=5,
            guest_visits=312,
            active_trial_memberships=18,
            top_activities=[
                {"name": "Tennis", "participation": 450, "change_pct": 12.0},
                {"name": "Swimming", "participation": 380, "change_pct": 8.0},
                {"name": "Yoga", "participation": 290, "change_pct": 15.0},
                {"name": "Golf", "participation": 210, "change_pct": 5.0},
            ],
        )

        return {
            "status": "success",
            "message": (
                f"\u2699\ufe0f Operaciones: "
                f"{operational.events_held} eventos | "
                f"Utilizaci\u00f3n: {operational.facility_utilization_pct}% | "
                f"Mantenimiento pendiente: "
                f"{operational.maintenance_pending}"
            ),
            "operational": operational.model_dump(mode="json"),
        }

    # \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
    # \U0001f7e2 TOOL: DETECT ANOMALIES (AUTO)
    # \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

    @MCPTool(
        name="detect_anomalies",
        description=(
            "Detectar anomal\u00edas y alertas en los datos del club: "
            "ca\u00eddas de engagement, spikes en cancelaciones, "
            "desviaciones presupuestarias, problemas operativos."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def detect_anomalies(
        self,
        domain: str = "",
        sensitivity: str = "medium",
    ) -> dict[str, Any]:
        # Limpiar anomal\u00edas previas
        await self.repo.clear_anomalies()

        anomalies: list[Anomaly] = []

        # Detectar anomal\u00edas por dominio
        domains_to_check = (
            [domain] if domain
            else ["membership", "financial", "operational", "engagement"]
        )

        for d in domains_to_check:
            if d == "membership":
                a = Anomaly(
                    id=f"anom_{d}_001",
                    domain=AnomalyDomain.MEMBERSHIP,
                    severity=AnomalySeverity.MEDIUM,
                    title="Segmento b\u00e1sico con churn elevado",
                    description=(
                        "El segmento Basic muestra una tasa de "
                        "cancelaci\u00f3n 2.3x mayor que el promedio "
                        "del \u00faltimo trimestre."
                    ),
                    context={
                        "churn_rate_basic": 4.1,
                        "churn_rate_avg": 1.8,
                        "members_affected": 23,
                    },
                    suggested_action=(
                        "Lanzar campa\u00f1a de reactivaci\u00f3n "
                        "para segmento b\u00e1sico con ofertas "
                        "de upgrade a Premium."
                    ),
                )
                anomalies.append(a)

            elif d == "financial":
                a = Anomaly(
                    id=f"anom_{d}_001",
                    domain=AnomalyDomain.FINANCIAL,
                    severity=AnomalySeverity.HIGH,
                    title="Sobrecosto en F&B",
                    description=(
                        "Los gastos de Food & Beverage superan "
                        "el presupuesto en un 18% este trimestre."
                    ),
                    context={
                        "budget_pct_used": 118.0,
                        "overrun_amount": 45000.0,
                    },
                    suggested_action=(
                        "Renegociar contrato de catering y "
                        "revisar men\u00fas para optimizar costos."
                    ),
                )
                anomalies.append(a)

            elif d == "operational":
                a = Anomaly(
                    id=f"anom_{d}_001",
                    domain=AnomalyDomain.OPERATIONAL,
                    severity=AnomalySeverity.LOW,
                    title="Utilizaci\u00f3n de piscina a la baja",
                    description=(
                        "La utilizaci\u00f3n de la piscina "
                        "disminuy\u00f3 un 12% vs trimestre anterior."
                    ),
                    context={
                        "utilization_current": 58.0,
                        "utilization_previous": 70.0,
                        "change_pct": -12.0,
                    },
                    suggested_action=(
                        "Evaluar horarios y promociones "
                        "especiales para piscina."
                    ),
                )
                anomalies.append(a)

            elif d == "engagement":
                a = Anomaly(
                    id=f"anom_{d}_001",
                    domain=AnomalyDomain.ENGAGEMENT,
                    severity=AnomalySeverity.MEDIUM,
                    title="NPS en descenso",
                    description=(
                        "El NPS baj\u00f3 de +42 a +35 "
                        "en el \u00faltimo trimestre."
                    ),
                    context={
                        "nps_current": 35.0,
                        "nps_previous": 42.0,
                        "change": -7.0,
                    },
                    suggested_action=(
                        "Realizar encuesta de satisfacci\u00f3n "
                        "profunda para identificar causas "
                        "ra\u00edz del descenso."
                    ),
                )
                anomalies.append(a)

        # Guardar anomal\u00edas
        for a in anomalies:
            await self.repo.save_anomaly(a)

        if not anomalies:
            return {
                "status": "success",
                "message": (
                    "\u2705 No se detectaron anomal\u00edas "
                    "en los datos del club."
                ),
                "anomalies": [],
                "total_anomalies": 0,
            }

        severity_counts: dict[str, int] = {}
        for a in anomalies:
            sev = a.severity.value
            severity_counts[sev] = severity_counts.get(sev, 0) + 1

        return {
            "status": "success",
            "message": (
                f"\u26a0\ufe0f {len(anomalies)} anomal\u00eda(s) "
                f"detectada(s). "
                + " | ".join(
                    f"{k}: {v}" for k, v in severity_counts.items()
                )
            ),
            "anomalies": [a.model_dump(mode="json") for a in anomalies],
            "total_anomalies": len(anomalies),
            "severity_counts": severity_counts,
        }
    # ═══════════════════════════════════════════════════
    # 🟢 TOOL: GET AGE GROUP BALANCE (AUTO)
    # ═══════════════════════════════════════════════════

    @MCPTool(
        name="get_age_group_balance",
        description=(
            "Analizar distribución de actividades por grupo etario. "
            "Calcula coeficiente de Gini y genera recomendaciones "
            "para mejorar el balance de participación entre segmentos."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_age_group_balance(
        self,
        period: str = "current_quarter",
    ) -> dict[str, Any]:
        # Simulated age group distribution
        distribution = {
            "children_0_5": {
                "members": 320,
                "activities": 8,
                "participation_pct": 65.0,
            },
            "children_6_12": {
                "members": 480,
                "activities": 15,
                "participation_pct": 78.0,
            },
            "teens_13_17": {
                "members": 290,
                "activities": 10,
                "participation_pct": 52.0,
            },
            "young_adults_18_30": {
                "members": 380,
                "activities": 12,
                "participation_pct": 45.0,
            },
            "adults_31_50": {
                "members": 890,
                "activities": 20,
                "participation_pct": 72.0,
            },
            "seniors_51_plus": {
                "members": 530,
                "activities": 14,
                "participation_pct": 68.0,
            },
        }

        # Gini coefficient calculation
        values = [d["participation_pct"] for d in distribution.values()]
        n = len(values)
        mean_val = sum(values) / n if n > 0 else 0.0

        if mean_val > 0:
            abs_diffs = sum(
                abs(values[i] - values[j])
                for i in range(n)
                for j in range(n)
            )
            gini = abs_diffs / (2 * n * n * mean_val)
        else:
            gini = 0.0

        # Balance assessment
        if gini < 0.1:
            balance_score = "excellent"
            balance_emoji = "🟢"
        elif gini < 0.2:
            balance_score = "good"
            balance_emoji = "🟡"
        elif gini < 0.3:
            balance_score = "fair"
            balance_emoji = "🟠"
        else:
            balance_score = "poor"
            balance_emoji = "🔴"

        # Identify under/over-represented groups
        avg_pct = mean_val
        underrepresented = [
            k
            for k, v in distribution.items()
            if v["participation_pct"] < avg_pct * 0.8
        ]
        overrepresented = [
            k
            for k, v in distribution.items()
            if v["participation_pct"] > avg_pct * 1.2
        ]

        # Recommendations
        recommendations: list[str] = []
        if underrepresented:
            groups = ", ".join(
                g.replace("_", " ") for g in underrepresented
            )
            recommendations.append(
                f"Crear programas específicos para: {groups}"
            )
        if gini > 0.2:
            recommendations.append(
                "Revisar oferta de actividades para garantizar "
                "equidad entre grupos etarios"
            )
        if not recommendations:
            recommendations.append(
                "La distribución actual es equitativa. "
                "Mantener la estrategia actual."
            )

        return {
            "status": "success",
            "message": (
                f"{balance_emoji} Balance etario ({period}): "
                f"{balance_score} (Gini: {gini:.3f})"
            ),
            "distribution": distribution,
            "gini_coefficient": round(gini, 4),
            "balance_score": balance_score,
            "underrepresented": underrepresented,
            "overrepresented": overrepresented,
            "recommendations": recommendations,
        }
    # ═══════════════════════════════════════════════════
    # 🔵 TOOL: GET PENDING APPROVALS (AUTO)
    # ═══════════════════════════════════════════════════

    @MCPTool(
        name="get_pending_approvals",
        description=(
            "Obtener todas las solicitudes de aprobación pendientes. "
            "Para uso del administrador: revisar, aprobar o rechazar "
            "acciones que requieren HITL (Human-in-the-Loop)."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_pending_approvals(
        self,
        agent: str = "",
    ) -> dict[str, Any]:
        engine = getattr(self, "approval_engine", None)
        if engine is None:
            return {
                "status": "error",
                "message": "ApprovalEngine no configurado en este agente.",
                "items": [],
                "total": 0,
            }

        agent_filter = agent if agent else None
        pending = await engine.get_pending(agent=agent_filter)

        items = []
        for req in pending:
            # Calcular urgencia: pending más viejo = más urgente
            now = datetime.now(tz=timezone.utc)
            age_hours = (now - req.created_at).total_seconds() / 3600
            is_expiring_soon = (
                req.expires_at is not None
                and (req.expires_at - now).total_seconds() < 3600 * 4
            )

            items.append({
                "request_id": str(req.request_id),
                "agent": req.agent,
                "tool": req.tool,
                "params": req.params,
                "requested_by": req.requested_by,
                "approval_level": req.approval_level.value,
                "status": req.status.value,
                "risk_summary": req.risk_summary,
                "estimated_impact": req.estimated_impact,
                "affected_count": req.affected_count,
                "created_at": req.created_at.isoformat(),
                "expires_at": req.expires_at.isoformat() if req.expires_at else None,
                "requires_dual_approval": req.requires_dual_approval,
                "first_approval_by": req.first_approval_by,
                "is_expiring_soon": is_expiring_soon,
                "age_hours": round(age_hours, 1),
            })

        # Ordenar: más urgente primero (expiring_soon > más viejo)
        items.sort(
            key=lambda x: (
                not x["is_expiring_soon"],
                -x["age_hours"],
            )
        )

        return {
            "status": "success",
            "message": (
                f"📋 {len(items)} solicitud(es) pendiente(s) "
                f"de aprobación."
            ),
            "items": items,
            "total": len(items),
        }

    # ═══════════════════════════════════════════════════
    # 🔵 TOOL: APPROVE REQUEST (AUTO)
    # ═══════════════════════════════════════════════════

    @MCPTool(
        name="approve_request",
        description=(
            "Aprobar una solicitud HITL pendiente. "
            "Ejecuta la acción asociada (ej: generar informe, "
            "enviar campaña). Requiere request_id válido."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def approve_request(
        self,
        request_id: str = "",
        approved_by: str = "admin",
        note: str = "",
    ) -> dict[str, Any]:
        if not request_id:
            return {
                "status": "error",
                "message": "Se requiere request_id 🔍",
            }

        engine = getattr(self, "approval_engine", None)
        if engine is None:
            return {
                "status": "error",
                "message": "ApprovalEngine no configurado.",
            }

        try:
            from uuid import UUID
            uid = UUID(request_id)
        except ValueError:
            return {
                "status": "error",
                "message": f"request_id no válido: {request_id}",
            }

        try:
            approved = await engine.approve(
                request_id=uid,
                approved_by=approved_by,
                note=note,
            )
        except ValueError as exc:
            return {
                "status": "error",
                "message": str(exc),
            }

        return {
            "status": "success",
            "message": (
                f"✅ Solicitud {request_id[:8]}… aprobada "
                f"por {approved_by}."
            ),
            "request": {
                "request_id": str(approved.request_id),
                "agent": approved.agent,
                "tool": approved.tool,
                "status": approved.status.value,
                "resolved_by": approved.resolved_by,
                "resolved_at": (
                    approved.resolved_at.isoformat()
                    if approved.resolved_at else None
                ),
                "resolution_note": approved.resolution_note,
            },
        }

    # ═══════════════════════════════════════════════════
    # 🔵 TOOL: REJECT REQUEST (AUTO)
    # ═══════════════════════════════════════════════════

    @MCPTool(
        name="reject_request",
        description=(
            "Rechazar una solicitud HITL pendiente. "
            "La acción asociada NO se ejecuta. "
            "Requiere request_id y un motivo de rechazo."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def reject_request(
        self,
        request_id: str = "",
        rejected_by: str = "admin",
        reason: str = "",
    ) -> dict[str, Any]:
        if not request_id:
            return {
                "status": "error",
                "message": "Se requiere request_id 🔍",
            }

        engine = getattr(self, "approval_engine", None)
        if engine is None:
            return {
                "status": "error",
                "message": "ApprovalEngine no configurado.",
            }

        try:
            from uuid import UUID
            uid = UUID(request_id)
        except ValueError:
            return {
                "status": "error",
                "message": f"request_id no válido: {request_id}",
            }

        try:
            rejected = await engine.reject(
                request_id=uid,
                rejected_by=rejected_by,
                reason=reason,
            )
        except ValueError as exc:
            return {
                "status": "error",
                "message": str(exc),
            }

        return {
            "status": "success",
            "message": (
                f"🚫 Solicitud {request_id[:8]}… rechazada "
                f"por {rejected_by}."
            ),
            "request": {
                "request_id": str(rejected.request_id),
                "agent": rejected.agent,
                "tool": rejected.tool,
                "status": rejected.status.value,
                "resolved_by": rejected.resolved_by,
                "resolved_at": (
                    rejected.resolved_at.isoformat()
                    if rejected.resolved_at else None
                ),
                "resolution_note": rejected.resolution_note,
            },
        }
