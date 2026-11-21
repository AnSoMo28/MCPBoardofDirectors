"""Suite de persistencia Ola 2.1-decimoquinta — gate del vertical
finance:

    pytest: write → restart runtime → read OK

Misma mecánica de las suites family/engagement/event/compliance/
guest/satisfaction/communication/cultural_social/executive_dashboard/
proactive_recommendation/facility_management/age_group/sports_
recreation (Ola 2.1-bis … -decimocuarta): restart REAL
(engine.dispose() + engine NUEVO + sesión nueva) · RE-RUNNABLE
(_reset_backend antes de cada test) · sqlite local / pgvector real
en CI.

Además — el gate de CONTRATO: los tests del agente finance (51 tests)
corren contra el repo in-memory async (la cirugía del propio
vertical); este archivo verifica que el repo ORM async cumple el
mismo contrato (mismos 17 métodos · None/[] sin excepciones custom ·
JSONB items roundtrip · enums roundtrip · DRAFT/PENDING literales del
create · get_budget 9 líneas · AccountStatus vacío para familia sin
facturas · summary con emoji · aging buckets · monthly trend labels
"Ene..Dic" · H-3: 9 budgets sembrados + singleton ₡45M sobrevive
restart).
"""
from __future__ import annotations

import os

import pytest

from club_mcp.db.orm.base import Base
from club_mcp.db.orm.repositories.finance_repo import (
    FinanceRepository as FinanceRepoORM,
)
from club_mcp.db.orm.session import make_engine
from club_mcp.models.finance import (
    ExpenseCategory,
    ExpenseCreate,
    InvoiceCreate,
    InvoiceItem,
    InvoiceStatus,
    PaymentCreate,
    PaymentMethod,
    PaymentStatus,
)


PG_URL = os.environ.get("CLUB_PERSISTENCE_URL", "")
SQLITE_URL = "sqlite+aiosqlite:///_persist_finance.db"

pytestmark = pytest.mark.asyncio


def _backend_url() -> str:
    """PG del service container SIEMPRE que exista; sqlite solo sin PG."""
    if PG_URL:
        return PG_URL
    return SQLITE_URL


async def _reset_backend() -> None:
    """Re-runnable: DROP + CREATE del backend antes de cada test (Ola 2.1f)."""
    engine = make_engine(_backend_url())
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()


def _repo() -> FinanceRepoORM:
    return FinanceRepoORM(make_engine(_backend_url()))


async def _restart_repo(repo: FinanceRepoORM) -> FinanceRepoORM:
    """Restart REAL: dispose del engine + engine nuevo + repo nuevo."""
    await repo._engine.dispose()
    return _repo()


def _expense(description: str = "Poda de jardines") -> ExpenseCreate:
    return ExpenseCreate(
        description=description,
        amount=3500.0,
        category=ExpenseCategory.MAINTENANCE,
        vendor="Jardín Express",
        date="2025-01-15",
    )


def _invoice(tax_rate: float = 16.0) -> InvoiceCreate:
    return InvoiceCreate(
        family_id="fam-001",
        items=[
            InvoiceItem(description="Membresía Enero", quantity=1, unit_price=5000),
            InvoiceItem(description="Evento especial", quantity=2, unit_price=1500),
        ],
        tax_rate=tax_rate,
        due_date="2025-02-01",
        notes="Factura de enero",
    )


def _payment(amount: float = 5000.0) -> PaymentCreate:
    return PaymentCreate(
        family_id="fam-001",
        invoice_id="inv_x",
        amount=amount,
        method=PaymentMethod.TRANSFER,
        reference="TRX-001",
        date="2025-02-05",
    )


