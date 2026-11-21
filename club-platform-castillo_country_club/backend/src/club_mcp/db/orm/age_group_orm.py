"""Tablas del dominio Age Group — Ola 2.1-decimotercima.

Espejo 1:1 del estado interno del repo in-memory
(club_mcp.db.repositories.age_group_repo):

    _activities:        dict[str, dict]      → age_group_activities
    _enrollment:        dict[str, list[dict]]→ age_group_enrollments
    _monthly_snapshots: dict[month, {ag: m}] → age_group_monthly_snapshots
    _member_counts + _family_counts:         → age_group_member_counts

Los enums del dominio (AgeGroupCategory · ActivityDifficulty ·
AgeGroupActivityStatus) NO son constraint CHECK: el repo guarda .value
en String(32) y reconstruye el Pydantic enum al leer — el contrato del
agente pasa enums; un CHECK duplicaría la validación que Pydantic ya
hace en el borde (mismo estilo que las 12 verticales previas
§3.8..§3.8-DUODECIMA).

Las listas del agregado (equipment_needed · tags · schedule_days) van
a JSONB por fila: anexos de la actividad, no entidades con identity
propia — mismo criterio que families (§3.8-bis) hasta
facility_management (§3.8-DUODECIMA).

Enrollments son ENTIDADES con identity propia (family_id por
actividad — el agente las lee con get_activity_enrollment y los
compute las agregan): columnas planas family_id · enrolled_at ·
status · satisfaction + activity_id. El in-memory las guarda como
list[dict] colgando del activity_id; el ORM las normaliza — MISMO
contrato observable (get_activity_enrollment devuelve la lista de
dicts planos en el MISMO orden de inserción).

Monthly snapshots: PK compuesto (month, age_group) · métricas en
columnas (enrolled · satisfaction · new_enrollments ·
retention_rate). El in-memory las colgaba de una constante de seed
que SOLO existía con seed_demo_data=True (hallazgo H-3 de la guía):
la tabla las hace dato de primera clase — el deploy las carga y los
compute (trends · forecast · proposals · health) leen de la base.

Member/family counts: una fila por age_group (toddler..seniors) —
dato de primera clase, no constante de seed (criterio H-3). El repo
in-memory nace con 0 en las 6 categorías; el ORM igual (las filas
se crean con set_member_count del contrato interno de siembra o
por el deploy).

created_at/updated_at: el in-memory persiste ISO strings
(datetime.now(timezone.utc).isoformat()) en el create — columnas Text
que guardan el MISMO string; roundtrip pérdida cero. update_activity
SIEMPRE refresca updated_at (semántica literal del in-memory).

IDs: el in-memory genera f"act_{uuid4().hex[:8]}" (_gen_id con
prefijo "act") — el repo ORM reproduce la MISMA forma.

Sin índices: todos los reads del contrato cargan la tabla (chica) y
filtran en Python EXACTO como el in-memory iteraba .values() — mismo
orden de inserción (snapshots: sorted(keys), igual que el in-memory),
mismo contrato observable (criterio sin-índice de communication
§3.8-OCTAVA).
"""
from __future__ import annotations

from sqlalchemy import JSON, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from club_mcp.db.orm.base import Base


# JSONB en postgres, JSON en sqlite (dev/suite local): misma API.
# (idéntico a families §3.8-bis … facility_management §3.8-DUODECIMA).
JSONType = JSONB().with_variant(JSON(), "sqlite")


class AgeGroupActivityORM(Base):
    """Actividad por grupo etario — espejo de AgeGroupActivity."""

    __tablename__ = "age_group_activities"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    name: Mapped[str] = mapped_column(String(240), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    age_group: Mapped[str] = mapped_column(String(32), nullable=False)
    difficulty: Mapped[str] = mapped_column(String(32), nullable=False, default="easy")
    location: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    max_participants: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    requires_instructor: Mapped[bool] = mapped_column(Integer, nullable=False, default=0)
    instructor_name: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    equipment_needed: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list)
    tags: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    schedule_days: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list)
    schedule_time: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    created_at: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    updated_at: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)


class AgeGroupEnrollmentORM(Base):
    """Inscripción de una familia a una actividad (registro plano).

    Espejo de los dicts de _enrollment[activity_id]: family_id ·
    enrolled_at · status · satisfaction — columnas planas (el dict
    NO tiene id propio; la fila lo toma del surrogate).
    """

    __tablename__ = "age_group_enrollments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    activity_id: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    family_id: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    enrolled_at: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="active")
    satisfaction: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)


class AgeGroupMonthlySnapshotORM(Base):
    """Snapshot mensual por grupo — PK compuesto (month, age_group).

    Espejo de _monthly_snapshots[month][age_group]: enrolled ·
    satisfaction · new_enrollments · retention_rate.
    """

    __tablename__ = "age_group_monthly_snapshots"

    month: Mapped[str] = mapped_column(String(7), primary_key=True)
    age_group: Mapped[str] = mapped_column(String(32), primary_key=True)
    enrolled: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    satisfaction: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    new_enrollments: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    retention_rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)


class AgeGroupMemberCountORM(Base):
    """Miembros/familias por grupo — dato de primera clase (H-3).

    Espejo de _member_counts[ag] / _family_counts[ag].
    """

    __tablename__ = "age_group_member_counts"

    age_group: Mapped[str] = mapped_column(String(32), primary_key=True)
    member_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    family_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
