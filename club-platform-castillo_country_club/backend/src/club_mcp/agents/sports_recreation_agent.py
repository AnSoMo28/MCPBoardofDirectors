"""
SportsRecreationAgent: Gestión de deportes y recreación.
Club: Castillo Country Club

TOOLS:
  manage_court_reservations  🟢 AUTO        Reservar/cancelar canchas (🔴 HITL si bloquea para torneo)
  organize_tournament        🔴 HITL        Crear torneos deportivos
  manage_fitness_classes     🟢 AUTO        Clases de fitness y grupales
  coordinate_coaching        🟢 AUTO        Sesiones de coaching privadas
  manage_sport_leagues       🔴 HITL        Crear y gestionar ligas deportivas
  get_equipment_availability 🟢 AUTO        Disponibilidad de equipamiento
  get_sports_recommendations 🟢 AUTO        Recomendaciones personalizadas
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from club_mcp.agents.base import BaseAgent, MCPTool
from club_mcp.db.repositories.sports_recreation_repo import (
    SportsRecreationRepository,
)
from club_mcp.hitl.approval_types import ApprovalLevel
from club_mcp.models.sports_recreation import (
    CalendarItemType,
    ClassType,
    CreateCoachingSession,
    CreateEquipment,
    CreateFitnessClass,
    CreateReservation,
    CreateSportLeague,
    CreateSportsRecommendation,
    CreateTournament,
    EquipmentCondition,
    LeagueFormat,
    SkillLevel,
    SportsAnalytics,
    SportsCalendarItem,
    SportsHealthFactor,
    SportsHealthSummary,
    SportsProposal,
    SportType,
    TournamentFormat,
    TournamentStatus,
)

logger = logging.getLogger(__name__)


# backend/src/club_mcp/agents/sports_recreation_agent.py

# backend/src/club_mcp/agents/sports_recreation_agent.py — SOLO CAMBIAR EL CONSTRUCTOR

class SportsRecreationAgent(BaseAgent):
    """
    Agente de deportes y recreación de Castillo Country Club.
    Gestiona canchas, torneos, clases, coaching, ligas y equipamiento.
    """

    agent_name: str = "sports_recreation"
    description: str = "Gestión de deportes y recreación"

    def __init__(self, repo=None, approval_engine=None, notifier=None) -> None:
        super().__init__()
        self.repo = repo or SportsRecreationRepository()
        if approval_engine is not None:
            self.approval_engine = approval_engine
        self.notifier = notifier

    def _register_tools(self) -> None:
        pass



    # ──────────────────────────────────────────────────
    # 🟢 TOOL: MANAGE COURT RESERVATIONS (AUTO / HITL)
    # ──────────────────────────────────────────────────

    @MCPTool(
        name="manage_court_reservations",
        description=(
            "Crear o cancelar reservaciones de canchas deportivas. "
            "Ejecución directa para socios regulares. "
            "Requiere aprobación humana cuando se bloquean canchas para torneos."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def manage_court_reservations(
        self,
        action: str = "create",
        court_name: str = "",
        sport: str = "tennis",
        member_id: str = "",
        member_name: str = "",
        date: str = "",
        start_time: str = "",
        end_time: str = "",
        purpose: str = "regular",
        reservation_id: str = "",
        notes: str = "",
        requested_by: str = "system",
    ) -> dict[str, Any]:
        # ── Cancel reservation ──
        if action == "cancel":
            if not reservation_id:
                return {
                    "status": "error",
                    "message": "Se requiere reservation_id para cancelar 🤔",
                }

            res = await self.repo.get_reservation(reservation_id)
            if not res:
                return {
                    "status": "not_found",
                    "message": f"No encontramos la reserva {reservation_id} 😊",
                }

            updated = await self.repo.update_reservation(
                reservation_id, {"status": "cancelled"}
            )
            return {
                "status": "success",
                "message": (
                    f"🎾 La reserva de {res.court_name} el {res.date} "
                    f"ha sido cancelada exitosamente."
                ),
                "reservation": updated.model_dump(mode="json"),
            }

        # ── Create reservation ──
        if not all([court_name, member_id, member_name, date, start_time, end_time]):
            return {
                "status": "error",
                "message": (
                    "Faltan campos obligatorios: court_name, member_id, "
                    "member_name, date, start_time, end_time 📋"
                ),
            }

        try:
            sport_type = SportType(sport)
        except ValueError:
            return {
                "status": "error",
                "message": (
                    f"Deporte no válido: '{sport}'. "
                    f"Opciones: {', '.join(s.value for s in SportType)}"
                ),
            }

        # ── Tournament court block → HITL ──
        if purpose == "tournament_block":
            approval = await self.approval_engine.create_request(
                agent=self.agent_name,
                tool="manage_court_reservations",
                params={
                    "action": "create",
                    "court_name": court_name,
                    "sport": sport,
                    "member_id": member_id,
                    "member_name": member_name,
                    "date": date,
                    "start_time": start_time,
                    "end_time": end_time,
                    "purpose": purpose,
                    "notes": notes,
                },
                requested_by=requested_by,
                approval_level=ApprovalLevel.HITL,
                risk_summary=(
                    f"Bloqueo de cancha para torneo: {court_name} "
                    f"el {date} ({start_time}–{end_time})"
                ),
                estimated_impact="Cancha no disponible para reservas regulares",
                affected_count=1,
                approver_roles=["admin"],
            )

            logger.info(
                "[sports_recreation] Court block approval request: %s on %s",
                court_name,
                date,
            )

            return {
                "status": "pending_approval",
                "request_id": str(approval.request_id),
                "message": (
                    f"🏟️ El bloqueo de {court_name} para torneo el {date} "
                    f"requiere aprobación del administrador."
                ),
                "details": {
                    "court_name": court_name,
                    "sport": sport,
                    "date": date,
                    "start_time": start_time,
                    "end_time": end_time,
                    "purpose": purpose,
                },
            }

        # ── Regular reservation → AUTO ──
        data = CreateReservation(
            court_name=court_name,
            sport=sport_type,
            member_id=member_id,
            member_name=member_name,
            date=date,
            start_time=start_time,
            end_time=end_time,
            purpose=purpose,
            notes=notes or None,
        )
        reservation = await self.repo.create_reservation(data)

        logger.info(
            "[sports_recreation] Reservation created: %s for %s on %s",
            court_name,
            member_name,
            date,
        )

        return {
            "status": "success",
            "message": (
                f"🎾 Cancha {reservation.court_name} reservada para "
                f"{member_name} el {date} ({start_time}–{end_time})."
            ),
            "reservation": reservation.model_dump(mode="json"),
        }

    # ── INTERNAL: Execute court block after HITL approval ──

    async def execute_court_reservation_block(
        self,
        court_name: str,
        sport: str,
        member_id: str,
        member_name: str,
        date: str,
        start_time: str,
        end_time: str,
        purpose: str = "tournament_block",
        notes: str = "",
    ) -> dict[str, Any]:
        """Ejecuta el bloqueo de cancha después de la aprobación HITL."""
        sport_type = SportType(sport)
        data = CreateReservation(
            court_name=court_name,
            sport=sport_type,
            member_id=member_id,
            member_name=member_name,
            date=date,
            start_time=start_time,
            end_time=end_time,
            purpose=purpose,
            notes=notes or None,
        )
        reservation = await self.repo.create_reservation(data)

        logger.info(
            "[sports_recreation] Court block approved: %s on %s",
            court_name,
            date,
        )

        return {
            "status": "success",
            "message": (
                f"🏟️ Bloqueo de {court_name} aprobado y confirmado "
                f"para el {date}."
            ),
            "reservation": reservation.model_dump(mode="json"),
        }

    # ──────────────────────────────────────────────────
    # 🔴 TOOL: ORGANIZE TOURNAMENT (HITL)
    # ──────────────────────────────────────────────────

    @MCPTool(
        name="organize_tournament",
        description=(
            "Crea y organiza un torneo deportivo. "
            "REQUIERE APROBACIÓN HUMANA. "
            "Usar cuando un socio u organización quiere realizar un torneo."
        ),
        approval=ApprovalLevel.HITL,
        approver_roles=["admin"],
    )
    async def organize_tournament(
        self,
        name: str = "",
        sport: str = "tennis",
        format: str = "single_elimination",
        start_date: str = "",
        end_date: str = "",
        registration_deadline: str = "",
        max_participants: int = 0,
        venue: str = "",
        organizer_member_id: str = "",
        entry_fee: float = 0.0,
        prizes: str = "",
        rules: str = "",
        requested_by: str = "system",
    ) -> dict[str, Any]:
        if not all(
            [
                name,
                start_date,
                end_date,
                registration_deadline,
                max_participants,
                venue,
                organizer_member_id,
            ]
        ):
            return {
                "status": "error",
                "message": "Faltan campos obligatorios para crear el torneo 📋",
            }

        try:
            sport_type = SportType(sport)
        except ValueError:
            return {
                "status": "error",
                "message": (
                    f"Deporte no válido: '{sport}'. "
                    f"Opciones: {', '.join(s.value for s in SportType)}"
                ),
            }

        try:
            TournamentFormat(format)
        except ValueError:
            return {
                "status": "error",
                "message": (
                    f"Formato no válido: '{format}'. "
                    f"Opciones: {', '.join(f.value for f in TournamentFormat)}"
                ),
            }

        prize_list = (
            [p.strip() for p in prizes.split(",") if p.strip()] if prizes else []
        )

        approval = await self.approval_engine.create_request(
            agent=self.agent_name,
            tool="organize_tournament",
            params={
                "name": name,
                "sport": sport,
                "format": format,
                "start_date": start_date,
                "end_date": end_date,
                "registration_deadline": registration_deadline,
                "max_participants": max_participants,
                "venue": venue,
                "organizer_member_id": organizer_member_id,
                "entry_fee": entry_fee,
                "prizes": prize_list,
                "rules": rules,
            },
            requested_by=requested_by,
            approval_level=ApprovalLevel.HITL,
            risk_summary=(
                f"Nuevo torneo: {name} ({sport}, {max_participants} participantes). "
                f"Organizador: {organizer_member_id}"
            ),
            estimated_impact="Reserva de canchas, logística y premios",
            affected_count=max_participants,
            approver_roles=["admin"],
        )

        logger.info(
            "[sports_recreation] Tournament approval request: %s", name
        )

        return {
            "status": "pending_approval",
            "request_id": str(approval.request_id),
            "message": (
                f"🏆 Torneo '{name}' creado. "
                f"Esperando aprobación del administrador."
            ),
            "details": {
                "name": name,
                "sport": sport,
                "format": format,
                "start_date": start_date,
                "end_date": end_date,
                "max_participants": max_participants,
                "venue": venue,
                "entry_fee": entry_fee,
                "prizes": prize_list,
            },
        }

    # ── INTERNAL: Execute tournament creation after approval ──

    async def execute_tournament(
        self,
        name: str,
        sport: str,
        format: str,
        start_date: str,
        end_date: str,
        registration_deadline: str,
        max_participants: int,
        venue: str,
        organizer_member_id: str,
        entry_fee: float = 0.0,
        prizes: list[str] | None = None,
        rules: str = "",
    ) -> dict[str, Any]:
        """Crea el torneo después de la aprobación HITL."""
        sport_type = SportType(sport)
        tournament_format = TournamentFormat(format)

        data = CreateTournament(
            name=name,
            sport=sport_type,
            format=tournament_format,
            start_date=start_date,
            end_date=end_date,
            registration_deadline=registration_deadline,
            max_participants=max_participants,
            venue=venue,
            organizer_member_id=organizer_member_id,
            entry_fee=entry_fee,
            prizes=prizes or [],
            rules=rules or None,
        )
        tournament = await self.repo.create_tournament(data)

        # Confirmar inmediatamente tras aprobación
        tournament = await self.repo.update_tournament(
            tournament.id, {"status": TournamentStatus.CONFIRMED}
        )

        logger.info(
            "[sports_recreation] Tournament confirmed: %s (%s)",
            tournament.name,
            tournament.id,
        )

        return {
            "status": "success",
            "message": (
                f"🏆 Torneo '{tournament.name}' aprobado y confirmado. "
                f"¡Listo para inscripciones!"
            ),
            "tournament": tournament.model_dump(mode="json"),
        }

    # ──────────────────────────────────────────────────
    # 🟢 TOOL: MANAGE FITNESS CLASSES (AUTO)
    # ──────────────────────────────────────────────────

    @MCPTool(
        name="manage_fitness_classes",
        description=(
            "Crear, actualizar o listar clases de fitness y sesiones grupales. "
            "Incluye yoga, pilates, spinning y más."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def manage_fitness_classes(
        self,
        action: str = "list",
        class_id: str = "",
        name: str = "",
        sport: str = "",
        class_type: str = "group",
        instructor: str = "",
        skill_level: str = "all_levels",
        schedule_day: str = "",
        schedule_time: str = "",
        duration_minutes: int = 60,
        max_capacity: int = 20,
        location: str = "",
        equipment_needed: str = "",
        is_active: bool = True,
    ) -> dict[str, Any]:
        # ── List ──
        if action == "list":
            sport_filter = None
            if sport:
                try:
                    sport_filter = SportType(sport)
                except ValueError:
                    pass
            classes = await self.repo.list_fitness_classes(sport=sport_filter)
            return {
                "status": "success",
                "message": f"📋 Encontramos {len(classes)} clases de fitness.",
                "classes": [c.model_dump(mode="json") for c in classes],
            }

        # ── Get ──
        if action == "get":
            if not class_id:
                return {
                    "status": "error",
                    "message": "Se requiere class_id 🤔",
                }
            fc = await self.repo.get_fitness_class(class_id)
            if not fc:
                return {
                    "status": "not_found",
                    "message": f"No encontramos la clase {class_id} 😊",
                }
            return {
                "status": "success",
                "fitness_class": fc.model_dump(mode="json"),
            }

        # ── Create ──
        if action == "create":
            if not all(
                [
                    name,
                    instructor,
                    schedule_day,
                    schedule_time,
                    location,
                    max_capacity,
                ]
            ):
                return {
                    "status": "error",
                    "message": (
                        "Faltan campos obligatorios para crear la clase: "
                        "name, instructor, schedule_day, schedule_time, "
                        "location, max_capacity 📋"
                    ),
                }

            try:
                sport_type = SportType(sport)
                ct = ClassType(class_type)
                sl = SkillLevel(skill_level)
            except ValueError as e:
                return {
                    "status": "error",
                    "message": f"Valor no válido: {e} 🤔",
                }

            equip = (
                [e.strip() for e in equipment_needed.split(",") if e.strip()]
                if equipment_needed
                else []
            )

            data = CreateFitnessClass(
                name=name,
                sport=sport_type,
                class_type=ct,
                instructor=instructor,
                skill_level=sl,
                schedule_day=schedule_day,
                schedule_time=schedule_time,
                duration_minutes=duration_minutes,
                max_capacity=max_capacity,
                location=location,
                equipment_needed=equip,
            )
            fc = await self.repo.create_fitness_class(data)

            logger.info(
                "[sports_recreation] Fitness class created: %s with %s",
                fc.name,
                instructor,
            )

            return {
                "status": "success",
                "message": (
                    f"🧘 Clase '{fc.name}' con {instructor} "
                    f"creada exitosamente."
                ),
                "fitness_class": fc.model_dump(mode="json"),
            }

        # ── Update ──
        if action == "update":
            if not class_id:
                return {
                    "status": "error",
                    "message": "Se requiere class_id para actualizar 🤔",
                }

            updates: dict[str, Any] = {}
            if name:
                updates["name"] = name
            if instructor:
                updates["instructor"] = instructor
            if schedule_day:
                updates["schedule_day"] = schedule_day
            if schedule_time:
                updates["schedule_time"] = schedule_time
            if duration_minutes:
                updates["duration_minutes"] = duration_minutes
            if max_capacity:
                updates["max_capacity"] = max_capacity
            if location:
                updates["location"] = location
            if equipment_needed:
                updates["equipment_needed"] = [
                    e.strip() for e in equipment_needed.split(",") if e.strip()
                ]
            updates["is_active"] = is_active

            fc = await self.repo.update_fitness_class(class_id, updates)
            if not fc:
                return {
                    "status": "not_found",
                    "message": f"No encontramos la clase {class_id} 😊",
                }

            return {
                "status": "success",
                "message": f"✏️ Clase '{fc.name}' actualizada exitosamente.",
                "fitness_class": fc.model_dump(mode="json"),
            }

        return {
            "status": "error",
            "message": (
                f"Acción no válida: '{action}'. "
                f"Usa: create, get, update o list 🤔"
            ),
        }

    # ──────────────────────────────────────────────────
    # 🟢 TOOL: COORDINATE COACHING (AUTO)
    # ──────────────────────────────────────────────────

    @MCPTool(
        name="coordinate_coaching",
        description=(
            "Programar sesiones de coaching privadas o grupales "
            "entre miembros y entrenadores."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def coordinate_coaching(
        self,
        action: str = "create",
        session_id: str = "",
        sport: str = "tennis",
        coach_name: str = "",
        member_id: str = "",
        member_name: str = "",
        skill_level: str = "beginner",
        date: str = "",
        start_time: str = "",
        end_time: str = "",
        location: str = "",
        focus_areas: str = "",
    ) -> dict[str, Any]:
        # ── List ──
        if action == "list":
            sport_filter = None
            if sport:
                try:
                    sport_filter = SportType(sport)
                except ValueError:
                    pass
            sessions = await self.repo.list_coaching_sessions(sport=sport_filter)
            return {
                "status": "success",
                "message": f"📋 Encontramos {len(sessions)} sesiones de coaching.",
                "sessions": [s.model_dump(mode="json") for s in sessions],
            }

        # ── Get ──
        if action == "get":
            if not session_id:
                return {
                    "status": "error",
                    "message": "Se requiere session_id 🤔",
                }
            session = await self.repo.get_coaching_session(session_id)
            if not session:
                return {
                    "status": "not_found",
                    "message": f"No encontramos la sesión {session_id} 😊",
                }
            return {
                "status": "success",
                "session": session.model_dump(mode="json"),
            }

        # ── Create ──
        if action == "create":
            if not all(
                [coach_name, member_id, member_name, date, start_time, end_time, location]
            ):
                return {
                    "status": "error",
                    "message": (
                        "Faltan campos obligatorios: coach_name, member_id, "
                        "member_name, date, start_time, end_time, location 📋"
                    ),
                }

            try:
                sport_type = SportType(sport)
                sl = SkillLevel(skill_level)
            except ValueError as e:
                return {
                    "status": "error",
                    "message": f"Valor no válido: {e} 🤔",
                }

            areas = (
                [a.strip() for a in focus_areas.split(",") if a.strip()]
                if focus_areas
                else []
            )

            data = CreateCoachingSession(
                sport=sport_type,
                coach_name=coach_name,
                member_id=member_id,
                member_name=member_name,
                skill_level=sl,
                date=date,
                start_time=start_time,
                end_time=end_time,
                location=location,
                focus_areas=areas,
            )
            session = await self.repo.create_coaching_session(data)

            logger.info(
                "[sports_recreation] Coaching session: %s with %s for %s",
                coach_name,
                member_name,
                date,
            )

            return {
                "status": "success",
                "message": (
                    f"🎾 Sesión con {coach_name} programada para "
                    f"{member_name} el {date}."
                ),
                "session": session.model_dump(mode="json"),
            }

        return {
            "status": "error",
            "message": f"Acción no válida: '{action}'. Usa: create, get o list 🤔",
        }

    # ──────────────────────────────────────────────────
    # 🔴 TOOL: MANAGE SPORT LEAGUES (HITL)
    # ──────────────────────────────────────────────────

    @MCPTool(
        name="manage_sport_leagues",
        description=(
            "Crear, actualizar y gestionar ligas deportivas. "
            "REQUIERE APROBACIÓN HUMANA para crear nuevas ligas. "
            "Consultas y actualizaciones de estado son directas."
        ),
        approval=ApprovalLevel.HITL,
        approver_roles=["admin"],
    )
    async def manage_sport_leagues(
        self,
        action: str = "list",
        league_id: str = "",
        name: str = "",
        sport: str = "tennis",
        format: str = "round_robin",
        teams: str = "",
        season: str = "",
        start_date: str = "",
        end_date: str = "",
        coordinator_member_id: str = "",
        max_teams: int = 8,
        new_status: str = "",
        requested_by: str = "system",
    ) -> dict[str, Any]:
        # ── List ──
        if action == "list":
            sport_filter = None
            if sport:
                try:
                    sport_filter = SportType(sport)
                except ValueError:
                    pass
            leagues = await self.repo.list_leagues(sport=sport_filter)
            return {
                "status": "success",
                "message": f"📋 Encontramos {len(leagues)} ligas deportivas.",
                "leagues": [l.model_dump(mode="json") for l in leagues],
            }

        # ── Get ──
        if action == "get":
            if not league_id:
                return {
                    "status": "error",
                    "message": "Se requiere league_id 🤔",
                }
            league = await self.repo.get_league(league_id)
            if not league:
                return {
                    "status": "not_found",
                    "message": f"No encontramos la liga {league_id} 😊",
                }
            return {
                "status": "success",
                "league": league.model_dump(mode="json"),
            }

        # ── Create → HITL ──
        if action == "create":
            if not all(
                [name, season, start_date, end_date, coordinator_member_id, max_teams]
            ):
                return {
                    "status": "error",
                    "message": (
                        "Faltan campos obligatorios para crear la liga: "
                        "name, season, start_date, end_date, "
                        "coordinator_member_id, max_teams 📋"
                    ),
                }

            try:
                sport_type = SportType(sport)
                lf = LeagueFormat(format)
            except ValueError as e:
                return {
                    "status": "error",
                    "message": f"Valor no válido: {e} 🤔",
                }

            team_list = (
                [t.strip() for t in teams.split(",") if t.strip()] if teams else []
            )

            approval = await self.approval_engine.create_request(
                agent=self.agent_name,
                tool="manage_sport_leagues",
                params={
                    "action": "create",
                    "name": name,
                    "sport": sport,
                    "format": format,
                    "teams": team_list,
                    "season": season,
                    "start_date": start_date,
                    "end_date": end_date,
                    "coordinator_member_id": coordinator_member_id,
                    "max_teams": max_teams,
                },
                requested_by=requested_by,
                approval_level=ApprovalLevel.HITL,
                risk_summary=(
                    f"Nueva liga deportiva: {name} ({sport}, "
                    f"{len(team_list)} equipos, temporada {season})"
                ),
                estimated_impact="Organización de calendario y canchas",
                affected_count=max_teams,
                approver_roles=["admin"],
            )

            logger.info(
                "[sports_recreation] League approval request: %s", name
            )

            return {
                "status": "pending_approval",
                "request_id": str(approval.request_id),
                "message": (
                    f"⚽ Liga '{name}' creada. "
                    f"Esperando aprobación del administrador."
                ),
                "details": {
                    "name": name,
                    "sport": sport,
                    "format": format,
                    "teams": team_list,
                    "season": season,
                    "max_teams": max_teams,
                },
            }

        # ── Update Status ──
        if action == "update_status":
            if not league_id or not new_status:
                return {
                    "status": "error",
                    "message": "Se requiere league_id y new_status 🤔",
                }
            league = await self.repo.get_league(league_id)
            if not league:
                return {
                    "status": "not_found",
                    "message": f"No encontramos la liga {league_id} 😊",
                }
            league = await self.repo.update_league(
                league_id, {"status": new_status}
            )
            return {
                "status": "success",
                "message": (
                    f"✅ Liga '{league.name}' actualizada a estado: {new_status}."
                ),
                "league": league.model_dump(mode="json"),
            }

        return {
            "status": "error",
            "message": (
                f"Acción no válida: '{action}'. "
                f"Usa: create, get, list o update_status 🤔"
            ),
        }

    # ── INTERNAL: Execute league creation after approval ──

    async def execute_league(
        self,
        name: str,
        sport: str,
        format: str,
        teams: list[str],
        season: str,
        start_date: str,
        end_date: str,
        coordinator_member_id: str,
        max_teams: int,
    ) -> dict[str, Any]:
        """Crea la liga después de la aprobación HITL."""
        sport_type = SportType(sport)
        lf = LeagueFormat(format)

        data = CreateSportLeague(
            name=name,
            sport=sport_type,
            format=lf,
            teams=teams,
            season=season,
            start_date=start_date,
            end_date=end_date,
            coordinator_member_id=coordinator_member_id,
            max_teams=max_teams,
        )
        league = await self.repo.create_league(data)

        # Activar inmediatamente tras aprobación
        league = await self.repo.update_league(league.id, {"status": "active"})

        logger.info(
            "[sports_recreation] League activated: %s (%s)",
            league.name,
            league.id,
        )

        return {
            "status": "success",
            "message": (
                f"⚽ Liga '{league.name}' aprobada y activada. "
                f"¡Que comience la temporada!"
            ),
            "league": league.model_dump(mode="json"),
        }

    # ──────────────────────────────────────────────────
    # 🟢 TOOL: GET EQUIPMENT AVAILABILITY (AUTO)
    # ──────────────────────────────────────────────────

    @MCPTool(
        name="get_equipment_availability",
        description=(
            "Consultar disponibilidad y estado del equipamiento deportivo "
            "por deporte o ubicación."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_equipment_availability(
        self,
        sport: str = "",
        location: str = "",
    ) -> dict[str, Any]:
        sport_filter = None
        if sport:
            try:
                sport_filter = SportType(sport)
            except ValueError:
                return {
                    "status": "error",
                    "message": (
                        f"Deporte no válido: '{sport}'. "
                        f"Opciones: {', '.join(s.value for s in SportType)}"
                    ),
                }

        equipment = await self.repo.list_equipment(
            sport=sport_filter, location=location if location else None
        )

        if not equipment:
            return {
                "status": "success",
                "message": "📦 No encontramos equipamiento con esos filtros.",
                "equipment": [],
                "total_items": 0,
                "available_items": 0,
            }

        available = [e for e in equipment if e.available_quantity > 0]
        return {
            "status": "success",
            "message": (
                f"📦 Encontramos {len(equipment)} items de equipamiento "
                f"({len(available)} con disponibilidad)."
            ),
            "equipment": [e.model_dump(mode="json") for e in equipment],
            "total_items": len(equipment),
            "available_items": len(available),
        }

    # ──────────────────────────────────────────────────
    # 🟢 TOOL: GET SPORTS RECOMMENDATIONS (AUTO)
    # ──────────────────────────────────────────────────

    @MCPTool(
        name="get_sports_recommendations",
        description=(
            "Generar recomendaciones personalizadas de deportes y actividades "
            "para un miembro basándose en su perfil e historial."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_sports_recommendations(
        self,
        member_id: str = "",
        sport: str = "",
    ) -> dict[str, Any]:
        if not member_id:
            return {
                "status": "error",
                "message": "Se requiere member_id 💡",
            }

        sport_filter = None
        if sport:
            try:
                sport_filter = SportType(sport)
            except ValueError:
                return {
                    "status": "error",
                    "message": (
                        f"Deporte no válido: '{sport}'. "
                        f"Opciones: {', '.join(s.value for s in SportType)}"
                    ),
                }

        # ── Gather data sources ──
        classes = await self.repo.list_fitness_classes(active_only=True)
        sessions = await self.repo.list_coaching_sessions(member_id=member_id)
        equipment = await self.repo.list_equipment()

        recommendations: list[SportsRecommendation] = []
        recommended_sports: set[str] = set()

        # ── Recommendations from available classes ──
        for cls in classes:
            if cls.current_enrolled < cls.max_capacity:
                sport_key = f"{cls.sport}_{cls.schedule_day}"
                if sport_key not in recommended_sports:
                    recommended_sports.add(sport_key)

                    reasons: list[str] = []
                    if cls.current_enrolled < cls.max_capacity // 2:
                        reasons.append("muchos lugares disponibles")
                    if cls.skill_level.value == "all_levels":
                        reasons.append("todos los niveles son bienvenidos")

                    reason_text = (
                        ", ".join(reasons)
                        if reasons
                        else f"gran clase con {cls.instructor}"
                    )

                    if sport_filter and cls.sport != sport_filter:
                        continue

                    rec_data = CreateSportsRecommendation(
                        member_id=member_id,
                        sport=cls.sport,
                        reason=(
                            f"Probá '{cls.name}' los {cls.schedule_day} "
                            f"— {reason_text}."
                        ),
                        confidence_score=0.8,
                        suggested_class=cls.name,
                        suggested_coach=cls.instructor,
                    )
                    rec = await self.repo.create_recommendation(rec_data)
                    recommendations.append(rec)

        # ── Coaching follow-up recommendations ──
        if sessions:
            last_session = sessions[-1]
            if not sport_filter or last_session.sport == sport_filter:
                rec_data = CreateSportsRecommendation(
                    member_id=member_id,
                    sport=last_session.sport,
                    reason=(
                        f"Basado en tu sesión con {last_session.coach_name}, "
                        f"considerá una seguimiento para continuar tu progreso."
                    ),
                    confidence_score=0.75,
                    suggested_coach=last_session.coach_name,
                )
                rec = await self.repo.create_recommendation(rec_data)
                recommendations.append(rec)

        # ── Equipment-based fallback ──
        if not recommendations:
            available_sports = list(
                set(e.sport for e in equipment if e.available_quantity > 0)
            )
            if available_sports:
                target_sport = available_sports[0]
                if not sport_filter or target_sport == sport_filter:
                    rec_data = CreateSportsRecommendation(
                        member_id=member_id,
                        sport=target_sport,
                        reason=(
                            "Hay equipamiento disponible — "
                            "¡un buen momento para probar algo nuevo!"
                        ),
                        confidence_score=0.5,
                    )
                    rec = await self.repo.create_recommendation(rec_data)
                    recommendations.append(rec)

        return {
            "status": "success",
            "message": (
                f"💡 Generamos {len(recommendations)} recomendaciones "
                f"personalizadas para vos."
            ),
            "recommendations": [r.model_dump(mode="json") for r in recommendations],
        }

    # ──────────────────────────────────────────────────────────────────────
    # 🟢 TOOL: GET SPORTS ANALYTICS (AUTO) — 9-Dimension Analysis Engine
    # ──────────────────────────────────────────────────────────────────────

    @MCPTool(
        name="get_sports_analytics",
        description=(
            "Motor de análisis deportivo integral en 9 dimensiones: "
            "popularidad por deporte, utilización de canchas, inscripción en clases, "
            "métricas de torneos, salud de equipamiento, efectividad de coaching, "
            "patrones estacionales, engagement de socios y horas pico. "
            "0 tokens, 100% client-side compute."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_sports_analytics(
        self,
        lookback_days: int = 30,
    ) -> dict[str, Any]:
        sport_popularity = await self.repo.get_sport_popularity()
        court_utilization = await self.repo.get_court_utilization(lookback_days)
        class_enrollment = await self.repo.get_class_enrollment_stats()
        tournament_metrics = await self.repo.get_tournament_metrics()
        equipment_health = await self.repo.get_equipment_lifecycle()
        coaching_stats = await self.repo.get_coaching_effectiveness()
        seasonal_patterns = await self.repo.get_seasonal_patterns()

        # ── Member engagement score (0-100) ──
        total_reservations = sum(
            1
            for r in self.repo._reservations.values()
            if self.repo._ev(r.get("status")) != "cancelled"
        )
        total_active_classes = sum(
            1
            for c in self.repo._fitness_classes.values()
            if c.get("is_active", True)
        )
        total_coaching = len(self.repo._coaching_sessions)
        total_tournaments = len(self.repo._tournaments)

        reservation_component = min(100.0, total_reservations * 2.0)
        class_component = min(100.0, total_active_classes * 5.0)
        coaching_component = min(100.0, total_coaching * 4.0)
        tournament_component = min(100.0, total_tournaments * 10.0)

        engagement_score = round(
            reservation_component * 0.35
            + class_component * 0.25
            + coaching_component * 0.25
            + tournament_component * 0.15,
            1,
        )

        # ── Peak hours from reservation data ──
        peak_hours: dict[str, int] = {}
        for r in self.repo._reservations.values():
            if self.repo._ev(r.get("status")) == "cancelled":
                continue
            start_h = r.get("start_time", "0:00").split(":")[0]
            hour_key = f"{start_h}:00"
            peak_hours[hour_key] = peak_hours.get(hour_key, 0) + 1

        analytics = SportsAnalytics(
            sport_popularity=sport_popularity,
            court_utilization=court_utilization,
            class_enrollment=class_enrollment,
            tournament_metrics=tournament_metrics,
            equipment_health=equipment_health,
            coaching_stats=coaching_stats,
            seasonal_patterns=seasonal_patterns,
            member_engagement_score=engagement_score,
            peak_hours=peak_hours,
            total_active_reservations=total_reservations,
            total_active_classes=total_active_classes,
            lookback_days=lookback_days,
        )

        logger.info(
            "[sports_recreation] Analytics generated — lookback=%d days, "
            "engagement=%.1f, %d sports tracked",
            lookback_days,
            engagement_score,
            len(sport_popularity),
        )

        return {
            "status": "success",
            "message": (
                f"📊 Analytics deportivos generados "
                f"({lookback_days} días de historial)."
            ),
            "analytics": analytics.model_dump(mode="json"),
        }

    # ──────────────────────────────────────────────────────────────────────
    # 🟢 TOOL: GET SPORTS HEALTH SUMMARY (AUTO) — Composite Health Score
    # ──────────────────────────────────────────────────────────────────────

    @MCPTool(
        name="get_sports_health_summary",
        description=(
            "Calcula el puntaje de salud deportiva (0-100) basado en 5 factores "
            "ponderados: utilización de canchas (25%), inscripción en clases (20%), "
            "actividad de torneos (20%), condición de equipamiento (15%), "
            "participación de socios (20%). Incluye tendencia, alertas y "
            "recomendaciones accionables."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_sports_health_summary(self) -> dict[str, Any]:
        court_util = await self.repo.get_court_utilization(30)
        class_stats = await self.repo.get_class_enrollment_stats()
        tournament_metrics = await self.repo.get_tournament_metrics()
        equipment = await self.repo.get_equipment_lifecycle()
        coaching = await self.repo.get_coaching_effectiveness()

        alerts: list[str] = []
        recommendations: list[str] = []

        # ── Factor 1: Court Utilization (weight 25%) ──
        if court_util:
            avg_util = sum(c.utilization_pct for c in court_util) / len(court_util)
            court_score = min(100.0, avg_util * 1.5)
            underused = [c for c in court_util if c.utilization_pct < 30]
            if underused:
                alerts.append(
                    f"{len(underused)} cancha(s) por debajo del 30% de utilización"
                )
                recommendations.append(
                    "Promocionar o reasignar canchas subutilizadas"
                )
        else:
            court_score = 50.0
            alerts.append("Sin datos de utilización de canchas")

        court_status = self._health_level(court_score)

        # ── Factor 2: Class Enrollment (weight 20%) ──
        if class_stats:
            avg_fill = sum(c.fill_rate_pct for c in class_stats) / len(class_stats)
            class_score = min(100.0, avg_fill * 1.2)
            underperforming = [c for c in class_stats if c.is_underperforming]
            if underperforming:
                alerts.append(
                    f"{len(underperforming)} clase(s) con inscripción baja (<40%)"
                )
                recommendations.append("Revisar horarios de clases con baja inscripción")
        else:
            class_score = 50.0
            alerts.append("Sin clases de fitness activas")

        class_status = self._health_level(class_score)

        # ── Factor 3: Tournament Activity (weight 20%) ──
        total_t = tournament_metrics.total_tournaments
        if total_t > 0:
            tournament_score = min(100.0, total_t * 15.0)
            if tournament_metrics.avg_participation_rate < 50:
                tournament_score *= 0.7
                alerts.append(
                    f"Participación promedio en torneos: "
                    f"{tournament_metrics.avg_participation_rate}%"
                )
        else:
            tournament_score = 20.0
            alerts.append("Sin torneos registrados")
            recommendations.append("Organizar al menos un torneo este trimestre")

        tournament_status = self._health_level(tournament_score)

        # ── Factor 4: Equipment Condition (weight 15%) ──
        if equipment:
            avg_urgency = sum(e.urgency_score for e in equipment) / len(equipment)
            equipment_score = max(0.0, 100.0 - avg_urgency)
            needs_attention = [e for e in equipment if e.needs_attention]
            if needs_attention:
                alerts.append(
                    f"{len(needs_attention)} item(s) de equipamiento requieren atención"
                )
                recommendations.append(
                    "Programar mantenimiento preventivo para equipamiento deportivo"
                )
        else:
            equipment_score = 50.0
            alerts.append("Sin datos de equipamiento")

        equipment_status = self._health_level(equipment_score)

        # ── Factor 5: Member Participation (weight 20%) ──
        unique_members = coaching.unique_members_coached
        total_reservations = sum(
            1
            for r in self.repo._reservations.values()
            if self.repo._ev(r.get("status")) != "cancelled"
        )
        raw_participation = (
            total_reservations * 1.5 + unique_members * 3.0 + coaching.total_sessions * 2.0
        )
        member_score = min(100.0, raw_participation)

        if unique_members == 0:
            alerts.append("Sin sesiones de coaching registradas")
            recommendations.append("Promocionar coaching deportivo entre socios")

        member_status = self._health_level(member_score)

        # ── Composite Health Score ──
        factors = [
            SportsHealthFactor(
                name="Utilización de Canchas",
                score=round(court_score, 1),
                weight=0.25,
                weighted_score=round(court_score * 0.25, 1),
                status=court_status,
                detail=f"{len(court_util)} cancha(s) monitoreada(s)",
            ),
            SportsHealthFactor(
                name="Inscripción en Clases",
                score=round(class_score, 1),
                weight=0.20,
                weighted_score=round(class_score * 0.20, 1),
                status=class_status,
                detail=f"{len(class_stats)} clase(s) activa(s)",
            ),
            SportsHealthFactor(
                name="Actividad de Torneos",
                score=round(tournament_score, 1),
                weight=0.20,
                weighted_score=round(tournament_score * 0.20, 1),
                status=tournament_status,
                detail=f"{total_t} torneo(s) registrado(s)",
            ),
            SportsHealthFactor(
                name="Estado de Equipamiento",
                score=round(equipment_score, 1),
                weight=0.15,
                weighted_score=round(equipment_score * 0.15, 1),
                status=equipment_status,
                detail=f"{len(equipment)} item(s) en inventario",
            ),
            SportsHealthFactor(
                name="Participación de Socios",
                score=round(member_score, 1),
                weight=0.20,
                weighted_score=round(member_score * 0.20, 1),
                status=member_status,
                detail=f"{unique_members} socio(s) con coaching activo",
            ),
        ]

        health_score = round(sum(f.weighted_score for f in factors), 1)
        level = self._health_level_label(health_score)

        trend = "stable"
        if health_score >= 70 and total_reservations > 10:
            trend = "improving"
        elif health_score < 40:
            trend = "declining"

        if health_score < 65:
            recommendations.append(
                "Incrementar la visibilidad de actividades deportivas en el club"
            )

        summary = SportsHealthSummary(
            health_score=health_score,
            level=level,
            factors=factors,
            trend=trend,
            alerts=alerts,
            recommendations=recommendations,
        )

        logger.info(
            "[sports_recreation] Health summary: %.1f/100 (%s) — %d alerts",
            health_score,
            level,
            len(alerts),
        )

        return {
            "status": "success",
            "message": f"🏋️ Salud deportiva: {health_score:.0f}/100 ({level})",
            "health_summary": summary.model_dump(mode="json"),
        }

    # ──────────────────────────────────────────────────────────────────────
    # 🟢 TOOL: GET SPORTS CALENDAR (AUTO) — Unified Timeline
    # ──────────────────────────────────────────────────────────────────────

    @MCPTool(
        name="get_sports_calendar",
        description=(
            "Calendario deportivo unificado que combina reservas de canchas, "
            "torneos, clases de fitness, sesiones de coaching y jornadas de liga "
            "en una sola línea de tiempo. Incluye detección de conflictos de "
            "horario y evaluación de riesgo climático para deportes outdoor "
            "basado en patrones estacionales de Costa Rica."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_sports_calendar(
        self,
        date_from: str = "",
        date_to: str = "",
        sport: str = "",
    ) -> dict[str, Any]:
        from datetime import timedelta

        if not date_from or not date_to:
            return {
                "status": "error",
                "message": (
                    "Se requieren date_from y date_to (formato: YYYY-MM-DD) 📋"
                ),
            }

        sport_filter = None
        if sport:
            try:
                sport_filter = SportType(sport)
            except ValueError:
                return {
                    "status": "error",
                    "message": (
                        f"Deporte no válido: '{sport}'. "
                        f"Opciones: {', '.join(s.value for s in SportType)}"
                    ),
                }

        OUTDOOR_SPORTS = {
            SportType.TENNIS,
            SportType.GOLF,
            SportType.SWIMMING,
            SportType.VOLLEYBALL,
            SportType.FOOTBALL,
        }

        def weather_risk(date_str: str, sport_type: SportType) -> Optional[str]:
            if sport_type not in OUTDOOR_SPORTS:
                return None
            dt = self.repo._parse_date(date_str)
            if dt is None:
                return None
            month = dt.month
            if month in (12, 1, 2, 3):
                return "low"       # Dry season
            elif month in (5, 6, 7):
                return "medium"    # Transition
            else:
                return "high"      # Green season (Aug-Nov, Apr)

        items: list[SportsCalendarItem] = []

        # ── Reservations ──
        for r in self.repo._reservations.values():
            if self.repo._ev(r.get("status")) == "cancelled":
                continue
            if r["date"] < date_from or r["date"] > date_to:
                continue
            if sport_filter and r["sport"] != sport_filter:
                continue
            items.append(
                SportsCalendarItem(
                    id=f"cal_{r['id']}",
                    type=CalendarItemType.RESERVATION,
                    title=f"Cancha: {r['court_name']}",
                    sport=r["sport"],
                    date=r["date"],
                    start_time=r["start_time"],
                    end_time=r["end_time"],
                    location=r["court_name"],
                    status=self.repo._ev(r.get("status", "confirmed")),
                    weather_risk=weather_risk(r["date"], r["sport"]),
                    entity_id=r["id"],
                )
            )

        # ── Tournaments ──
        for t in self.repo._tournaments.values():
            if t["end_date"] < date_from or t["start_date"] > date_to:
                continue
            if sport_filter and t["sport"] != sport_filter:
                continue

            status_val = self.repo._ev(t.get("status", "draft"))
            start = self.repo._parse_date(max(t["start_date"], date_from))
            end = self.repo._parse_date(min(t["end_date"], date_to))

            if start and end:
                current = start
                while current <= end:
                    ds = current.strftime("%Y-%m-%d")
                    items.append(
                        SportsCalendarItem(
                            id=f"cal_{t['id']}_{ds}",
                            type=CalendarItemType.TOURNAMENT,
                            title=f"🏆 {t['name']}",
                            sport=t["sport"],
                            date=ds,
                            start_time="09:00",
                            end_time="18:00",
                            location=t["venue"],
                            participants=t.get("current_participants", 0),
                            status=status_val,
                            weather_risk=weather_risk(ds, t["sport"]),
                            entity_id=t["id"],
                        )
                    )
                    current += timedelta(days=1)

        # ── Fitness Classes (map schedule_day → dates in range) ──
        DAY_MAP = {
            "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
            "friday": 4, "saturday": 5, "sunday": 6,
            "lunes": 0, "martes": 1, "miércoles": 2, "miercoles": 2,
            "jueves": 3, "viernes": 4, "sábado": 5, "sabado": 5, "domingo": 6,
        }

        for c in self.repo._fitness_classes.values():
            if not c.get("is_active", True):
                continue
            if sport_filter and c["sport"] != sport_filter:
                continue

            day_name = c.get("schedule_day", "").lower()
            target_wd = DAY_MAP.get(day_name)
            if target_wd is None:
                continue

            start_dt = self.repo._parse_date(date_from)
            end_dt = self.repo._parse_date(date_to)
            if not start_dt or not end_dt:
                continue

            sched_parts = c.get("schedule_time", "00:00").split(":")
            sched_h = int(sched_parts[0]) if len(sched_parts) >= 1 else 0
            sched_m = int(sched_parts[1]) if len(sched_parts) >= 2 else 0
            dur = c.get("duration_minutes", 60)
            end_total = sched_h * 60 + sched_m + dur
            end_time_str = f"{end_total // 60:02d}:{end_total % 60:02d}"

            current = start_dt
            while current <= end_dt:
                if current.weekday() == target_wd:
                    ds = current.strftime("%Y-%m-%d")
                    items.append(
                        SportsCalendarItem(
                            id=f"cal_{c['id']}_{ds}",
                            type=CalendarItemType.CLASS,
                            title=f"🧘 {c['name']}",
                            sport=c["sport"],
                            date=ds,
                            start_time=c["schedule_time"],
                            end_time=end_time_str,
                            location=c["location"],
                            participants=c.get("current_enrolled", 0),
                            status="active",
                            weather_risk=weather_risk(ds, c["sport"]),
                            entity_id=c["id"],
                        )
                    )
                current += timedelta(days=1)

        # ── Coaching Sessions ──
        for s in self.repo._coaching_sessions.values():
            if s["date"] < date_from or s["date"] > date_to:
                continue
            if sport_filter and s["sport"] != sport_filter:
                continue
            items.append(
                SportsCalendarItem(
                    id=f"cal_{s['id']}",
                    type=CalendarItemType.COACHING,
                    title=f"🎾 Coaching: {s['coach_name']}",
                    sport=s["sport"],
                    date=s["date"],
                    start_time=s["start_time"],
                    end_time=s["end_time"],
                    location=s["location"],
                    participants=2,
                    status=self.repo._ev(s.get("status", "scheduled")),
                    weather_risk=weather_risk(s["date"], s["sport"]),
                    entity_id=s["id"],
                )
            )

        # ── Leagues (show on match days — Saturdays) ──
        for l in self.repo._leagues.values():
            if l["end_date"] < date_from or l["start_date"] > date_to:
                continue
            if sport_filter and l["sport"] != sport_filter:
                continue

            status_val = self.repo._ev(l.get("status", "proposed"))
            start_dt = self.repo._parse_date(max(l["start_date"], date_from))
            end_dt = self.repo._parse_date(min(l["end_date"], date_to))

            if start_dt and end_dt:
                current = start_dt
                while current <= end_dt:
                    if current.weekday() == 5:  # Saturday = match day
                        ds = current.strftime("%Y-%m-%d")
                        items.append(
                            SportsCalendarItem(
                                id=f"cal_{l['id']}_{ds}",
                                type=CalendarItemType.LEAGUE,
                                title=f"⚽ Liga: {l['name']}",
                                sport=l["sport"],
                                date=ds,
                                start_time="10:00",
                                end_time="14:00",
                                location="Multiple courts",
                                participants=len(l.get("teams", [])),
                                status=status_val,
                                weather_risk=weather_risk(ds, l["sport"]),
                                entity_id=l["id"],
                            )
                        )
                    current += timedelta(days=1)

        # ── Conflict Detection ──
        from collections import defaultdict

        slot_map: dict[str, list[SportsCalendarItem]] = defaultdict(list)
        for item in items:
            key = f"{item.date}_{item.location}"
            slot_map[key].append(item)

        conflict_count = 0
        for slot_items in slot_map.values():
            if len(slot_items) < 2:
                continue
            for i, a in enumerate(slot_items):
                for b in slot_items[i + 1 :]:
                    if a.start_time < b.end_time and b.start_time < a.end_time:
                        a.is_conflict = True
                        a.conflict_reason = f"Conflicto con: {b.title}"
                        b.is_conflict = True
                        b.conflict_reason = f"Conflicto con: {a.title}"
                        conflict_count += 1

        items.sort(key=lambda x: (x.date, x.start_time))

        logger.info(
            "[sports_recreation] Calendar: %d items (%s → %s), %d conflicts",
            len(items),
            date_from,
            date_to,
            conflict_count,
        )

        return {
            "status": "success",
            "message": (
                f"📅 Calendario deportivo: {len(items)} actividades programadas."
            ),
            "calendar": [item.model_dump(mode="json") for item in items],
            "total_items": len(items),
            "conflict_count": conflict_count,
            "date_range": {"from": date_from, "to": date_to},
        }

    # ──────────────────────────────────────────────────────────────────────
    # 🟢 TOOL: GENERATE SPORTS PROPOSALS (AUTO) — Engagement Motor
    # ──────────────────────────────────────────────────────────────────────

    @MCPTool(
        name="generate_sports_proposals",
        description=(
            "Motor de Engagement deportivo. Analiza el estado actual de "
            "deportes y señales cross-domain para generar propuestas proactivas "
            "de nuevas actividades, torneos, clases y alianzas. "
            "7 reglas determinísticas, 0 tokens API."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def generate_sports_proposals(
        self,
        member_id: str = "",
        sport: str = "",
    ) -> dict[str, Any]:
        from datetime import timedelta

        sport_filter = None
        if sport:
            try:
                sport_filter = SportType(sport)
            except ValueError:
                return {
                    "status": "error",
                    "message": (
                        f"Deporte no válido: '{sport}'. "
                        f"Opciones: {', '.join(s.value for s in SportType)}"
                    ),
                }

        proposals: list[SportsProposal] = []
        pid = 0
        now = datetime.utcnow()
        today_str = now.strftime("%Y-%m-%d")
        horizon_str = (now + timedelta(days=60)).strftime("%Y-%m-%d")

        # ── Rule 1: No tournaments in next 60 days ──
        all_tournaments = await self.repo.list_tournaments()
        upcoming = [
            t
            for t in all_tournaments
            if t.start_date >= today_str and t.start_date <= horizon_str
        ]

        if not upcoming and not sport_filter:
            pid += 1
            proposals.append(
                SportsProposal(
                    id=f"prop_{pid:03d}",
                    type="tournament_idea",
                    title="Organizar torneo en los próximos 60 días",
                    description=(
                        "No hay torneos programados para los próximos 2 meses. "
                        "Los socios esperan competencia regular."
                    ),
                    target_sport=SportType.TENNIS,
                    expected_participants=16,
                    confidence_score=0.85,
                    reasoning=(
                        "Sin actividad de torneo reduce el engagement competitivo. "
                        "Los torneos de tennis tienen alta participación histórica "
                        "en clubes privados de CR."
                    ),
                    cross_domain_signals=[
                        "Engagement score puede bajar sin eventos competitivos"
                    ],
                    estimated_revenue=480000,
                    action_label="Crear torneo",
                    approval="HITL",
                )
            )

        # ── Rule 2: Classes with low enrollment ──
        class_stats = await self.repo.get_class_enrollment_stats()
        underperforming = [
            c for c in class_stats if c.is_underperforming
        ]

        for cls in underperforming[:2]:
            pid += 1
            proposals.append(
                SportsProposal(
                    id=f"prop_{pid:03d}",
                    type="class_suggestion",
                    title=(
                        f"Reactivar '{cls.name}' — inscripción al "
                        f"{cls.fill_rate_pct}%"
                    ),
                    description=(
                        f"La clase {cls.name} con {cls.instructor} solo tiene "
                        f"{cls.enrolled}/{cls.capacity} inscritos. "
                        f"Considerar cambio de horario o promoción dirigida."
                    ),
                    target_sport=cls.sport,
                    expected_participants=cls.capacity - cls.enrolled,
                    confidence_score=0.75,
                    reasoning=(
                        f"Baja inscripción ({cls.fill_rate_pct}%) indica posible "
                        f"problema de horario o falta de visibilidad."
                    ),
                    cross_domain_signals=[
                        f"Clase '{cls.name}' subutilizada — oportunidad de reactivación"
                    ],
                    action_label="Ajustar clase",
                    approval="AUTO",
                )
            )

        # ── Rule 3: Dormant sports with available equipment ──
        popularity = await self.repo.get_sport_popularity()
        equipment = await self.repo.get_equipment_lifecycle()

        sports_with_equipment = {
            e.sport for e in equipment if e.condition != EquipmentCondition.RETIRED
        }
        sports_with_activity = {p.sport for p in popularity}
        dormant = sports_with_equipment - sports_with_activity

        for dormant_sport in list(dormant)[:2]:
            if sport_filter and dormant_sport != sport_filter:
                continue
            available = [
                e
                for e in equipment
                if e.sport == dormant_sport and e.condition != EquipmentCondition.RETIRED
            ]
            if available:
                pid += 1
                proposals.append(
                    SportsProposal(
                        id=f"prop_{pid:03d}",
                        type="new_activity",
                        title=(
                            f"Activitar {dormant_sport.value} — "
                            f"equipamiento disponible"
                        ),
                        description=(
                            f"Hay {len(available)} items de "
                            f"{dormant_sport.value} en inventario pero "
                            f"0 actividad reciente. Proponer una clase "
                            f"introductoria o evento de prueba."
                        ),
                        target_sport=dormant_sport,
                        expected_participants=10,
                        confidence_score=0.65,
                        reasoning=(
                            "Equipamiento sin usar = inversión ociosa. "
                            "Activarlo genera engagement sin CAPEX adicional."
                        ),
                        cross_domain_signals=[
                            f"Equipamiento de {dormant_sport.value} sin actividad"
                        ],
                        action_label="Crear actividad",
                        approval="AUTO",
                    )
                )

        # ── Rule 4: Peak season outdoor opportunity (CR: Dec-Apr) ──
        current_month = now.month
        is_peak = current_month in (12, 1, 2, 3, 4)

        if is_peak and not sport_filter:
            outdoor_sports = {
                SportType.TENNIS,
                SportType.GOLF,
                SportType.SWIMMING,
                SportType.VOLLEYBALL,
                SportType.FOOTBALL,
            }
            outdoor_activity = sum(
                p.total_activity for p in popularity if p.sport in outdoor_sports
            )
            total_activity = max(1, sum(p.total_activity for p in popularity))

            if outdoor_activity / total_activity < 0.4:
                pid += 1
                proposals.append(
                    SportsProposal(
                        id=f"prop_{pid:03d}",
                        type="new_activity",
                        title=(
                            "Temporada alta: maximizar deportes outdoor"
                        ),
                        description=(
                            "Estamos en temporada seca (dic-abr). Es el mejor "
                            "momento para promover tennis, golf, swimming y "
                            "deportes al aire libre."
                        ),
                        target_sport=SportType.TENNIS,
                        expected_participants=30,
                        confidence_score=0.90,
                        reasoning=(
                            "Temporada seca en CR = clima perfecto para outdoor. "
                            "Clubes que no capitalizan esto pierden engagement "
                            "y revenue estacional."
                        ),
                        cross_domain_signals=[
                            "High season CR: clima favorable para deportes outdoor",
                            f"Actividad outdoor actual: {outdoor_activity}/{total_activity}",
                        ],
                        estimated_revenue=900000,
                        action_label="Crear programa outdoor",
                        approval="AUTO",
                    )
                )

        # ── Rule 5: Coaching concentrated in few sports ──
        coaching = await self.repo.get_coaching_effectiveness()
        if coaching.coaches and not sport_filter:
            top_sports: set[str] = set()
            for c in coaching.coaches:
                top_sports.update(c.popular_sports)

            all_sports_vals = {s.value for s in SportType}
            uncoached = all_sports_vals - top_sports

            if uncoached and len(top_sports) <= 3:
                pid += 1
                proposals.append(
                    SportsProposal(
                        id=f"prop_{pid:03d}",
                        type="cross_sell",
                        title="Expandir coaching a más deportes",
                        description=(
                            f"Coaching concentrado en "
                            f"{', '.join(sorted(top_sports))}. "
                            f"{len(uncoached)} deportes sin coaching activo: "
                            f"{', '.join(sorted(uncoached)[:5])}."
                        ),
                        target_sport=SportType.FITNESS,
                        expected_participants=8,
                        confidence_score=0.70,
                        reasoning=(
                            "Diversificar coaching aumenta el engagement de "
                            "socios que practican deportes menos representados."
                        ),
                        cross_domain_signals=[
                            f"Coaching limitado a {len(top_sports)} deport(es)"
                        ],
                        action_label="Ofrecer coaching diversificado",
                        approval="AUTO",
                    )
                )

        # ── Rule 6: Weekend saturation / weekday underutilization ──
        all_reservations = await self.repo.list_reservations()
        weekday_count = 0
        weekend_count = 0

        for r in all_reservations:
            dt = self.repo._parse_date(r.date)
            if dt is None:
                continue
            if dt.weekday() < 5:
                weekday_count += 1
            else:
                weekend_count += 1

        if weekend_count > 0 and weekday_count > 0:
            ratio = weekend_count / weekday_count
            if ratio > 2.5:
                pid += 1
                proposals.append(
                    SportsProposal(
                        id=f"prop_{pid:03d}",
                        type="class_suggestion",
                        title=(
                            f"Fines de semana saturados "
                            f"({ratio:.1f}x) — promover entre semana"
                        ),
                        description=(
                            f"Los fines de semana tienen {ratio:.1f}x más "
                            f"reservas que entre semana. Proponer descuentos "
                            f"o eventos especiales de lunes a viernes para "
                            f"redistribuir la demanda."
                        ),
                        target_sport=SportType.TENNIS,
                        expected_participants=15,
                        confidence_score=0.80,
                        reasoning=(
                            "Redistribuir demanda reduce saturación de fin de "
                            "semana y llena slots ociosos entre semana."
                        ),
                        cross_domain_signals=[
                            f"Weekend/weekday ratio: {ratio:.1f}x",
                            f"{weekday_count} reservas weekdays vs {weekend_count} weekend",
                        ],
                        estimated_revenue=450000,
                        action_label="Crear promoción midweek",
                        approval="AUTO",
                    )
                )

        # ── Rule 7: Member with no sports activity ──
        if member_id:
            profile = await self.repo.get_member_sport_profile(member_id)
            if not profile.sports_played:
                pid += 1
                proposals.append(
                    SportsProposal(
                        id=f"prop_{pid:03d}",
                        type="new_activity",
                        title="Socio sin actividad deportiva",
                        description=(
                            "Este socio no tiene actividad deportiva registrada. "
                            "Ofrecer una clase introductoria gratuita para "
                            "despertar interés."
                        ),
                        target_sport=SportType.TENNIS,
                        expected_participants=1,
                        confidence_score=0.60,
                        reasoning=(
                            "Socios sin actividad deportiva tienen mayor riesgo "
                            "de churn. Una experiencia positiva incrementa "
                            "retención y LTV."
                        ),
                        cross_domain_signals=[
                            "Socio sin engagement deportivo — riesgo de churn"
                        ],
                        action_label="Enviar invitación",
                        approval="AUTO",
                    )
                )

        logger.info(
            "[sports_recreation] Engagement Motor: %d proposals generated",
            len(proposals),
        )

        return {
            "status": "success",
            "message": (
                f"💡 Motor de Engagement: {len(proposals)} propuestas generadas."
            ),
            "proposals": [p.model_dump(mode="json") for p in proposals],
            "total_proposals": len(proposals),
        }

    # ── Health Score Helpers ──────────────────────────────────────────────

    @staticmethod
    def _health_level(score: float) -> str:
        """Map score to health status string."""
        if score >= 85:
            return "excellent"
        if score >= 65:
            return "good"
        if score >= 45:
            return "attention"
        return "critical"

    @staticmethod
    def _health_level_label(score: float) -> str:
        """Map score to human-readable health level."""
        if score >= 85:
            return "Excepcional"
        if score >= 65:
            return "Saludable"
        if score >= 45:
            return "Atención"
        return "Crítico"
