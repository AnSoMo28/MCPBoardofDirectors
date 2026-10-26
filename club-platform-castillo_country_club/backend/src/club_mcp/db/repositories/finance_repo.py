"""In-memory financial repository.

Production will swap for PostgreSQL + SQLAlchemy.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from typing import Any

from club_mcp.models.finance import (
    AccountStatus,
    BudgetLine,
    BudgetSummary,
    Expense,
    ExpenseCategory,
    ExpenseCreate,
    FinancialARAgingBucket,
    FinancialMonthlyTrend,
    FinancialReport,
    Invoice,
    InvoiceCreate,
    InvoiceItem,
    InvoiceStatus,
    Payment,
    PaymentCreate,
    PaymentStatus,
)


def _gen_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


class FinanceRepository:
    """In-memory repository for financial data."""

    def __init__(self) -> None:
        self._expenses: dict[str, dict[str, Any]] = {}
        self._invoices: dict[str, dict[str, Any]] = {}
        self._payments: dict[str, dict[str, Any]] = {}
        # Default budget per category
        self._budgets: dict[str, float] = {
            cat.value: 0.0 for cat in ExpenseCategory
        }
        # Seed: initial club cash position (₡45M for demo)
        self._cash_balance: float = 45_000_000.0

    # ── Expenses ───────────────────────────────────────────

    def create_expense(self, data: ExpenseCreate) -> Expense:
        eid = _gen_id("exp")
        now = datetime.now(timezone.utc)
        rec = {
            "id": eid,
            "description": data.description,
            "amount": data.amount,
            "category": data.category.value,
            "vendor": data.vendor,
            "date": data.date or now.strftime("%Y-%m-%d"),
            "notes": data.notes,
            "receipt_url": data.receipt_url,
            "created_at": now.isoformat(),
        }
        self._expenses[eid] = rec
        return Expense(**rec)

    def get_expense(self, expense_id: str) -> Expense | None:
        if expense_id not in self._expenses:
            return None
        return Expense(**self._expenses[expense_id])

    def list_expenses(
        self,
        category: str | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
    ) -> list[Expense]:
        out: list[Expense] = []
        for rec in self._expenses.values():
            if category and rec["category"] != category:
                continue
            if date_from and rec["date"] < date_from:
                continue
            if date_to and rec["date"] > date_to:
                continue
            out.append(Expense(**rec))
        return sorted(out, key=lambda e: e.date, reverse=True)

    # ── Invoices ───────────────────────────────────────────

    def create_invoice(self, data: InvoiceCreate, family_name: str = "") -> Invoice:
        iid = _gen_id("inv")
        now = datetime.now(timezone.utc)
        items = []
        subtotal = 0.0
        for item in data.items:
            line_total = item.quantity * item.unit_price
            items.append({
                "description": item.description,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "total": round(line_total, 2),
            })
            subtotal += line_total

        tax = round(subtotal * data.tax_rate / 100, 2)
        total = round(subtotal + tax, 2)

        rec = {
            "id": iid,
            "family_id": data.family_id,
            "family_name": family_name,
            "items": items,
            "subtotal": round(subtotal, 2),
            "tax": tax,
            "total": total,
            "status": InvoiceStatus.DRAFT.value,
            "due_date": data.due_date,
            "paid_date": "",
            "notes": data.notes,
            "created_at": now.isoformat(),
        }
        self._invoices[iid] = rec
        return Invoice(**rec)

    def get_invoice(self, invoice_id: str) -> Invoice | None:
        if invoice_id not in self._invoices:
            return None
        return Invoice(**self._invoices[invoice_id])

    def update_invoice_status(self, invoice_id: str, status: str) -> Invoice | None:
        if invoice_id not in self._invoices:
            return None
        self._invoices[invoice_id]["status"] = status
        return Invoice(**self._invoices[invoice_id])

    def list_invoices(
        self,
        family_id: str | None = None,
        status: str | None = None,
    ) -> list[Invoice]:
        out: list[Invoice] = []
        for rec in self._invoices.values():
            if family_id and rec["family_id"] != family_id:
                continue
            if status and rec["status"] != status:
                continue
            out.append(Invoice(**rec))
        return out

    # ── Payments ───────────────────────────────────────────

    def create_payment(self, data: PaymentCreate, family_name: str = "") -> Payment:
        pid = _gen_id("pay")
        now = datetime.now(timezone.utc)
        rec = {
            "id": pid,
            "invoice_id": data.invoice_id,
            "family_id": data.family_id,
            "family_name": family_name,
            "amount": data.amount,
            "method": data.method.value,
            "status": PaymentStatus.PENDING.value,
            "reference": data.reference,
            "date": data.date or now.strftime("%Y-%m-%d"),
            "notes": data.notes,
            "created_at": now.isoformat(),
        }
        self._payments[pid] = rec
        return Payment(**rec)

    def update_payment_status(self, payment_id: str, status: str) -> Payment | None:
        if payment_id not in self._payments:
            return None
        self._payments[payment_id]["status"] = status
        return Payment(**self._payments[payment_id])

    def list_payments(self, family_id: str | None = None) -> list[Payment]:
        out: list[Payment] = []
        for rec in self._payments.values():
            if family_id and rec["family_id"] != family_id:
                continue
            out.append(Payment(**rec))
        return out

    # ── Budgets ────────────────────────────────────────────

    def get_budget(self, period: str = "monthly") -> BudgetSummary:
        lines: list[BudgetLine] = []
        total_budgeted = 0.0
        total_spent = 0.0

        for cat, budgeted in self._budgets.items():
            spent = sum(
                e["amount"] for e in self._expenses.values()
                if e["category"] == cat
            )
            remaining = budgeted - spent
            util = round((spent / budgeted * 100) if budgeted > 0 else 0.0, 1)
            lines.append(BudgetLine(
                category=cat,
                budgeted=budgeted,
                spent=round(spent, 2),
                remaining=round(remaining, 2),
                utilization_pct=util,
            ))
            total_budgeted += budgeted
            total_spent += spent

        total_remaining = total_budgeted - total_spent
        total_util = round(
            (total_spent / total_budgeted * 100) if total_budgeted > 0 else 0.0, 1
        )

        return BudgetSummary(
            period=period,
            total_budgeted=total_budgeted,
            total_spent=round(total_spent, 2),
            total_remaining=round(total_remaining, 2),
            utilization_pct=total_util,
            lines=lines,
        )

    def set_budget(self, category: str, amount: float) -> None:
        self._budgets[category] = amount

    def get_account_status(self, family_id: str) -> AccountStatus | None:
        invoices = self.list_invoices(family_id=family_id)
        if not invoices:
            # Return empty account status rather than None for unknown families
            return AccountStatus(
                family_id=family_id,
                family_name="",
            )

        payments = self.list_payments(family_id=family_id)
        total_invoiced = sum(inv.total for inv in invoices)
        total_paid = sum(pay.amount for pay in payments if pay.status == PaymentStatus.PAID.value)
        balance = total_invoiced - total_paid
        overdue = sum(
            inv.total for inv in invoices
            if inv.status == InvoiceStatus.OVERDUE.value
        )
        overdue_count = sum(
            1 for inv in invoices
            if inv.status == InvoiceStatus.OVERDUE.value
        )
        last_pay = max(
            (pay.date for pay in payments if pay.status == PaymentStatus.PAID.value),
            default="",
        )

        return AccountStatus(
            family_id=family_id,
            family_name=invoices[0].family_name,
            total_invoiced=round(total_invoiced, 2),
            total_paid=round(total_paid, 2),
            balance_due=round(balance, 2),
            overdue_amount=round(overdue, 2),
            overdue_count=overdue_count,
            last_payment_date=last_pay,
            invoices=invoices,
        )

    # ── Reports ────────────────────────────────────────────

    def generate_report(
        self,
        report_type: str,
        date_from: str,
        date_to: str,
    ) -> FinancialReport:
        expenses = self.list_expenses(date_from=date_from, date_to=date_to)
        payments_list = [
            p for p in self._payments.values()
            if p.get("date", "") >= date_from and p.get("date", "") <= date_to
            and p.get("status") == PaymentStatus.PAID.value
        ]

        total_expenses = sum(e.amount for e in expenses)
        total_income = sum(p["amount"] for p in payments_list)

        # Expense breakdown by category
        exp_by_cat: dict[str, float] = {}
        for e in expenses:
            exp_by_cat[e.category] = exp_by_cat.get(e.category, 0) + e.amount
        expense_breakdown = [
            {"category": k, "amount": round(v, 2)} for k, v in exp_by_cat.items()
        ]

        income_breakdown = [
            {"method": p["method"], "amount": p["amount"]} for p in payments_list
        ]

        net = round(total_income - total_expenses, 2)
        emoji = "📈" if net >= 0 else "📉"

        return FinancialReport(
            report_type=report_type,
            period_start=date_from,
            period_end=date_to,
            total_income=round(total_income, 2),
            total_expenses=round(total_expenses, 2),
            net_result=net,
            expense_breakdown=expense_breakdown,
            income_breakdown=income_breakdown,
            summary=(
                f"{emoji} Período {date_from} a {date_to}: "
                f"Ingresos ${total_income:,.2f}, "
                f"Gastos ${total_expenses:,.2f}, "
                f"Resultado neto ${net:,.2f}"
            ),
        )

    # ── Cash Position ──────────────────────────────────────

    def get_cash_position(self) -> float:
        """Get current cash position: seed + paid payments - expenses."""
        total_paid = sum(
            p["amount"] for p in self._payments.values()
            if p.get("status") == PaymentStatus.PAID.value
        )
        total_expenses = sum(
            e["amount"] for e in self._expenses.values()
        )
        return round(
            self._cash_balance + total_paid - total_expenses, 2
        )

    # ── Accounts Receivable ────────────────────────────────

    def get_accounts_receivable_summary(self) -> dict[str, Any]:
        """Get total AR and aging buckets from unpaid invoices."""
        today = date.today()
        all_invoices = self.list_invoices()
        unpaid = [
            inv for inv in all_invoices
            if inv.status != InvoiceStatus.PAID.value
        ]

        total_ar = sum(inv.total for inv in unpaid)

        # Initialize aging buckets
        buckets: dict[str, dict[str, Any]] = {
            "0-30 días": {"amount": 0.0, "count": 0},
            "31-60 días": {"amount": 0.0, "count": 0},
            "61-90 días": {"amount": 0.0, "count": 0},
            "90+ días": {"amount": 0.0, "count": 0},
        }

        for inv in unpaid:
            days = 0
            if inv.due_date:
                try:
                    due = datetime.strptime(
                        inv.due_date, "%Y-%m-%d"
                    ).date()
                    days = max(0, (today - due).days)
                except ValueError:
                    days = 0

            if days <= 30:
                key = "0-30 días"
            elif days <= 60:
                key = "31-60 días"
            elif days <= 90:
                key = "61-90 días"
            else:
                key = "90+ días"

            buckets[key]["amount"] += inv.total
            buckets[key]["count"] += 1

        aging = [
            FinancialARAgingBucket(
                bucket=k,
                amount=round(v["amount"], 2),
                count=v["count"],
            )
            for k, v in buckets.items()
        ]

        return {
            "total_ar": round(total_ar, 2),
            "aging": aging,
        }

    # ── Monthly Trend ──────────────────────────────────────

    def get_monthly_trend(
        self, date_from: str, date_to: str
    ) -> list[FinancialMonthlyTrend]:
        """Aggregate revenue and expenses by month."""
        month_names = [
            "Ene", "Feb", "Mar", "Abr", "May", "Jun",
            "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
        ]

        # Group paid payments (revenue) by month
        rev_by_month: dict[str, float] = {}
        for p in self._payments.values():
            d = p.get("date", "")
            if (
                d >= date_from
                and d <= date_to
                and p.get("status") == PaymentStatus.PAID.value
            ):
                key = d[:7]  # "YYYY-MM"
                rev_by_month[key] = (
                    rev_by_month.get(key, 0) + p["amount"]
                )

        # Group expenses by month
        exp_by_month: dict[str, float] = {}
        for e in self._expenses.values():
            d = e.get("date", "")
            if d >= date_from and d <= date_to:
                key = d[:7]
                exp_by_month[key] = (
                    exp_by_month.get(key, 0) + e["amount"]
                )

        # Merge all months
        all_months = sorted(
            set(list(rev_by_month.keys())
                + list(exp_by_month.keys()))
        )

        trends: list[FinancialMonthlyTrend] = []
        for m in all_months:
            rev = round(rev_by_month.get(m, 0), 2)
            exp = round(exp_by_month.get(m, 0), 2)
            # Convert "2026-01" → "Ene"
            try:
                idx = int(m.split("-")[1]) - 1
                label = (
                    month_names[idx]
                    if 0 <= idx < 12
                    else m
                )
            except (IndexError, ValueError):
                label = m

            trends.append(FinancialMonthlyTrend(
                month=label,
                revenue=rev,
                expenses=exp,
                net=round(rev - exp, 2),
            ))

        return trends
