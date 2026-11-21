"""FinanceRepository async — los 3 dicts y 2 estados se vuelven tablas.

Ola 2.1-decimoquinta (vertical finance). Contrato EXACTO del módulo
in-memory que reemplaza (club_mcp.db.repositories.finance_repo) —
mismos 17 métodos públicos (misma superficie que el in-memory tras
la cirugía async del propio vertical), mismas firmas, mismos
Pydantic de salida, mismo comportamiento de error (None / lista
vacía / AccountStatus vacío — el in-memory no define excepciones
custom y el ORM tampoco las inventa).

La decimoquinta es vertical DIRECTO sin refactor previo (como las
13 primeras): el agente YA consume solo públicos (0 privados
tocados — solo _gen_id, que es idéntico acá) y sus tools son YA
async, así que este repo implementa el contrato async completo y el
agente solo gana los await (misma mecánica de compliance
§3.8-QUINQUE).

Mismas decisiones que las 14 verticales (§3.8..§3.8-DECIMOCUARTA):
engine por inyección · session_scope transaccional · devuelve
Pydantic (SQLAlchemy no sube) · ids de la MISMA forma que el
in-memory (exp_/inv_/pay_ + uuid4().hex[:8]).

Semántica literal del in-memory que se preserva:
  * create_expense: id/date/created_at los fija el REPO (date solo
    si el Create no trae) · category guarda .value.
  * create_invoice: subtotal = suma qty x unit_price por linea · tax =
    round(subtotal x tax_rate/100, 2) · total = round(sub+tax, 2) ·
    status DRAFT LITERAL del create · paid_date="" literal.
  * create_payment: status PENDING LITERAL del create · date solo
    si el Create no trae · method guarda .value.
  * update_invoice_status / update_payment_status: solo el status
    (sin tocar más nada — el in-memory hacía rec["status"]=status).
  * get_budget: 9 líneas SIEMPRE (una por ExpenseCategory — el
    in-memory iteraba el dict sembrado en __init__), spent Σ
    expenses de la categoría · utilization_pct 0.0 si budgeted≤0
    (división por cero guardada MISMA) · rounds a 1 decimal.
  * set_budget: UPSERT por categoría (el in-memory era
    dict[key]=amount).
  * get_account_status: AccountStatus VACÍO para familia sin
    facturas (no None — el in-memory lo devuelve con defaults) ·
    total_invoiced Σ total · total_paid SOLO pay.status == "paid" ·
    balance = invoiced - paid · overdue solo status "overdue" ·
    last_payment_date = max(fechas de pagos paid, default "").
  * generate_report: income SOLO pagos paid en [from, to] ·
    expense_breakdown por categoría con round 2 · income_breakdown
    método+monto · net = round(ingresos - gastos, 2) · summary con
    emoji 📈/📉 por signo del neto (STRING LITERAL MISMO).
  * get_cash_position: balance singleton + suma pagos paid - suma gastos
    (round 2).
  * get_accounts_receivable: unpaid = status ≠ "paid" · aging
    buckets "0-30/31-60/61-90/90+ días" por días vencidos (0 si
    due_date inválida) · dict {total_ar, aging}.
  * get_monthly_trend: rev por mes solo pagos paid en rango ·
    label "Ene..Dic" desde el mes (mes inválido → label YYYY-MM).
  * list_expenses: filtros category/date_from/date_to en Python ·
    sort date DESC · list_invoices/list_payments: filtros en
    Python, MISMO orden de inserción.

Estados de primera clase (H-3, como age_group §3.8-DECIMATERCERA):
finance_budgets nace con las 9 filas (0.0) y finance_cash_balance
con el singleton ₡45M — el deploy YA no re-siembra nada.

created_at: el in-memory NUNCA lo persiste (el default_factory del
modelo lo regenera en cada read); el ORM lo persiste ISO Text y lo
parsea al leer — roundtrip pérdida cero, y conserva el REAL.
"""
from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import select

from club_mcp.db.orm.finance_orm import (
    FinanceBudgetORM,
    FinanceCashBalanceORM,
    FinanceExpenseORM,
    FinanceInvoiceORM,
    FinancePaymentORM,
)
from club_mcp.db.orm.session import session_scope
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
    PaymentMethod,
    PaymentStatus,
)


def _gen_id(prefix: str) -> str:
    """MISMA forma que el in-memory: {prefix}_{uuid4().hex[:8]}."""
    return f"{prefix}_{uuid4().hex[:8]}"


def _plain(value: Any) -> str:
    """Enum → .value; str pasa directo (mismo borde del in-memory)."""
    return value.value if hasattr(value, "value") else str(value)


