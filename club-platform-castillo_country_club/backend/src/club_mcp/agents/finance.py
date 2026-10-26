"""FinanceAgent — manages club financial operations.

7 tools covering expenses, invoices, payments, budgets,
account status, and financial reports.
"""

from __future__ import annotations

import logging
import math
from datetime import date, timedelta
from typing import TYPE_CHECKING, Any

from club_mcp.agents.base import BaseAgent, MCPTool
from club_mcp.hitl.approval_types import ApprovalLevel
from club_mcp.models.family import FamilyStatus
from club_mcp.models.finance import (
    AiFinancialReport,
    AlertSignal,
    BudgetSummary,
    CashFlowForecast,
    CashFlowPeriod,
    CashFlowProjection,
    ExpenseCategory,
    ExpenseCreate,
    FinancialAnomaly,
    FinancialARAgingBucket,
    FinancialExpenseLine,
    FinancialMonthlyTrend,
    FinancialRecommendation,
    FinancialReport,
    FinancialRevenueLine,
    FinancialSummaryResponse,
    HealthScore,
    HealthScoreFactor,
    InvoiceCreate,
    InvoiceItem,
    InvoiceStatus,
    MemberEconomics,
    PaymentCreate,
    PaymentMethod,
    RevenueConcentration,
    RevenueSource,
    TrendItem,
)


if TYPE_CHECKING:
    from club_mcp.db.repositories.family_repo import FamilyRepository
    from club_mcp.db.repositories.finance_repo import FinanceRepository

logger = logging.getLogger(__name__)

