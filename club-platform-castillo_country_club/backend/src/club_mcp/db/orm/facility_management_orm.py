"""Tablas del dominio Facility Management — Ola 2.1-duodécima.

Espejo 1:1 de club_mcp.models.facility_management (Pydantic).
Los 5 dicts del repo in-memory (verificar contra
facility_management_repo.py):

    _facilities:   dict[str, dict] → facilities
    _maintenance:  dict[str, dict] → maintenance_tasks
    _setups:       dict[str, dict] → event_setups
    _inspections:  dict[str, dict] → inspections
    _reservations: dict[str, dict] → facility_reservations

Los enums del dominio (FacilityType · FacilityStatus ·
MaintenanceType · MaintenanceStatus · MaintenancePriority ·
SetupStatus · InspectionResult · ReservationStatus) NO son constraint
CHECK: el repo guarda .value en String(32) y reconstruye el Pydantic
enum al leer — el contrato del agente pasa enums; un CHECK duplicaría
la validación que Pydantic ya hace en el borde (mismo estilo que las
11 verticales previas §3.8..§3.8-UNDECIMA).

Las listas (amenities · requirements · corrective_actions) van a
JSONB por fila: anexos del agregado, no entidades con identity
propia — mismo criterio que families (§3.8-bis) hasta
proactive_recommendation (§3.8-UNDECIMA).

IDs: el in-memory genera uuid4().hex[:8] SIN prefijo (_gen_id
staticmethod) para TODAS las entidades; el repo ORM reproduce la
MISMA forma. Sin excepciones custom (el in-memory devuelve None /
listas vacías; el ORM idéntico).

created_at: el in-memory persiste ISO strings en el create de
reservations (datetime.now(tz=UTC).isoformat()) — columna Text que
guarda el MISMO string; roundtrip pérdida cero. El resto de las
entidades NO llevan created_at en el modelo Pydantic: el dict del
in-memory tampoco lo guarda — el ORM tampoco (contrato observable
exacto; facility/maintenance/setup/inspection no tienen timestamps).

Fechas/horas (scheduled_date · inspection_date · setup_date · date ·
start_time · end_time · completed_at) son strings ISO "YYYY-MM-DD" /
"HH:MM" en el in-memory — columnas Text guardan el MISMO string
(orden lexicográfico = orden cronológico para ISO: los filtros de
rango de list_reservations y los < de check_reservation_conflict
funcionan IDENTICAL sobre Text).

Sin índices: todos los reads del contrato cargan la tabla (chica) y
filtran en Python EXACTO como el in-memory iteraba .values() — mismo
orden de inserción, mismo contrato observable (criterio sin-índice
de communication §3.8-OCTAVA).
"""
from __future__ import annotations

from sqlalchemy import JSON, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from club_mcp.db.orm.base import Base


# JSONB en postgres, JSON en sqlite (dev/suite local): misma API.
# (idéntico a families §3.8-bis … proactive_recommendation §3.8-UNDECIMA).
JSONType = JSONB().with_variant(JSON(), "sqlite")


class FacilityORM(Base):
    """Instalación — espejo de Facility (Pydantic)."""

    __tablename__ = "facilities"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    name: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    facility_type: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="operational")
    location: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    amenities: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list)
    opening_time: Mapped[str] = mapped_column(String(8), nullable=False, default="06:00")
    closing_time: Mapped[str] = mapped_column(String(8), nullable=False, default="22:00")
    responsible_member_id: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    base_rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)


class MaintenanceTaskORM(Base):
    """Tarea de mantenimiento — espejo de MaintenanceTask (Pydantic)."""

    __tablename__ = "maintenance_tasks"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    facility_id: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    facility_name: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    maintenance_type: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="scheduled")
    priority: Mapped[str] = mapped_column(String(32), nullable=False, default="medium")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    scheduled_date: Mapped[str] = mapped_column(Text, nullable=False, default="")
    scheduled_time: Mapped[str] = mapped_column(String(8), nullable=False, default="08:00")
    estimated_duration_hours: Mapped[float] = mapped_column(Float, nullable=False, default=2.0)
    assigned_to: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    cost: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    completed_at: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)


class EventSetupORM(Base):
    """Setup de evento — espejo de EventSetup (Pydantic)."""

    __tablename__ = "event_setups"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    event_id: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    event_name: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    facility_id: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    facility_name: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="requested")
    setup_date: Mapped[str] = mapped_column(Text, nullable=False, default="")
    setup_time: Mapped[str] = mapped_column(String(8), nullable=False, default="08:00")
    event_start: Mapped[str] = mapped_column(Text, nullable=False, default="")
    event_end: Mapped[str] = mapped_column(Text, nullable=False, default="")
    requirements: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list)
    assigned_to: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    coordinator_member_id: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)


class InspectionORM(Base):
    """Inspección — espejo de Inspection (Pydantic)."""

    __tablename__ = "inspections"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    facility_id: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    facility_name: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    result: Mapped[str] = mapped_column(String(32), nullable=False, default="pass")
    inspector_member_id: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    inspection_date: Mapped[str] = mapped_column(Text, nullable=False, default="")
    findings: Mapped[str] = mapped_column(Text, nullable=False, default="")
    corrective_actions: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list)
    next_inspection_date: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)


class FacilityReservationORM(Base):
    """Reserva — espejo de FacilityReservation (Pydantic)."""

    __tablename__ = "facility_reservations"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    facility_id: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    facility_name: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    family_id: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    family_name: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    date: Mapped[str] = mapped_column(Text, nullable=False, default="")
    start_time: Mapped[str] = mapped_column(String(8), nullable=False, default="")
    end_time: Mapped[str] = mapped_column(String(8), nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    guest_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    purpose: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    created_by: Mapped[str] = mapped_column(String(240), nullable=False, default="system")
    created_at: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
