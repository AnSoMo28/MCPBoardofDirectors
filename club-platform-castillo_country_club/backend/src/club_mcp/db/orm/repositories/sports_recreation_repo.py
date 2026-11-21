"""SportsRecreationRepository async — los 7 dicts se vuelven 7 tablas.

Ola 2.1-decimocuarta (vertical sports_recreation). Contrato EXACTO
del módulo in-memory que reemplaza (club_mcp.db.repositories.
sports_recreation_repo) — mismos 40 métodos públicos (25 CRUD +
8 analytics + 7 del refactor 0042), mismas firmas, mismos Pydantic
de salida, mismo comportamiento de error (None / lista vacía — el
in-memory no define excepciones custom y el ORM tampoco las inventa).

La decimocuarta es drop-in tras el refactor 0042 (contrato
observable): el agente YA consume solo los públicos (0 privados
tocados — desacoplados en 8f0a638), así que este repo implementa
el contrato completo y el agente no cambia UN BYTE.

Mismas decisiones que las 13 verticales (§3.8..§3.8-DECIMATERCERA):
engine por inyección · session_scope transaccional · devuelve
Pydantic (SQLAlchemy no sube) · ids de la MISMA forma que el
in-memory (res_/trn_/cls_/coach_/eq_/lg_/srec_ + uuid4().hex[:8]).

Semántica literal del in-memory que se preserva:
  * create_reservation: status CONFIRMED LITERAL (el Create schema
    no trae status; el in-memory lo fija en el create).
  * create_tournament: current_participants=0 · status DRAFT
    LITERALES del create.
  * create_fitness_class: current_enrolled=0 · is_active=True
    LITERALES del create.
  * create_coaching_session: status "scheduled" STRING literal
    (no enum — el modelo lo declara str).
  * create_equipment: notes=None · last_maintenance=None literales.
  * create_league: current_round=0 · standings={} · status
    PROPOSED literales.
  * update_*: rec.update(updates) — CLAVE DESCONOCIDA se persiste en
    el in-memory pero el Pydantic la IGNORA al rehidratar; el ORM
    aplica whitelist de columnas (misma salida observable). enum →
    .value al persistir.
  * list_*: filtros por igualdad en Python sobre la tabla completa
    (chica) — MISMO orden de inserción que iterar .values().
  * analytics (F32) reproducidos compute-on-read sobre tablas:
    mismos rounds, mismos sorts (fill_rate ASC · utilization DESC ·
    urgency DESC · session_count DESC), mismas constantes
    (available_hours_per_day=14 · PEAK_MONTHS · MONTH_NAMES ·
    condition_urgency · +30/+15/+20 maintenance).
  * parse_date/status_value: delegan datetime.fromisoformat /
    enum .value — contrato del refactor 0042.

Los helpers _ev · _safe_int · _parse_date y las constantes de los
analytics se reproducen en este módulo: MISMA fuente de verdad
sobre tablas (mecánica del 0040 age_group).

created_at: el in-memory NUNCA lo persiste (el default_factory del
modelo lo regenera en cada read); el ORM lo persiste ISO Text y lo
parsea al leer — roundtrip pérdida cero, y conserva el REAL.
"""
from __future__ import annotations

import logging
from collections import defaultdict
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Any
from uuid import uuid4

from sqlalchemy import select

from club_mcp.db.orm.session import session_scope
from club_mcp.db.orm.sports_recreation_orm import (
    SportsCoachingSessionORM,
    SportsEquipmentORM,
    SportsFitnessClassORM,
    SportsLeagueORM,
    SportsRecommendationORM,
    SportsReservationORM,
    SportsTournamentORM,
)
from club_mcp.models.sports_recreation import (
    ClassEnrollmentStat,
    ClassType,
    CoachingEffectiveness,
    CoachingSession,
    CoachStat,
    CourtReservation,
    CourtUtilizationStat,
    CreateCoachingSession,
    CreateEquipment,
    CreateFitnessClass,
    CreateReservation,
    CreateSportLeague,
    CreateSportsRecommendation,
    CreateTournament,
    Equipment,
    EquipmentCondition,
    EquipmentLifecycleItem,
    FitnessClass,
    LeagueFormat,
    LeagueStatus,
    MemberSportProfile,
    ReservationStatus,
    SeasonalPattern,
    SkillLevel,
    SportLeague,
    SportPopularity,
    SportsRecommendation,
    SportType,
    Tournament,
    TournamentFormat,
    TournamentMetrics,
    TournamentStatus,
)


if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncEngine

logger = logging.getLogger(__name__)


def _gen_id(prefix: str) -> str:
    """MISMA generación que el in-memory ({prefix}_{uuid4().hex[:8]})."""
    return f"{prefix}_{uuid4().hex[:8]}"


def _ev(value: Any) -> str:
    """Enum → .value; str pasa directo (mismo borde del in-memory)."""
    return value.value if hasattr(value, "value") else str(value)


def _safe_int(value: Any, default: int = 0) -> int:
    """Cast seguro a int (mismo helper del in-memory)."""
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _parse_date(date_str: str) -> datetime | None:
    """ISO string → datetime | None (mismo helper del in-memory)."""
    try:
        return datetime.fromisoformat(date_str)
    except (ValueError, TypeError):
        return None


def _parse_iso_created(v: str | None) -> datetime:
    """created_at ISO Text → datetime (default_factory utcnow del modelo)."""
    if not v:
        return datetime.now(UTC).replace(tzinfo=None)
    try:
        return datetime.fromisoformat(v)
    except ValueError:
        return datetime.now(UTC).replace(tzinfo=None)


# ── helpers de reconstrucción (ORM → Pydantic) ──


def _reservation_from_orm(r: SportsReservationORM) -> CourtReservation:
    return CourtReservation(
        id=r.id,
        member_id=r.member_id,
        member_name=r.member_name,
        sport=SportType(r.sport),
        court_name=r.court_name,
        date=r.date,
        start_time=r.start_time,
        end_time=r.end_time,
        status=ReservationStatus(r.status),
        purpose=r.purpose,
        notes=r.notes,
        created_at=_parse_iso_created(r.created_at),
    )


