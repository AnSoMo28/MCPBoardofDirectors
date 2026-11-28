"""FacilityManagementRepository async — los 5 dicts se vuelven 5 tablas.

Ola 2.1-duodécima (vertical facility_management). Contrato EXACTO del
módulo in-memory que reemplaza (club_mcp.db.repositories.
facility_management_repo) — mismos 20 métodos, mismas firmas, mismos
Pydantic de salida, mismo comportamiento de error (None / lista vacía
— el in-memory no define excepciones custom y el ORM tampoco las
inventa).

La duodécima es async-FIRST como engagement/guest/satisfaction/
communication/cultural_social/executive_dashboard/proactive
(drop-in total): el in-memory ya es 20/20 async y el agente YA
awaited sus 31 call sites (verificado por grep — 0 privados
tocados: contrato limpio).

Mismas decisiones que las 11 verticales (§3.8..§3.8-UNDECIMA): engine
por inyección · session_scope transaccional · devuelve Pydantic
(SQLAlchemy no sube) · ids de la MISMA forma que el in-memory
(uuid4().hex[:8] SIN prefijo, _gen_id).

Semántica literal del in-memory que se preserva:
  * create_facility: status OPERATIONAL LITERAL (no el default del
    modelo — el Create schema NO trae status; el in-memory lo fija
    en el create).
  * create_maintenance: status SCHEDULED literal · priority/
    scheduled_time/estimated_duration_hours vienen del Create.
  * create_setup: status REQUESTED literal.
  * create_reservation: status CONFIRMED literal (no PENDING, el
    default del modelo) + created_at=now ISO — el in-memory lo
    fija en el create.
  * update_*(facility/maintenance/setup): record.update(updates) del
    dict plano — setattr por whitelist _UPDATABLE; clave desconocida
    ignorada (el dict la guardaba, Pydantic la descartaba al
    reconstruir: mismo comportamiento observable). id intocable.
    OJO: el in-memory NO pone updated_at (no existe en estos
    modelos) — el ORM tampoco: contrato observable exacto.
  * list_*: filtros por igualdad EN Python sobre la tabla completa
    (chica) — MISMO orden de inserción que iterar .values().
  * list_reservations: tras filtros, results.sort(key=(date,
    start_time)) — sort estable DESPUÉS de los filtros, igual que el
    in-memory.
  * check_reservation_conflict: overlap start < end_time and
    end > start_time · excluye CANCELLED/NO_SHOW · excluye
    exclude_id — mismo contrato.
  * get_facility_health/get_amenity_utilization/get_space_
    optimization/get_facility_analytics: COMPUTE-ON-READ sobre los
    list_* del contrato — los helpers _get_health_level/_get_
    dimension_status/_estimate_monthly_revenue/_REVENUE_RATES/
    _HEALTH_LEVELS/_DIMENSION_LEVELS/_generate_utilization_series/
    _suggest_alternative_use se reproducen del in-memory (misma
    fuente de verdad, byte a byte).
  * _seed_data: NO se reproduce — el dict nace vacío en el ORM (el
    seed DEMO del in-memory es solo del demo in-memory; criterio
    communication §3.8-OCTAVA: SIN seed, las tablas nacen vacías).
"""
from __future__ import annotations

import hashlib
import logging
from collections import defaultdict
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Any
from uuid import uuid4

from sqlalchemy import select

from club_mcp.db.orm.facility_management_orm import (
    EventSetupORM,
    FacilityORM,
    FacilityReservationORM,
    InspectionORM,
    MaintenanceTaskORM,
)
from club_mcp.db.orm.session import session_scope
from club_mcp.models.facility_management import (
    AmenityUtilizationItem,
    AmenityUtilizationResponse,
    AnalyticsDimension,
    CreateEventSetup,
    CreateFacility,
    CreateFacilityReservation,
    CreateInspection,
    CreateMaintenanceTask,
    CrossDomainSignal,
    EventSetup,
    Facility,
    FacilityAnalyticsResponse,
    FacilityHealthResponse,
    FacilityReservation,
    FacilityStatus,
    FacilityType,
    HealthFactor,
    Inspection,
    InspectionResult,
    MaintenancePriority,
    MaintenanceStatus,
    MaintenanceTask,
    MaintenanceType,
    ReservationStatus,
    SetupStatus,
    SpaceOptimizationResponse,
    SpaceOptimizationSuggestion,
)


if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

logger = logging.getLogger(__name__)

# ── Revenue estimation rates per facility type (₡/unit) — del in-memory ──

_REVENUE_RATES: dict[FacilityType, dict[str, float]] = {
    FacilityType.POOL: {"per_person_day": 5_000, "daily_avg_visitors": 45},
    FacilityType.GYM: {"per_person_day": 3_000, "daily_avg_visitors": 60},
    FacilityType.TENNIS_COURT: {"per_hour": 15_000, "daily_avg_hours": 10},
    FacilityType.SQUASH_COURT: {"per_hour": 10_000, "daily_avg_hours": 6},
    FacilityType.GOLF_COURSE: {"per_round": 25_000, "daily_avg_rounds": 12},
    FacilityType.RESTAURANT: {"per_person_avg": 25_000, "daily_avg_diners": 50},
    FacilityType.LOUNGE: {"per_person_avg": 15_000, "daily_avg_visitors": 25},
    FacilityType.BALLROOM: {"per_event": 150_000, "events_per_month": 4},
    FacilityType.GARDEN: {"per_event": 80_000, "events_per_month": 3},
    FacilityType.SPA: {"per_person": 35_000, "daily_avg_visitors": 12},
    FacilityType.KIDS_AREA: {"per_child_day": 5_000, "daily_avg_children": 15},
    FacilityType.PARKING: {"flat_monthly": 0},
    FacilityType.PLAYGROUND: {"flat_monthly": 0},
}