async def test_entities_restart() -> None:
    """Expenses + invoices (items JSONB) + payments: write → restart → read."""
    await _reset_backend()
    repo = _repo()

    exp = await repo.create_expense(_expense())
    assert exp.id.startswith("exp_"), "ids exp_{hex8} del in-memory"
    assert exp.category == ExpenseCategory.MAINTENANCE, "enum roundtrip"
    assert exp.date == "2025-01-15", "date del Create se respeta"

    inv = await repo.create_invoice(_invoice(), family_name="Familia Chen")
    assert inv.id.startswith("inv_")
    assert inv.status == InvoiceStatus.DRAFT, "DRAFT literal del create"
    assert inv.paid_date == "", "paid_date '' literal del create"
    assert inv.subtotal == 8000.0, "subtotal = suma qty x unit_price"
    assert inv.tax == 1280.0, "tax = round(8000x16/100, 2)"
    assert inv.total == 9280.0, "total = round(sub+tax, 2)"
    assert inv.items[0].description == "Membresía Enero", "JSONB items roundtrip"
    assert inv.items[1].total == 3000.0, "total linea round(2x1500, 2)"

    pay = await repo.create_payment(_payment(), family_name="Familia Chen")
    assert pay.id.startswith("pay_")
    assert pay.status == PaymentStatus.PENDING, "PENDING literal del create"
    assert pay.method == PaymentMethod.TRANSFER, "enum method roundtrip"
    assert pay.date == "2025-02-05", "date del Create se respeta"

    # update_status: solo el status (semántica literal del in-memory)
    upd_inv = await repo.update_invoice_status(inv.id, "sent")
    assert upd_inv is not None and upd_inv.status == InvoiceStatus.SENT
    upd_pay = await repo.update_payment_status(pay.id, "paid")
    assert upd_pay is not None and upd_pay.status == PaymentStatus.PAID

    missing = await repo.get_invoice("inv_nope")
    assert missing is None, "None sin excepción (contrato del in-memory)"
    missing_pay = await repo.update_payment_status("pay_nope", "paid")
    assert missing_pay is None

    # ── restart REAL ──
    repo = await _restart_repo(repo)

    got_exp = await repo.get_expense(exp.id)
    assert got_exp is not None
    assert got_exp.category == ExpenseCategory.MAINTENANCE, "enum tras restart"
    assert got_exp.vendor == "Jardín Express"

    got_inv = await repo.get_invoice(inv.id)
    assert got_inv is not None
    assert got_inv.status == InvoiceStatus.SENT, "update sobrevive restart"
    assert len(got_inv.items) == 2, "JSONB items sobrevive restart"
    assert got_inv.items[1].quantity == 2

    pays_after = await repo.list_payments(family_id="fam-001")
    got_pay = next(p for p in pays_after if p.id == pay.id)
    assert got_pay.status == PaymentStatus.PAID, "update sobrevive restart"
    assert got_pay.method == PaymentMethod.TRANSFER

    # filtros list_* (orden de inserción · filtro en Python)
    exps = await repo.list_expenses(category="maintenance")
    assert all(e.category == ExpenseCategory.MAINTENANCE for e in exps)
    dated = await repo.list_expenses(date_from="2025-01-01", date_to="2025-01-31")
    assert all(e.date <= "2025-01-31" for e in dated)
    fams = await repo.list_invoices(family_id="fam-001")
    assert len(fams) == 1
    pays = await repo.list_payments(family_id="fam-001")
    assert len(pays) == 1


async def test_budgets_cash_and_account_status_restart() -> None:
    """H-3: 9 budgets + singleton ₡45M sobreviven restart · account status."""
    await _reset_backend()
    repo = _repo()

    # H-3: get_budget SIEMPRE trae las 9 líneas (el in-memory las siembra
    # en __init__; _ensure_seed_states garantiza las 9 filas)
    budget = await repo.get_budget(period="monthly")
    assert budget.period == "monthly"
    assert len(budget.lines) == 9, "9 categorías ExpenseCategory sembradas"
    cats = {line.category for line in budget.lines}
    assert cats == {c.value for c in ExpenseCategory}, "las 9 exactas"
    assert budget.total_budgeted == 0.0, "todas 0.0 (seed del in-memory)"

    # set_budget → UPSERT · get_budget refleja spent de expenses
    await repo.set_budget("maintenance", 50000.0)
    await repo.set_budget("food_beverage", 30000.0)
    await repo.create_expense(_expense())  # 3500 maintenance
    budget2 = await repo.get_budget()
    assert budget2.total_budgeted == 80000.0
    assert budget2.total_spent == 3500.0
    maint = next(line for line in budget2.lines if line.category == "maintenance")
    assert maint.budgeted == 50000.0
    assert maint.spent == 3500.0
    assert maint.remaining == 46500.0
    assert maint.utilization_pct == 7.0, "round(3500/50000x100, 1)"

    # account status vacío para familia SIN facturas (no None)
    empty = await repo.get_account_status("fam-nobody")
    assert empty is not None
    assert empty.family_id == "fam-nobody"
    assert empty.family_name == ""
    assert empty.total_invoiced == 0.0

    inv = await repo.create_invoice(_invoice(), family_name="Familia Chen")
    await repo.update_invoice_status(inv.id, "overdue")
    pay = await repo.create_payment(_payment(4000.0), family_name="Familia Chen")
    await repo.update_payment_status(pay.id, "paid")

    status = await repo.get_account_status("fam-001")
    assert status is not None
    assert status.family_name == "Familia Chen"
    assert status.total_invoiced == 9280.0, "Σ total de facturas"
    assert status.total_paid == 4000.0, "SOLO pagos paid"
    assert status.balance_due == 5280.0, "invoiced - paid"
    assert status.overdue_amount == 9280.0, "overdue cuenta total"
    assert status.overdue_count == 1
    assert status.last_payment_date == "2025-02-05", "max fecha pagos paid"
    assert len(status.invoices) == 1

    # ── cash position: singleton 45M + paid - expenses ──
    cash = await repo.get_cash_position()
    assert cash == 45_000_000.0 + 4000.0 - 3500.0, "45M + pagos paid - gastos"

    # ── restart REAL ──
    repo = await _restart_repo(repo)

    budget3 = await repo.get_budget()
    assert budget3.total_budgeted == 80000.0, "H-3: budgets sobreviven restart"
    assert budget3.total_spent == 3500.0, "expenses sobreviven restart"
    maint3 = next(line for line in budget3.lines if line.category == "maintenance")
    assert maint3.budgeted == 50000.0

    cash2 = await repo.get_cash_position()
    assert cash2 == 45_004_000.0 - 3500.0, "H-3: caja 45M sobrevive restart"

    status2 = await repo.get_account_status("fam-001")
    assert status2 is not None
    assert status2.total_paid == 4000.0, "pagos paid sobreviven restart"
    assert status2.overdue_count == 1, "overdue sobrevive restart"