def _tournament_from_orm(r: SportsTournamentORM) -> Tournament:
    return Tournament(
        id=r.id,
        name=r.name,
        sport=SportType(r.sport),
        format=TournamentFormat(r.format),
        start_date=r.start_date,
        end_date=r.end_date,
        registration_deadline=r.registration_deadline,
        max_participants=r.max_participants,
        current_participants=r.current_participants,
        venue=r.venue,
        organizer_member_id=r.organizer_member_id,
        entry_fee=r.entry_fee,
        prizes=list(r.prizes or []),
        rules=r.rules,
        status=TournamentStatus(r.status),
        created_at=_parse_iso_created(r.created_at),
    )


def _class_from_orm(r: SportsFitnessClassORM) -> FitnessClass:
    return FitnessClass(
        id=r.id,
        name=r.name,
        sport=SportType(r.sport),
        class_type=ClassType(r.class_type),
        instructor=r.instructor,
        schedule_day=r.schedule_day,
        schedule_time=r.schedule_time,
        duration_minutes=r.duration_minutes,
        max_capacity=r.max_capacity,
        location=r.location,
        skill_level=SkillLevel(r.skill_level),
        current_enrolled=r.current_enrolled,
        equipment_needed=list(r.equipment_needed or []),
        is_active=bool(r.is_active),
        created_at=_parse_iso_created(r.created_at),
    )


def _coaching_from_orm(r: SportsCoachingSessionORM) -> CoachingSession:
    return CoachingSession(
        id=r.id,
        sport=SportType(r.sport),
        coach_name=r.coach_name,
        member_id=r.member_id,
        member_name=r.member_name,
        date=r.date,
        start_time=r.start_time,
        end_time=r.end_time,
        location=r.location,
        skill_level=r.skill_level,
        focus_areas=list(r.focus_areas or []),
        notes=r.notes,
        status=r.status,
        created_at=_parse_iso_created(r.created_at),
    )


def _equipment_from_orm(r: SportsEquipmentORM) -> Equipment:
    return Equipment(
        id=r.id,
        name=r.name,
        sport=SportType(r.sport),
        location=r.location,
        total_quantity=r.total_quantity,
        available_quantity=r.available_quantity,
        condition=EquipmentCondition(r.condition),
        brand=r.brand,
        notes=r.notes,
        last_maintenance=r.last_maintenance,
        created_at=_parse_iso_created(r.created_at),
    )


def _league_from_orm(r: SportsLeagueORM) -> SportLeague:
    return SportLeague(
        id=r.id,
        name=r.name,
        sport=SportType(r.sport),
        season=r.season,
        start_date=r.start_date,
        end_date=r.end_date,
        coordinator_member_id=r.coordinator_member_id,
        max_teams=r.max_teams,
        format=LeagueFormat(r.format),
        teams=list(r.teams or []),
        current_round=r.current_round,
        standings=dict(r.standings or {}),
        status=LeagueStatus(r.status),
        created_at=_parse_iso_created(r.created_at),
    )


def _recommendation_from_orm(r: SportsRecommendationORM) -> SportsRecommendation:
    return SportsRecommendation(
        id=r.id,
        member_id=r.member_id,
        sport=SportType(r.sport),
        reason=r.reason,
        confidence_score=r.confidence_score,
        suggested_class=r.suggested_class,
        suggested_coach=r.suggested_coach,
        created_at=_parse_iso_created(r.created_at),
    )


# whitelists de columnas por entidad (update dict — clave desconocida
# se ignora en la SALIDA Pydantic aunque el in-memory la guardara en
# el dict: mismo output observable)
_RESERVATION_FIELDS = {
    "member_id", "member_name", "sport", "court_name", "date",
    "start_time", "end_time", "status", "purpose", "notes",
}
_TOURNAMENT_FIELDS = {
    "name", "sport", "format", "start_date", "end_date",
    "registration_deadline", "max_participants", "current_participants",
    "venue", "organizer_member_id", "entry_fee", "prizes", "rules",
    "status",
}
_CLASS_FIELDS = {
    "name", "sport", "class_type", "instructor", "schedule_day",
    "schedule_time", "duration_minutes", "max_capacity", "location",
    "skill_level", "current_enrolled", "equipment_needed", "is_active",
}
_COACHING_FIELDS = {
    "sport", "coach_name", "member_id", "member_name", "date",
    "start_time", "end_time", "location", "skill_level",
    "focus_areas", "notes", "status",
}
_EQUIPMENT_FIELDS = {
    "name", "sport", "location", "total_quantity", "available_quantity",
    "condition", "brand", "notes", "last_maintenance",
}
_LEAGUE_FIELDS = {
    "name", "sport", "season", "start_date", "end_date",
    "coordinator_member_id", "max_teams", "format", "teams",
    "current_round", "standings", "status",
}


def _reservation_from_orm_row(rec: dict) -> CourtReservation:
    return CourtReservation(**rec)


def _equip_recs(rows: list[SportsEquipmentORM]) -> list[dict]:
    """Filas de equipment → dicts planos (misma forma que el in-memory)."""
    return [_equipment_rec(r) for r in rows]



def _reservation_rec(r: SportsReservationORM) -> dict:
    """Registro plano de la fila — MISMA forma que el dict interno
    del in-memory (model_dump + status CONFIRMED): enums en .value."""
    return {
        "id": r.id,
        "member_id": r.member_id,
        "member_name": r.member_name,
        "sport": SportType(r.sport),
        "court_name": r.court_name,
        "date": r.date,
        "start_time": r.start_time,
        "end_time": r.end_time,
        "status": ReservationStatus(r.status),
        "purpose": r.purpose,
        "notes": r.notes,
        "created_at": _parse_iso_created(r.created_at),
    }


