"""Tablas del dominio Finance — Ola 2.1-decimoquinta.

Espejo 1:1 del estado interno del repo in-memory
(club_mcp.db.repositories.finance_repo):

    _expenses: dict[str, dict] → finance_expenses
    _invoices: dict[str, dict] → finance_invoices (items JSONB)
    _payments: dict[str, dict] → finance_payments
    _budgets:  dict[str, float] → finance_budgets (estado de
               primera clase H-3: 9 categorías seed 0.0 — el
               in-memory lo siembra en __init__; la tabla nace
               con las mismas 9 filas)
    _cash_balance: float → finance_cash_balance (estado de primera
               clase H-3: singleton id=1 con el ₡45M inicial —
               el "seed demo" del comentario del in-memory es
               estado REAL del runtime observable vía
               get_cash_position; el ORM lo persiste para que el
               saldo sobreviva restarts)

Los enums del dominio (ExpenseCategory · PaymentStatus ·
PaymentMethod · InvoiceStatus) NO son constraint CHECK: el repo
guarda .value en String(32) y reconstruye el Pydantic enum al
leer — el contrato del agente pasa enums; un CHECK duplicaría la
validación que Pydantic ya hace en el borde (mismo estilo que las
14 verticales previas §3.8..§3.8-DECIMOCUARTA).

Los items de invoice (list[InvoiceItem]) van a JSONB por fila:
anexo del agregado, no entidad con identity propia — mismo
criterio que families (§3.8-bis) hasta sports (§3.8-DECIMOCUARTA).

created_at: el in-memory NUNCA lo persiste — el default_factory
del modelo lo genera en la REHIDRATACIÓN del Pydantic. La columna
lo persiste ISO Text y el repo lo parsea al leer: roundtrip
pérdida cero, y el ORM conserva el created_at REAL.

Sin índices: todos los reads del contrato cargan la tabla (chica) y
filtran en Python EXACTO como el in-memory iteraba .values() — mismo
orden de inserción, mismo contrato observable (criterio sin-índice
de communication §3.8-OCTAVA).
"""
from __future__ import annotations

from typing import Any

from sqlalchemy import JSON, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from club_mcp.db.orm.base import Base


# JSONB en postgres, JSON en sqlite (dev/suite local): misma API.
# (idéntico a families §3.8-bis … sports §3.8-DECIMOCUARTA).
JSONType = JSONB().with_variant(JSON(), "sqlite")


class FinanceExpenseORM(Base):
    """Gasto del club — espejo de Expense."""

    __tablename__ = "finance_expenses"

    id: Mapped[str] = mapped_column(String(24), primary_key=True)
    description: Mapped[str] = mapped_column(String(240), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    vendor: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    date: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    receipt_url: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)


class FinanceInvoiceORM(Base):
    """Factura a una familia — espejo de Invoice (items JSONB)."""

    __tablename__ = "finance_invoices"

    id: Mapped[str] = mapped_column(String(24), primary_key=True)
    family_id: Mapped[str] = mapped_column(String(64), nullable=False)
    family_name: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    items: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    subtotal: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    tax: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    total: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    due_date: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    paid_date: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)


class FinancePaymentORM(Base):
    """Pago de una familia — espejo de Payment."""

    __tablename__ = "finance_payments"

    id: Mapped[str] = mapped_column(String(24), primary_key=True)
    invoice_id: Mapped[str] = mapped_column(String(24), nullable=False, default="")
    family_id: Mapped[str] = mapped_column(String(64), nullable=False)
    family_name: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    method: Mapped[str] = mapped_column(String(32), nullable=False, default="transfer")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    reference: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    date: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)


class FinanceBudgetORM(Base):
    """Presupuesto por categoría — espejo de _budgets (dict[str, float]).

    Estado de primera clase (H-3): el in-memory siembra 9 filas
    (una por ExpenseCategory, 0.0) en __init__; la tabla nace con
    las MISMAS 9 filas — set_budget hace UPSERT. Sin PK de
    identidad: category ES la clave natural (única).
    """

    __tablename__ = "finance_budgets"

    category: Mapped[str] = mapped_column(String(32), primary_key=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)


class FinanceCashBalanceORM(Base):
    """Saldo de caja del club — espejo de _cash_balance (singleton).

    Estado de primera clase (H-3): una sola fila id=1 con el balance
    inicial ₡45,000,000 del in-memory (el "for demo" del comentario
    es estado REAL observable por get_cash_position — se persiste
    para que el saldo sobreviva restarts, criterio del seed de
    deploy de age_group §3.8-DECIMATERCERA).
    """

    __tablename__ = "finance_cash_balance"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    balance: Mapped[float] = mapped_column(Float, nullable=False, default=45_000_000.0)