class FinanceAgent(BaseAgent):
    """Agente financiero del club."""

    agent_name = "finance"
    description = "Gestión financiera: gastos, facturas, pagos y reportes"

    def __init__(
        self,
        finance_repo: FinanceRepository,
        approval_engine: Any = None,
        notifier: Any = None,
        family_repo: FamilyRepository | None = None,
    ) -> None:
        super().__init__()
        self.repo = finance_repo
        if approval_engine is not None:
            self.approval_engine = approval_engine
        self.notifier = notifier
        self.family_repo = family_repo

    def _register_tools(self) -> None:
        pass

    # ─────────────────────────────────────────────────────────
    # Tool 1: finance_expense_create  🔴 HITL
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "finance_expense_create",
        "Registrar un nuevo gasto del club. Requiere aprobación.",
        approval=ApprovalLevel.HITL,
    )
    async def finance_expense_create(
        self,
        description: str,
        amount: float,
        category: str,
        vendor: str = "",
        date: str = "",
        notes: str = "",
    ) -> dict[str, Any]:
        """Register a new club expense (HITL)."""
        # Validate category
        try:
            cat_enum = ExpenseCategory(category)
        except ValueError:
            valid = ", ".join(c.value for c in ExpenseCategory)
            return {
                "status": "error",
                "message": f"Categoría '{category}' no válida. Opciones: {valid}",
            }

        if amount <= 0:
            return {
                "status": "error",
                "message": "El monto debe ser mayor a cero.",
            }

        expense_data = {
            "description": description,
            "amount": amount,
            "category": cat_enum.value,
            "vendor": vendor,
            "date": date,
            "notes": notes,
        }

        request = await self.approval_engine.create_request(
            agent=self.agent_name,
            tool="finance_expense_create",
            params=expense_data,
            requested_by="system",
            approval_level=ApprovalLevel.HITL,
        )

        return {
            "status": "pending_approval",
            "message": (
                f'💰 Gasto "{description}" por ${amount:,.2f} '
                f"categoría {cat_enum.value} registrado. "
                f"Pendiente de aprobación. 🔔"
            ),
            "request_id": str(request.request_id),
            "description": description,
            "amount": amount,
            "category": cat_enum.value,
        }

    async def execute_expense_create(
        self, expense_data: dict[str, Any]
    ) -> dict[str, Any]:
        """Execute expense creation post-approval."""
        validated = ExpenseCreate(**expense_data)
        expense = self.repo.create_expense(validated)

        return {
            "status": "success",
            "message": (
                f'✨ Gasto "{expense.description}" por ${expense.amount:,.2f} '
                f"registrado exitosamente. 💵"
            ),
            "data": expense.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 2: finance_invoice_create  🔴 HITL
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "finance_invoice_create",
        "Generar una factura para una familia. Requiere aprobación.",
        approval=ApprovalLevel.HITL,
    )
    async def finance_invoice_create(
        self,
        family_id: str,
        items: list[dict[str, Any]],
        due_date: str = "",
        notes: str = "",
        tax_rate: float = 0.0,
    ) -> dict[str, Any]:
        """Generate an invoice for a family (HITL)."""
        if not items:
            return {
                "status": "error",
                "message": "La factura debe tener al menos un ítem.",
            }

        try:
            invoice_items = [InvoiceItem(**item) for item in items]
        except Exception as exc:
            return {
                "status": "error",
                "message": f"Ítems inválidos: {exc}",
            }

        invoice_data = {
            "family_id": family_id,
            "items": [it.model_dump(mode="json") for it in invoice_items],
            "due_date": due_date,
            "notes": notes,
            "tax_rate": tax_rate,
        }

        subtotal = sum(it.quantity * it.unit_price for it in invoice_items)
        tax = round(subtotal * tax_rate / 100, 2)
        total = round(subtotal + tax, 2)

        request = await self.approval_engine.create_request(
            agent=self.agent_name,
            tool="finance_invoice_create",
            params=invoice_data,
            requested_by="system",
            approval_level=ApprovalLevel.HITL,
        )

        return {
            "status": "pending_approval",
            "message": (
                f"📄 Factura por ${total:,.2f} generada para la familia. "
                f"Pendiente de aprobación. 🔔"
            ),
            "request_id": str(request.request_id),
            "subtotal": round(subtotal, 2),
            "tax": tax,
            "total": total,
            "family_id": family_id,
        }

    async def execute_invoice_create(
        self, invoice_data: dict[str, Any]
    ) -> dict[str, Any]:
        """Execute invoice creation post-approval."""
        validated = InvoiceCreate(**invoice_data)
        invoice = self.repo.create_invoice(validated)

        return {
            "status": "success",
            "message": (
                f'✨ Factura {invoice.id} por ${invoice.total:,.2f} '
                f"creada exitosamente. 📄"
            ),
            "data": invoice.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 3: finance_budget_check  🟢 AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "finance_budget_check",
        "Consultar el estado del presupuesto del club.",
        approval=ApprovalLevel.AUTO,
    )
    async def finance_budget_check(
        self,
        period: str = "monthly",
    ) -> dict[str, Any]:
        """Check budget status."""
        budget = self.repo.get_budget(period)
        emoji = "✅" if budget.utilization_pct < 80 else "⚠️"

        return {
            "status": "success",
            "message": (
                f"{emoji} Presupuesto {period}: "
                f"${budget.total_spent:,.2f} de "
                f"${budget.total_budgeted:,.2f} utilizado "
                f"({budget.utilization_pct}%). "
                f"Restante: ${budget.total_remaining:,.2f}"
            ),
            "data": budget.model_dump(mode="json"),
            "total_budgeted": budget.total_budgeted,
            "total_spent": budget.total_spent,
            "total_remaining": budget.total_remaining,
            "utilization_pct": budget.utilization_pct,
        }

    # ─────────────────────────────────────────────────────────
    # Tool 4: finance_payment_process  🔴 HITL
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "finance_payment_process",
        "Registrar y procesar un pago. Requiere aprobación.",
        approval=ApprovalLevel.HITL,
    )
    async def finance_payment_process(
        self,
        family_id: str,
        amount: float,
        method: str = "transfer",
        invoice_id: str = "",
        reference: str = "",
        date: str = "",
        notes: str = "",
    ) -> dict[str, Any]:
        """Record and process a payment (HITL)."""
        try:
            method_enum = PaymentMethod(method)
        except ValueError:
            valid = ", ".join(m.value for m in PaymentMethod)
            return {
                "status": "error",
                "message": f"Método de pago '{method}' no válido. Opciones: {valid}",
            }

        if amount <= 0:
            return {
                "status": "error",
                "message": "El monto del pago debe ser mayor a cero.",
            }

        payment_data = {
            "family_id": family_id,
            "amount": amount,
            "method": method_enum.value,
            "invoice_id": invoice_id,
            "reference": reference,
            "date": date,
            "notes": notes,
        }

        request = await self.approval_engine.create_request(
            agent=self.agent_name,
            tool="finance_payment_process",
            params=payment_data,
            requested_by="system",
            approval_level=ApprovalLevel.HITL,
        )

        return {
            "status": "pending_approval",
            "message": (
                f'💳 Pago de ${amount:,.2f} vía {method_enum.value} '
                f"registrado. Pendiente de aprobación. 🔔"
            ),
            "request_id": str(request.request_id),
            "amount": amount,
            "method": method_enum.value,
            "family_id": family_id,
        }

    async def execute_payment_process(
        self, payment_data: dict[str, Any]
    ) -> dict[str, Any]:
        """Execute payment processing post-approval."""
        validated = PaymentCreate(**payment_data)
        payment = self.repo.create_payment(validated)
        # Auto-approve the payment post HITL approval
        payment = self.repo.update_payment_status(payment.id, "paid") or payment

        # If linked to an invoice, mark it as paid
        if validated.invoice_id:
            inv = self.repo.get_invoice(validated.invoice_id)
            if inv:
                self.repo.update_invoice_status(validated.invoice_id, "paid")

        return {
            "status": "success",
            "message": (
                f'✨ Pago de ${payment.amount:,.2f} procesado '
                f"exitosamente. ¡Gracias! 💰"
            ),
            "data": payment.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 5: finance_report_generate  🟡 SEMI-AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "finance_report_generate",
        "Generar un reporte financiero del club.",
        approval=ApprovalLevel.SEMI_AUTO,
    )
    async def finance_report_generate(
        self,
        report_type: str = "income_expense",
        date_from: str = "",
        date_to: str = "",
    ) -> dict[str, Any]:
        """Generate a financial report."""
        if not date_from or not date_to:
            return {
                "status": "error",
                "message": "Debe proporcionar fecha de inicio y fin del período.",
            }

        if date_from > date_to:
            return {
                "status": "error",
                "message": "La fecha de inicio debe ser anterior a la fecha de fin.",
            }

        report = self.repo.generate_report(report_type, date_from, date_to)

        return {
            "status": "success",
            "message": report.summary,
            "data": report.model_dump(mode="json"),
            "report_type": report.report_type,
            "period": f"{date_from} a {date_to}",
        }

    # ─────────────────────────────────────────────────────────
    # Tool 6: finance_account_status  🟢 AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "finance_account_status",
        "Consultar el estado de cuenta de una familia.",
        approval=ApprovalLevel.AUTO,
    )
    async def finance_account_status(
        self,
        family_id: str,
    ) -> dict[str, Any]:
        """Get account status for a family."""
        status = self.repo.get_account_status(family_id)

        if not status or (not status.invoices and status.total_invoiced == 0):
            return {
                "status": "success",
                "message": "📋 No hay actividad financiera para esta familia.",
                "data": {"family_id": family_id, "balance_due": 0},
            }

        emoji = "✅" if status.balance_due <= 0 else "⚠️"
        overdue_msg = (
            f" ¡Tiene {status.overdue_count} factura(s) vencida(s) "
            f"por ${status.overdue_amount:,.2f}!"
            if status.overdue_count > 0
            else ""
        )

        return {
            "status": "success",
            "message": (
                f"{emoji} Estado de cuenta: "
                f"Facturado ${status.total_invoiced:,.2f}, "
                f"Pagado ${status.total_paid:,.2f}, "
                f"Saldo ${status.balance_due:,.2f}.{overdue_msg}"
            ),
            "data": status.model_dump(mode="json"),
            "balance_due": status.balance_due,
            "overdue_amount": status.overdue_amount,
        }

    # ─────────────────────────────────────────────────────────
    # Tool 7: finance_category_update  🟡 SEMI-AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "finance_category_update",
        "Actualizar el presupuesto de una categoría de gasto.",
        approval=ApprovalLevel.SEMI_AUTO,
    )
    async def finance_category_update(
        self,
        category: str,
        budget_amount: float,
    ) -> dict[str, Any]:
        """Update budget for an expense category."""
        try:
            cat_enum = ExpenseCategory(category)
        except ValueError:
            valid = ", ".join(c.value for c in ExpenseCategory)
            return {
                "status": "error",
                "message": f"Categoría '{category}' no válida. Opciones: {valid}",
            }

        if budget_amount < 0:
            return {
                "status": "error",
                "message": "El presupuesto no puede ser negativo.",
            }

        self.repo.set_budget(cat_enum.value, budget_amount)

        return {
            "status": "success",
            "message": (
                f'✅ Presupuesto de "{category}" actualizado a '
                f"${budget_amount:,.2f}. 📊"
            ),
            "category": cat_enum.value,
            "budget_amount": budget_amount,
        }

    # ─────────────────────────────────────────────────────────
    # Tool 8: generate_ai_analysis  🟢 AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "generate_ai_analysis",
        (
            "Generar análisis financiero inteligente: Health Score compuesto, "
            "proyección de flujo de caja, concentración de ingresos (Shannon/HHI), "
            "detección de anomalías, recomendaciones con impacto cuantificado, "
            "y economía por socio."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def generate_ai_analysis(
        self,
        scope: str = "financial",
        period: str = "current_quarter",
    ) -> dict[str, Any]:
        """Generate comprehensive financial analysis."""
        date_from, date_to = self._resolve_period(period)
        budget_period = self._period_to_budget_period(period)
        months = self._months_in_period(period)

        # ── 1. Gather data ──
        try:
            budget = self.repo.get_budget(budget_period)
        except Exception:
            budget = BudgetSummary(period=budget_period)

        try:
            report = self.repo.generate_report("income_expense", date_from, date_to)
        except Exception:
            report = FinancialReport(
                report_type="income_expense",
                period_start=date_from,
                period_end=date_to,
            )

        # ── 2. Calculate all metrics ──
        health = self._calculate_health_score(budget, report, months)
        concentration = self._calculate_revenue_concentration(report)
        forecast = self._calculate_cash_flow_forecast(report, budget, months)
        anomalies = self._detect_financial_anomalies(budget, report, months)
        recommendations = self._generate_recommendations(
            health, concentration, anomalies, budget, report, months
        )
        positive_trends = self._identify_positive_trends(report, budget)
        alert_signals = self._identify_alert_signals(report, budget, anomalies)
        projection = self._generate_projection(report, forecast, months)
        member_econ = await self._calculate_member_economics(report)

        # ── 3. Build report ──
        ai_report = AiFinancialReport(
            health_score=health,
            cash_flow_forecast=forecast,
            revenue_concentration=concentration,
            financial_anomalies=anomalies,
            recommendations=recommendations,
            positive_trends=positive_trends,
            alert_signals=alert_signals,
            projection=projection,
            member_economics=member_econ,
        )

        return {
            "status": "success",
            "message": f"📊 Análisis financiero generado para {period}",
            "data": ai_report.model_dump(mode="json"),
        }

    # ── Period Resolution ────────────────────────────────────

    @staticmethod
    def _resolve_period(period: str) -> tuple[str, str]:
        """Convert period key to (date_from, date_to) ISO strings."""
        today = date.today()
        year, month = today.year, today.month

        if period == "current_month":
            start = date(year, month, 1)
            end = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
        elif period == "current_quarter":
            q = (month - 1) // 3
            start = date(year, q * 3 + 1, 1)
            em = q * 3 + 4
            end = date(year, em, 1) if em <= 12 else date(year + 1, em - 12, 1)
        elif period == "current_year":
            start, end = date(year, 1, 1), date(year + 1, 1, 1)
        elif period == "last_month":
            if month == 1:
                start, end = date(year - 1, 12, 1), date(year, 1, 1)
            else:
                start = date(year, month - 1, 1)
                end = date(year, month, 1)
        elif period == "last_quarter":
            q = (month - 1) // 3
            if q == 0:
                start, end = date(year - 1, 10, 1), date(year, 1, 1)
            else:
                start = date(year, (q - 1) * 3 + 1, 1)
                end = date(year, q * 3 + 1, 1)
        elif period == "ytd":
            start = date(year, 1, 1)
            em = month + 1
            end = date(year, em, 1) if em <= 12 else date(year + 1, em - 12, 1)
        else:
            q = (month - 1) // 3
            start = date(year, q * 3 + 1, 1)
            em = q * 3 + 4
            end = date(year, em, 1) if em <= 12 else date(year + 1, em - 12, 1)

        return start.isoformat(), end.isoformat()

    @staticmethod
    def _period_to_budget_period(period: str) -> str:
        if "month" in period:
            return "monthly"
        if "year" in period or "ytd" in period:
            return "yearly"
        return "quarterly"

    @staticmethod
    def _months_in_period(period: str) -> int:
        if "month" in period:
            return 1
        if "year" in period or "ytd" in period:
            return 12
        return 3

    # ── Health Score ─────────────────────────────────────────

    def _calculate_health_score(
        self, budget: BudgetSummary, report: FinancialReport, months: int
    ) -> HealthScore:
        factors: list[HealthScoreFactor] = []
        total_income = max(report.total_income, 1)

        # Factor 1: Liquidity (weight 0.20) — net income / monthly expenses
        monthly_exp = report.total_expenses / max(months, 1)
        cash_ratio = 0.0
        if monthly_exp > 0:
            cash_ratio = report.net_result / monthly_exp
            liq_score = max(0.0, min(100.0, cash_ratio * 25))
        else:
            liq_score = 100.0
        liq_trend = "improving" if liq_score > 60 else "declining" if liq_score < 30 else "stable"
        factors.append(HealthScoreFactor(
            name="Liquidez", score=round(liq_score, 1), weight=0.20,
            contribution=round(liq_score * 0.20, 1), trend=liq_trend,
            detail=f"Ratio flujo/gasto mensual: {cash_ratio:.1f}x",
        ))

        # Factor 2: Efficiency (weight 0.25) — closeness to 80% utilization
        util = budget.utilization_pct if budget.total_budgeted > 0 else 50.0
        eff_score = max(0.0, 100.0 - abs(util - 80) * 1.5)
        eff_trend = "improving" if 70 <= util <= 90 else "declining"
        factors.append(HealthScoreFactor(
            name="Eficiencia", score=round(eff_score, 1), weight=0.25,
            contribution=round(eff_score * 0.25, 1), trend=eff_trend,
            detail=f"Utilización presupuestaria: {util:.1f}%",
        ))

        # Factor 3: Growth (weight 0.20) — operating margin as proxy
        margin = (report.net_result / total_income * 100) if total_income > 1 else 0
        growth_score = max(0.0, min(100.0, 50 + margin * 2.5))
        growth_trend = "improving" if margin > 15 else "declining" if margin < 5 else "stable"
        factors.append(HealthScoreFactor(
            name="Crecimiento", score=round(growth_score, 1), weight=0.20,
            contribution=round(growth_score * 0.20, 1), trend=growth_trend,
            detail=f"Margen operativo: {margin:.1f}%",
        ))

        # Factor 4: Collection (weight 0.20) — estimate from income structure
        # Higher income concentration + positive margin = healthy collection
        collection_score = min(100.0, max(0.0, 50 + margin * 2))
        coll_trend = "stable"
        factors.append(HealthScoreFactor(
            name="Cobranza", score=round(collection_score, 1), weight=0.20,
            contribution=round(collection_score * 0.20, 1), trend=coll_trend,
            detail="Estimado basado en estructura de ingresos",
        ))

        # Factor 5: Budget adherence (weight 0.15)
        if budget.total_budgeted > 0:
            variance_pct = abs(budget.utilization_pct - 100)
            budget_score = max(0.0, 100.0 - variance_pct * 2)
        else:
            budget_score = 50.0
        b_trend = "improving" if budget_score > 70 else "declining"
        factors.append(HealthScoreFactor(
            name="Presupuesto", score=round(budget_score, 1), weight=0.15,
            contribution=round(budget_score * 0.15, 1), trend=b_trend,
            detail=f"Variación presupuestaria: {budget.utilization_pct - 100:+.1f}%",
        ))

        total = round(sum(f.contribution for f in factors), 1)
        return HealthScore(
            total=total,
            grade=self._health_grade(total),
            factors=factors,
            trend_vs_previous=0.0,
        )

    @staticmethod
    def _health_grade(score: float) -> str:
        if score >= 95:
            return "A+"
        if score >= 85:
            return "A"
        if score >= 75:
            return "B+"
        if score >= 65:
            return "B"
        if score >= 55:
            return "C+"
        if score >= 45:
            return "C"
        if score >= 35:
            return "D"
        return "F"

    # ── Revenue Concentration ────────────────────────────────

    def _calculate_revenue_concentration(
        self, report: FinancialReport
    ) -> RevenueConcentration:
        sources: list[RevenueSource] = []
        total = report.total_income if report.total_income > 0 else 1.0

        for item in report.income_breakdown:
            amount = float(item.get("amount", 0))
            share = (amount / total) * 100
            sources.append(RevenueSource(
                name=str(item.get("category", "unknown")),
                label=str(item.get("label", item.get("category", "Otro"))),
                share_pct=round(share, 1),
                amount=amount,
            ))

        if not sources:
            return RevenueConcentration(
                risk_assessment="Sin datos de ingresos disponibles.",
            )

        shares = [s.share_pct / 100 for s in sources]
        entropy = self._shannon_entropy(shares)
        max_entropy = math.log2(len(shares)) if len(shares) > 1 else 1.0
        div_index = (entropy / max_entropy) if max_entropy > 0 else 0.0
        hhi = sum(s.share_pct ** 2 for s in sources)

        # Risk assessment
        if div_index < 0.5:
            risk = (
                f"RIESGO ALTO: Diversificación {div_index:.0%}. "
                f"Ingresos muy concentrados. Diversificar hacia F&B, eventos y bienestar."
            )
        elif div_index < 0.7:
            risk = (
                f"RIESGO MEDIO: Diversificación {div_index:.0%}. "
                f"Concentración moderada. Oportunidad de crecimiento en fuentes secundarias."
            )
        else:
            risk = (
                f"SALUDABLE: Diversificación {div_index:.0%}. "
                f"Buen balance entre fuentes de ingreso."
            )

        return RevenueConcentration(
            entropy=round(entropy, 3),
            max_entropy=round(max_entropy, 3),
            diversification_index=round(div_index, 3),
            herfindahl_index=round(hhi, 0),
            sources=sources,
            risk_assessment=risk,
        )

    @staticmethod
    def _shannon_entropy(shares: list[float]) -> float:
        """H = -Σ(p_i x log2(p_i)) where p_i is proportion."""
        h = 0.0
        for p in shares:
            if p > 0:
                h -= p * math.log2(p)
        return h

    # ── Cash Flow Forecast ───────────────────────────────────

    def _calculate_cash_flow_forecast(
        self, report: FinancialReport, budget: BudgetSummary, months: int
    ) -> CashFlowForecast:
        monthly_rev = report.total_income / max(months, 1)
        monthly_exp = report.total_expenses / max(months, 1)
        monthly_net = monthly_rev - monthly_exp

        # Use budget data for projection if available
        if budget.total_budgeted > 0:
            monthly_budget_exp = budget.total_budgeted / max(months, 1)
        else:
            monthly_budget_exp = monthly_exp

        periods: list[CashFlowPeriod] = []
        cumulative = report.net_result  # Start from current net

        month_names = [
            "Ene", "Feb", "Mar", "Abr", "May", "Jun",
            "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
        ]
        today = date.today()
        current_idx = today.month - 1

        for i in range(1, 7):
            target_idx = (current_idx + i) % 12
            target_year = today.year + ((current_idx + i) // 12)
            label = f"{month_names[target_idx]} {target_year}"

            # Simple projection: current run rate with slight seasonality
            seasonal_factor = 1.0
            if target_idx in [11, 0, 1, 2, 3]:  # Dec-May high season CR
                seasonal_factor = 1.08
            elif target_idx in [5, 6, 7, 8]:  # Jun-Sep low season
                seasonal_factor = 0.92

            proj_rev = round(monthly_rev * seasonal_factor, 0)
            proj_exp = round(monthly_budget_exp, 0)
            proj_net = proj_rev - proj_exp
            cumulative += proj_net

            # Confidence band widens with distance
            se = abs(monthly_net) * 0.15 * i
            periods.append(CashFlowPeriod(
                label=label,
                projected_revenue=proj_rev,
                projected_expenses=proj_exp,
                projected_net=proj_net,
                cumulative_cash=round(cumulative, 0),
                lower_bound=round(proj_net - 1.28 * se, 0),
                upper_bound=round(proj_net + 1.28 * se, 0),
            ))

        return CashFlowForecast(
            method="run_rate_with_seasonality",
            confidence="medium",
            confidence_band_pct=80.0,
            periods=periods,
            assumptions=[
                f"Ingresos mensuales promedio: {format_currency(monthly_rev)}",
                f"Gastos mensuales promedio: {format_currency(monthly_exp)}",
                "Factor estacional Costa Rica: +8% dic-may, -8% jun-sep",
                "Proyección basada en tasa actual sin cambios estructurales",
            ],
        )

    # ── Anomaly Detection ────────────────────────────────────

    def _detect_financial_anomalies(
        self, budget: BudgetSummary, report: FinancialReport, months: int
    ) -> list[FinancialAnomaly]:
        anomalies: list[FinancialAnomaly] = []
        annualizer = 12 / max(months, 1)
        total_income = max(report.total_income, 1)

        # 1. Budget overrun per category
        for line in budget.lines:
            if line.utilization_pct > 110:
                overrun = line.spent - line.budgeted
                severity = "critical" if line.utilization_pct > 130 else "high"
                anomalies.append(FinancialAnomaly(
                    id=f"budget_overrun_{line.category}",
                    domain="budget",
                    severity=severity,
                    title=f"Sobrepresupuesto: {line.category}",
                    detail=(
                        f"{line.utilization_pct:.0f}% utilizado — "
                        f"{format_currency(line.spent)} de {format_currency(line.budgeted)} presupuestado."
                    ),
                    deviation_pct=round(line.utilization_pct - 100, 1),
                    estimated_annual_impact=round(overrun * annualizer, 0),
                    suggested_action=f"Revisar contratos y gastos recurrentes de {line.category}.",
                ))

        # 2. Negative or critically low margin
        if total_income > 1:
            margin = report.net_result / total_income * 100
            if margin < 5:
                anomalies.append(FinancialAnomaly(
                    id="critical_margin",
                    domain="revenue",
                    severity="critical" if margin < 0 else "high",
                    title="Pérdida operativa" if margin < 0 else "Margen crítico",
                    detail=f"Margen operativo: {margin:.1f}%. Mínimo saludable para club privado: 15%.",
                    deviation_pct=round(margin - 15, 1),
                    estimated_annual_impact=round(report.net_result * annualizer, 0),
                    suggested_action="Plan de reducción de costos o incremento de revenue por nuevos servicios.",
                ))

        # 3. Revenue concentration risk
        if report.income_breakdown and len(report.income_breakdown) > 1:
            shares = [
                (float(item.get("amount", 0)) / total_income * 100)
                for item in report.income_breakdown
            ]
            hhi = sum(s ** 2 for s in shares)
            if hhi > 3000:
                max_source = max(report.income_breakdown, key=lambda x: float(x.get("amount", 0)))
                anomalies.append(FinancialAnomaly(
                    id="revenue_concentration",
                    domain="revenue",
                    severity="high" if hhi > 4500 else "medium",
                    title="Alta concentración de ingresos",
                    detail=(
                        f"HHI = {hhi:,.0f}. "
                        f"'{max_source.get('label', 'Principal')}' representa "
                        f"{max(shares):.0f}% del ingreso total."
                    ),
                    deviation_pct=round((hhi - 2500) / 25, 1),
                    estimated_annual_impact=0,
                    suggested_action="Diversificar: agregar programas de F&B, eventos privados, o bienestar.",
                ))

        # 4. High absolute expense growth (if expense breakdown has trends)
        for item in report.expense_breakdown:
            trend = float(item.get("trend_pct", 0))
            if trend > 20:
                anomalies.append(FinancialAnomaly(
                    id=f"expense_spike_{item.get('category', 'unknown')}",
                    domain="expense",
                    severity="high" if trend > 30 else "medium",
                    title=f"Aumento de gastos: {item.get('label', item.get('category', 'Desconocido'))}",
                    detail=f"Crecimiento de {trend:.0f}% vs periodo anterior.",
                    deviation_pct=round(trend, 1),
                    estimated_annual_impact=round(float(item.get("amount", 0)) * (trend / 100) * annualizer, 0),
                    suggested_action="Auditar gastos. Identificar causa raíz del incremento.",
                ))

        return anomalies

    # ── Recommendations ──────────────────────────────────────

    def _generate_recommendations(
        self,
        health: HealthScore,
        concentration: RevenueConcentration,
        anomalies: list[FinancialAnomaly],
        budget: BudgetSummary,
        report: FinancialReport,
        months: int,
    ) -> list[FinancialRecommendation]:
        recs: list[FinancialRecommendation] = []
        total_income = max(report.total_income, 1)
        annualizer = 12 / max(months, 1)
        idx = 0

        # Rec 1: If margin < 15%, recommend cost review
        margin = report.net_result / total_income * 100 if total_income > 1 else 0
        if margin < 15:
            idx += 1
            potential_saving = report.total_expenses * 0.05 * annualizer
            recs.append(FinancialRecommendation(
                id=f"rec_{idx}",
                category="cost_reduction",
                action="Auditar los 3 gastos más altos y renegociar contratos",
                justification=f"Margen de {margin:.1f}% está por debajo del benchmark de club privado (15-25%).",
                estimated_impact_annual=round(potential_saving, 0),
                confidence="medium",
                priority="high" if margin < 5 else "medium",
                implementation_effort="medium",
            ))

        # Rec 2: If concentration is high, diversify
        if concentration.diversification_index < 0.7 and concentration.diversification_index > 0:
            idx += 1
            recs.append(FinancialRecommendation(
                id=f"rec_{idx}",
                category="revenue_growth",
                action="Desarrollar programas de F&B premium, eventos corporativos y wellness",
                justification=(
                    f"Índice de diversificación {concentration.diversification_index:.0%}. "
                    f"Club diversificado reduce riesgo de caída en fuente principal."
                ),
                estimated_impact_annual=round(total_income * 0.08 * annualizer, 0),
                confidence="medium",
                priority="high",
                implementation_effort="high",
            ))

        # Rec 3: If budget overrun in any category
        overrun_categories = [a for a in anomalies if a.domain == "budget"]
        if overrun_categories:
            idx += 1
            total_impact = sum(a.estimated_annual_impact for a in overrun_categories)
            recs.append(FinancialRecommendation(
                id=f"rec_{idx}",
                category="cost_reduction",
                action=f"Implementar control de gastos en {len(overrun_categories)} categoría(s) sobre presupuesto",
                justification="Gastos recurrentes sobre presupuesto erosionan el margen operativo.",
                estimated_impact_annual=round(abs(total_impact), 0),
                confidence="high",
                priority="high",
                implementation_effort="low",
            ))

        # Rec 4: If positive margin, suggest investment
        if margin > 20:
            idx += 1
            recs.append(FinancialRecommendation(
                id=f"rec_{idx}",
                category="revenue_growth",
                action="Invertir excedente en mejora de instalaciones o nuevos servicios",
                justification=f"Margen saludable de {margin:.1f}% permite inversión estratégica.",
                estimated_impact_annual=round(report.net_result * 0.3, 0),
                confidence="medium",
                priority="medium",
                implementation_effort="high",
            ))

        # Rec 5: Collection improvement
        if health.total < 70:
            idx += 1
            recs.append(FinancialRecommendation(
                id=f"rec_{idx}",
                category="risk_mitigation",
                action="Implementar programa de cobranza proactiva con recordatorios automáticos",
                justification=f"Health Score de {health.total:.0f} indica múltiples áreas de mejora.",
                estimated_impact_annual=round(total_income * 0.03 * annualizer, 0),
                confidence="medium",
                priority="medium",
                implementation_effort="low",
            ))

        # Rec 6: Always suggest seasonal planning for Costa Rica
        idx += 1
        recs.append(FinancialRecommendation(
            id=f"rec_{idx}",
            category="efficiency",
            action="Ajustar presupuesto operativo según estacionalidad costarricense",
            justification=(
                "Temporada alta (dic-abr) requiere más staff y F&B. "
                "Temporada baja (jun-set) permite mantenimiento mayor."
            ),
            estimated_impact_annual=round(report.total_expenses * 0.02 * annualizer, 0),
            confidence="high",
            priority="low",
            implementation_effort="low",
        ))

        return recs

    # ── Trends & Alerts ──────────────────────────────────────

    def _identify_positive_trends(
        self, report: FinancialReport, budget: BudgetSummary
    ) -> list[TrendItem]:
        trends: list[TrendItem] = []
        total_income = max(report.total_income, 1)

        # Positive: net income is positive
        if report.net_result > 0:
            margin = report.net_result / total_income * 100
            trends.append(TrendItem(
                title="Resultado neto positivo",
                detail=f"Ingreso neto de {format_currency(report.net_result)} con margen de {margin:.1f}%.",
                metric="net_income",
                change_pct=round(margin, 1),
                period="periodo actual",
            ))

        # Positive: under budget
        if budget.utilization_pct < 90 and budget.total_budgeted > 0:
            savings = budget.total_budgeted - budget.total_spent
            trends.append(TrendItem(
                title="Bajo presupuesto",
                detail=f"Ahorro de {format_currency(savings)} ({100 - budget.utilization_pct:.0f}% bajo presupuesto).",
                metric="budget_utilization",
                change_pct=round(100 - budget.utilization_pct, 1),
                period="periodo actual",
            ))

        # Positive: revenue categories growing
        for item in report.income_breakdown:
            trend_pct = float(item.get("trend_pct", 0))
            if trend_pct > 10:
                trends.append(TrendItem(
                    title=f"Crecimiento en {item.get('label', item.get('category', 'Rubro'))}",
                    detail=f" +{trend_pct:.0f}% vs periodo anterior.",
                    metric=str(item.get("category", "")),
                    change_pct=round(trend_pct, 1),
                    period="vs anterior",
                ))

        return trends

    def _identify_alert_signals(
        self,
        report: FinancialReport,
        budget: BudgetSummary,
        anomalies: list[FinancialAnomaly],
    ) -> list[AlertSignal]:
        alerts: list[AlertSignal] = []

        # Alert from anomalies
        for a in anomalies:
            if a.severity in ("critical", "high"):
                alerts.append(AlertSignal(
                    title=a.title,
                    detail=a.detail,
                    severity=a.severity,
                    deviation_pct=a.deviation_pct,
                    threshold_exceeded=10.0,
                ))

        # Alert: expenses growing faster than revenue
        rev_trend_items = [i for i in report.income_breakdown if float(i.get("trend_pct", 0)) != 0]
        exp_trend_items = [i for i in report.expense_breakdown if float(i.get("trend_pct", 0)) != 0]
        if rev_trend_items and exp_trend_items:
            avg_rev_trend = sum(float(i.get("trend_pct", 0)) for i in rev_trend_items) / len(rev_trend_items)
            avg_exp_trend = sum(float(i.get("trend_pct", 0)) for i in exp_trend_items) / len(exp_trend_items)
            if avg_exp_trend > avg_rev_trend + 5:
                alerts.append(AlertSignal(
                    title="Gastos crecen más rápido que ingresos",
                    detail=(
                        f"Gastos: +{avg_exp_trend:.0f}% vs Ingresos: +{avg_rev_trend:.0f}%. "
                        f"Gap de {avg_exp_trend - avg_rev_trend:.0f} puntos porcentuales."
                    ),
                    severity="high",
                    deviation_pct=round(avg_exp_trend - avg_rev_trend, 1),
                    threshold_exceeded=5.0,
                ))

        return alerts

    # ── Projection ───────────────────────────────────────────

    def _generate_projection(
        self,
        report: FinancialReport,
        forecast: CashFlowForecast,
        months: int,
    ) -> CashFlowProjection:
        total_income = max(report.total_income, 1)
        margin = report.net_result / total_income * 100 if total_income > 1 else 0

        if forecast.periods:
            last = forecast.periods[-1]
            projected_net = last.cumulative_cash
            direction = "crecimiento" if projected_net > report.net_result else "contracción"
        else:
            projected_net = report.net_result
            direction = "estable"

        summary = (
            f"Proyección a 6 meses: ingreso neto acumulado de "
            f"{format_currency(projected_net)}. "
            f"Tendencia de {direction}. "
        )

        if margin < 10:
            summary += (
                f"Con margen actual de {margin:.1f}%, se requiere acción "
                f"para mantener la salud financiera."
            )
        elif margin > 20:
            summary += (
                f"Margen saludable de {margin:.1f}% permite "
                f"planificación de inversiones estratégicas."
            )

        risk_factors = [
            "Estacionalidad costarricense (baja junio-septiembre)",
            "Posible incremento en costos de servicios públicos",
            "Riesgo de churn de socios de alto valor",
        ]

        if margin < 10:
            risk_factors.insert(0, "Margen operativo por debajo del mínimo recomendado")

        return CashFlowProjection(
            method="run_rate_with_seasonality",
            confidence="medium",
            summary=summary,
            key_assumptions=[
                f"Margen operativo actual: {margin:.1f}%",
                f"Revenue mensual promedio: {format_currency(report.total_income / max(months, 1))}",
                "Patrón estacional Costa Rica aplicado",
            ],
            risk_factors=risk_factors,
        )

    # ── Member Economics ─────────────────────────────────────

    async def _calculate_member_economics(
        self, report: FinancialReport
    ) -> MemberEconomics:
        """Calculate per-member economics using active family members."""
        if self.family_repo is None:
            logger.warning(
                "[finance] FamilyRepository unavailable; member economics omitted"
            )
            return MemberEconomics()

        try:
            families = await self.family_repo.get_all_families()
        except Exception:
            logger.exception("[finance] Failed to load active family members")
            return MemberEconomics()

        member_count = sum(
            family.member_count
            for family in families
            if family.status == FamilyStatus.ACTIVE
        )
        if member_count == 0:
            logger.info("[finance] No active members available for unit economics")
            return MemberEconomics()

        total_income = report.total_income
        total_expenses = report.total_expenses

        avg_rev = total_income / member_count
        avg_cost = total_expenses / member_count
        avg_margin = avg_rev - avg_cost
        margin_pct = (avg_margin / max(avg_rev, 1)) * 100

        # CLV estimate: avg monthly revenue x margin x avg tenure (60 months)
        avg_monthly_rev = avg_rev / max(self._months_in_period("current_quarter"), 1)
        ltv = avg_monthly_rev * (margin_pct / 100) * 60
        cac = avg_rev * 0.15  # Estimate: 15% of annual revenue per acquisition
        ltv_cac = ltv / max(cac, 1)

        return MemberEconomics(
            member_count=member_count,
            avg_revenue_per_member=round(avg_rev, 0),
            avg_cost_per_member=round(avg_cost, 0),
            avg_margin_per_member=round(avg_margin, 0),
            ltv_estimate=round(ltv, 0),
            cac_estimate=round(cac, 0),
            ltv_cac_ratio=round(ltv_cac, 1),
            by_tier=[],
        )

    # ─────────────────────────────────────────────────────────
    # Tool 9: get_financial_summary  🟢 AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "get_financial_summary",
        (
            "Obtener el resumen financiero del dashboard: KPIs principales, "
            "tendencias mensuales, desglose de gastos, ingresos por fuente, "
            "posición de caja y cuentas por cobrar con aging."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_financial_summary(
        self,
        period: str = "current_quarter",
    ) -> dict[str, Any]:
        """Get dashboard-level financial summary."""
        date_from, date_to = self._resolve_period(period)
        budget_period = self._period_to_budget_period(period)

        # 1. Gather data
        try:
            report = self.repo.generate_report(
                "income_expense", date_from, date_to
            )
        except Exception:
            report = FinancialReport(
                report_type="income_expense",
                period_start=date_from,
                period_end=date_to,
            )

        try:
            budget = self.repo.get_budget(budget_period)
        except Exception:
            budget = BudgetSummary(period=budget_period)

        # 2. Core KPIs
        revenue_total = report.total_income
        expenses_total = report.total_expenses
        net_income = report.net_result
        operating_margin_pct = round(
            (net_income / revenue_total * 100)
            if revenue_total > 0 else 0, 1
        )
        budget_variance_pct = round(
            budget.utilization_pct - 100, 1
        )

        # 3. Cash position
        cash_position = self.repo.get_cash_position()

        # 4. Accounts receivable + aging
        ar_data = self.repo.get_accounts_receivable_summary()
        accounts_receivable = ar_data["total_ar"]
        ar_aging: list[FinancialARAgingBucket] = ar_data["aging"]

        # 5. Collection ratio
        all_invoices = self.repo.list_invoices()
        total_invoiced = sum(inv.total for inv in all_invoices)
        total_paid_inv = sum(
            inv.total for inv in all_invoices
            if inv.status == InvoiceStatus.PAID.value
        )
        collection_ratio_pct = round(
            (total_paid_inv / total_invoiced * 100)
            if total_invoiced > 0 else 0, 1
        )

        # 6. Monthly trend
        monthly_trend: list[FinancialMonthlyTrend] = (
            self.repo.get_monthly_trend(date_from, date_to)
        )

        # 7. Revenue by source
        revenue_by_source: list[FinancialRevenueLine] = []
        if report.income_breakdown:
            for item in report.income_breakdown:
                amount = float(item.get("amount", 0))
                source = str(
                    item.get("method", item.get("category", "Otro"))
                )
                pct = round(
                    (amount / revenue_total * 100)
                    if revenue_total > 0 else 0, 1
                )
                revenue_by_source.append(FinancialRevenueLine(
                    source=source,
                    amount=amount,
                    percentage=pct,
                ))

        # 8. Expense breakdown with percentages + variance
        expense_breakdown: list[FinancialExpenseLine] = []
        for line in budget.lines:
            pct = round(
                (line.spent / expenses_total * 100)
                if expenses_total > 0 else 0, 1
            )
            variance = round(
                ((line.spent - line.budgeted) / line.budgeted * 100)
                if line.budgeted > 0 else 0, 1
            )
            expense_breakdown.append(FinancialExpenseLine(
                category=line.category,
                amount=line.spent,
                percentage=pct,
                variance_pct=variance,
            ))

        # 9. Assemble response
        summary = FinancialSummaryResponse(
            period=period,
            revenue_total=round(revenue_total, 2),
            expenses_total=round(expenses_total, 2),
            net_income=round(net_income, 2),
            operating_margin_pct=operating_margin_pct,
            collection_ratio_pct=collection_ratio_pct,
            budget_variance_pct=budget_variance_pct,
            monthly_trend=monthly_trend,
            expense_breakdown=expense_breakdown,
            revenue_by_source=revenue_by_source,
            cash_position=round(cash_position, 2),
            accounts_receivable=round(accounts_receivable, 2),
            accounts_receivable_aging=ar_aging,
        )

        return {
            "status": "success",
            "message": (
                f"📊 Resumen financiero ({period}): "
                f"₡{revenue_total / 1_000_000:,.1f}M ingresos, "
                f"margen {operating_margin_pct}%, "
                f"₡{cash_position / 1_000_000:,.1f}M en caja."
            ),
            "data": summary.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 10: finance_board_briefing  🟡 SEMI-AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "finance_board_briefing",
        (
            "Generar briefing financiero consolidado para la junta directiva. "
            "Incluye Health Score, KPIs principales, forecast de caja, "
            "anomalías, recomendaciones y economía por socio. "
            "Formato ejecutivo listo para presentación."
        ),
        approval=ApprovalLevel.SEMI_AUTO,
    )
    async def finance_board_briefing(
        self,
        period: str = "current_quarter",
    ) -> dict[str, Any]:
        """Generate board-ready financial briefing."""
        date_from, date_to = self._resolve_period(period)
        budget_period = self._period_to_budget_period(period)
        months = self._months_in_period(period)

        # ── 1. Gather all data (same as generate_ai_analysis) ──
        try:
            budget = self.repo.get_budget(budget_period)
        except Exception:
            budget = BudgetSummary(period=budget_period)

        try:
            report = self.repo.generate_report(
                "income_expense", date_from, date_to
            )
        except Exception:
            report = FinancialReport(
                report_type="income_expense",
                period_start=date_from,
                period_end=date_to,
            )

        # ── 2. Compute all metrics ──
        health = self._calculate_health_score(budget, report, months)
        concentration = self._calculate_revenue_concentration(report)
        forecast = self._calculate_cash_flow_forecast(
            report, budget, months
        )
        anomalies = self._detect_financial_anomalies(
            budget, report, months
        )
        recommendations = self._generate_recommendations(
            health, concentration, anomalies,
            budget, report, months,
        )
        positive_trends = self._identify_positive_trends(report, budget)
        alert_signals = self._identify_alert_signals(
            report, budget, anomalies,
        )
        member_econ = await self._calculate_member_economics(report)

        # ── 3. Executive headline ──
        total_income = report.total_income
        total_expenses = report.total_expenses
        net_income = report.net_result
        margin_pct = (
            round(net_income / total_income * 100, 1)
            if total_income > 0 else 0
        )

        cash_position = 0.0
        try:
            cash_position = self.repo.get_cash_position()
        except Exception:
            logger.exception("[finance] Failed to load cash position")

        # Trend direction
        if margin_pct > 15:
            trajectory = "crecimiento"
            trajectory_emoji = "📈"
        elif margin_pct > 5:
            trajectory = "estable"
            trajectory_emoji = "➡️"
        else:
            trajectory = "precaución"
            trajectory_emoji = "📉"

        # ── 4. Board summary line ──
        summary = (
            f"{trajectory_emoji} Briefing {period}: "
            f"Health {health.total:.0f}/100 ({health.grade}). "
            f"Revenue {format_currency(total_income)}, "
            f"Margen {margin_pct}%, "
            f"Caja {format_currency(cash_position)}. "
            f"Trayectoria: {trajectory}."
        )

        # ── 5. Critical items for board attention ──
        critical_anomalies = [
            a for a in anomalies
            if a.severity in ("critical", "high")
        ]
        high_priority_recs = [
            r for r in recommendations
            if r.priority == "high"
        ]

        # ── 6. Assemble briefing ──
        briefing = {
            "period": period,
            "date_from": date_from,
            "date_to": date_to,
            "generated_at": date.today().isoformat(),

            # ── Section 1: Headline KPIs ──
            "headline": {
                "health_score": health.total,
                "health_grade": health.grade,
                "revenue": round(total_income, 2),
                "expenses": round(total_expenses, 2),
                "net_income": round(net_income, 2),
                "operating_margin_pct": margin_pct,
                "cash_position": round(cash_position, 2),
                "trajectory": trajectory,
            },

            # ── Section 2: Health factors ──
            "health_factors": [
                {
                    "name": f.name,
                    "score": f.score,
                    "weight": f.weight,
                    "trend": f.trend,
                    "detail": f.detail,
                }
                for f in health.factors
            ],

            # ── Section 3: Cash flow forecast ──
            "cash_flow_forecast": {
                "method": forecast.method,
                "confidence": forecast.confidence,
                "periods": [
                    {
                        "label": p.label,
                        "projected_revenue": p.projected_revenue,
                        "projected_expenses": p.projected_expenses,
                        "projected_net": p.projected_net,
                        "cumulative_cash": p.cumulative_cash,
                    }
                    for p in forecast.periods
                ],
                "assumptions": forecast.assumptions,
            },

            # ── Section 4: Revenue concentration ──
            "revenue_concentration": {
                "diversification_index": concentration.diversification_index,
                "herfindahl_index": concentration.herfindahl_index,
                "risk_assessment": concentration.risk_assessment,
                "sources": [
                    {
                        "name": s.name,
                        "label": s.label,
                        "share_pct": s.share_pct,
                        "amount": s.amount,
                    }
                    for s in concentration.sources
                ],
            },

            # ── Section 5: Critical anomalies ──
            "critical_items": [
                {
                    "title": a.title,
                    "severity": a.severity,
                    "detail": a.detail,
                    "estimated_annual_impact": a.estimated_annual_impact,
                    "suggested_action": a.suggested_action,
                }
                for a in critical_anomalies
            ],

            # ── Section 6: Top recommendations ──
            "top_recommendations": [
                {
                    "action": r.action,
                    "justification": r.justification,
                    "estimated_impact_annual": r.estimated_impact_annual,
                    "priority": r.priority,
                    "confidence": r.confidence,
                }
                for r in high_priority_recs
            ],

            # ── Section 7: Positive trends ──
            "positive_trends": [
                {
                    "title": t.title,
                    "detail": t.detail,
                    "change_pct": t.change_pct,
                }
                for t in positive_trends
            ],

            # ── Section 8: Alert signals ──
            "alert_signals": [
                {
                    "title": a.title,
                    "detail": a.detail,
                    "severity": a.severity,
                }
                for a in alert_signals
            ],

            # ── Section 9: Member economics ──
            "member_economics": {
                "avg_revenue_per_member": member_econ.avg_revenue_per_member,
                "avg_cost_per_member": member_econ.avg_cost_per_member,
                "avg_margin_per_member": member_econ.avg_margin_per_member,
                "ltv_estimate": member_econ.ltv_estimate,
                "ltv_cac_ratio": member_econ.ltv_cac_ratio,
            },

            # ── Section 10: Risk assessment ──
            "risk_assessment": (
                f"El club presenta {len(critical_anomalies)} "
                f"item(s) crítico(s) que requieren atención inmediata. "
                f"Margen operativo de {margin_pct}% "
                + (
                    "es saludable (benchmark: 15-25%)."
                    if margin_pct >= 15
                    else "está por debajo del benchmark de 15%."
                )
                + f" Caja disponible: {format_currency(cash_position)}."
            ),
        }

        return {
            "status": "success",
            "message": summary,
            "briefing": briefing,
        }

    # ─────────────────────────────────────────────────────────
    # Tool 11: get_cashflow_forecast  🟢 AUTO (B4)
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "get_cashflow_forecast",
        (
            "Proyección de flujo de caja a 6 meses con bandas "
            "de confianza, estacionalidad costarricense y "
            "supuestos declarados."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_cashflow_forecast(
        self,
        period: str = "current_quarter",
    ) -> dict[str, Any]:
        """Get standalone cash flow forecast."""
        date_from, date_to = self._resolve_period(period)
        budget_period = self._period_to_budget_period(period)
        months = self._months_in_period(period)

        try:
            report = self.repo.generate_report(
                "income_expense", date_from, date_to
            )
        except Exception:
            report = FinancialReport(
                report_type="income_expense",
                period_start=date_from,
                period_end=date_to,
            )

        try:
            budget = self.repo.get_budget(budget_period)
        except Exception:
            budget = BudgetSummary(period=budget_period)

        forecast = self._calculate_cash_flow_forecast(
            report, budget, months
        )

        return {
            "status": "success",
            "message": (
                f"📈 Forecast a 6 meses ({forecast.confidence}): "
                + ", ".join(
                    f"{p.label}: {format_currency(p.projected_net)}"
                    for p in forecast.periods[:3]
                )
                + "..."
            ),
            "data": forecast.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 12: get_budget_variance  🟢 AUTO (B4)
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "get_budget_variance",
        (
            "Análisis detallado de variación presupuestaria "
            "por categoría: sobre/bajo presupuesto, impacto "
            "anual estimado y categorías problemáticas."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_budget_variance(
        self,
        period: str = "current_quarter",
    ) -> dict[str, Any]:
        """Get detailed budget variance analysis."""
        budget_period = self._period_to_budget_period(period)
        months = self._months_in_period(period)
        annualizer = 12 / max(months, 1)

        try:
            budget = self.repo.get_budget(budget_period)
        except Exception:
            budget = BudgetSummary(period=budget_period)

        # Build variance lines
        lines: list[dict[str, Any]] = []
        total_budgeted = budget.total_budgeted
        total_spent = budget.total_spent

        for line in budget.lines:
            variance_amount = line.spent - line.budgeted
            variance_pct = (
                round((variance_amount / line.budgeted * 100), 1)
                if line.budgeted > 0
                else 0.0
            )
            annual_impact = round(
                variance_amount * annualizer, 0
            )
            status = (
                "over" if variance_pct > 5
                else "under" if variance_pct < -5
                else "on_track"
            )

            lines.append({
                "category": line.category,
                "budgeted": line.budgeted,
                "spent": line.spent,
                "remaining": line.budgeted - line.spent,
                "utilization_pct": line.utilization_pct,
                "variance_amount": round(variance_amount, 2),
                "variance_pct": variance_pct,
                "annual_impact": annual_impact,
                "status": status,
            })

        # Sort: worst over-budget first
        lines.sort(key=lambda line: line["variance_pct"], reverse=True)

        # Summary
        overall_variance = round(
            total_spent - total_budgeted, 2
        )
        overall_variance_pct = round(
            (overall_variance / total_budgeted * 100)
            if total_budgeted > 0
            else 0.0, 1
        )

        over_budget = [
            line for line in lines if line["status"] == "over"
        ]
        under_budget = [
            line for line in lines if line["status"] == "under"
        ]

        return {
            "status": "success",
            "message": (
                f"📊 Presupuesto ({period}): "
                f"{format_currency(total_spent)} de "
                f"{format_currency(total_budgeted)} "
                f"({overall_variance_pct:+.1f}%). "
                f"{len(over_budget)} categoría(s) sobre "
                f"presupuesto, {len(under_budget)} bajo."
            ),
            "data": {
                "period": period,
                "total_budgeted": total_budgeted,
                "total_spent": total_spent,
                "total_remaining": round(
                    total_budgeted - total_spent, 2
                ),
                "utilization_pct": budget.utilization_pct,
                "overall_variance": overall_variance,
                "overall_variance_pct": overall_variance_pct,
                "lines": lines,
                "over_budget_count": len(over_budget),
                "under_budget_count": len(under_budget),
                "on_track_count": len(lines) - len(over_budget) - len(under_budget),
            },
        }

    # ─────────────────────────────────────────────────────────
    # Tool 13: get_seasonal_analysis  🟢 AUTO (B4)
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "get_seasonal_analysis",
        (
            "Análisis de patrones estacionales costarricenses: "
            "factores por mes, meses pico, meses bajos, "
            "impacto en revenue y recomendaciones de staffing."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_seasonal_analysis(
        self,
        period: str = "current_year",
    ) -> dict[str, Any]:
        """Analyze seasonal patterns for Costa Rica."""
        # Costa Rica seasonal factors (dic-may high, jun-set low)
        seasonal_factors = [
            {"month": "Enero", "month_num": 1, "factor": 1.08,
             "season": "high", "label": "Temporada alta"},
            {"month": "Febrero", "month_num": 2, "factor": 1.08,
             "season": "high", "label": "Temporada alta"},
            {"month": "Marzo", "month_num": 3, "factor": 1.10,
             "season": "high", "label": "Semana Santa + alta"},
            {"month": "Abril", "month_num": 4, "factor": 1.06,
             "season": "high", "label": "Transición alta"},
            {"month": "Mayo", "month_num": 5, "factor": 1.02,
             "season": "high", "label": "Fin temporada alta"},
            {"month": "Junio", "month_num": 6, "factor": 0.92,
             "season": "low", "label": "Inicio invierno"},
            {"month": "Julio", "month_num": 7, "factor": 0.90,
             "season": "low", "label": "Temporada baja"},
            {"month": "Agosto", "month_num": 8, "factor": 0.88,
             "season": "low", "label": "Pico temporada baja"},
            {"month": "Septiembre", "month_num": 9, "factor": 0.90,
             "season": "low", "label": "Temporada baja"},
            {"month": "Octubre", "month_num": 10, "factor": 0.95,
             "season": "low", "label": "Transición"},
            {"month": "Noviembre", "month_num": 11, "factor": 1.00,
             "season": "transition", "label": "Pre-temporada alta"},
            {"month": "Diciembre", "month_num": 12, "factor": 1.12,
             "season": "high", "label": "Pico temporada alta"},
        ]

        # Get actual data for context
        date_from, date_to = self._resolve_period(period)
        months = self._months_in_period(period)

        try:
            report = self.repo.generate_report(
                "income_expense", date_from, date_to
            )
        except Exception:
            report = FinancialReport(
                report_type="income_expense",
                period_start=date_from,
                period_end=date_to,
            )

        monthly_rev = (
            report.total_income / max(months, 1)
            if report.total_income > 0
            else 0
        )
        monthly_exp = (
            report.total_expenses / max(months, 1)
            if report.total_expenses > 0
            else 0
        )

        # Enrich with projections
        projections: list[dict[str, Any]] = []
        for sf in seasonal_factors:
            proj_rev = round(monthly_rev * sf["factor"], 0)
            proj_net = proj_rev - monthly_exp
            projections.append({
                **sf,
                "projected_revenue": proj_rev,
                "projected_expenses": round(monthly_exp, 0),
                "projected_net": proj_net,
            })

        peak_months = [
            p for p in projections if p["factor"] >= 1.06
        ]
        low_months = [
            p for p in projections if p["factor"] <= 0.92
        ]

        # Staffing recommendation
        staffing_rec = (
            f"Temporada alta ({', '.join(m['month'] for m in peak_months)}): "
            f"incrementar staff F&B y eventos en 15-20%. "
            f"Temporada baja ({', '.join(m['month'] for m in low_months)}): "
            f"reducir staff temporal, aprovechar para mantenimiento mayor."
        )

        return {
            "status": "success",
            "message": (
                f"🌴 Análisis estacional Costa Rica: "
                f"pico en {peak_months[0]['month'] if peak_months else '-'} "
                f"(factor {peak_months[0]['factor'] if peak_months else '-'}), "
                f"más bajo en {low_months[0]['month'] if low_months else '-'} "
                f"(factor {low_months[0]['factor'] if low_months else '-'})."
            ),
            "data": {
                "country": "Costa Rica",
                "period": period,
                "monthly_revenue_base": round(monthly_rev, 0),
                "monthly_expenses_base": round(monthly_exp, 0),
                "projections": projections,
                "peak_months": [m["month"] for m in peak_months],
                "low_months": [m["month"] for m in low_months],
                "staffing_recommendation": staffing_rec,
            },
        }

    # ─────────────────────────────────────────────────────────
    # Tool 14: get_financial_health_score  🟢 AUTO (B4)
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "get_financial_health_score",
        (
            "Score de salud financiera compuesto (0-100): "
            "5 factores — liquidez, eficiencia, crecimiento, "
            "cobranza y adherencia presupuestaria — con "
            "tendencia y grade (A+ a F)."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_financial_health_score(
        self,
        period: str = "current_quarter",
    ) -> dict[str, Any]:
        """Get standalone financial health score."""
        date_from, date_to = self._resolve_period(period)
        budget_period = self._period_to_budget_period(period)
        months = self._months_in_period(period)

        try:
            budget = self.repo.get_budget(budget_period)
        except Exception:
            budget = BudgetSummary(period=budget_period)

        try:
            report = self.repo.generate_report(
                "income_expense", date_from, date_to
            )
        except Exception:
            report = FinancialReport(
                report_type="income_expense",
                period_start=date_from,
                period_end=date_to,
            )

        health = self._calculate_health_score(
            budget, report, months
        )

        # Grade emoji
        grade_emoji = {
            "A+": "🟢", "A": "🟢", "B+": "🟢",
            "B": "🟡", "C+": "🟡", "C": "🟠",
            "D": "🔴", "F": "🔴",
        }
        emoji = grade_emoji.get(health.grade, "⚪")

        # Critical factors
        critical = [
            f.name for f in health.factors
            if f.score < 50
        ]

        return {
            "status": "success",
            "message": (
                f"{emoji} Health Score: {health.total}/100 "
                f"(Grade {health.grade}). "
                + (
                    f"Factores críticos: {', '.join(critical)}."
                    if critical
                    else "Todos los factores en rango saludable."
                )
            ),
            "data": health.model_dump(mode="json"),
        }


def format_currency(amount: float) -> str:
    """Format amount as Costa Rican colones."""
    if abs(amount) >= 1_000_000:
        return f"₡{amount / 1_000_000:,.1f}M"
    if abs(amount) >= 1_000:
        return f"₡{amount / 1_000:,.0f}K"
    return f"₡{amount:,.0f}"