def _parse_iso_created(v: str | None) -> datetime:
    """created_at ISO Text → datetime (default_factory utcnow del modelo)."""
    if not v:
        return datetime.now(UTC).replace(tzinfo=None)
    try:
        return datetime.fromisoformat(v)
    except ValueError:
        return datetime.now(UTC).replace(tzinfo=None)


# ── helpers de reconstrucción (ORM → Pydantic) ──


def _expense_from_orm(e: FinanceExpenseORM) -> Expense:
    return Expense(
        id=e.id,
        description=e.description,
        amount=e.amount,
        category=ExpenseCategory(e.category),
        vendor=e.vendor,
        date=e.date,
        notes=e.notes,
        receipt_url=e.receipt_url,
        created_at=_parse_iso_created(e.created_at),
    )


def _invoice_from_orm(i: FinanceInvoiceORM) -> Invoice:
    items = [
        InvoiceItem(**item) for item in (i.items or [])
    ]
    return Invoice(
        id=i.id,
        family_id=i.family_id,
        family_name=i.family_name,
        items=items,
        subtotal=i.subtotal,
        tax=i.tax,
        total=i.total,
        status=InvoiceStatus(i.status),
        due_date=i.due_date,
        paid_date=i.paid_date,
        notes=i.notes,
        created_at=_parse_iso_created(i.created_at),
    )


def _payment_from_orm(p: FinancePaymentORM) -> Payment:
    return Payment(
        id=p.id,
        invoice_id=p.invoice_id,
        family_id=p.family_id,
        family_name=p.family_name,
        amount=p.amount,
        method=PaymentMethod(p.method),
        status=PaymentStatus(p.status),
        reference=p.reference,
        date=p.date,
        notes=p.notes,
        created_at=_parse_iso_created(p.created_at),
    )