async def test_report_and_ar_summary() -> None:
    """generate_report (emoji + breakdowns) + aging buckets + trends."""
    await _reset_backend()
    repo = _repo()

    await repo.create_expense(_expense())  # 3500 maintenance 2025-01-15
    await repo.create_expense(ExpenseCreate(
        description="Catering evento",
        amount=8000.0,
        category=ExpenseCategory.FOOD_BEVERAGE,
        vendor="Chef Mario",
        date="2025-01-20",
    ))
    inv = await repo.create_invoice(_invoice(), family_name="Familia Chen")
    pay = await repo.create_payment(_payment(5000.0), family_name="Familia Chen")
    await repo.update_payment_status(pay.id, "paid")
    _ = inv  # seed del test 3 (AR usa la factura unpaid)
    # pago pending: NO cuenta para income
    await repo.create_payment(PaymentCreate(
        family_id="fam-002", invoice_id="", amount=999.0,
        method=PaymentMethod.CASH, date="2025-01-25",
    ))

    report = await repo.generate_report("income_expense", "2025-01-01", "2025-12-31")
    assert report.report_type == "income_expense"
    assert report.total_income == 5000.0, "SOLO pagos paid en rango"
    assert report.total_expenses == 11500.0
    assert report.net_result == -6500.0
    assert report.summary.startswith("📉"), "emoji por neto NEGATIVO"
    assert "Resultado neto $-6,500.00" in report.summary, "summary MISMO formato"
    cats = {b["category"]: b["amount"] for b in report.expense_breakdown}
    assert cats["maintenance"] == 3500.0
    assert cats["food_beverage"] == 8000.0
    assert report.income_breakdown == [{"method": "transfer", "amount": 5000.0}]

    # AR summary: inv DRAFT no-paid → bucket por due_date 2025-02-01
    ar = await repo.get_accounts_receivable_summary()
    assert ar["total_ar"] == 9280.0, "unpaid (≠ paid) suma total"
    buckets = {b.bucket: b for b in ar["aging"]}
    assert set(buckets) == {"0-30 días", "31-60 días", "61-90 días", "90+ días"}
    assert sum(b.count for b in ar["aging"]) == 1
    assert sum(b.amount for b in ar["aging"]) == 9280.0

    # monthly trend: 2 meses con actividad (Ene: expenses 11500 ·
    # Feb: revenue 5000 — el pago paid es del 2025-02-05): MISMO
    # agrupado por fecha real que el in-memory
    trends = await repo.get_monthly_trend("2025-01-01", "2025-12-31")
    assert len(trends) == 2, "Ene (gastos) + Feb (ingreso paid)"
    by_month = {t.month: t for t in trends}
    assert set(by_month) == {"Ene", "Feb"}, "labels Ene/Feb"
    assert by_month["Ene"].revenue == 0.0
    assert by_month["Ene"].expenses == 11500.0
    assert by_month["Ene"].net == -11500.0
    assert by_month["Feb"].revenue == 5000.0
    assert by_month["Feb"].expenses == 0.0
    assert by_month["Feb"].net == 5000.0

    # ── restart REAL ──
    repo = await _restart_repo(repo)

    report2 = await repo.generate_report("income_expense", "2025-01-01", "2025-12-31")
    assert report2.total_income == 5000.0, "reporte sobrevive restart"
    assert report2.total_expenses == 11500.0
    assert report2.summary.startswith("📉")

    ar2 = await repo.get_accounts_receivable_summary()
    assert ar2["total_ar"] == 9280.0, "AR sobrevive restart"

    trends2 = await repo.get_monthly_trend("2025-01-01", "2025-12-31")
    assert len(trends2) == 2, "trend sobrevive restart"
    by_month2 = {t.month: t for t in trends2}
    assert by_month2["Feb"].revenue == 5000.0


