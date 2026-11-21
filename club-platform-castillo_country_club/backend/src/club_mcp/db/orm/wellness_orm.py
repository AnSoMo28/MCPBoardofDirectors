"""Tablas del dominio Wellness — Ola 2.1-decimosexta.

Espejo 1:1 del estado interno del repo in-memory
(club_mcp.db.repositories.wellness_repo):

    _profiles:      dict[str, dict] → wellness_profiles (JSONB lists)
    _goals:         dict[str, dict] → wellness_goals
    _activities:    dict[str, dict] → wellness_activities
    _classes:       dict[str, dict] → wellness_classes
    _appointments:  dict[str, dict] → wellness_appointments

Los enums del dominio (WellnessGoalType · GoalStatus · ActivityType ·
ClassLevel · AppointmentStatus) NO son constraint CHECK: el repo
guarda .value en String(32) y Pydantic reconstruye el enum al leer —
el contrato del agente pasa enums y str indistintamente ( coercion
del borde); un CHECK duplicaría la validación que Pydantic ya hace
(mismo estilo que las 15 verticales previas §3.8..§3.8-DECIMOQUINTA).

Las listas del perfil (health_conditions · allergies ·
dietary_restrictions · preferred_activities) van JSONB por fila:
anexo del agregado, no entidades con identity propia — mismo
criterio que families (§3.8-bis) hasta finance (§3.8-DECIMOQUINTA).

created_at: el in-memory NUNCA lo persiste — el default_factory
del modelo lo genera en la REHIDRATACIÓN del Pydantic. La columna
lo persiste ISO Text y el repo lo parsea al leer: roundtrip
pérdida cero, y el ORM conserva el created_at REAL. WellnessClass
NO tiene created_at en el modelo (add_class no lo fija) — la tabla
tampoco lo lleva: espejo exacto del estado observable.

Sin índices: todos los reads del contrato cargan la tabla (chica) y
filtran en Python EXACTO como el in-memory iteraba .values() — mismo
orden de inserción (order_by(id) PK String insert-order estable en
ambos backends), mismo contrato observable (criterio sin-índice de
communication §3.8-OCTAVA · reafirmado run #56: el orden contractual
de list_* es orden de inserción y SIEMPRE lleva order_by(id) explícito
— nunca el heap físico del result-set).
"""
from __future__ import annotations

from sqlalchemy import JSON, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from club_mcp.db.orm.base import Base


# JSONB en postgres, JSON en sqlite (dev/suite local): misma API.
# (idéntico a families §3.8-bis … finance §3.8-DECIMOQUINTA).
JSONType = JSONB().with_variant(JSON(), "sqlite")


class WellnessProfileORM(Base):
    """Perfil de bienestar — espejo de WellnessProfile (lists JSONB)."""

    __tablename__ = "wellness_profiles"

    id: Mapped[str] = mapped_column(String(24), primary_key=True)
    family_id: Mapped[str] = mapped_column(String(64), nullable=False)
    family_name: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    fitness_level: Mapped[str] = mapped_column(String(32), nullable=False, default="beginner")
    health_conditions: Mapped[list[str]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    allergies: Mapped[list[str]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    dietary_restrictions: Mapped[list[str]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    preferred_activities: Mapped[list[str]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    emergency_contact: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    emergency_phone: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    updated_at: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)


class WellnessGoalORM(Base):
    """Objetivo de bienestar — espejo de WellnessGoal."""

    __tablename__ = "wellness_goals"

    id: Mapped[str] = mapped_column(String(24), primary_key=True)
    family_id: Mapped[str] = mapped_column(String(64), nullable=False)
    goal_type: Mapped[str] = mapped_column(String(32), nullable=False)
    title: Mapped[str] = mapped_column(String(240), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    target_value: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    current_value: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    unit: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    target_date: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    created_at: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)


class WellnessActivityORM(Base):
    """Actividad registrada — espejo de WellnessActivity."""

    __tablename__ = "wellness_activities"

    id: Mapped[str] = mapped_column(String(24), primary_key=True)
    family_id: Mapped[str] = mapped_column(String(64), nullable=False)
    member_name: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    activity_type: Mapped[str] = mapped_column(String(32), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    calories_burned: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    distance_km: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    date: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    created_at: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)


class WellnessClassORM(Base):
    """Clase de bienestar — espejo de WellnessClass (SIN created_at)."""

    __tablename__ = "wellness_classes"

    id: Mapped[str] = mapped_column(String(24), primary_key=True)
    name: Mapped[str] = mapped_column(String(240), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    activity_type: Mapped[str] = mapped_column(String(32), nullable=False)
    instructor: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    level: Mapped[str] = mapped_column(String(32), nullable=False, default="all_levels")
    max_participants: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    location: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    schedule_day: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    schedule_time: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    enrolled_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class WellnessAppointmentORM(Base):
    """Cita de clase — espejo de ClassAppointment."""

    __tablename__ = "wellness_appointments"

    id: Mapped[str] = mapped_column(String(24), primary_key=True)
    class_id: Mapped[str] = mapped_column(String(24), nullable=False, default="")
    class_name: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    family_id: Mapped[str] = mapped_column(String(64), nullable=False)
    member_name: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    date: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    time: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="scheduled")
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)