class FinanceRepository:
    """Repo ORM async del dominio Finance — contrato EXACTO del in-memory."""

    def __init__(self, engine: Any) -> None:
        # 9 filas de budget + singleton de caja: nacen con las tablas
        # (H-3) — ver _ensure_seed_states().
        self._engine = engine

    # ── seed de estados de primera clase (H-3 · 9 budgets + caja) ──

    async def _ensure_seed_states(self) -> None:
        """Siembra las 9 categorías (0.0) y el singleton de caja si faltan.

        El in-memory siembra esto en __init__; las tablas lo garantizan
        aquí (idempotente — mismo contrato desde el primer read).
        """
        async with session_scope(self._engine) as s:
            existing = {
                row.category for row in (
                    await s.execute(select(FinanceBudgetORM))
                ).scalars()
            }
            for cat in ExpenseCategory:
                if cat.value not in existing:
                    s.add(FinanceBudgetORM(category=cat.value, amount=0.0))
            if await s.get(FinanceCashBalanceORM, 1) is None:
                s.add(FinanceCashBalanceORM(id=1, balance=45_000_000.0))

    # ── Expenses ───────────────────────────────────────────

    async def create_expense(self, data: ExpenseCreate) -> Expense:
        eid = _gen_id("exp")
        now = datetime.now(UTC)
        rec = FinanceExpenseORM(
            id=eid,
            description=data.description,
            amount=data.amount,
            category=_plain(data.category),
            vendor=data.vendor,
            date=data.date or now.strftime("%Y-%m-%d"),
            notes=data.notes,
            receipt_url=data.receipt_url,
            created_at=now.isoformat(),
        )
        async with session_scope(self._engine) as s:
            s.add(rec)
        return Expense(
            id=eid,
            description=data.description,
            amount=data.amount,
            category=data.category,
            vendor=data.vendor,
            date=rec.date,
            notes=data.notes,
            receipt_url=data.receipt_url,
            created_at=_parse_iso_created(rec.created_at),
        )

    async def get_expense(self, expense_id: str) -> Expense | None:
        async with session_scope(self._engine) as s:
            row = await s.get(FinanceExpenseORM, expense_id)
            if row is None:
                return None
            return _expense_from_orm(row)

    async def list_expenses(
        self,
        category: str | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
    ) -> list[Expense]:
        out: list[Expense] = []
        async with session_scope(self._engine) as s:
            for row in (
                await s.execute(
                    select(FinanceExpenseORM).order_by(FinanceExpenseORM.id)
                )
            ).scalars():
                if category and row.category != category:
                    continue
                if date_from and row.date < date_from:
                    continue
                if date_to and row.date > date_to:
                    continue
                out.append(_expense_from_orm(row))
        return sorted(out, key=lambda e: e.date, reverse=True)

    # ── Invoices ───────────────────────────────────────────

    async def create_invoice(
        self, data: InvoiceCreate, family_name: str = ""
    ) -> Invoice:
        iid = _gen_id("inv")
        now = datetime.now(UTC)
        items: list[dict[str, Any]] = []
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

        rec = FinanceInvoiceORM(
            id=iid,
            family_id=data.family_id,
            family_name=family_name,
            items=items,
            subtotal=round(subtotal, 2),
            tax=tax,
            total=total,
            status=InvoiceStatus.DRAFT.value,
            due_date=data.due_date,
            paid_date="",
            notes=data.notes,
            created_at=now.isoformat(),
        )
        async with session_scope(self._engine) as s:
            s.add(rec)
        return Invoice(
            id=iid,
            family_id=data.family_id,
            family_name=family_name,
            items=[InvoiceItem(**item) for item in items],
            subtotal=round(subtotal, 2),
            tax=tax,
            total=total,
            status=InvoiceStatus.DRAFT,
            due_date=data.due_date,
            paid_date="",
            notes=data.notes,
            created_at=_parse_iso_created(rec.created_at),
        )

    async def get_invoice(self, invoice_id: str) -> Invoice | None:
        async with session_scope(self._engine) as s:
            row = await s.get(FinanceInvoiceORM, invoice_id)
            if row is None:
                return None
            return _invoice_from_orm(row)

    async def update_invoice_status(
        self, invoice_id: str, status: str
    ) -> Invoice | None:
        async with session_scope(self._engine) as s:
            row = await s.get(FinanceInvoiceORM, invoice_id)
            if row is None:
                return None
            row.status = _plain(status)
            return _invoice_from_orm(row)

    async def list_invoices(
        self,
        family_id: str | None = None,
        status: str | None = None,
    ) -> list[Invoice]:
        out: list[Invoice] = []
        async with session_scope(self._engine) as s:
            for row in (
                await s.execute(
                    select(FinanceInvoiceORM).order_by(FinanceInvoiceORM.id)
                )
            ).scalars():
                if family_id and row.family_id != family_id:
                    continue
                if status and row.status != status:
                    continue
                out.append(_invoice_from_orm(row))
        return out

    # ── Payments ───────────────────────────────────────────

    async def create_payment(
        self, data: PaymentCreate, family_name: str = ""
    ) -> Payment:
        pid = _gen_id("pay")
        now = datetime.now(UTC)
        rec = FinancePaymentORM(
            id=pid,
            invoice_id=data.invoice_id,
            family_id=data.family_id,
            family_name=family_name,
            amount=data.amount,
            method=_plain(data.method),
            status=PaymentStatus.PENDING.value,
            reference=data.reference,
            date=data.date or now.strftime("%Y-%m-%d"),
            notes=data.notes,
            created_at=now.isoformat(),
        )
        async with session_scope(self._engine) as s:
            s.add(rec)
        return Payment(
            id=pid,
            invoice_id=data.invoice_id,
            family_id=data.family_id,
            family_name=family_name,
            amount=data.amount,
            method=data.method,
            status=PaymentStatus.PENDING,
            reference=data.reference,
            date=rec.date,
            notes=data.notes,
            created_at=_parse_iso_created(rec.created_at),
        )

    async def update_payment_status(
        self, payment_id: str, status: str
    ) -> Payment | None:
        async with session_scope(self._engine) as s:
            row = await s.get(FinancePaymentORM, payment_id)
            if row is None:
                return None
            row.status = _plain(status)
            return _payment_from_orm(row)

    async def list_payments(self, family_id: str | None = None) -> list[Payment]:
        out: list[Payment] = []
        async with session_scope(self._engine) as s:
            for row in (
                await s.execute(
                    select(FinancePaymentORM).order_by(FinancePaymentORM.id)
                )
            ).scalars():
                if family_id and row.family_id != family_id:
                    continue
                out.append(_payment_from_orm(row))
        return out

    # ── Budgets ────────────────────────────────────────────

    async def get_budget(self, period: str = "monthly") -> BudgetSummary:
        await self._ensure_seed_states()
        lines: list[BudgetLine] = []
        total_budgeted = 0.0
        total_spent = 0.0

        async with session_scope(self._engine) as s:
            budgets: dict[str, float] = {
                row.category: row.amount
                for row in (await s.execute(select(FinanceBudgetORM))).scalars()
            }
            expenses = (
                await s.execute(select(FinanceExpenseORM))
            ).scalars().all()
        spent_by_cat: dict[str, float] = {}
        for e in expenses:
            spent_by_cat[e.category] = (
                spent_by_cat.get(e.category, 0.0) + e.amount
            )

        for cat, budgeted in budgets.items():
            spent = spent_by_cat.get(cat, 0.0)
            remaining = budgeted - spent
            util = round(
                (spent / budgeted * 100) if budgeted > 0 else 0.0, 1
            )
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
            (total_spent / total_budgeted * 100) if total_budgeted > 0 else 0.0,
            1,
        )

        return BudgetSummary(
            period=period,
            total_budgeted=total_budgeted,
            total_spent=round(total_spent, 2),
            total_remaining=round(total_remaining, 2),
            utilization_pct=total_util,
            lines=lines,
        )

    async def set_budget(self, category: str, amount: float) -> None:
        await self._ensure_seed_states()
        async with session_scope(self._engine) as s:
            row = await s.get(FinanceBudgetORM, category)
            if row is None:
                s.add(FinanceBudgetORM(category=category, amount=amount))
            else:
                row.amount = amount

    # ── Account Status ──────────────────────────────────────

    async def get_account_status(self, family_id: str) -> AccountStatus | None:
        invoices = await self.list_invoices(family_id=family_id)
        if not invoices:
            # Return empty account status rather than None for unknown families
            return AccountStatus(
                family_id=family_id,
                family_name="",
            )

        payments = await self.list_payments(family_id=family_id)
        total_invoiced = sum(inv.total for inv in invoices)
        total_paid = sum(
            pay.amount for pay in payments
            if pay.status == PaymentStatus.PAID.value
        )
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
            (
                pay.date for pay in payments
                if pay.status == PaymentStatus.PAID.value
            ),
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

    async def generate_report(
        self,
        report_type: str,
        date_from: str,
        date_to: str,
    ) -> FinancialReport:
        expenses = await self.list_expenses(date_from=date_from, date_to=date_to)
        async with session_scope(self._engine) as s:
            payments_rows = (
                await s.execute(
                    select(FinancePaymentORM).order_by(FinancePaymentORM.id)
                )
            ).scalars().all()
        payments_list: list[dict[str, Any]] = [
            {"date": p.date, "status": p.status, "amount": p.amount, "method": p.method}
            for p in payments_rows
            if p.date >= date_from and p.date <= date_to
            and p.status == PaymentStatus.PAID.value
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

    async def get_cash_position(self) -> float:
        """Get current cash position: seed + paid payments - expenses."""
        await self._ensure_seed_states()
        async with session_scope(self._engine) as s:
            cash_row = await s.get(FinanceCashBalanceORM, 1)
            cash = cash_row.balance if cash_row is not None else 45_000_000.0
            total_paid = sum(
                p.amount for p in (
                    await s.execute(select(FinancePaymentORM))
                ).scalars()
                if p.status == PaymentStatus.PAID.value
            )
            total_expenses = sum(
                e.amount for e in (
                    await s.execute(select(FinanceExpenseORM))
                ).scalars()
            )
        return round(
            cash + total_paid - total_expenses, 2
        )

    # ── Accounts Receivable ────────────────────────────────

    async def get_accounts_receivable_summary(self) -> dict[str, Any]:
        """Get total AR and aging buckets from unpaid invoices."""
        today = date.today()
        all_invoices = await self.list_invoices()
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

    async def get_monthly_trend(
        self, date_from: str, date_to: str
    ) -> list[FinancialMonthlyTrend]:
        """Aggregate revenue and expenses by month."""
        month_names = [
            "Ene", "Feb", "Mar", "Abr", "May", "Jun",
            "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
        ]

        async with session_scope(self._engine) as s:
            payment_rows = (
                await s.execute(
                    select(FinancePaymentORM).order_by(FinancePaymentORM.id)
                )
            ).scalars().all()
            expense_rows = (
                await s.execute(
                    select(FinanceExpenseORM).order_by(FinanceExpenseORM.id)
                )
            ).scalars().all()

        # Group paid payments (revenue) by month
        rev_by_month: dict[str, float] = {}
        for p in payment_rows:
            d = p.date
            if (
                d >= date_from
                and d <= date_to
                and p.status == PaymentStatus.PAID.value
            ):
                key = d[:7]  # "YYYY-MM"
                rev_by_month[key] = (
                    rev_by_month.get(key, 0) + p.amount
                )

        # Group expenses by month
        exp_by_month: dict[str, float] = {}
        for e in expense_rows:
            d = e.date
            if d >= date_from and d <= date_to:
                key = d[:7]
                exp_by_month[key] = (
                    exp_by_month.get(key, 0) + e.amount
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