# ── Health level thresholds — del in-memory ──

_HEALTH_LEVELS: list[tuple[int, str, str]] = [
    (85, "A", "Excepcional"),
    (70, "B", "Saludable"),
    (50, "C", "Atención"),
    (30, "D", "Preocupante"),
    (0, "F", "Crítico"),
]

_DIMENSION_LEVELS: list[tuple[int, str]] = [
    (80, "excepcional"),
    (60, "saludable"),
    (40, "atencion"),
    (0, "critico"),
]


def _get_health_level(score: int) -> tuple[str, str]:
    for threshold, grade, level in _HEALTH_LEVELS:
        if score >= threshold:
            return grade, level
    return "F", "Crítico"


def _get_dimension_status(score: int) -> str:
    for threshold, status in _DIMENSION_LEVELS:
        if score >= threshold:
            return status
    return "critico"


def _estimate_monthly_revenue(ft: FacilityType) -> float:
    rates = _REVENUE_RATES.get(ft, {})
    if "per_person_day" in rates:
        return rates["per_person_day"] * rates.get("daily_avg_visitors", 0) * 30
    if "per_hour" in rates:
        return rates["per_hour"] * rates.get("daily_avg_hours", 0) * 30
    if "per_round" in rates:
        return rates["per_round"] * rates.get("daily_avg_rounds", 0) * 30
    if "per_person_avg" in rates:
        return rates["per_person_avg"] * rates.get("daily_avg_visitors", 0) * 30
    if "per_event" in rates:
        return rates["per_event"] * rates.get("events_per_month", 0)
    if "per_person" in rates:
        return rates["per_person"] * rates.get("daily_avg_visitors", 0) * 30
    if "per_child_day" in rates:
        return rates["per_child_day"] * rates.get("daily_avg_children", 0) * 30
    return 0.0


def _gen_id() -> str:
    """MISMA generación que el in-memory (uuid4().hex[:8] sin prefijo)."""
    return uuid4().hex[:8]


def _utcnow_iso() -> str:
    """now ISO UTC — misma fuente que el in-memory (create_reservation)."""
    return datetime.now(tz=UTC).isoformat()


def _enum_val(v: Any) -> str:
    """Enum → .value; str pasa directo (mismo borde del in-memory)."""
    return v.value if hasattr(v, "value") else str(v)


# ── helpers de reconstrucción (ORM → Pydantic) ──


def _facility_from_orm(r: FacilityORM) -> Facility:
    return Facility(
        id=r.id,
        name=r.name,
        facility_type=FacilityType(r.facility_type),
        status=FacilityStatus(r.status),
        location=r.location,
        capacity=r.capacity,
        description=r.description,
        amenities=list(r.amenities or []),
        opening_time=r.opening_time,
        closing_time=r.closing_time,
        responsible_member_id=r.responsible_member_id,
        base_rate=r.base_rate,
        notes=r.notes,
    )


def _maintenance_from_orm(r: MaintenanceTaskORM) -> MaintenanceTask:
    return MaintenanceTask(
        id=r.id,
        facility_id=r.facility_id,
        facility_name=r.facility_name,
        maintenance_type=MaintenanceType(r.maintenance_type),
        status=MaintenanceStatus(r.status),
        priority=MaintenancePriority(r.priority),
        description=r.description,
        scheduled_date=r.scheduled_date,
        scheduled_time=r.scheduled_time,
        estimated_duration_hours=r.estimated_duration_hours,
        assigned_to=r.assigned_to,
        cost=r.cost,
        completed_at=r.completed_at,
        notes=r.notes,
    )


def _setup_from_orm(r: EventSetupORM) -> EventSetup:
    return EventSetup(
        id=r.id,
        event_id=r.event_id,
        event_name=r.event_name,
        facility_id=r.facility_id,
        facility_name=r.facility_name,
        status=SetupStatus(r.status),
        setup_date=r.setup_date,
        setup_time=r.setup_time,
        event_start=r.event_start,
        event_end=r.event_end,
        requirements=list(r.requirements or []),
        assigned_to=r.assigned_to,
        coordinator_member_id=r.coordinator_member_id,
        notes=r.notes,
    )


def _inspection_from_orm(r: InspectionORM) -> Inspection:
    return Inspection(
        id=r.id,
        facility_id=r.facility_id,
        facility_name=r.facility_name,
        result=InspectionResult(r.result),
        inspector_member_id=r.inspector_member_id,
        inspection_date=r.inspection_date,
        findings=r.findings,
        corrective_actions=list(r.corrective_actions or []),
        next_inspection_date=r.next_inspection_date,
        notes=r.notes,
    )


def _reservation_from_orm(r: FacilityReservationORM) -> FacilityReservation:
    return FacilityReservation(
        id=r.id,
        facility_id=r.facility_id,
        facility_name=r.facility_name,
        family_id=r.family_id,
        family_name=r.family_name,
        date=r.date,
        start_time=r.start_time,
        end_time=r.end_time,
        status=ReservationStatus(r.status),
        guest_count=r.guest_count,
        purpose=r.purpose,
        notes=r.notes,
        created_by=r.created_by,
        created_at=r.created_at,
    )


# ── updates dict (semántica record.update del in-memory) ──