async def test_contract_empty_and_drop_in_inmemory() -> None:
    """Contrato VACÍO idéntico al in-memory tras cirugía: drop-in total.

    El in-memory (Ola 2.1-decimoquinta cirugía async) y el ORM comparten
    contrato async: mismo seed (9 budgets 0.0 + caja 45M) · mismas
    salidas vacías · mismo emoji formato. Este test ejecuta AMBOS con
    el MISMO dataset sembrado por los MISMOS métodos públicos y compara
    las salidas canónicas: drop-in del 15º repo (0 cirugía del agente).
    """
    await _reset_backend()
    orm = _repo()

    from club_mcp.db.repositories.finance_repo import (
        FinanceRepository as FinanceInMemory,
    )

    mem = FinanceInMemory()

    # ── contrato vacío ──
    assert await orm.get_expense("nope") is None
    assert await mem.get_expense("nope") is None
    assert (await orm.list_invoices()) == []
    assert (await mem.list_invoices()) == []
    empty_orm = await orm.get_account_status("fam-0")
    empty_mem = await mem.get_account_status("fam-0")
    assert empty_orm is not None and empty_mem is not None
    assert empty_orm.family_id == empty_mem.family_id == "fam-0"
    assert empty_orm.total_invoiced == empty_mem.total_invoiced == 0.0

    # seed idéntico por métodos públicos en AMBOS
    for repo in (orm, mem):
        await repo.set_budget("maintenance", 50000.0)
        await repo.create_expense(_expense())
        inv = await repo.create_invoice(_invoice(), family_name="Familia Chen")
        pay = await repo.create_payment(_payment(5000.0), family_name="Familia Chen")
        await repo.update_payment_status(pay.id, "paid")
        await repo.update_invoice_status(inv.id, "sent")
        _ = inv
        await repo.create_payment(PaymentCreate(
            family_id="fam-002", invoice_id="", amount=999.0,
            method=PaymentMethod.CASH, date="2025-01-25",
        ))

    # salidas canónicas comparadas: budget · cash · report · AR · trend · status
    def canon_budget(b):
        return (
            b.period, b.total_budgeted, b.total_spent,
            b.total_remaining, b.utilization_pct,
            tuple(
                (line.category, line.budgeted, line.spent, line.remaining, line.utilization_pct)
                for line in b.lines
            ),
        )

    def canon_report(r):
        return (
            r.report_type, r.period_start, r.period_end,
            r.total_income, r.total_expenses, r.net_result,
            tuple(sorted((b["category"], b["amount"]) for b in r.expense_breakdown)),
            tuple(sorted((b["method"], b["amount"]) for b in r.income_breakdown)),
            r.summary,
        )

    def canon_ar(a):
        return (
            a["total_ar"],
            tuple((b.bucket, b.amount, b.count) for b in a["aging"]),
        )

    def canon_trend(ts):
        return tuple((t.month, t.revenue, t.expenses, t.net) for t in ts)

    def canon_status(st):
        return (
            st.family_id, st.family_name, st.total_invoiced, st.total_paid,
            st.balance_due, st.overdue_amount, st.overdue_count,
            st.last_payment_date, len(st.invoices),
        )

    b_orm, b_mem = await orm.get_budget(), await mem.get_budget()
    assert canon_budget(b_orm) == canon_budget(b_mem), "get_budget idéntico"
    assert b_orm.total_budgeted == 50000.0, "solo maintenance (9→1 modificada)"

    c_orm, c_mem = await orm.get_cash_position(), await mem.get_cash_position()
    assert c_orm == c_mem == 45_000_000.0 + 5000.0 - 3500.0, "cash idéntico"

    r_orm = await orm.generate_report("income_expense", "2025-01-01", "2025-12-31")
    r_mem = await mem.generate_report("income_expense", "2025-01-01", "2025-12-31")
    assert canon_report(r_orm) == canon_report(r_mem), "generate_report idéntico"
    assert r_orm.summary == r_mem.summary, "emoji+formato MISMO byte a byte"
    assert r_orm.summary.startswith("📈"), "neto +1500 → 📈 (UNA expense 3500)"

    ar_orm, ar_mem = (
        await orm.get_accounts_receivable_summary(),
        await mem.get_accounts_receivable_summary(),
    )
    assert canon_ar(ar_orm) == canon_ar(ar_mem), "AR idéntico"

    t_orm = await orm.get_monthly_trend("2025-01-01", "2025-12-31")
    t_mem = await mem.get_monthly_trend("2025-01-01", "2025-12-31")
    assert canon_trend(t_orm) == canon_trend(t_mem), "trend idéntico"

    s_orm = await orm.get_account_status("fam-001")
    s_mem = await mem.get_account_status("fam-001")
    assert canon_status(s_orm) == canon_status(s_mem), "account status idéntico"
    assert s_orm.overdue_count == s_mem.overdue_count == 0, "sent ≠ overdue"