def _tournament_rec(r: SportsTournamentORM) -> dict:
    return {
        "id": r.id,
        "name": r.name,
        "sport": SportType(r.sport),
        "format": TournamentFormat(r.format),
        "start_date": r.start_date,
        "end_date": r.end_date,
        "registration_deadline": r.registration_deadline,
        "max_participants": r.max_participants,
        "current_participants": r.current_participants,
        "venue": r.venue,
        "organizer_member_id": r.organizer_member_id,
        "entry_fee": r.entry_fee,
        "prizes": list(r.prizes or []),
        "rules": r.rules,
        "status": TournamentStatus(r.status),
        "created_at": _parse_iso_created(r.created_at),
    }


def _class_rec(r: SportsFitnessClassORM) -> dict:
    return {
        "id": r.id,
        "name": r.name,
        "sport": SportType(r.sport),
        "class_type": ClassType(r.class_type),
        "instructor": r.instructor,
        "schedule_day": r.schedule_day,
        "schedule_time": r.schedule_time,
        "duration_minutes": r.duration_minutes,
        "max_capacity": r.max_capacity,
        "location": r.location,
        "skill_level": SkillLevel(r.skill_level),
        "current_enrolled": r.current_enrolled,
        "equipment_needed": list(r.equipment_needed or []),
        "is_active": bool(r.is_active),
        "created_at": _parse_iso_created(r.created_at),
    }


def _coaching_rec(r: SportsCoachingSessionORM) -> dict:
    return {
        "id": r.id,
        "sport": SportType(r.sport),
        "coach_name": r.coach_name,
        "member_id": r.member_id,
        "member_name": r.member_name,
        "date": r.date,
        "start_time": r.start_time,
        "end_time": r.end_time,
        "location": r.location,
        "skill_level": SkillLevel(r.skill_level),
        "focus_areas": list(r.focus_areas or []),
        "notes": r.notes,
        "status": r.status,
        "created_at": _parse_iso_created(r.created_at),
    }


def _league_rec(r: SportsLeagueORM) -> dict:
    return {
        "id": r.id,
        "name": r.name,
        "sport": SportType(r.sport),
        "season": r.season,
        "start_date": r.start_date,
        "end_date": r.end_date,
        "coordinator_member_id": r.coordinator_member_id,
        "max_teams": r.max_teams,
        "format": LeagueFormat(r.format),
        "teams": list(r.teams or []),
        "current_round": r.current_round,
        "standings": dict(r.standings or {}),
        "status": LeagueStatus(r.status),
        "created_at": _parse_iso_created(r.created_at),
    }


def _equipment_rec(r: SportsEquipmentORM) -> dict:
    return {
        "id": r.id,
        "name": r.name,
        "sport": SportType(r.sport),
        "location": r.location,
        "total_quantity": r.total_quantity,
        "available_quantity": r.available_quantity,
        "condition": EquipmentCondition(r.condition),
        "brand": r.brand,
        "notes": r.notes,
        "last_maintenance": r.last_maintenance,
        "created_at": _parse_iso_created(r.created_at),
    }


def _recommendation_rec(r: SportsRecommendationORM) -> dict:
    return {
        "id": r.id,
        "member_id": r.member_id,
        "sport": SportType(r.sport),
        "reason": r.reason,
        "confidence_score": r.confidence_score,
        "suggested_class": r.suggested_class,
        "suggested_coach": r.suggested_coach,
        "created_at": _parse_iso_created(r.created_at),
    }