_UPDATABLE: dict[str, set[str]] = {
    "facility": {
        "name", "facility_type", "status", "location", "capacity",
        "description", "amenities", "opening_time", "closing_time",
        "responsible_member_id", "base_rate", "notes",
    },
    "maintenance": {
        "facility_id", "facility_name", "maintenance_type", "status",
        "priority", "description", "scheduled_date", "scheduled_time",
        "estimated_duration_hours", "assigned_to", "cost",
        "completed_at", "notes",
    },
    "setup": {
        "event_id", "event_name", "facility_id", "facility_name",
        "status", "setup_date", "setup_time", "event_start",
        "event_end", "requirements", "assigned_to",
        "coordinator_member_id", "notes",
    },
}


def _apply_updates(obj: Any, updates: dict[str, Any], key: str) -> None:
    """record.update(updates) del in-memory — setattr por clave de columna.

    Las claves que no calzan con una columna se ignoran (el dict del
    in-memory las guardaba pero Pydantic las descartaba al reconstruir:
    mismo comportamiento observable). id no se toca nunca.
    """
    allowed = _UPDATABLE[key]
    for k, v in (updates or {}).items():
        if k in allowed:
            setattr(obj, k, v)


async def _load_all(s: AsyncSession, cls: type[Any]) -> list[Any]:
    return list((await s.execute(select(cls))).scalars().all())


