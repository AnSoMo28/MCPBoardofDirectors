"""Tablas del dominio Member 360 — Ola 2.1-decimaseptima.

Espejo 1:1 del estado observable del repo in-memory
(club_mcp.db.repositories.member_360_repo):

    MEMBER_SEED (12 members)          → member360_members
    HEALTH_FACTORS_SEED (5x5 +         → member360_health_factors
    _DEFAULT_FACTORS para el resto)

El repo in-memory es READ-ONLY: NO tiene métodos de escritura
públicos (get_*/search_*/generate_* solos). El dataset demo vive en
CONSTANTES DE MÓDULO y entra SOLO por el opt-in del constructor
(seed_demo_data=True). La tabla espeja ese estado; el ORM siembra
el MISMO dataset idempotente desde el MISMO módulo (mecánica
family_repo.seed_demo_data) — sin opt-in, tablas VACÍAS = contrato
vacío idéntico al in-memory sin opt-in.

Los enums del dominio (MemberHealthLevel · JourneyStage ·
ChurnRiskLevel · ActivityDomain · EngagementProposalType) NO son
constraint CHECK: el repo guarda .value (o str directo — el
in-memory es stringly-typed en el borde: tier/role/age_group son
str) y Pydantic reconstruye al leer; un CHECK duplicaría la
validación que Pydantic ya hace (mismo estilo que las 16
verticales previas §3.8..§3.8-DECIMOSEXTA).

join_date va Date (el modelo lo exige date); age/age_group son
NULLABLE porque MEMBER_SEED los trae opcional (.get en el borde).
factors: score/weight Float · trend/details String/Text planos.

Sin índices: todos los reads del contrato cargan la tabla (chica)
y filtran en Python EXACTO como el in-memory iteraba .values() /
la lista _members — mismo orden de inserción (order_by(id) PK
Integer insert-order estable en ambos backends), mismo contrato
observable (criterio sin-índice de communication §3.8-OCTAVA ·
lección run #56: el orden contractual SIEMPRE lleva order_by
explícito — nunca el heap físico del result-set).
"""
from __future__ import annotations

from datetime import date as _date

from sqlalchemy import Date, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from club_mcp.db.orm.base import Base


class Member360MemberORM(Base):
    """Miembro del dataset 360 — espejo de MemberIdentity."""

    __tablename__ = "member360_members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    member_id: Mapped[str] = mapped_column(String(24), nullable=False, unique=True)
    first_name: Mapped[str] = mapped_column(String(120), nullable=False)
    last_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str | None] = mapped_column(String(240), nullable=True)
    tier: Mapped[str] = mapped_column(String(32), nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    family_id: Mapped[str] = mapped_column(String(24), nullable=False)
    family_name: Mapped[str] = mapped_column(String(120), nullable=False)
    join_date: Mapped[_date] = mapped_column(Date, nullable=False)
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    age_group: Mapped[str | None] = mapped_column(String(32), nullable=True)


class Member360HealthFactorORM(Base):
    """Factor de salud — espejo de HealthFactor (5 por miembro).

    member_id referencia lógica a member360_members.member_id
    (FK NO declarado: el in-memory lo resuelve por dict lookup —
    mismo criterio de espejo blando de las verticales previas;
    el repo filtra en Python por la columna).
    """

    __tablename__ = "member360_health_factors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    member_id: Mapped[str] = mapped_column(String(24), nullable=False, index=False)
    name: Mapped[str] = mapped_column(String(32), nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    weight: Mapped[float] = mapped_column(Float, nullable=False)
    trend: Mapped[str] = mapped_column(String(16), nullable=False, default="stable")
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