class SportsRecreationRepository:
    """Repo ORM async — contrato EXACTO del in-memory (40 métodos)."""

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine

    # ── vistas del contrato observable (refactor 0042 · completadas
    #    async por el vertical — ver docstring del módulo) ─────────

    async def get_reservations_view(self) -> dict[str, dict]:
        """Copia superficial de las reservas (id → registro).

        Contrato del refactor 0042: el in-memory devolvía dict(
        self._reservations) — los dicts PLANOS del estado interno.
        El ORM reconstruye los registros desde filas: mismas claves
        (columnas), mismos valores (enums en .value como quedaban
        en el dict del in-memory tras model_dump), MISMA forma.
        """
        async with session_scope(self._engine) as s:
            rows = (await s.execute(select(SportsReservationORM))).scalars().all()
            return {r.id: _reservation_rec(r) for r in rows}

    async def get_tournaments_view(self) -> dict[str, dict]:
        """Copia superficial de los torneos (id → registro)."""
        async with session_scope(self._engine) as s:
            rows = (await s.execute(select(SportsTournamentORM))).scalars().all()
            return {r.id: _tournament_rec(r) for r in rows}

    async def get_fitness_classes_view(self) -> dict[str, dict]:
        """Copia superficial de las clases de fitness (id → registro)."""
        async with session_scope(self._engine) as s:
            rows = (await s.execute(select(SportsFitnessClassORM))).scalars().all()
            return {r.id: _class_rec(r) for r in rows}

    async def get_coaching_sessions_view(self) -> dict[str, dict]:
        """Copia superficial de las sesiones de coaching (id → registro)."""
        async with session_scope(self._engine) as s:
            rows = (await s.execute(select(SportsCoachingSessionORM))).scalars().all()
            return {r.id: _coaching_rec(r) for r in rows}

    async def get_leagues_view(self) -> dict[str, dict]:
        """Copia superficial de las ligas (id → registro)."""
        async with session_scope(self._engine) as s:
            rows = (await s.execute(select(SportsLeagueORM))).scalars().all()
            return {r.id: _league_rec(r) for r in rows}

    @staticmethod
    def status_value(value: Any) -> str:
        """Delegación observable de _ev (enum/str → str) — refactor 0042."""
        return _ev(value)

    @staticmethod
    def parse_date(date_str: str) -> datetime | None:
        """Delegación observable de _parse_date (ISO → datetime | None)."""
        return _parse_date(date_str)

    # ── Reservations ──────────────────────────────────────────────

    async def create_reservation(self, data: CreateReservation) -> CourtReservation:
        rid = _gen_id("res")
        d = data.model_dump()
        async with session_scope(self._engine) as s:
            s.add(
                SportsReservationORM(
                    id=rid,
                    member_id=d["member_id"],
                    member_name=d["member_name"],
                    sport=_ev(d["sport"]),
                    court_name=d["court_name"],
                    date=d["date"],
                    start_time=d["start_time"],
                    end_time=d["end_time"],
                    status=ReservationStatus.CONFIRMED.value,
                    purpose=_ev(d.get("purpose", "regular")),
                    notes=d.get("notes"),
                    created_at=datetime.now(UTC).replace(tzinfo=None).isoformat(),
                )
            )
        async with session_scope(self._engine) as s:
            r = await s.get(SportsReservationORM, rid)
            return _reservation_from_orm(r)

    async def get_reservation(self, reservation_id: str) -> CourtReservation | None:
        async with session_scope(self._engine) as s:
            r = await s.get(SportsReservationORM, reservation_id)
            if r is None:
                return None
            return _reservation_from_orm(r)

    async def update_reservation(
        self, reservation_id: str, updates: dict
    ) -> CourtReservation | None:
        _W = _RESERVATION_FIELDS
        async with session_scope(self._engine) as s:
            r = await s.get(SportsReservationORM, reservation_id)
            if r is None:
                return None
            for key, val in updates.items():
                if key in _W and val is not None:
                    setattr(r, key, _ev(val) if hasattr(val, "value") else val)
            await s.flush()
            return _reservation_from_orm(r)

    async def list_reservations(
        self,
        member_id: str | None = None,
        sport: SportType | None = None,
        date: str | None = None,
        status: ReservationStatus | None = None,
    ) -> list[CourtReservation]:
        results = list((await self.get_reservations_view()).values())
        if member_id:
            results = [r for r in results if r["member_id"] == member_id]
        if sport:
            results = [r for r in results if r["sport"] == _ev(sport)]
        if date:
            results = [r for r in results if r["date"] == date]
        if status:
            results = [r for r in results if r["status"] == _ev(status)]
        return [CourtReservation(**r) for r in results]

    # ── Tournaments ───────────────────────────────────────────────

    async def create_tournament(self, data: CreateTournament) -> Tournament:
        tid = _gen_id("trn")
        d = data.model_dump()
        async with session_scope(self._engine) as s:
            s.add(
                SportsTournamentORM(
                    id=tid,
                    name=d["name"],
                    sport=_ev(d["sport"]),
                    format=_ev(d["format"]),
                    start_date=d["start_date"],
                    end_date=d["end_date"],
                    registration_deadline=d["registration_deadline"],
                    max_participants=d["max_participants"],
                    current_participants=0,
                    venue=d["venue"],
                    organizer_member_id=d["organizer_member_id"],
                    entry_fee=float(d.get("entry_fee", 0.0) or 0.0),
                    prizes=list(d.get("prizes") or []),
                    rules=d.get("rules"),
                    status=TournamentStatus.DRAFT.value,
                    created_at=datetime.now(UTC).replace(tzinfo=None).isoformat(),
                )
            )
        view = await self.get_tournaments_view()
        t = view.get(tid)
        if t is None:
            return Tournament(
                name=d["name"],
                sport=d["sport"],
                format=d["format"],
                start_date=d["start_date"],
                end_date=d["end_date"],
                registration_deadline=d["registration_deadline"],
                max_participants=d["max_participants"],
                venue=d["venue"],
                organizer_member_id=d["organizer_member_id"],
            )
        return Tournament(**t)

    async def get_tournament(self, tournament_id: str) -> Tournament | None:
        async with session_scope(self._engine) as s:
            r = await s.get(SportsTournamentORM, tournament_id)
            if r is None:
                return None
            return _tournament_from_orm(r)

    async def update_tournament(
        self, tournament_id: str, updates: dict
    ) -> Tournament | None:
        _W = _TOURNAMENT_FIELDS
        async with session_scope(self._engine) as s:
            r = await s.get(SportsTournamentORM, tournament_id)
            if r is None:
                return None
            for key, val in updates.items():
                if key in _W and val is not None:
                    v = val.value if hasattr(val, "value") else val
                    if key == "prizes":
                        v = list(v)
                    setattr(r, key, v)
            await s.flush()
            return _tournament_from_orm(r)

    async def list_tournaments(
        self,
        sport: SportType | None = None,
        status: TournamentStatus | None = None,
    ) -> list[Tournament]:
        results = list((await self.get_tournaments_view()).values())
        if sport:
            results = [t for t in results if t["sport"] == _ev(sport)]
        if status:
            results = [t for t in results if t["status"] == _ev(status)]
        return [Tournament(**t) for t in results]

    # ── Fitness Classes ────────────────────────────────────────────

    async def create_fitness_class(self, data: CreateFitnessClass) -> FitnessClass:
        cid = _gen_id("cls")
        d = data.model_dump()
        async with session_scope(self._engine) as s:
            s.add(
                SportsFitnessClassORM(
                    id=cid,
                    name=d["name"],
                    sport=_ev(d["sport"]),
                    class_type=_ev(d["class_type"]),
                    instructor=d["instructor"],
                    schedule_day=d["schedule_day"],
                    schedule_time=d["schedule_time"],
                    duration_minutes=d["duration_minutes"],
                    max_capacity=d["max_capacity"],
                    location=d["location"],
                    skill_level=_ev(d.get("skill_level", "all_levels")),
                    current_enrolled=0,
                    equipment_needed=list(d.get("equipment_needed") or []),
                    is_active=1,
                    created_at=datetime.now(UTC).replace(tzinfo=None).isoformat(),
                )
            )
        view = await self.get_fitness_classes_view()
        c = view.get(cid)
        if c is None:
            return FitnessClass(
                name=d["name"],
                sport=d["sport"],
                class_type=d["class_type"],
                instructor=d["instructor"],
                schedule_day=d["schedule_day"],
                schedule_time=d["schedule_time"],
                duration_minutes=d["duration_minutes"],
                max_capacity=d["max_capacity"],
                location=d["location"],
            )
        return FitnessClass(**c)

    async def get_fitness_class(self, class_id: str) -> FitnessClass | None:
        async with session_scope(self._engine) as s:
            r = await s.get(SportsFitnessClassORM, class_id)
            if r is None:
                return None
            return _class_from_orm(r)

    async def update_fitness_class(
        self, class_id: str, updates: dict
    ) -> FitnessClass | None:
        _W = _CLASS_FIELDS
        async with session_scope(self._engine) as s:
            r = await s.get(SportsFitnessClassORM, class_id)
            if r is None:
                return None
            for key, val in updates.items():
                if key in _W and val is not None:
                    v = val.value if hasattr(val, "value") else val
                    if key == "equipment_needed":
                        v = list(v)
                    if key == "is_active":
                        v = 1 if v else 0
                    setattr(r, key, v)
            await s.flush()
            return _class_from_orm(r)

    async def list_fitness_classes(
        self,
        sport: SportType | None = None,
        class_type: ClassType | None = None,
        active_only: bool = False,
    ) -> list[FitnessClass]:
        results = list((await self.get_fitness_classes_view()).values())
        if sport:
            results = [c for c in results if c["sport"] == _ev(sport)]
        if class_type:
            results = [c for c in results if c["class_type"] == _ev(class_type)]
        if active_only:
            results = [c for c in results if c.get("is_active", True)]
        return [FitnessClass(**c) for c in results]

    # ── Coaching Sessions ─────────────────────────────────────────

    async def create_coaching_session(
        self, data: CreateCoachingSession
    ) -> CoachingSession:
        sid = _gen_id("coach")
        d = data.model_dump()
        async with session_scope(self._engine) as s:
            s.add(
                SportsCoachingSessionORM(
                    id=sid,
                    sport=_ev(d["sport"]),
                    coach_name=d["coach_name"],
                    member_id=d["member_id"],
                    member_name=d["member_name"],
                    date=d["date"],
                    start_time=d["start_time"],
                    end_time=d["end_time"],
                    location=d["location"],
                    skill_level=_ev(d.get("skill_level", "beginner")),
                    focus_areas=list(d.get("focus_areas") or []),
                    notes=d.get("notes"),
                    status="scheduled",
                    created_at=datetime.now(UTC).replace(tzinfo=None).isoformat(),
                )
            )
        view = await self.get_coaching_sessions_view()
        c = view.get(sid)
        if c is None:
            return CoachingSession(
                sport=d["sport"],
                coach_name=d["coach_name"],
                member_id=d["member_id"],
                member_name=d["member_name"],
                date=d["date"],
                start_time=d["start_time"],
                end_time=d["end_time"],
                location=d["location"],
            )
        return CoachingSession(**c)

    async def get_coaching_session(
        self, session_id: str
    ) -> CoachingSession | None:
        async with session_scope(self._engine) as s:
            r = await s.get(SportsCoachingSessionORM, session_id)
            if r is None:
                return None
            return _coaching_from_orm(r)

    async def list_coaching_sessions(
        self,
        member_id: str | None = None,
        coach_name: str | None = None,
        sport: SportType | None = None,
    ) -> list[CoachingSession]:
        results = list((await self.get_coaching_sessions_view()).values())
        if member_id:
            results = [s for s in results if s["member_id"] == member_id]
        if coach_name:
            results = [s for s in results if s["coach_name"] == coach_name]
        if sport:
            results = [s for s in results if s["sport"] == _ev(sport)]
        return [CoachingSession(**s) for s in results]

    # ── Equipment ─────────────────────────────────────────────────

    async def create_equipment(self, data: CreateEquipment) -> Equipment:
        eid = _gen_id("eq")
        d = data.model_dump()
        async with session_scope(self._engine) as s:
            s.add(
                SportsEquipmentORM(
                    id=eid,
                    name=d["name"],
                    sport=_ev(d["sport"]),
                    location=d["location"],
                    total_quantity=d["total_quantity"],
                    available_quantity=d["available_quantity"],
                    condition=_ev(d.get("condition", "good")),
                    brand=d.get("brand"),
                    notes=None,
                    last_maintenance=None,
                    created_at=datetime.now(UTC).replace(tzinfo=None).isoformat(),
                )
            )
        async with session_scope(self._engine) as s:
            r = await s.get(SportsEquipmentORM, eid)
            return _equipment_from_orm(r)

    async def get_equipment(self, equipment_id: str) -> Equipment | None:
        async with session_scope(self._engine) as s:
            r = await s.get(SportsEquipmentORM, equipment_id)
            if r is None:
                return None
            return _equipment_from_orm(r)

    async def update_equipment(
        self, equipment_id: str, updates: dict
    ) -> Equipment | None:
        _W = _EQUIPMENT_FIELDS
        async with session_scope(self._engine) as s:
            r = await s.get(SportsEquipmentORM, equipment_id)
            if r is None:
                return None
            for key, val in updates.items():
                if key in _W and val is not None:
                    setattr(r, key, _ev(val) if hasattr(val, "value") else val)
            await s.flush()
            return _equipment_from_orm(r)

    async def list_equipment(
        self,
        sport: SportType | None = None,
        location: str | None = None,
    ) -> list[Equipment]:
        results = list(_equip_recs(await self._equipment_rows()))
        if sport:
            results = [e for e in results if e["sport"] == _ev(sport)]
        if location:
            results = [e for e in results if e["location"] == location]
        return [Equipment(**e) for e in results]

    # ── Leagues ───────────────────────────────────────────────────

    async def create_league(self, data: CreateSportLeague) -> SportLeague:
        lid = _gen_id("lg")
        d = data.model_dump()
        async with session_scope(self._engine) as s:
            s.add(
                SportsLeagueORM(
                    id=lid,
                    name=d["name"],
                    sport=_ev(d["sport"]),
                    season=d["season"],
                    start_date=d["start_date"],
                    end_date=d["end_date"],
                    coordinator_member_id=d["coordinator_member_id"],
                    max_teams=d["max_teams"],
                    format=_ev(d.get("format", "round_robin")),
                    teams=list(d.get("teams") or []),
                    current_round=0,
                    standings={},
                    status=LeagueStatus.PROPOSED.value,
                    created_at=datetime.now(UTC).replace(tzinfo=None).isoformat(),
                )
            )
        view = await self.get_leagues_view()
        l = view.get(lid)
        if l is None:
            return SportLeague(
                name=d["name"],
                sport=d["sport"],
                season=d["season"],
                start_date=d["start_date"],
                end_date=d["end_date"],
                coordinator_member_id=d["coordinator_member_id"],
                max_teams=d["max_teams"],
            )
        return SportLeague(**l)

    async def get_league(self, league_id: str) -> SportLeague | None:
        async with session_scope(self._engine) as s:
            r = await s.get(SportsLeagueORM, league_id)
            if r is None:
                return None
            return _league_from_orm(r)

    async def update_league(
        self, league_id: str, updates: dict
    ) -> SportLeague | None:
        _W = _LEAGUE_FIELDS
        async with session_scope(self._engine) as s:
            r = await s.get(SportsLeagueORM, league_id)
            if r is None:
                return None
            for key, val in updates.items():
                if key in _W and val is not None:
                    v = val.value if hasattr(val, "value") else val
                    if key in ("teams",):
                        v = list(v)
                    if key == "standings":
                        v = dict(v)
                    setattr(r, key, v)
            await s.flush()
            return _league_from_orm(r)

    async def list_leagues(
        self,
        sport: SportType | None = None,
        status: LeagueStatus | None = None,
    ) -> list[SportLeague]:
        results = list((await self.get_leagues_view()).values())
        if sport:
            results = [l for l in results if l["sport"] == _ev(sport)]
        if status:
            results = [l for l in results if l["status"] == _ev(status)]
        return [SportLeague(**l) for l in results]

    # ── Recommendations ────────────────────────────────────────────

    async def create_recommendation(
        self, data: CreateSportsRecommendation
    ) -> SportsRecommendation:
        rid = _gen_id("srec")
        d = data.model_dump()
        async with session_scope(self._engine) as s:
            s.add(
                SportsRecommendationORM(
                    id=rid,
                    member_id=d["member_id"],
                    sport=_ev(d["sport"]),
                    reason=d["reason"],
                    confidence_score=float(d.get("confidence_score", 0.8) or 0.8),
                    suggested_class=d.get("suggested_class"),
                    suggested_coach=d.get("suggested_coach"),
                    created_at=datetime.now(UTC).replace(tzinfo=None).isoformat(),
                )
            )
        async with session_scope(self._engine) as s:
            r = await s.get(SportsRecommendationORM, rid)
            return _recommendation_from_orm(r)

    async def list_recommendations(
        self,
        member_id: str | None = None,
        sport: SportType | None = None,
    ) -> list[SportsRecommendation]:
        results = [
            _recommendation_rec(r)
            for r in await self._recommendation_rows_list()
        ]
        if member_id:
            results = [r for r in results if r["member_id"] == member_id]
        if sport:
            results = [r for r in results if r["sport"] == _ev(sport)]
        return [SportsRecommendation(**r) for r in results]

    # ── Intelligence Aggregation Methods (F32) — compute-on-read ──

    async def _equipment_rows(self) -> list[SportsEquipmentORM]:
        async with session_scope(self._engine) as s:
            return list((await s.execute(select(SportsEquipmentORM))).scalars().all())

    async def _equipment_rows_list(self) -> list[SportsEquipmentORM]:
        return await self._equipment_rows()

    async def _recommendation_rows(self) -> dict[str, SportsRecommendationORM]:
        async with session_scope(self._engine) as s:
            rows = (await s.execute(select(SportsRecommendationORM))).scalars().all()
            return {r.id: r for r in rows}

    async def _recommendation_rows_list(self) -> list[SportsRecommendationORM]:
        async with session_scope(self._engine) as s:
            return list((await s.execute(select(SportsRecommendationORM))).scalars().all())

    async def get_sport_popularity(self) -> list[SportPopularity]:
        """Rank deportes por actividad total — misma aritmética F32."""
        counts: dict[str, dict[str, int]] = defaultdict(
            lambda: {"reservation": 0, "class": 0, "tournament": 0, "coaching": 0}
        )

        for r in (await self.get_reservations_view()).values():
            if _ev(r.get("status")) == "cancelled":
                continue
            counts[_ev(r["sport"])]["reservation"] += 1

        for c in (await self.get_fitness_classes_view()).values():
            if not c.get("is_active", True):
                continue
            counts[_ev(c["sport"])]["class"] += 1

        for t in (await self.get_tournaments_view()).values():
            counts[_ev(t["sport"])]["tournament"] += 1

        for s_ in (await self.get_coaching_sessions_view()).values():
            counts[_ev(s_["sport"])]["coaching"] += 1

        total_activity = max(1, sum(sum(c.values()) for c in counts.values()))

        result: list[SportPopularity] = []
        for sport_val, breakdown in counts.items():
            sport_total = sum(breakdown.values())
            try:
                sport_enum = SportType(sport_val)
            except ValueError:
                continue
            result.append(
                SportPopularity(
                    sport=sport_enum,
                    total_activity=sport_total,
                    reservation_count=breakdown["reservation"],
                    class_count=breakdown["class"],
                    tournament_count=breakdown["tournament"],
                    coaching_count=breakdown["coaching"],
                    activity_share_pct=round(sport_total / total_activity * 100, 1),
                    popularity_rank=0,
                )
            )

        result.sort(key=lambda x: x.total_activity, reverse=True)
        for idx, item in enumerate(result):
            item.popularity_rank = idx + 1

        return result

    async def get_court_utilization(
        self, lookback_days: int = 30
    ) -> list[CourtUtilizationStat]:
        """Utilización por cancha — misma aritmética F32 sobre filas."""
        now = datetime.now(UTC).replace(tzinfo=None)
        cutoff_ts = (now - timedelta(days=lookback_days)).timestamp()

        court_data: dict[str, dict[str, Any]] = defaultdict(
            lambda: {"sport": None, "booked_hours": 0, "bookings": []}
        )

        for r in (await self.get_reservations_view()).values():
            if _ev(r.get("status")) == "cancelled":
                continue
            res_dt = _parse_date(r["date"])
            if res_dt is None or res_dt.timestamp() < cutoff_ts:
                continue

            court = r["court_name"]
            court_data[court]["sport"] = r["sport"]
            court_data[court]["bookings"].append(r)

            start_parts = r.get("start_time", "0:00").split(":")
            end_parts = r.get("end_time", "0:00").split(":")
            start_min = int(start_parts[0]) * 60 + int(start_parts[1]) if len(start_parts) >= 2 else 0
            end_min = int(end_parts[0]) * 60 + int(end_parts[1]) if len(end_parts) >= 2 else 0
            hours = max(0, (end_min - start_min) / 60)
            court_data[court]["booked_hours"] += hours

        available_hours_per_day = 14  # 7am–9pm
        total_available = available_hours_per_day * lookback_days

        result: list[CourtUtilizationStat] = []
        for court_name, data in court_data.items():
            booked = data["booked_hours"]
            util_pct = round(booked / total_available * 100, 1) if total_available > 0 else 0.0

            hour_counts: dict[str, int] = defaultdict(int)
            for b in data["bookings"]:
                h = b.get("start_time", "0:00").split(":")[0]
                hour_counts[f"{h}:00"] += 1

            peak = sorted(hour_counts.items(), key=lambda x: x[1], reverse=True)[:3]
            peak_hours = [h[0] for h in peak]
            avg_daily = round(booked / lookback_days, 1) if lookback_days > 0 else 0.0

            result.append(
                CourtUtilizationStat(
                    court_name=court_name,
                    sport=data["sport"],
                    total_slots=total_available,
                    booked_slots=int(booked),
                    utilization_pct=util_pct,
                    peak_hours=peak_hours,
                    avg_daily_bookings=avg_daily,
                    trend="stable",
                )
            )

        result.sort(key=lambda x: x.utilization_pct, reverse=True)
        return result

    async def get_class_enrollment_stats(self) -> list[ClassEnrollmentStat]:
        """Fill rate de clases activas — misma aritmética F32."""
        result: list[ClassEnrollmentStat] = []

        for c in (await self.get_fitness_classes_view()).values():
            if not c.get("is_active", True):
                continue

            enrolled = _safe_int(c.get("current_enrolled", 0))
            capacity = max(1, _safe_int(c.get("max_capacity", 1)))
            fill_rate = round(enrolled / capacity * 100, 1)

            result.append(
                ClassEnrollmentStat(
                    class_id=c["id"],
                    name=c["name"],
                    sport=c["sport"],
                    class_type=c["class_type"],
                    enrolled=enrolled,
                    capacity=capacity,
                    fill_rate_pct=fill_rate,
                    is_underperforming=fill_rate < 40,
                    instructor=c.get("instructor", ""),
                    schedule_day=c.get("schedule_day", ""),
                )
            )

        result.sort(key=lambda x: x.fill_rate_pct)
        return result

    async def get_tournament_metrics(self) -> TournamentMetrics:
        """Métricas de torneos — misma aritmética F32."""
        tournaments = list((await self.get_tournaments_view()).values())

        if not tournaments:
            return TournamentMetrics()

        by_status: dict[str, int] = {}
        total_participation_ratio = 0.0
        total_revenue = 0.0
        upcoming = 0
        in_progress = 0
        completed = 0
        total_entry_fees = 0.0
        count_with_participants = 0

        for t in tournaments:
            status_val = _ev(t.get("status", "draft"))
            by_status[status_val] = by_status.get(status_val, 0) + 1

            max_p = max(1, _safe_int(t.get("max_participants", 0)))
            cur_p = _safe_int(t.get("current_participants", 0))
            fee = float(t.get("entry_fee", 0) or 0)

            total_participation_ratio += cur_p / max_p
            count_with_participants += 1
            total_revenue += cur_p * fee
            total_entry_fees += fee

            if status_val in ("registration_open", "confirmed", "draft"):
                upcoming += 1
            elif status_val == "in_progress":
                in_progress += 1
            elif status_val == "completed":
                completed += 1

        avg_participation = (
            round(total_participation_ratio / count_with_participants * 100, 1)
            if count_with_participants > 0
            else 0.0
        )

        return TournamentMetrics(
            total_tournaments=len(tournaments),
            by_status=by_status,
            avg_participation_rate=avg_participation,
            total_revenue=round(total_revenue, 2),
            upcoming_count=upcoming,
            in_progress_count=in_progress,
            completed_count=completed,
            avg_entry_fee=round(total_entry_fees / len(tournaments), 2) if tournaments else 0.0,
        )

    async def get_equipment_lifecycle(self) -> list[EquipmentLifecycleItem]:
        """Urgencia de reemplazo/mantenimiento — misma aritmética F32."""
        condition_urgency: dict[str, int] = {
            EquipmentCondition.NEW.value: 0,
            EquipmentCondition.GOOD.value: 10,
            EquipmentCondition.FAIR.value: 40,
            EquipmentCondition.NEEDS_REPAIR.value: 80,
            EquipmentCondition.RETIRED.value: 100,
        }

        result: list[EquipmentLifecycleItem] = []

        for e in _equip_recs(await self._equipment_rows()):
            cond = e.get("condition", EquipmentCondition.GOOD)
            cond_val = _ev(cond)
            try:
                condition_enum = EquipmentCondition(cond_val)
            except ValueError:
                condition_enum = EquipmentCondition.GOOD

            base_urgency = condition_urgency.get(cond_val, 10)

            days_since: int | None = None
            maintenance_str = e.get("last_maintenance")
            if maintenance_str:
                last_dt = _parse_date(maintenance_str)
                if last_dt is not None:
                    days_since = (datetime.now(UTC).replace(tzinfo=None) - last_dt).days
                    if days_since > 365:
                        base_urgency = min(100, base_urgency + 30)
                    elif days_since > 180:
                        base_urgency = min(100, base_urgency + 15)

            total_qty = max(1, _safe_int(e.get("total_quantity", 1)))
            avail_qty = _safe_int(e.get("available_quantity", 0))
            if avail_qty / total_qty < 0.2:
                base_urgency = min(100, base_urgency + 20)

            if base_urgency >= 80:
                action = "replace_urgent"
            elif base_urgency >= 60:
                action = "replace_soon"
            elif base_urgency >= 35:
                action = "schedule_maintenance"
            else:
                action = "ok"

            result.append(
                EquipmentLifecycleItem(
                    equipment_id=e["id"],
                    name=e["name"],
                    sport=e["sport"],
                    condition=condition_enum,
                    urgency_score=float(base_urgency),
                    needs_attention=base_urgency >= 35,
                    days_since_maintenance=days_since,
                    recommended_action=action,
                )
            )

        result.sort(key=lambda x: x.urgency_score, reverse=True)
        return result

    async def get_coaching_effectiveness(self) -> CoachingEffectiveness:
        """Estadísticas por coach — misma aritmética F32."""
        sessions = list((await self.get_coaching_sessions_view()).values())

        if not sessions:
            return CoachingEffectiveness()

        coach_data: dict[str, dict[str, Any]] = defaultdict(
            lambda: {"session_count": 0, "members": set(), "sports": defaultdict(int)}
        )

        all_members: set[str] = set()

        for s_ in sessions:
            coach = s_.get("coach_name", "Unknown")
            member = s_.get("member_id", "")
            sport_val = _ev(s_.get("sport", ""))

            coach_data[coach]["session_count"] += 1
            coach_data[coach]["members"].add(member)
            coach_data[coach]["sports"][sport_val] += 1
            all_members.add(member)

        coaches: list[CoachStat] = []
        top_coach: str | None = None
        max_sessions = 0

        for name, data in coach_data.items():
            member_count = len(data["members"])
            pop_sports = sorted(
                data["sports"].items(), key=lambda x: x[1], reverse=True
            )[:3]

            coaches.append(
                CoachStat(
                    name=name,
                    session_count=data["session_count"],
                    unique_members=member_count,
                    popular_sports=[sp[0] for sp in pop_sports],
                    avg_sessions_per_member=(
                        round(data["session_count"] / member_count, 1)
                        if member_count > 0
                        else 0.0
                    ),
                )
            )

            if data["session_count"] > max_sessions:
                max_sessions = data["session_count"]
                top_coach = name

        coaches.sort(key=lambda x: x.session_count, reverse=True)
        unique_count = len(all_members)

        return CoachingEffectiveness(
            coaches=coaches,
            total_sessions=len(sessions),
            avg_sessions_per_member=(
                round(len(sessions) / unique_count, 1) if unique_count > 0 else 0.0
            ),
            unique_members_coached=unique_count,
            top_coach=top_coach,
        )

    async def get_seasonal_patterns(self) -> list[SeasonalPattern]:
        """Distribución mensual con contexto estacional CR — misma F32."""
        MONTH_NAMES = [
            "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre",
        ]
        PEAK_MONTHS = {12, 1, 2, 3, 4}

        monthly: dict[int, dict[str, Any]] = defaultdict(
            lambda: {"reservation": 0, "class": 0, "tournament": 0, "sports": defaultdict(int)}
        )

        for r in (await self.get_reservations_view()).values():
            dt = _parse_date(r.get("date", ""))
            if dt is not None:
                m = dt.month
                monthly[m]["reservation"] += 1
                monthly[m]["sports"][_ev(r["sport"])] += 1

        for c in (await self.get_fitness_classes_view()).values():
            if not c.get("is_active", True):
                continue
            sport_val = _ev(c["sport"])
            for m in range(1, 13):
                monthly[m]["class"] += 4
                monthly[m]["sports"][sport_val] += 4

        for t in (await self.get_tournaments_view()).values():
            dt = _parse_date(t.get("start_date", ""))
            if dt is not None:
                m = dt.month
                monthly[m]["tournament"] += 1
                monthly[m]["sports"][_ev(t["sport"])] += 1

        result: list[SeasonalPattern] = []
        for m in range(1, 13):
            data = monthly[m]
            total = data["reservation"] + data["class"] + data["tournament"]
            dominant = None
            if data["sports"]:
                dominant = max(data["sports"].items(), key=lambda x: x[1])[0]

            result.append(
                SeasonalPattern(
                    month=m,
                    month_name=MONTH_NAMES[m],
                    activity_count=total,
                    dominant_sport=dominant,
                    is_peak_season=m in PEAK_MONTHS,
                    reservation_count=data["reservation"],
                    class_count=data["class"],
                    tournament_count=data["tournament"],
                )
            )

        return result

    async def get_member_sport_profile(self, member_id: str) -> MemberSportProfile:
        """Perfil deportivo del socio — misma aritmética F32."""
        sports_played: set[str] = set()
        total_sessions = 0
        sport_counts: dict[str, int] = defaultdict(int)
        coaching_count = 0
        active_reservations = 0
        skill_levels: dict[str, str] = {}

        for r in (await self.get_reservations_view()).values():
            if r.get("member_id") != member_id:
                continue
            sport_val = _ev(r["sport"])
            sports_played.add(sport_val)
            sport_counts[sport_val] += 1
            total_sessions += 1
            if _ev(r.get("status")) in ("confirmed", "pending"):
                active_reservations += 1

        for s_ in (await self.get_coaching_sessions_view()).values():
            if s_.get("member_id") != member_id:
                continue
            sport_val = _ev(s_["sport"])
            sports_played.add(sport_val)
            sport_counts[sport_val] += 1
            total_sessions += 1
            coaching_count += 1
            sl = s_.get("skill_level")
            if sl:
                skill_levels[sport_val] = _ev(sl)

        for rec in [
            _recommendation_rec(r)
            for r in await self._recommendation_rows_list()
        ]:
            if rec.get("member_id") != member_id:
                continue
            sports_played.add(_ev(rec["sport"]))

        favorite = max(sport_counts.items(), key=lambda x: x[1])[0] if sport_counts else None

        return MemberSportProfile(
            member_id=member_id,
            sports_played=sorted(sports_played),
            total_sessions=total_sessions,
            favorite_sport=favorite,
            coaching_sessions=coaching_count,
            tournament_participations=0,
            active_reservations=active_reservations,
            skill_levels=skill_levels,
        )