class FacilityManagementRepository:
    """Repo ORM async — contrato EXACTO del in-memory (20 métodos)."""

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine

    # ── Facilities CRUD ─────────────────────────────────────────

    async def create_facility(self, data: CreateFacility) -> Facility:
        fid = _gen_id()
        record: dict[str, Any] = {
            "id": fid,
            "name": data.name,
            "facility_type": data.facility_type,
            "status": FacilityStatus.OPERATIONAL,
            "location": data.location,
            "capacity": data.capacity,
            "description": data.description,
            "amenities": data.amenities,
            "opening_time": data.opening_time,
            "closing_time": data.closing_time,
            "responsible_member_id": data.responsible_member_id,
            "base_rate": data.base_rate,
            "notes": data.notes,
        }
        async with session_scope(self._engine) as s:
            s.add(
                FacilityORM(
                    id=fid,
                    name=data.name,
                    facility_type=_enum_val(data.facility_type),
                    status=FacilityStatus.OPERATIONAL.value,
                    location=data.location,
                    capacity=data.capacity,
                    description=data.description,
                    amenities=list(data.amenities),
                    opening_time=data.opening_time,
                    closing_time=data.closing_time,
                    responsible_member_id=data.responsible_member_id,
                    base_rate=data.base_rate,
                    notes=data.notes,
                )
            )
        logger.info("[facility_mgmt] Facility created: %s (%s)", data.name, fid)
        return Facility(**record)

    async def get_facility(self, facility_id: str) -> Facility | None:
        async with session_scope(self._engine) as s:
            r = await s.get(FacilityORM, facility_id)
            if r is None:
                return None
            return _facility_from_orm(r)

    async def update_facility(
        self, facility_id: str, updates: dict[str, Any]
    ) -> Facility | None:
        async with session_scope(self._engine) as s:
            r = await s.get(FacilityORM, facility_id)
            if r is None:
                return None
            _apply_updates(r, updates, "facility")
            record = _facility_from_orm(r)
        return record

    async def list_facilities(
        self,
        facility_type: FacilityType | None = None,
        status: FacilityStatus | None = None,
    ) -> list[Facility]:
        async with session_scope(self._engine) as s:
            rows = await _load_all(s, FacilityORM)
        results: list[Facility] = []
        for r in rows:
            if facility_type and r.facility_type != _enum_val(facility_type):
                continue
            if status and r.status != _enum_val(status):
                continue
            results.append(_facility_from_orm(r))
        return results

    # ── Maintenance CRUD ────────────────────────────────

    async def create_maintenance(
        self, data: CreateMaintenanceTask
    ) -> MaintenanceTask:
        mid = _gen_id()
        record: dict[str, Any] = {
            "id": mid,
            "facility_id": data.facility_id,
            "facility_name": data.facility_name,
            "maintenance_type": data.maintenance_type,
            "status": MaintenanceStatus.SCHEDULED,
            "priority": data.priority,
            "description": data.description,
            "scheduled_date": data.scheduled_date,
            "scheduled_time": data.scheduled_time,
            "estimated_duration_hours": data.estimated_duration_hours,
            "assigned_to": data.assigned_to,
            "cost": data.cost,
            "completed_at": None,
            "notes": data.notes,
        }
        async with session_scope(self._engine) as s:
            s.add(
                MaintenanceTaskORM(
                    id=mid,
                    facility_id=data.facility_id,
                    facility_name=data.facility_name,
                    maintenance_type=_enum_val(data.maintenance_type),
                    status=MaintenanceStatus.SCHEDULED.value,
                    priority=_enum_val(data.priority),
                    description=data.description,
                    scheduled_date=data.scheduled_date,
                    scheduled_time=data.scheduled_time,
                    estimated_duration_hours=data.estimated_duration_hours,
                    assigned_to=data.assigned_to,
                    cost=data.cost,
                    completed_at=None,
                    notes=data.notes,
                )
            )
        return MaintenanceTask(**record)

    async def get_maintenance(
        self, task_id: str
    ) -> MaintenanceTask | None:
        async with session_scope(self._engine) as s:
            r = await s.get(MaintenanceTaskORM, task_id)
            if r is None:
                return None
            return _maintenance_from_orm(r)

    async def update_maintenance(
        self, task_id: str, updates: dict[str, Any]
    ) -> MaintenanceTask | None:
        async with session_scope(self._engine) as s:
            r = await s.get(MaintenanceTaskORM, task_id)
            if r is None:
                return None
            _apply_updates(r, updates, "maintenance")
            record = _maintenance_from_orm(r)
        return record

    async def list_maintenance(
        self,
        facility_id: str | None = None,
        status: MaintenanceStatus | None = None,
    ) -> list[MaintenanceTask]:
        async with session_scope(self._engine) as s:
            rows = await _load_all(s, MaintenanceTaskORM)
        results: list[MaintenanceTask] = []
        for r in rows:
            if facility_id and r.facility_id != facility_id:
                continue
            if status and r.status != _enum_val(status):
                continue
            results.append(_maintenance_from_orm(r))
        return results

    # ── Event Setups CRUD ───────────────────────────────

    async def create_setup(self, data: CreateEventSetup) -> EventSetup:
        sid = _gen_id()
        record: dict[str, Any] = {
            "id": sid,
            "event_id": data.event_id,
            "event_name": data.event_name,
            "facility_id": data.facility_id,
            "facility_name": data.facility_name,
            "status": SetupStatus.REQUESTED,
            "setup_date": data.setup_date,
            "setup_time": data.setup_time,
            "event_start": data.event_start,
            "event_end": data.event_end,
            "requirements": data.requirements,
            "assigned_to": data.assigned_to,
            "coordinator_member_id": data.coordinator_member_id,
            "notes": data.notes,
        }
        async with session_scope(self._engine) as s:
            s.add(
                EventSetupORM(
                    id=sid,
                    event_id=data.event_id,
                    event_name=data.event_name,
                    facility_id=data.facility_id,
                    facility_name=data.facility_name,
                    status=SetupStatus.REQUESTED.value,
                    setup_date=data.setup_date,
                    setup_time=data.setup_time,
                    event_start=data.event_start,
                    event_end=data.event_end,
                    requirements=list(data.requirements),
                    assigned_to=data.assigned_to,
                    coordinator_member_id=data.coordinator_member_id,
                    notes=data.notes,
                )
            )
        return EventSetup(**record)

    async def get_setup(self, setup_id: str) -> EventSetup | None:
        async with session_scope(self._engine) as s:
            r = await s.get(EventSetupORM, setup_id)
            if r is None:
                return None
            return _setup_from_orm(r)

    async def update_setup(
        self, setup_id: str, updates: dict[str, Any]
    ) -> EventSetup | None:
        async with session_scope(self._engine) as s:
            r = await s.get(EventSetupORM, setup_id)
            if r is None:
                return None
            _apply_updates(r, updates, "setup")
            record = _setup_from_orm(r)
        return record

    async def list_setups(
        self,
        facility_id: str | None = None,
        status: SetupStatus | None = None,
    ) -> list[EventSetup]:
        async with session_scope(self._engine) as s:
            rows = await _load_all(s, EventSetupORM)
        results: list[EventSetup] = []
        for r in rows:
            if facility_id and r.facility_id != facility_id:
                continue
            if status and r.status != _enum_val(status):
                continue
            results.append(_setup_from_orm(r))
        return results

    # ── Inspections CRUD ───────────────────────────────

    async def create_inspection(
        self, data: CreateInspection
    ) -> Inspection:
        iid = _gen_id()
        record: dict[str, Any] = {
            "id": iid,
            "facility_id": data.facility_id,
            "facility_name": data.facility_name,
            "result": data.result,
            "inspector_member_id": data.inspector_member_id,
            "inspection_date": data.inspection_date,
            "findings": data.findings,
            "corrective_actions": data.corrective_actions,
            "next_inspection_date": data.next_inspection_date,
            "notes": data.notes,
        }
        async with session_scope(self._engine) as s:
            s.add(
                InspectionORM(
                    id=iid,
                    facility_id=data.facility_id,
                    facility_name=data.facility_name,
                    result=_enum_val(data.result),
                    inspector_member_id=data.inspector_member_id,
                    inspection_date=data.inspection_date,
                    findings=data.findings,
                    corrective_actions=list(data.corrective_actions),
                    next_inspection_date=data.next_inspection_date,
                    notes=data.notes,
                )
            )
        return Inspection(**record)

    async def get_inspection(
        self, inspection_id: str
    ) -> Inspection | None:
        async with session_scope(self._engine) as s:
            r = await s.get(InspectionORM, inspection_id)
            if r is None:
                return None
            return _inspection_from_orm(r)

    async def list_inspections(
        self, facility_id: str | None = None,
    ) -> list[Inspection]:
        async with session_scope(self._engine) as s:
            rows = await _load_all(s, InspectionORM)
        results: list[Inspection] = []
        for r in rows:
            if facility_id and r.facility_id != facility_id:
                continue
            results.append(_inspection_from_orm(r))
        return results

    # ── Reservations CRUD (F33) ────────────────────────

    async def create_reservation(
        self, data: CreateFacilityReservation
    ) -> FacilityReservation:
        rid = _gen_id()
        now = _utcnow_iso()
        record: dict[str, Any] = {
            "id": rid,
            "facility_id": data.facility_id,
            "facility_name": data.facility_name,
            "family_id": data.family_id,
            "family_name": data.family_name,
            "date": data.date,
            "start_time": data.start_time,
            "end_time": data.end_time,
            "status": ReservationStatus.CONFIRMED,
            "guest_count": data.guest_count,
            "purpose": data.purpose,
            "notes": data.notes,
            "created_by": data.created_by,
            "created_at": now,
        }
        async with session_scope(self._engine) as s:
            s.add(
                FacilityReservationORM(
                    id=rid,
                    facility_id=data.facility_id,
                    facility_name=data.facility_name,
                    family_id=data.family_id,
                    family_name=data.family_name,
                    date=data.date,
                    start_time=data.start_time,
                    end_time=data.end_time,
                    status=ReservationStatus.CONFIRMED.value,
                    guest_count=data.guest_count,
                    purpose=data.purpose,
                    notes=data.notes,
                    created_by=data.created_by,
                    created_at=now,
                )
            )
        logger.info(
            "[facility_mgmt] Reservation created: %s at %s on %s",
            data.family_name, data.facility_name, data.date,
        )
        return FacilityReservation(**record)

    async def list_reservations(
        self,
        facility_id: str | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
        status: ReservationStatus | None = None,
    ) -> list[FacilityReservation]:
        async with session_scope(self._engine) as s:
            rows = await _load_all(s, FacilityReservationORM)
        results: list[FacilityReservation] = []
        for r in rows:
            if facility_id and r.facility_id != facility_id:
                continue
            if date_from and r.date < date_from:
                continue
            if date_to and r.date > date_to:
                continue
            if status and r.status != _enum_val(status):
                continue
            results.append(_reservation_from_orm(r))
        results.sort(key=lambda res: (res.date, res.start_time))
        return results

    async def check_reservation_conflict(
        self,
        facility_id: str,
        date: str,
        start_time: str,
        end_time: str,
        exclude_id: str | None = None,
    ) -> list[FacilityReservation]:
        """Find overlapping reservations for the same facility and date."""
        conflicts: list[FacilityReservation] = []
        async with session_scope(self._engine) as s:
            rows = await _load_all(s, FacilityReservationORM)
        for r in rows:
            if r.facility_id != facility_id:
                continue
            if r.date != date:
                continue
            if exclude_id and r.id == exclude_id:
                continue
            if r.status in (
                ReservationStatus.CANCELLED.value,
                ReservationStatus.NO_SHOW.value,
            ):
                continue
            # Check time overlap
            if start_time < r.end_time and end_time > r.start_time:
                conflicts.append(_reservation_from_orm(r))
        return conflicts

    # ── Analytics Methods (F33) — compute-on-read sobre tablas ──

    async def get_facility_health(self) -> FacilityHealthResponse:
        """5-factor composite health score for all facilities."""
        today = datetime.now(tz=UTC)
        today_str = today.strftime("%Y-%m-%d")
        thirty_days_ago = (today - timedelta(days=30)).strftime("%Y-%m-%d")

        facilities = await self.list_facilities()
        maintenance = await self.list_maintenance()
        inspections = await self.list_inspections()
        reservations = await self.list_reservations()

        operational = [
            f for f in facilities if f.status == FacilityStatus.OPERATIONAL
        ]

        # Factor 1: Utilization (25%)
        total_cap = sum(f.capacity for f in operational) or 1
        today_res = [
            r for r in reservations
            if r.date == today_str
            and r.status in (ReservationStatus.CONFIRMED, ReservationStatus.PENDING)
        ]
        total_occ = sum(r.guest_count for r in today_res)
        util_score = min(100, round(total_occ / total_cap * 100 * 1.5))

        # Factor 2: Maintenance (25%)
        overdue = [
            m for m in maintenance
            if m.status == MaintenanceStatus.SCHEDULED
            and m.scheduled_date < today_str
        ]
        in_progress = [
            m for m in maintenance
            if m.status == MaintenanceStatus.IN_PROGRESS
        ]
        maint_score = max(0, min(100, 100 - len(overdue) * 15 - len(in_progress) * 5))

        # Factor 3: Inspection (20%)
        recent_insp = [
            i for i in inspections if i.inspection_date >= thirty_days_ago
        ]
        if recent_insp:
            pass_count = sum(
                1 for i in recent_insp if i.result == InspectionResult.PASS
            )
            insp_score = round(pass_count / len(recent_insp) * 100)
        else:
            insp_score = 50

        # Factor 4: Satisfaction (15%) — placeholder until satisfaction agent connected
        sat_score = 75

        # Factor 5: Cost efficiency (15%)
        total_maint_cost = sum(m.cost for m in maintenance)
        total_revenue = sum(
            _estimate_monthly_revenue(f.facility_type) for f in operational
        )
        if total_maint_cost > 0:
            ratio = total_revenue / total_maint_cost
            cost_score = min(100, round(ratio * 25))
        else:
            cost_score = 80

        factors = [
            HealthFactor(
                name="Utilización", score=util_score, weight=0.25,
                detail=f"{total_occ}/{total_cap} personas hoy",
                contribution=round(util_score * 0.25, 1),
            ),
            HealthFactor(
                name="Mantenimiento", score=maint_score, weight=0.25,
                detail=f"{len(overdue)} atrasados, {len(in_progress)} en progreso",
                contribution=round(maint_score * 0.25, 1),
            ),
            HealthFactor(
                name="Inspecciones", score=insp_score, weight=0.20,
                detail=f"{len(recent_insp)} inspecciones recientes",
                contribution=round(insp_score * 0.20, 1),
            ),
            HealthFactor(
                name="Satisfacción", score=sat_score, weight=0.15,
                detail="Estimado (agente de satisfacción pendiente)",
                contribution=round(sat_score * 0.15, 1),
            ),
            HealthFactor(
                name="Eficiencia de costos", score=cost_score, weight=0.15,
                detail=f"₡{total_revenue:,.0f} revenue vs ₡{total_maint_cost:,.0f} maint/mes",
                contribution=round(cost_score * 0.15, 1),
            ),
        ]

        total_score = round(sum(f.contribution for f in factors))
        grade, level = _get_health_level(total_score)

        alerts: list[str] = []
        if overdue:
            alerts.append(f"{len(overdue)} tarea(s) de mantenimiento atrasada(s)")
        for i in inspections:
            if i.result in (InspectionResult.FAIL, InspectionResult.MAJOR_ISSUES):
                alerts.append(
                    f"{i.facility_name}: inspección con resultado {i.result.value}"
                )

        return FacilityHealthResponse(
            score=total_score, grade=grade, level=level,
            trend="stable",
            factors=factors, alerts=alerts,
            generated_at=today.isoformat(),
        )

    async def get_amenity_utilization(
        self, facility_type: FacilityType | None = None,
    ) -> AmenityUtilizationResponse:
        """Per-facility utilization analysis with time series."""
        today = datetime.now(tz=UTC)
        today_str = today.strftime("%Y-%m-%d")

        facilities = await self.list_facilities(facility_type=facility_type)
        reservations = await self.list_reservations()

        items: list[AmenityUtilizationItem] = []
        total_cap = 0
        total_occ = 0
        peak_facility = ("", 0.0)
        lowest_facility = ("", 100.0)

        for f in facilities:
            # Current occupancy from today's reservations
            today_res = [
                r for r in reservations
                if r.facility_id == f.id
                and r.date == today_str
                and r.status in (ReservationStatus.CONFIRMED, ReservationStatus.PENDING)
            ]
            current = sum(r.guest_count for r in today_res)
            util_pct = round(current / f.capacity * 100, 1) if f.capacity > 0 else 0.0

            # Peak hours from reservation patterns
            hour_counts: dict[int, int] = defaultdict(int)
            for r in reservations:
                if r.facility_id == f.id and r.status != ReservationStatus.CANCELLED:
                    start_h = int(r.start_time.split(":")[0])
                    end_h = int(r.end_time.split(":")[0])
                    for h in range(start_h, min(end_h, 24)):
                        hour_counts[h] += 1
            sorted_hours = sorted(hour_counts.items(), key=lambda x: -x[1])
            peak_hours = [f"{h:02d}:00" for h, _ in sorted_hours[:3]]

            # Time series (7-day deterministic)
            series = self._generate_utilization_series(f.id, 7)

            # Trend
            if len(series) >= 6:
                recent_avg = sum(d["utilization"] for d in series[-3:]) / 3
                older_avg = sum(d["utilization"] for d in series[:3]) / 3
                if recent_avg > older_avg + 5:
                    trend = "improving"
                elif recent_avg < older_avg - 5:
                    trend = "declining"
                else:
                    trend = "stable"
            else:
                trend = "stable"

            # Forecast
            if series:
                forecast_pct = round(
                    sum(d["utilization"] for d in series[-3:]) / 3, 1
                )
            else:
                forecast_pct = util_pct

            est_rev = _estimate_monthly_revenue(f.facility_type)

            items.append(AmenityUtilizationItem(
                facility_id=f.id, facility_name=f.name,
                facility_type=f.facility_type.value, status=f.status.value,
                current_occupancy=current, capacity=f.capacity,
                utilization_pct=util_pct, peak_hours=peak_hours,
                trend=trend, forecast_pct=forecast_pct,
                time_series=series, base_rate=f.base_rate,
                estimated_monthly_revenue=est_rev,
            ))

            total_cap += f.capacity
            total_occ += current
            if util_pct > peak_facility[1]:
                peak_facility = (f.name, util_pct)
            if f.status == FacilityStatus.OPERATIONAL and util_pct < lowest_facility[1]:
                lowest_facility = (f.name, util_pct)

        overall = round(total_occ / total_cap * 100, 1) if total_cap > 0 else 0.0

        return AmenityUtilizationResponse(
            overall_utilization_pct=overall, facilities=items,
            total_capacity=total_cap, total_occupancy=total_occ,
            peak_facility=peak_facility[0],
            lowest_facility=lowest_facility[0] if lowest_facility[1] < 100 else "",
            generated_at=today.isoformat(),
        )

    async def get_space_optimization(self) -> SpaceOptimizationResponse:
        """Cross-domain space optimization analysis."""
        today = datetime.now(tz=UTC)

        facilities = await self.list_facilities()
        maintenance = await self.list_maintenance()
        utilization = await self.get_amenity_utilization()

        suggestions: list[SpaceOptimizationSuggestion] = []
        under_count = 0
        over_count = 0

        util_map = {u.facility_id: u for u in utilization.facilities}

        for f in facilities:
            u = util_map.get(f.id)
            if not u:
                continue

            # Underutilized (< 20% average)
            if u.utilization_pct < 20 and f.status == FacilityStatus.OPERATIONAL:
                under_count += 1
                alt_use = self._suggest_alternative_use(f)
                suggestions.append(SpaceOptimizationSuggestion(
                    facility_id=f.id, facility_name=f.name,
                    suggestion_type="underutilized",
                    current_use=f.facility_type.value,
                    suggested_use=alt_use,
                    estimated_impact=f"Potencial: +₡{u.estimated_monthly_revenue * 0.3:,.0f}/mes",
                    priority="medium",
                    roi_estimate=f"{round(u.estimated_monthly_revenue * 0.3 / max(1, f.base_rate) * 100)}%",
                ))

            # Overutilized (> 85%)
            elif u.utilization_pct > 85:
                over_count += 1
                suggestions.append(SpaceOptimizationSuggestion(
                    facility_id=f.id, facility_name=f.name,
                    suggestion_type="expansion",
                    current_use=f.facility_type.value,
                    suggested_use="Expandir capacidad o agregar horarios",
                    estimated_impact=f"Reducir espera: {u.current_occupancy}/{f.capacity} actual",
                    priority="high",
                ))

            # Negative ROI
            maint_cost = sum(
                m.cost for m in maintenance
                if m.facility_id == f.id
                and m.status in (MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS)
            )
            if u.estimated_monthly_revenue > 0 and maint_cost > u.estimated_monthly_revenue * 3:
                suggestions.append(SpaceOptimizationSuggestion(
                    facility_id=f.id, facility_name=f.name,
                    suggestion_type="cost_review",
                    current_use=f.facility_type.value,
                    suggested_use="Revisar costos de mantenimiento o reasignar",
                    estimated_impact=f"₡{maint_cost:,.0f} en mantenimiento pendiente",
                    priority="high",
                    roi_estimate=f"ROI: -{round((maint_cost / u.estimated_monthly_revenue - 1) * 100)}%",
                ))

        total_savings = sum(
            float(s.estimated_impact.replace("+₡", "").replace("/mes", "").replace(",", ""))
            for s in suggestions
            if s.estimated_impact.startswith("+₡")
        )

        return SpaceOptimizationResponse(
            suggestions=suggestions,
            underutilized_count=under_count,
            overutilized_count=over_count,
            total_potential_savings=total_savings,
            generated_at=today.isoformat(),
        )

    async def get_facility_analytics(self) -> FacilityAnalyticsResponse:
        """9-dimension facility intelligence analysis."""
        today = datetime.now(tz=UTC)

        health = await self.get_facility_health()
        utilization = await self.get_amenity_utilization()
        optimization = await self.get_space_optimization()
        maintenance = await self.list_maintenance()
        inspections = await self.list_inspections()
        setups = await self.list_setups()

        # D1: Health Score
        d1 = AnalyticsDimension(
            dimension_id="D1", name="Health Score",
            score=health.score, status=_get_dimension_status(health.score),
            findings=[
                f"Score general: {health.score}/100 ({health.grade})",
                *[f"Factor {f.name}: {f.score}/100" for f in health.factors[:3]],
            ],
            recommendations=health.alerts[:2] if health.alerts
            else ["Mantener estándares actuales"],
            data={"grade": health.grade, "level": health.level},
        )

        # D2: Utilization Analysis
        avg_util = utilization.overall_utilization_pct
        d2 = AnalyticsDimension(
            dimension_id="D2", name="Utilización",
            score=min(100, round(avg_util * 1.2)),
            status=_get_dimension_status(min(100, round(avg_util * 1.2))),
            findings=[
                f"Utilización promedio: {avg_util}%",
                f"Espacio más usado: {utilization.peak_facility}",
                f"Espacio menos usado: {utilization.lowest_facility}",
            ],
            recommendations=[
                "Expandir horarios en espacios de alta demanda"
                if avg_util > 70 else
                "Evaluar consolidación de espacios subutilizados",
            ],
            data={"peak": utilization.peak_facility, "lowest": utilization.lowest_facility},
        )

        # D3: Maintenance Intelligence
        overdue = [
            m for m in maintenance
            if m.status == MaintenanceStatus.SCHEDULED
            and m.scheduled_date < today.strftime("%Y-%m-%d")
        ]
        active = [m for m in maintenance if m.status == MaintenanceStatus.IN_PROGRESS]
        total_cost = sum(m.cost for m in maintenance)
        maint_score = max(0, min(100, 100 - len(overdue) * 15 - len(active) * 5))
        d3 = AnalyticsDimension(
            dimension_id="D3", name="Mantenimiento",
            score=maint_score, status=_get_dimension_status(maint_score),
            findings=[
                f"{len(overdue)} tarea(s) atrasada(s)",
                f"{len(active)} en progreso",
                f"₡{total_cost:,.0f} en costos totales",
            ],
            recommendations=[
                f"Programar {len(overdue)} mantenimiento(s) atrasado(s) inmediatamente"
                if overdue else "Calendario de mantenimiento al día",
            ],
            data={"overdue_count": len(overdue), "total_cost": total_cost},
        )

        # D4: Space Optimization
        d4 = AnalyticsDimension(
            dimension_id="D4", name="Optimización de Espacios",
            score=max(0, 100 - len(optimization.suggestions) * 10),
            status=_get_dimension_status(max(0, 100 - len(optimization.suggestions) * 10)),
            findings=[
                f"{optimization.underutilized_count} espacio(s) subutilizado(s)",
                f"{optimization.overutilized_count} espacio(s) sobrecargado(s)",
                f"Ahorro potencial: ₡{optimization.total_potential_savings:,.0f}/mes",
            ],
            recommendations=[
                s.estimated_impact for s in optimization.suggestions[:2]
            ] or ["Espacios bien distribuidos"],
            data={"suggestions_count": len(optimization.suggestions)},
        )

        # D5: Revenue Analysis
        total_rev = sum(u.estimated_monthly_revenue for u in utilization.facilities)
        d5 = AnalyticsDimension(
            dimension_id="D5", name="Análisis de Revenue",
            score=min(100, round(total_rev / 10_000_000 * 100)) if total_rev > 0 else 30,
            status=_get_dimension_status(
                min(100, round(total_rev / 10_000_000 * 100))
            ),
            findings=[
                f"Revenue mensual estimado: ₡{total_rev:,.0f}",
                f"Costo mensual mantenimiento: ₡{total_cost:,.0f}",
                f"Neto: ₡{total_rev - total_cost:,.0f}",
            ],
            recommendations=[
                "Optimizar pricing en espacios de alta demanda"
                if total_rev > 0 else "Evaluar monetización de espacios",
            ],
            data={"total_revenue": total_rev, "total_cost": total_cost},
        )

        # D6: Compliance Status
        recent_insp = [
            i for i in inspections
            if i.inspection_date >= (today - timedelta(days=30)).strftime("%Y-%m-%d")
        ]
        fail_count = sum(
            1 for i in recent_insp
            if i.result in (InspectionResult.FAIL, InspectionResult.MAJOR_ISSUES)
        )
        compliance_score = max(0, 100 - fail_count * 25)
        d6 = AnalyticsDimension(
            dimension_id="D6", name="Cumplimiento",
            score=compliance_score, status=_get_dimension_status(compliance_score),
            findings=[
                f"{len(recent_insp)} inspecciones recientes",
                f"{fail_count} con hallazgos críticos",
            ],
            recommendations=[
                "Resolver hallazgos críticos antes de la próxima inspección"
                if fail_count > 0 else "Cumplimiento al día",
            ],
        )

        # D7: Event Readiness — OJO: el in-memory indexa dicts
        # (s["setup_date"]); acá son Pydantic (s.setup_date) — MISMA data.
        upcoming_setups = [
            s for s in setups
            if s.setup_date >= today.strftime("%Y-%m-%d")
            and s.status in (SetupStatus.PLANNED, SetupStatus.IN_PROGRESS)
        ]
        d7 = AnalyticsDimension(
            dimension_id="D7", name="Preparación de Eventos",
            score=max(40, 100 - len(upcoming_setups) * 8),
            status=_get_dimension_status(max(40, 100 - len(upcoming_setups) * 8)),
            findings=[
                f"{len(upcoming_setups)} evento(s) próximamente",
            ],
            recommendations=[
                "Confirmar setup de eventos pendientes"
                if upcoming_setups else "Sin eventos próximos",
            ],
        )

        # D8: Cross-Domain Signals
        d8 = AnalyticsDimension(
            dimension_id="D8", name="Señales Cross-Domain",
            score=70, status="saludable",
            findings=[
                "Sports: canchas deportivas cercanas a capacidad máxima",
                "Events: aumento en demanda de venues para Q3",
                "Finance: presupuesto de mantenimiento al 78%",
            ],
            recommendations=[
                "Coordinar con Sports para redirigir a facilities alternativas",
                "Preparar Salón El Dorado para temporada alta de eventos",
            ],
        )

        # D9: Predictive Insights
        d9 = AnalyticsDimension(
            dimension_id="D9", name="Insights Predictivos",
            score=65, status="saludable",
            findings=[
                "Demanda de piscina aumentará 30% en diciembre (temporada seca)",
                "Gimnasio: patrón creciente de uso matutino (+15% mes/mes)",
                "Spa: reapertura estimada en 8 días — demanda acumulada alta",
            ],
            recommendations=[
                "Preparar protocolo de control de acceso para piscina en diciembre",
                "Agregar clases matutinas de 6:00 AM en gimnasio",
                "Campaña de pre-venta para spa antes de reapertura",
            ],
        )

        cross_domain = [
            CrossDomainSignal(
                domain="sports", impact="negative", severity="medium",
                signal="Canchas deportivas al 85% — sugerir alternativas en facilities",
            ),
            CrossDomainSignal(
                domain="events", impact="positive", severity="low",
                signal="3 eventos confirmados este mes — Salón El Dorado estable",
            ),
            CrossDomainSignal(
                domain="finance", impact="neutral", severity="low",
                signal="₡2.3M en mantenimiento Q2 — dentro del presupuesto",
            ),
            CrossDomainSignal(
                domain="communications", impact="positive", severity="low",
                signal="Comunicación de cierre de Spa generó 0 quejas — buena gestión",
            ),
        ]

        dimensions = [d1, d2, d3, d4, d5, d6, d7, d8, d9]
        overall_score = round(sum(d.score for d in dimensions) / len(dimensions))
        grade, level = _get_health_level(overall_score)

        return FacilityAnalyticsResponse(
            overall_score=overall_score, overall_grade=grade,
            overall_level=level, trend="stable",
            dimensions=dimensions,
            cross_domain_signals=cross_domain,
            generated_at=today.isoformat(),
        )

    # ── Private Helpers — reproducidos del in-memory ──

    def _generate_utilization_series(
        self, facility_id: str, days: int = 7,
    ) -> list[dict[str, Any]]:
        """Deterministic utilization time series (no random)."""
        today = datetime.now(tz=UTC).date()
        seed = int(hashlib.md5(facility_id.encode()).hexdigest()[:8], 16)
        series: list[dict[str, Any]] = []
        for i in range(days, 0, -1):
            day = today - timedelta(days=i)
            day_seed = (seed + day.toordinal()) % 100
            # Map to realistic utilization (20-80 range typical)
            utilization = max(5, min(95, 20 + (day_seed % 60)))
            series.append({
                "date": day.isoformat(),
                "utilization": utilization,
                "reservations": max(1, day_seed % 15),
            })
        return series

    @staticmethod
    def _suggest_alternative_use(facility: Facility) -> str:
        """Suggest alternative use for underutilized space."""
        suggestions = {
            FacilityType.GARDEN: "Área de yoga o meditación al aire libre",
            FacilityType.LOUNGE: "Coworking lounge para miembros",
            FacilityType.BALLROOM: "Espacio multiusos para workshops",
            FacilityType.GOLF_COURSE: "Academia de golf junior",
            FacilityType.PARKING: "Área de eventos temporales",
            FacilityType.PLAYGROUND: "Espacio de actividades familiares",
        }
        return suggestions.get(
            facility.facility_type,
            f"Evaluar reasignación de {facility.facility_type.value}",
        )
