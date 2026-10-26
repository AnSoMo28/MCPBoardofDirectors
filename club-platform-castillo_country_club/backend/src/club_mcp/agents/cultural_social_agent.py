"""
CulturalSocialAgent: Gestión cultural y social.
Club: Castillo Country Club

TOOLS:
  organize_formal_gala      🔴 HITL   Organizar galas y eventos formales
  manage_entertainment_acts  🔴 HITL   Gestionar actos de entretenimiento
  manage_cultural_program    🔴 HITL   Crear y gestionar programas culturales
  manage_social_events       🟢 AUTO   Eventos sociales regulares
  manage_art_exhibitions     🟢 AUTO   Exposiciones de arte
  get_cultural_calendar      🟢 AUTO   Calendario cultural y social
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from datetime import datetime, timedelta
import json
from collections import defaultdict

from club_mcp.agents.base import BaseAgent, MCPTool
from club_mcp.ai.claude_service import ClaudeService
from club_mcp.db.repositories.cultural_social_repo import CulturalSocialRepository
from club_mcp.hitl.approval_types import ApprovalLevel
from club_mcp.models.cultural_social import (
    CategoryPerformance,
    CreateArtExhibition,
    CreateCulturalEvent,
    CreateCulturalProgram,
    CreateEntertainmentAct,
    CrossDomainConnections,
    CulturalAnalytics,
    CulturalCategory,
    CulturalProposal,
    CulturalProposalsResponse,
    CulturalSummary,
    EntertainmentROI,
    EntertainmentType,
    EventType,
    EventStatus,
    ExhibitionStatus,
    FocusArea,
    FormalityLevel,
    ImplementationEffort,
    ProgramStatus,
    ProposalCategory,
    ProposalImpact,
    SeasonalPattern,
    SuggestedTimeline,
    TargetDemographic,
    VenueType,
    VenueUtilizationAnalytics,
)

logger = logging.getLogger(__name__)


class CulturalSocialAgent(BaseAgent):
    """
    Agente cultural y social de Castillo Country Club.
    Gestiona galas, entretenimiento, programas culturales, eventos sociales y exposiciones.
    """

    agent_name: str = "cultural_social"
    description: str = "Gestión cultural y social"

    def __init__(
        self, repo=None, approval_engine=None, notifier=None, claude_service=None,
    ) -> None:
        super().__init__()
        self.repo = repo or CulturalSocialRepository()
        if approval_engine is not None:
            self.approval_engine = approval_engine
        self.notifier = notifier
        self.claude_service = claude_service or ClaudeService()

    def _register_tools(self) -> None:
        pass

    # ──────────────────────────────────────────────────
    # 🔴 TOOL: ORGANIZE FORMAL GALA (HITL)
    # ──────────────────────────────────────────────────

    @MCPTool(
        name="organize_formal_gala",
        description=(
            "Organizar galas y eventos formales del club. "
            "REQUIERE APROBACIÓN HUMANA. "
            "Incluye cenas de gala, recepciones de etiqueta y eventos benéficos."
        ),
        approval=ApprovalLevel.HITL,
        approver_roles=["admin"],
    )
    async def organize_formal_gala(
        self,
        name: str = "",
        venue: str = "",
        venue_type: str = "ballroom",
        date: str = "",
        start_time: str = "",
        end_time: str = "",
        formality: str = "black_tie",
        organizer_member_id: str = "",
        guest_count: int = 0,
        budget: float = 0.0,
        menu_theme: str = "",
        dress_code: str = "",
        description: str = "",
        notes: str = "",
        requested_by: str = "system",
    ) -> dict[str, Any]:
        if not all(
            [name, venue, date, start_time, end_time, organizer_member_id]
        ):
            return {
                "status": "error",
                "message": (
                    "Faltan campos obligatorios: name, venue, date, "
                    "start_time, end_time, organizer_member_id 📋"
                ),
            }

        try:
            FormalityLevel(formality)
        except ValueError:
            return {
                "status": "error",
                "message": (
                    f"Formalidad no válida: '{formality}'. "
                    f"Opciones: {', '.join(f.value for f in FormalityLevel)}"
                ),
            }

        try:
            VenueType(venue_type)
        except ValueError:
            return {
                "status": "error",
                "message": (
                    f"Tipo de venue no válido: '{venue_type}'. "
                    f"Opciones: {', '.join(v.value for v in VenueType)}"
                ),
            }

        approval = await self.approval_engine.create_request(
            agent=self.agent_name,
            tool="organize_formal_gala",
            params={
                "name": name,
                "venue": venue,
                "venue_type": venue_type,
                "date": date,
                "start_time": start_time,
                "end_time": end_time,
                "formality": formality,
                "organizer_member_id": organizer_member_id,
                "guest_count": guest_count,
                "budget": budget,
                "menu_theme": menu_theme,
                "dress_code": dress_code,
                "description": description,
                "notes": notes,
            },
            requested_by=requested_by,
            approval_level=ApprovalLevel.HITL,
            risk_summary=(
                f"Gala formal: {name} ({formality}) en {venue} "
                f"para {guest_count} invitados. Presupuesto: ₡{budget:,.0f}"
            ),
            estimated_impact="Reservación de venue, catering, decoración y entretenimiento",
            affected_count=guest_count,
            approver_roles=["admin"],
        )

        logger.info("[cultural_social] Gala approval request: %s", name)

        return {
            "status": "pending_approval",
            "request_id": str(approval.request_id),
            "message": (
                f"🎭 Gala '{name}' creada. "
                f"Esperando aprobación del administrador."
            ),
            "details": {
                "name": name,
                "venue": venue,
                "venue_type": venue_type,
                "date": date,
                "formality": formality,
                "guest_count": guest_count,
                "budget": budget,
            },
        }

    # ── INTERNAL: Execute gala after HITL approval ──

    async def execute_formal_gala(
        self,
        name: str,
        venue: str,
        venue_type: str,
        date: str,
        start_time: str,
        end_time: str,
        formality: str,
        organizer_member_id: str,
        guest_count: int = 0,
        budget: float = 0.0,
        menu_theme: str = "",
        dress_code: str = "",
        description: str = "",
        notes: str = "",
    ) -> dict[str, Any]:
        """Crea la gala después de la aprobación HITL."""
        data = CreateCulturalEvent(
            name=name,
            event_type=EventType.GALA,
            formality=FormalityLevel(formality),
            venue=venue,
            venue_type=VenueType(venue_type),
            date=date,
            start_time=start_time,
            end_time=end_time,
            organizer_member_id=organizer_member_id,
            description=description,
            guest_count=guest_count,
            budget=budget,
            menu_theme=menu_theme,
            dress_code=dress_code,
            notes=notes or None,
        )
        event = await self.repo.create_event(data)

        # Confirmar inmediatamente tras aprobación
        event = await self.repo.update_event(
            event.id, {"status": EventStatus.CONFIRMED}
        )
        if event is None:
            return {
                "status": "error",
                "message": f"La gala '{name}' se creó, pero no pudo confirmarse.",
            }

        logger.info(
            "[cultural_social] Gala confirmed: %s (%s)", event.name, event.id
        )

        return {
            "status": "success",
            "message": (
                f"🎭 Gala '{event.name}' aprobada y confirmada. "
                f"¡A preparar los detalles!"
            ),
            "event": event.model_dump(mode="json"),
        }

    # ──────────────────────────────────────────────────
    # 🔴 TOOL: MANAGE ENTERTAINMENT ACTS (HITL)
    # ──────────────────────────────────────────────────

    @MCPTool(
        name="manage_entertainment_acts",
        description=(
            "Gestionar actos de entretenimiento: bandas, DJs, comediantes, etc. "
            "REQUIERE APROBACIÓN HUMANA para contratar nuevos artistas. "
            "Consultas y actualizaciones de estado son directas."
        ),
        approval=ApprovalLevel.HITL,
        approver_roles=["admin"],
    )
    async def manage_entertainment_acts(
        self,
        action: str = "list",
        act_id: str = "",
        artist_name: str = "",
        entertainment_type: str = "live_band",
        genre: str = "",
        description: str = "",
        duration_minutes: int = 60,
        cost: float = 0.0,
        contact_person: str = "",
        contact_phone: str = "",
        requirements: str = "",
        new_status: str = "",
        notes: str = "",
        requested_by: str = "system",
    ) -> dict[str, Any]:
        # ── List ──
        if action == "list":
            type_filter = None
            if entertainment_type:
                try:
                    type_filter = EntertainmentType(entertainment_type)
                except ValueError:
                    pass
            acts = await self.repo.list_acts(entertainment_type=type_filter)
            return {
                "status": "success",
                "message": f"📋 Encontramos {len(acts)} actos de entretenimiento.",
                "acts": [a.model_dump(mode="json") for a in acts],
            }

        # ── Get ──
        if action == "get":
            if not act_id:
                return {
                    "status": "error",
                    "message": "Se requiere act_id 🤔",
                }
            act = await self.repo.get_act(act_id)
            if not act:
                return {
                    "status": "not_found",
                    "message": f"No encontramos el acto {act_id} 😊",
                }
            return {
                "status": "success",
                "act": act.model_dump(mode="json"),
            }

        # ── Create → HITL ──
        if action == "create":
            if not all([artist_name, entertainment_type, contact_person]):
                return {
                    "status": "error",
                    "message": (
                        "Faltan campos obligatorios: artist_name, "
                        "entertainment_type, contact_person 📋"
                    ),
                }

            try:
                ent_type = EntertainmentType(entertainment_type)
            except ValueError:
                return {
                    "status": "error",
                    "message": (
                        f"Tipo no válido: '{entertainment_type}'. "
                        f"Opciones: {', '.join(e.value for e in EntertainmentType)}"
                    ),
                }

            req_list = (
                [r.strip() for r in requirements.split(",") if r.strip()]
                if requirements
                else []
            )

            approval = await self.approval_engine.create_request(
                agent=self.agent_name,
                tool="manage_entertainment_acts",
                params={
                    "action": "create",
                    "artist_name": artist_name,
                    "entertainment_type": entertainment_type,
                    "genre": genre,
                    "description": description,
                    "duration_minutes": duration_minutes,
                    "cost": cost,
                    "contact_person": contact_person,
                    "contact_phone": contact_phone,
                    "requirements": req_list,
                    "notes": notes,
                },
                requested_by=requested_by,
                approval_level=ApprovalLevel.HITL,
                risk_summary=(
                    f"Contratación de artista: {artist_name} "
                    f"({entertainment_type}). Costo: ₡{cost:,.0f}"
                ),
                estimated_impact="Contratación y pago de entretenimiento",
                affected_count=1,
                approver_roles=["admin"],
            )

            logger.info(
                "[cultural_social] Entertainment act approval: %s",
                artist_name,
            )

            return {
                "status": "pending_approval",
                "request_id": str(approval.request_id),
                "message": (
                    f"🎪 Artista '{artist_name}' registrado. "
                    f"Esperando aprobación del administrador."
                ),
                "details": {
                    "artist_name": artist_name,
                    "entertainment_type": entertainment_type,
                    "genre": genre,
                    "cost": cost,
                    "duration_minutes": duration_minutes,
                },
            }

        # ── Update Status ──
        if action == "update_status":
            if not act_id or not new_status:
                return {
                    "status": "error",
                    "message": "Se requiere act_id y new_status 🤔",
                }
            act = await self.repo.get_act(act_id)
            if not act:
                return {
                    "status": "not_found",
                    "message": f"No encontramos el acto {act_id} 😊",
                }
            act = await self.repo.update_act(
                act_id, {"status": new_status}
            )
            if act is None:
                return {
                    "status": "not_found",
                    "message": f"No encontramos el acto {act_id} 😊",
                }
            return {
                "status": "success",
                "message": (
                    f"✅ Acto de '{act.artist_name}' actualizado a: {new_status}."
                ),
                "act": act.model_dump(mode="json"),
            }

        return {
            "status": "error",
            "message": (
                f"Acción no válida: '{action}'. "
                f"Usa: list, get, create, update_status 🤔"
            ),
        }

    # ── INTERNAL: Execute entertainment act after approval ──

    async def execute_entertainment_act(
        self,
        artist_name: str,
        entertainment_type: str,
        genre: str = "",
        description: str = "",
        duration_minutes: int = 60,
        cost: float = 0.0,
        contact_person: str = "",
        contact_phone: str = "",
        requirements: list[str] | None = None,
        notes: str = "",
    ) -> dict[str, Any]:
        """Crea el acto de entretenimiento después de la aprobación HITL."""
        data = CreateEntertainmentAct(
            artist_name=artist_name,
            entertainment_type=EntertainmentType(entertainment_type),
            genre=genre,
            description=description,
            duration_minutes=duration_minutes,
            cost=cost,
            contact_person=contact_person,
            contact_phone=contact_phone,
            requirements=requirements or [],
            notes=notes or None,
        )
        act = await self.repo.create_act(data)

        # Confirmar contratación tras aprobación
        act = await self.repo.update_act(
            act.id, {"status": "contracted"}
        )
        if act is None:
            return {
                "status": "error",
                "message": f"No se pudo confirmar la contratación de '{artist_name}'.",
            }

        logger.info(
            "[cultural_social] Entertainment act contracted: %s (%s)",
            act.artist_name,
            act.id,
        )

        return {
            "status": "success",
            "message": (
                f"🎪 Artista '{act.artist_name}' aprobado y contratado. "
                f"¡Listo para el show!"
            ),
            "act": act.model_dump(mode="json"),
        }

    # ──────────────────────────────────────────────────
    # 🔴 TOOL: MANAGE CULTURAL PROGRAM (HITL)
    # ──────────────────────────────────────────────────

    @MCPTool(
        name="manage_cultural_program",
        description=(
            "Crear y gestionar programas culturales del club. "
            "REQUIERE APROBACIÓN HUMANA para crear nuevos programas. "
            "Incluye series musicales, talleres artísticos, charlas y más."
        ),
        approval=ApprovalLevel.HITL,
        approver_roles=["admin"],
    )
    async def manage_cultural_program(
        self,
        action: str = "list",
        program_id: str = "",
        name: str = "",
        category: str = "music",
        description: str = "",
        season: str = "",
        start_date: str = "",
        end_date: str = "",
        coordinator_member_id: str = "",
        max_participants: int = 0,
        budget: float = 0.0,
        new_status: str = "",
        notes: str = "",
        requested_by: str = "system",
    ) -> dict[str, Any]:
        # ── List ──
        if action == "list":
            cat_filter = None
            if category:
                try:
                    cat_filter = CulturalCategory(category)
                except ValueError:
                    pass
            programs = await self.repo.list_programs(
                category=cat_filter, season=season or None
            )
            return {
                "status": "success",
                "message": f"📋 Encontramos {len(programs)} programas culturales.",
                "programs": [p.model_dump(mode="json") for p in programs],
            }

        # ── Get ──
        if action == "get":
            if not program_id:
                return {
                    "status": "error",
                    "message": "Se requiere program_id 🤔",
                }
            program = await self.repo.get_program(program_id)
            if not program:
                return {
                    "status": "not_found",
                    "message": f"No encontramos el programa {program_id} 😊",
                }
            return {
                "status": "success",
                "program": program.model_dump(mode="json"),
            }

        # ── Create → HITL ──
        if action == "create":
            if not all(
                [
                    name,
                    category,
                    description,
                    season,
                    start_date,
                    end_date,
                    coordinator_member_id,
                ]
            ):
                return {
                    "status": "error",
                    "message": (
                        "Faltan campos obligatorios: name, category, description, "
                        "season, start_date, end_date, coordinator_member_id 📋"
                    ),
                }

            try:
                cat = CulturalCategory(category)
            except ValueError:
                return {
                    "status": "error",
                    "message": (
                        f"Categoría no válida: '{category}'. "
                        f"Opciones: {', '.join(c.value for c in CulturalCategory)}"
                    ),
                }

            approval = await self.approval_engine.create_request(
                agent=self.agent_name,
                tool="manage_cultural_program",
                params={
                    "action": "create",
                    "name": name,
                    "category": category,
                    "description": description,
                    "season": season,
                    "start_date": start_date,
                    "end_date": end_date,
                    "coordinator_member_id": coordinator_member_id,
                    "max_participants": max_participants,
                    "budget": budget,
                    "notes": notes,
                },
                requested_by=requested_by,
                approval_level=ApprovalLevel.HITL,
                risk_summary=(
                    f"Nuevo programa cultural: {name} ({category}), "
                    f"temporada {season}. Presupuesto: ₡{budget:,.0f}"
                ),
                estimated_impact="Organización de espacio, instructores y materiales",
                affected_count=max_participants,
                approver_roles=["admin"],
            )

            logger.info(
                "[cultural_social] Program approval request: %s", name
            )

            return {
                "status": "pending_approval",
                "request_id": str(approval.request_id),
                "message": (
                    f"🎨 Programa '{name}' creado. "
                    f"Esperando aprobación del administrador."
                ),
                "details": {
                    "name": name,
                    "category": category,
                    "season": season,
                    "start_date": start_date,
                    "end_date": end_date,
                    "max_participants": max_participants,
                    "budget": budget,
                },
            }

        # ── Update Status ──
        if action == "update_status":
            if not program_id or not new_status:
                return {
                    "status": "error",
                    "message": "Se requiere program_id y new_status 🤔",
                }
            program = await self.repo.get_program(program_id)
            if not program:
                return {
                    "status": "not_found",
                    "message": f"No encontramos el programa {program_id} 😊",
                }
            program = await self.repo.update_program(
                program_id, {"status": new_status}
            )
            if program is None:
                return {
                    "status": "not_found",
                    "message": f"No encontramos el programa {program_id} 😊",
                }
            return {
                "status": "success",
                "message": (
                    f"✅ Programa '{program.name}' actualizado a: {new_status}."
                ),
                "program": program.model_dump(mode="json"),
            }

        return {
            "status": "error",
            "message": (
                f"Acción no válida: '{action}'. "
                f"Usa: list, get, create, update_status 🤔"
            ),
        }

    # ── INTERNAL: Execute cultural program after approval ──

    async def execute_cultural_program(
        self,
        name: str,
        category: str,
        description: str,
        season: str,
        start_date: str,
        end_date: str,
        coordinator_member_id: str,
        max_participants: int = 0,
        budget: float = 0.0,
        notes: str = "",
    ) -> dict[str, Any]:
        """Crea el programa cultural después de la aprobación HITL."""
        data = CreateCulturalProgram(
            name=name,
            category=CulturalCategory(category),
            description=description,
            season=season,
            start_date=start_date,
            end_date=end_date,
            coordinator_member_id=coordinator_member_id,
            max_participants=max_participants,
            budget=budget,
            notes=notes or None,
        )
        program = await self.repo.create_program(data)

        # Confirmar inmediatamente tras aprobación
        program = await self.repo.update_program(
            program.id, {"status": ProgramStatus.ACTIVE}
        )
        if program is None:
            return {
                "status": "error",
                "message": f"No se pudo activar el programa '{name}'.",
            }

        logger.info(
            "[cultural_social] Program confirmed: %s (%s)",
            program.name,
            program.id,
        )

        return {
            "status": "success",
            "message": (
                f"🎨 Programa '{program.name}' aprobado y confirmado. "
                f"¡Listo para inscripciones!"
            ),
            "program": program.model_dump(mode="json"),
        }

    # ──────────────────────────────────────────────────
    # 🟢 TOOL: MANAGE SOCIAL EVENTS (AUTO)
    # ──────────────────────────────────────────────────

    @MCPTool(
        name="manage_social_events",
        description=(
            "Crear, consultar y gestionar eventos sociales regulares: "
            "cenas temáticas, mixers, cócteles, brunchs y fiestas. "
            "Para galas formales usar organize_formal_gala."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def manage_social_events(
        self,
        action: str = "list",
        event_id: str = "",
        name: str = "",
        event_type: str = "",
        venue: str = "",
        venue_type: str = "lounge",
        date: str = "",
        start_time: str = "",
        end_time: str = "",
        organizer_member_id: str = "",
        description: str = "",
        guest_count: int = 0,
        budget: float = 0.0,
        menu_theme: str = "",
        dress_code: str = "",
        notes: str = "",
    ) -> dict[str, Any]:
        # ── List ──
        if action == "list":
            type_filter = None
            if event_type:
                try:
                    type_filter = EventType(event_type)
                except ValueError:
                    pass
            events = await self.repo.list_events(event_type=type_filter)
            return {
                "status": "success",
                "message": f"📋 Encontramos {len(events)} eventos sociales.",
                "events": [e.model_dump(mode="json") for e in events],
            }

        # ── Get ──
        if action == "get":
            if not event_id:
                return {
                    "status": "error",
                    "message": "Se requiere event_id 🤔",
                }
            event = await self.repo.get_event(event_id)
            if not event:
                return {
                    "status": "not_found",
                    "message": f"No encontramos el evento {event_id} 😊",
                }
            return {
                "status": "success",
                "event": event.model_dump(mode="json"),
            }

        # ── Create ──
        if action == "create":
            if event_type == "gala":
                return {
                    "status": "error",
                    "message": (
                        "Para galas formales, usá la herramienta "
                        "organize_formal_gala 🎭"
                    ),
                }

            if not all(
                [name, venue, date, start_time, end_time, organizer_member_id]
            ):
                return {
                    "status": "error",
                    "message": (
                        "Faltan campos obligatorios: name, venue, date, "
                        "start_time, end_time, organizer_member_id 📋"
                    ),
                }

            try:
                et = EventType(event_type)
            except ValueError:
                return {
                    "status": "error",
                    "message": (
                        f"Tipo de evento no válido: '{event_type}'. "
                        f"Opciones: {', '.join(e.value for e in EventType)}"
                    ),
                }

            try:
                vt = VenueType(venue_type)
            except ValueError:
                return {
                    "status": "error",
                    "message": (
                        f"Tipo de venue no válido: '{venue_type}'. "
                        f"Opciones: {', '.join(v.value for v in VenueType)}"
                    ),
                }

            data = CreateCulturalEvent(
                name=name,
                event_type=et,
                venue=venue,
                venue_type=vt,
                date=date,
                start_time=start_time,
                end_time=end_time,
                organizer_member_id=organizer_member_id,
                description=description,
                guest_count=guest_count,
                budget=budget,
                menu_theme=menu_theme,
                dress_code=dress_code,
                notes=notes or None,
            )
            event = await self.repo.create_event(data)

            logger.info(
                "[cultural_social] Social event created: %s on %s",
                event.name,
                event.date,
            )

            return {
                "status": "success",
                "message": (
                    f"🎉 Evento '{event.name}' creado para el {event.date}."
                ),
                "event": event.model_dump(mode="json"),
            }

        # ── Update ──
        if action == "update":
            if not event_id:
                return {
                    "status": "error",
                    "message": "Se requiere event_id para actualizar 🤔",
                }

            updates: dict[str, Any] = {}
            if name:
                updates["name"] = name
            if venue:
                updates["venue"] = venue
            if date:
                updates["date"] = date
            if start_time:
                updates["start_time"] = start_time
            if end_time:
                updates["end_time"] = end_time
            if description:
                updates["description"] = description
            if guest_count:
                updates["guest_count"] = guest_count
            if budget:
                updates["budget"] = budget
            if menu_theme:
                updates["menu_theme"] = menu_theme
            if dress_code:
                updates["dress_code"] = dress_code

            event = await self.repo.update_event(event_id, updates)
            if not event:
                return {
                    "status": "not_found",
                    "message": f"No encontramos el evento {event_id} 😊",
                }

            return {
                "status": "success",
                "message": f"✏️ Evento '{event.name}' actualizado exitosamente.",
                "event": event.model_dump(mode="json"),
            }

        # ── Cancel ──
        if action == "cancel":
            if not event_id:
                return {
                    "status": "error",
                    "message": "Se requiere event_id para cancelar 🤔",
                }
            event = await self.repo.get_event(event_id)
            if not event:
                return {
                    "status": "not_found",
                    "message": f"No encontramos el evento {event_id} 😊",
                }
            event = await self.repo.cancel_event(event_id)
            if event is None:
                return {
                    "status": "not_found",
                    "message": f"No encontramos el evento {event_id} 😊",
                }
            return {
                "status": "success",
                "message": f"❌ Evento '{event.name}' cancelado.",
                "event": event.model_dump(mode="json"),
            }

        return {
            "status": "error",
            "message": (
                f"Acción no válida: '{action}'. "
                f"Usa: create, get, list, update, cancel 🤔"
            ),
        }

    # ──────────────────────────────────────────────────
    # 🟢 TOOL: MANAGE ART EXHIBITIONS (AUTO)
    # ──────────────────────────────────────────────────

    @MCPTool(
        name="manage_art_exhibitions",
        description=(
            "Crear, consultar y gestionar exposiciones de arte y cultura "
            "en los espacios del club."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def manage_art_exhibitions(
        self,
        action: str = "list",
        exhibition_id: str = "",
        title: str = "",
        artist_name: str = "",
        category: str = "visual_arts",
        description: str = "",
        venue: str = "",
        venue_type: str = "lounge",
        start_date: str = "",
        end_date: str = "",
        num_pieces: int = 0,
        curator_member_id: str = "",
        opening_reception: bool = False,
        new_status: str = "",
        notes: str = "",
    ) -> dict[str, Any]:
        # ── List ──
        if action == "list":
            cat_filter = None
            if category:
                try:
                    cat_filter = CulturalCategory(category)
                except ValueError:
                    pass
            exhibitions = await self.repo.list_exhibitions(category=cat_filter)
            return {
                "status": "success",
                "message": (
                    f"🖼️ Encontramos {len(exhibitions)} exposiciones."
                ),
                "exhibitions": [e.model_dump(mode="json") for e in exhibitions],
            }

        # ── Get ──
        if action == "get":
            if not exhibition_id:
                return {
                    "status": "error",
                    "message": "Se requiere exhibition_id 🤔",
                }
            exhibition = await self.repo.get_exhibition(exhibition_id)
            if not exhibition:
                return {
                    "status": "not_found",
                    "message": f"No encontramos la exposición {exhibition_id} 😊",
                }
            return {
                "status": "success",
                "exhibition": exhibition.model_dump(mode="json"),
            }

        # ── Create ──
        if action == "create":
            if not all([title, artist_name, venue, start_date, end_date]):
                return {
                    "status": "error",
                    "message": (
                        "Faltan campos obligatorios: title, artist_name, "
                        "venue, start_date, end_date 📋"
                    ),
                }

            try:
                cat = CulturalCategory(category)
            except ValueError:
                return {
                    "status": "error",
                    "message": (
                        f"Categoría no válida: '{category}'. "
                        f"Opciones: {', '.join(c.value for c in CulturalCategory)}"
                    ),
                }

            try:
                vt = VenueType(venue_type)
            except ValueError:
                return {
                    "status": "error",
                    "message": (
                        f"Tipo de venue no válido: '{venue_type}'. "
                        f"Opciones: {', '.join(v.value for v in VenueType)}"
                    ),
                }

            data = CreateArtExhibition(
                title=title,
                artist_name=artist_name,
                category=cat,
                description=description,
                venue=venue,
                venue_type=vt,
                start_date=start_date,
                end_date=end_date,
                num_pieces=num_pieces,
                curator_member_id=curator_member_id,
                opening_reception=opening_reception,
                notes=notes or None,
            )
            exhibition = await self.repo.create_exhibition(data)

            logger.info(
                "[cultural_social] Exhibition created: %s by %s",
                exhibition.title,
                artist_name,
            )

            return {
                "status": "success",
                "message": (
                    f"🖼️ Exposición '{exhibition.title}' de {artist_name} "
                    f"creada exitosamente."
                ),
                "exhibition": exhibition.model_dump(mode="json"),
            }

        # ── Update Status ──
        if action == "update_status":
            if not exhibition_id or not new_status:
                return {
                    "status": "error",
                    "message": "Se requiere exhibition_id y new_status 🤔",
                }
            exhibition = await self.repo.get_exhibition(exhibition_id)
            if not exhibition:
                return {
                    "status": "not_found",
                    "message": (
                        f"No encontramos la exposición {exhibition_id} 😊"
                    ),
                }
            exhibition = await self.repo.update_exhibition(
                exhibition_id, {"status": new_status}
            )
            if exhibition is None:
                return {
                    "status": "not_found",
                    "message": (
                        f"No encontramos la exposición {exhibition_id} 😊"
                    ),
                }
            return {
                "status": "success",
                "message": (
                    f"✅ Exposición '{exhibition.title}' actualizada a: {new_status}."
                ),
                "exhibition": exhibition.model_dump(mode="json"),
            }

        return {
            "status": "error",
            "message": (
                f"Acción no válida: '{action}'. "
                f"Usa: list, get, create, update_status 🤔"
            ),
        }

    # ──────────────────────────────────────────────────
    # 🟢 TOOL: GET CULTURAL CALENDAR (AUTO)
    # ──────────────────────────────────────────────────

    @MCPTool(
        name="get_cultural_calendar",
        description=(
            "Consultar el calendario cultural y social completo del club. "
            "Incluye eventos sociales, exposiciones Y programas culturales "
            "en un rango de fechas, con detección de conflictos y estadísticas."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_cultural_calendar(
        self,
        date_from: str = "",
        date_to: str = "",
    ) -> dict[str, Any]:
        # ── Gather all sources ──
        events = await self.repo.list_events(
            date_from=date_from or None,
            date_to=date_to or None,
        )
        exhibitions = await self.repo.list_exhibitions()
        programs = await self.repo.list_programs()  # F31: programs added

        calendar: list[dict[str, Any]] = []

        # ── Events ──
        for ev in events:
            calendar.append({
                "title": ev.name,
                "type": "event",
                "event_type": ev.event_type.value,
                "date": ev.date,
                "start_time": ev.start_time,
                "end_time": ev.end_time,
                "venue": ev.venue,
                "venue_type": ev.venue_type.value,
                "status": ev.status.value,
                "formality": ev.formality.value,
                "description": ev.description,
                "guest_count": ev.guest_count,
                "budget": ev.budget,
            })

        # ── Exhibitions (filter by date range) ──
        for ex in exhibitions:
            if date_from and ex.end_date < date_from:
                continue
            if date_to and ex.start_date > date_to:
                continue
            calendar.append({
                "title": ex.title,
                "type": "exhibition",
                "category": ex.category.value,
                "date": ex.start_date,
                "end_date": ex.end_date,
                "venue": ex.venue,
                "venue_type": ex.venue_type.value,
                "status": ex.status.value,
                "description": ex.description,
                "artist": ex.artist_name,
                "num_pieces": ex.num_pieces,
                "opening_reception": ex.opening_reception,
            })

        # ── F31: Programs (filter by date range) ──
        for prog in programs:
            if date_from and prog.end_date < date_from:
                continue
            if date_to and prog.start_date > date_to:
                continue
            calendar.append({
                "title": prog.name,
                "type": "program",
                "category": prog.category.value,
                "date": prog.start_date,
                "end_date": prog.end_date,
                "venue": "",
                "status": prog.status.value,
                "description": prog.description,
                "season": prog.season,
                "enrollment": (
                    f"{prog.current_participants}/{prog.max_participants}"
                    if prog.max_participants > 0 else "sin límite"
                ),
                "budget": prog.budget,
            })

        # ── Sort by date ──
        calendar.sort(key=lambda item: item.get("date", ""))

        # ── F31: Summary statistics ──
        type_counts: dict[str, int] = {}
        for item in calendar:
            t = item.get("type", "unknown")
            type_counts[t] = type_counts.get(t, 0) + 1

        # ── F31: Conflict detection (same date + venue) ──
        date_venue_items: dict[str, list[str]] = defaultdict(list)
        for item in calendar:
            venue = item.get("venue", "")
            if venue:
                key = f"{item.get('date', '')}|{venue}"
                date_venue_items[key].append(item.get("title", ""))

        conflicts = []
        for key, titles in date_venue_items.items():
            if len(titles) > 1:
                date_str, venue = key.split("|", 1)
                conflicts.append({
                    "date": date_str,
                    "venue": venue,
                    "items": titles,
                    "count": len(titles),
                })

        if not calendar:
            return {
                "status": "success",
                "message": "📅 No hay actividades culturales programadas.",
                "calendar": [],
                "total_items": 0,
                "summary": {"event": 0, "exhibition": 0, "program": 0},
                "conflicts": [],
                "has_conflicts": False,
            }

        return {
            "status": "success",
            "message": (
                f"📅 Calendario cultural: {len(calendar)} actividad(es) "
                f"programada(s). "
                f"{'⚠️ ' + str(len(conflicts)) + ' conflicto(s) de venue.' if conflicts else ''}"
            ),
            "calendar": calendar,
            "total_items": len(calendar),
            "summary": {
                "event": type_counts.get("event", 0),
                "exhibition": type_counts.get("exhibition", 0),
                "program": type_counts.get("program", 0),
            },
            "conflicts": conflicts,
            "has_conflicts": len(conflicts) > 0,
        }

    # ══════════════════════════════════════════════════════
    #  F31 — INTELLIGENCE LAYER (3 new tools)
    # ══════════════════════════════════════════════════════

    # ──────────────────────────────────────────────────
    # 🟢 TOOL: GET CULTURAL ANALYTICS (AUTO)
    # ──────────────────────────────────────────────────

    @MCPTool(
        name="get_cultural_analytics",
        description=(
            "Análisis cultural de 9 dimensiones: rendimiento por categoría, "
            "utilización de venues, ROI de entretenimiento, tendencias de "
            "asistencia, presupuesto, patrones estacionales, inscripción "
            "a programas, engagement de exposiciones y señales cross-domain."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_cultural_analytics(
        self,
        period_days: int = 90,
    ) -> dict[str, Any]:
        try:
            events = await self.repo.list_events()
            programs = await self.repo.list_programs()
            exhibitions = await self.repo.list_exhibitions()
            acts = await self.repo.list_acts()
            upcoming = await self.repo.get_upcoming(days=30)

            # D1: Category Performance
            cat_data: dict[str, dict] = {}
            for prog in programs:
                cat = prog.category.value
                if cat not in cat_data:
                    cat_data[cat] = {
                        "category": cat, "event_count": 0,
                        "total_attendance": 0, "total_budget": 0.0,
                    }
                cat_data[cat]["event_count"] += 1
                cat_data[cat]["total_attendance"] += prog.current_participants
                cat_data[cat]["total_budget"] += prog.budget

            category_performance = []
            for cd in cat_data.values():
                n = cd["event_count"]
                cd["avg_attendance"] = round(cd["total_attendance"] / n, 1) if n else 0
                cd["avg_budget_per_event"] = round(cd["total_budget"] / n, 0) if n else 0
                cd["engagement_score"] = min(100, round(cd["avg_attendance"] * 15, 0))
                category_performance.append(CategoryPerformance(**cd))

            # D2: Venue Utilization
            venue_data = await self.repo.get_venue_utilization()
            total_entity_count = len(events) + len(exhibitions)
            venue_utilization = []
            for vd in venue_data:
                venue_utilization.append(VenueUtilizationAnalytics(
                    venue=vd["venue"],
                    venue_type=vd.get("venue_type", ""),
                    total_bookings=vd["bookings"],
                    total_guests=vd["total_guests"],
                    avg_guests=vd["avg_guests"],
                    total_budget=vd["total_budget"],
                    utilization_rate=min(100, round(
                        vd["bookings"] / max(1, total_entity_count) * 100, 1
                    )),
                ))

            # D3: Entertainment ROI
            ent_data = await self.repo.get_entertainment_costs()
            entertainment_roi = [EntertainmentROI(
                entertainment_type=ed["type"],
                total_acts=ed["total_acts"],
                contracted=ed["contracted"],
                contracted_rate=ed["contracted_rate"],
                total_cost=ed["total_cost"],
                avg_cost=ed["avg_cost"],
                total_duration=ed["total_duration"],
                cost_per_minute=ed["cost_per_minute"],
            ) for ed in ent_data]

            # D4: Attendance Trends (30-day)
            total_events_30d = len(upcoming["events"])
            avg_att_30d = (
                sum(e.guest_count for e in upcoming["events"]) / max(1, total_events_30d)
            )

            # D5: Budget Analysis
            total_budget = sum(p.budget for p in programs) + sum(e.budget for e in events)
            spent = sum(
                p.budget for p in programs
                if p.status in (ProgramStatus.ACTIVE, ProgramStatus.COMPLETED)
            )
            spent += sum(
                e.budget for e in events
                if e.status in (EventStatus.COMPLETED, EventStatus.IN_PROGRESS)
            )

            # D6: Seasonal Patterns
            seasonal_data = await self.repo.get_seasonal_data()
            seasonal_patterns = [SeasonalPattern(
                season=sd["season"],
                program_count=sd["programs"],
                total_budget=sd["total_budget"],
                total_participants=sd["total_participants"],
                max_participants=sd["max_participants"],
                enrollment_rate=sd["enrollment_rate"],
            ) for sd in seasonal_data]

            # D7: Program Enrollment
            active_programs = [p for p in programs if p.status == ProgramStatus.ACTIVE]
            enrollment_pcts = [
                p.current_participants / p.max_participants * 100
                for p in active_programs if p.max_participants > 0
            ]
            avg_enrollment = sum(enrollment_pcts) / max(1, len(enrollment_pcts))
            below_threshold = sum(1 for e in enrollment_pcts if e < 30)

            # D8: Exhibition Engagement
            active_exh = [x for x in exhibitions if x.status == ExhibitionStatus.ACTIVE]
            durations = []
            for x in exhibitions:
                try:
                    s = datetime.fromisoformat(x.start_date)
                    e = datetime.fromisoformat(x.end_date)
                    durations.append((e - s).days)
                except (ValueError, TypeError):
                    pass
            avg_dur = sum(durations) / max(1, len(durations))
            with_reception = sum(1 for x in exhibitions if x.opening_reception)

            # D9: Cross-domain Signals
            signals: list[str] = []
            if total_budget > 0 and spent / total_budget > 0.9:
                signals.append(
                    "Budget cultural al 90%+ — revisar antes de temporada alta"
                )
            if active_programs and avg_enrollment < 40:
                signals.append(
                    "Programas con baja inscripción — mejorar comunicación o replantear oferta"
                )
            if total_events_30d > 12:
                signals.append(
                    "Alta densidad de eventos próximos — posible canibalización de asistencia"
                )
            if total_events_30d < 3:
                signals.append(
                    "Baja actividad cultural — oportunidad para activar espacios y crear comunidad"
                )
            if active_programs and not any(
                p.category == CulturalCategory.GASTRONOMY for p in active_programs
            ):
                signals.append(
                    "Sin programas gastronómicos — categoría con alta demanda en clubes CR"
                )

            return CulturalAnalytics(
                status="success",
                message=(
                    f"📊 Análisis cultural: {len(category_performance)} categorías, "
                    f"{len(venue_utilization)} venues, "
                    f"{len(entertainment_roi)} tipos de entretenimiento"
                ),
                category_performance=category_performance,
                venue_utilization=venue_utilization,
                entertainment_roi=entertainment_roi,
                attendance_trend="stable",
                attendance_trend_pct=0.0,
                avg_attendance_30d=round(avg_att_30d, 1),
                total_events_30d=total_events_30d,
                total_budget_planned=round(total_budget, 0),
                total_budget_spent=round(spent, 0),
                budget_utilization_pct=round(spent / max(1, total_budget) * 100, 1),
                budget_variance_pct=round(
                    (spent - total_budget) / max(1, total_budget) * 100, 1
                ),
                seasonal_patterns=seasonal_patterns,
                current_season="",
                total_programs=len(programs),
                active_programs=len(active_programs),
                avg_enrollment_pct=round(avg_enrollment, 1),
                programs_below_threshold=below_threshold,
                total_exhibitions=len(exhibitions),
                active_exhibitions=len(active_exh),
                avg_exhibition_duration_days=round(avg_dur, 1),
                exhibitions_with_reception_pct=round(
                    with_reception / max(1, len(exhibitions)) * 100, 1
                ),
                cross_domain_signals=signals,
            ).model_dump(mode="json")

        except Exception as exc:
            logger.error("[cultural_social] Analytics error: %s", exc)
            return {
                "status": "error",
                "message": f"Error en análisis cultural: {exc}",
            }

    # ──────────────────────────────────────────────────
    # 🟢 TOOL: GET CULTURAL SUMMARY (AUTO)
    # ──────────────────────────────────────────────────

    @MCPTool(
        name="get_cultural_summary",
        description=(
            "Resumen ejecutivo cultural para el Executive Dashboard. "
            "KPIs, health score, highlights y alertas del dominio cultural."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_cultural_summary(self) -> dict[str, Any]:
        try:
            upcoming = await self.repo.get_upcoming(days=30)
            all_events = await self.repo.list_events()
            all_programs = await self.repo.list_programs()
            all_exhibitions = await self.repo.list_exhibitions()
            all_acts = await self.repo.list_acts()

            events_30d = upcoming["events"]
            programs_upcoming = upcoming["programs"]
            exhibitions_upcoming = upcoming["exhibitions"]

            # Health score (5-factor composite)
            # Factor 1: Programming diversity (Shannon entropy)
            categories = [p.category.value for p in all_programs]
            if categories:
                from collections import Counter
                counts = Counter(categories)
                total = len(categories)
                entropy = -sum(
                    (c / total) * __import__("math").log2(c / total)
                    for c in counts.values()
                )
                max_entropy = __import__("math").log2(7)  # 7 possible categories
                diversity_score = min(100, round(entropy / max_entropy * 100, 0))
            else:
                diversity_score = 0

            # Factor 2: Calendar density (2-4 per week = optimal)
            weeks = 4
            density = len(events_30d) / weeks
            if 2 <= density <= 4:
                density_score = 100
            elif density < 2:
                density_score = max(0, round(density / 2 * 100, 0))
            else:
                density_score = max(0, 100 - round((density - 4) * 15, 0))

            # Factor 3: Program enrollment
            active_progs = [p for p in all_programs if p.status == ProgramStatus.ACTIVE]
            enrollments = [
                p.current_participants / p.max_participants * 100
                for p in active_progs if p.max_participants > 0
            ]
            enrollment_score = (
                min(100, round(sum(enrollments) / max(1, len(enrollments)), 0))
            )

            # Factor 4: Entertainment portfolio (diversity of types)
            ent_types = set(a.entertainment_type.value for a in all_acts)
            portfolio_score = min(100, round(len(ent_types) / 7 * 100, 0))

            # Factor 5: Exhibition engagement
            active_exh = [x for x in all_exhibitions if x.status == ExhibitionStatus.ACTIVE]
            exhibition_score = min(100, round(
                len(active_exh) * 30 + sum(1 for x in all_exhibitions if x.opening_reception) * 10,
                0,
            ))

            health_score = round(
                diversity_score * 0.20 + density_score * 0.20 + enrollment_score * 0.25
                + portfolio_score * 0.15 + exhibition_score * 0.20
            )

            if health_score >= 85:
                health_level = "excepcional"
            elif health_score >= 65:
                health_level = "saludable"
            elif health_score >= 45:
                health_level = "atención"
            else:
                health_level = "crítico"

            # Highlights
            galas = [
                e for e in events_30d
                if e.event_type == EventType.GALA and e.status != EventStatus.CANCELLED
            ]
            galas.sort(key=lambda g: g.date)
            next_gala = None
            if galas:
                g = galas[0]
                next_gala = {
                    "name": g.name, "date": g.date,
                    "venue": g.venue, "formality": g.formality.value,
                    "guest_count": g.guest_count,
                }

            featured = None
            if active_exh:
                x = active_exh[0]
                featured = {
                    "title": x.title, "artist": x.artist_name,
                    "venue": x.venue, "end_date": x.end_date,
                }

            top_prog = None
            if active_progs:
                active_progs.sort(key=lambda p: p.current_participants, reverse=True)
                p = active_progs[0]
                top_prog = {
                    "name": p.name, "category": p.category.value,
                    "enrollment": (
                        f"{p.current_participants}/{p.max_participants}"
                        if p.max_participants > 0 else "sin límite"
                    ),
                }

            # Alerts
            alerts: list[str] = []
            if health_score < 45:
                alerts.append("Health score cultural crítico — requiere atención inmediata")
            if enrollment_score < 30:
                alerts.append("Programas con inscripción muy baja")
            if not events_30d:
                alerts.append("Sin eventos culturales programados para los próximos 30 días")

            # Total budget
            total_budget = sum(p.budget for p in all_programs) + sum(e.budget for e in all_events)

            return CulturalSummary(
                status="success",
                message=(
                    f"🎭 Resumen cultural: {len(events_30d)} eventos próximos, "
                    f"{len(active_exh)} exposiciones activas, "
                    f"{len(active_progs)} programas activos"
                ),
                upcoming_events_30d=len(events_30d),
                active_exhibitions=len(active_exh),
                active_programs=len(active_progs),
                total_entertainment_acts=len(all_acts),
                total_budget=round(total_budget, 0),
                budget_utilized_pct=0.0,
                cultural_health_score=health_score,
                health_level=health_level,
                next_gala=next_gala,
                featured_exhibition=featured,
                top_program=top_prog,
                alerts=alerts,
                events_this_week=0,
                events_next_week=0,
            ).model_dump(mode="json")

        except Exception as exc:
            logger.error("[cultural_social] Summary error: %s", exc)
            return {
                "status": "error",
                "message": f"Error en resumen cultural: {exc}",
            }

    # ──────────────────────────────────────────────────
    # 🟢 TOOL: GENERATE CULTURAL PROPOSALS (AUTO) — THE GAME CHANGER
    # ──────────────────────────────────────────────────

    _PROPOSALS_SYSTEM_PROMPT = (
        "Eres el Estratega de Engagement Cultural del Castillo Country Club — "
        "un experto en transformar clubes privados en comunidades vibrantes.\n\n"
        "Tu misión: generar propuestas accionables que hagan que los socios sientan "
        "que el club es SU segundo hogar.\n\n"
        "LOS 5 PILARES DEL ENGAGEMENT CULTURAL:\n\n"
        "1. PROPUESTAS DE ACTIVIDADES — Proponé actividades que los socios hoy hacen "
        "FUERA del club: cenas temáticas → serie gastronómica del club, cumpleaños en "
        "restaurantes → fiestas privadas en el club, clases de arte externas → talleres "
        "del club, reuniones de trabajo en cafés → coworking en el club.\n\n"
        "2. INVITACIONES DIRIGIDAS — Conectá socios correctos con experiencias correctas: "
        "nuevos socios sin asistencia cultural, socios con intereses compartidos que nunca "
        "se cruzaron, familias que se beneficiarían de un programa específico.\n\n"
        "3. COHESIÓN GRUPAL — Construí comunidad a través de experiencias compartidas: "
        "clubes internos (book club, wine club, cooking circle), mentoría intergeneracional, "
        "actividades para grupos familiares del mismo sector.\n\n"
        "4. APROPIACIÓN DEL ESPACIO — Que cada rincón del club se sienta vivo: "
        "programación recurrente que cree rutina de visita, espacios que sean 'hogar' de "
        "un grupo específico, personalización para eventos privados de socios.\n\n"
        "5. INTEGRACIÓN DE ESTILO DE VIDA — Reemplazar servicios externos: "
        "coworking mornings para profesionales remotos, paquetes de cumpleaños infantiles, "
        "cenas privadas temáticas, clases de arte/música/cocina para toda la familia, "
        "reuniones de trabajo en salas del club.\n\n"
        "CONTEXTO COSTA RICA:\n"
        "- Temporada alta (Dic-Abr): más galas, eventos formales, actividades outdoor\n"
        "- Temporada verde (May-Nov): actividades íntimas, talleres, experiencias indoor\n"
        "- Fiestas Patrias (Sep), Semana Santa, Navidad son anclajes culturales\n"
        "- Club premium: ₡35,000-65,000 por guest en eventos formales\n"
        "- Clubes CR compiten en COMUNIDAD, no solo amenidades\n\n"
        "OUTPUT: Generá las propuestas como JSON que matchee el schema provisto. "
        "Cada propuesta debe ser ESPECÍFICA al Castillo, accionable, y con pasos concretos. "
        "No genéricos. PENSÁ como un socio del club."
    )

    @MCPTool(
        name="generate_cultural_proposals",
        description=(
            "Motor de Engagement Cultural Proactivo. Genera propuestas accionables "
            "para transformar la relación del socio con el club: nuevas actividades, "
            "invitaciones dirigidas, cohesión grupal, activación de espacios e "
            "integración de estilo de vida. "
            "El club debe ser el lugar donde los socios hagan TODO — "
            "no solo lo deportivo o social, sino la vida completa."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def generate_cultural_proposals(
        self,
        focus_area: str = "all",
        target_demographic: str = "all",
        season: str = "",
    ) -> dict[str, Any]:
        try:
            # Validate inputs
            try:
                FocusArea(focus_area)
            except ValueError:
                focus_area = "all"
            try:
                TargetDemographic(target_demographic)
            except ValueError:
                target_demographic = "all"

            # Gather rich context
            events = await self.repo.list_events()
            programs = await self.repo.list_programs()
            exhibitions = await self.repo.list_exhibitions()
            acts = await self.repo.list_acts()
            upcoming = await self.repo.get_upcoming(days=60)
            venue_data = await self.repo.get_venue_utilization()
            ent_data = await self.repo.get_entertainment_costs()

            # Build context for Claude
            ctx: list[str] = [
                "=== ESTADO ACTUAL DEL CASTILLO COUNTRY CLUB ===",
                "",
                f"Eventos sociales: {len(events)} total "
                f"({len(upcoming['events'])} próximos 60 días)",
                f"Programas culturales: {len(programs)} total "
                f"({len(upcoming['programs'])} activos/próximos)",
                f"Exposiciones: {len(exhibitions)} total "
                f"({len(upcoming['exhibitions'])} activas/próximas)",
                f"Actos de entretenimiento: {len(acts)} total",
                "",
            ]

            # Events context
            ctx.append("=== EVENTOS RECIENTES ===")
            for ev in events[-10:]:
                ctx.append(
                    f"- {ev.name} ({ev.event_type.value}) — {ev.venue}, {ev.date}, "
                    f"{ev.guest_count} invitados, ₡{ev.budget:,.0f}, "
                    f"formalidad: {ev.formality.value}"
                )

            # Programs context
            ctx.append("\n=== PROGRAMAS CULTURALES ===")
            for prog in programs:
                fill = (
                    f"{prog.current_participants}/{prog.max_participants}"
                    if prog.max_participants > 0 else "sin límite"
                )
                ctx.append(
                    f"- {prog.name} ({prog.category.value}) — {prog.season}, "
                    f"inscripción: {fill}, ₡{prog.budget:,.0f}, "
                    f"status: {prog.status.value}"
                )

            # Exhibitions context
            ctx.append("\n=== EXPOSICIONES ===")
            for ex in exhibitions:
                ctx.append(
                    f"- {ex.title} de {ex.artist_name} ({ex.category.value}) — "
                    f"{ex.venue}, {ex.start_date} a {ex.end_date}, "
                    f"{ex.num_pieces} piezas, "
                    f"recepción: {'sí' if ex.opening_reception else 'no'}"
                )

            # Entertainment context
            ctx.append("\n=== ENTRETENIMIENTO ===")
            for act in acts:
                ctx.append(
                    f"- {act.artist_name} ({act.entertainment_type.value}) — "
                    f"{act.genre}, {act.duration_minutes}min, ₡{act.cost:,.0f}, "
                    f"status: {act.status.value}"
                )

            # Venues context
            ctx.append("\n=== VENUES DISPONIBLES ===")
            for vd in venue_data:
                ctx.append(
                    f"- {vd['venue']} ({vd.get('venue_type', '?')}) — "
                    f"{vd['bookings']} reservas, promedio {vd['avg_guests']:.0f} invitados"
                )

            # Parameters
            ctx.append("\n=== PARÁMETROS DE GENERACIÓN ===")
            ctx.append(f"Focus area: {focus_area}")
            ctx.append(f"Demografía objetivo: {target_demographic}")
            ctx.append(f"Temporada: {season or 'auto-detectar según fecha actual'}")

            context = "\n".join(ctx)

            # Generate with Claude
            result = await self.claude_service.generate_json(
                system_prompt=self._PROPOSALS_SYSTEM_PROMPT,
                user_prompt=(
                    f"Basándote en el estado actual del Castillo Country Club, "
                    f"genera 5-8 propuestas de engagement cultural accionables.\n\n"
                    f"Focus area: {focus_area}\n"
                    f"Demografía objetivo: {target_demographic}\n"
                    f"Temporada: {season or 'actual'}\n\n"
                    f"RESPONDE EN JSON VÁLIDO con esta estructura exacta:\n"
                    f"{json.dumps(CulturalProposalsResponse.model_json_schema(), indent=2, ensure_ascii=False)}\n\n"
                    f"Contexto del club:\n{context}\n\n"
                    f"Genera propuestas que transformen cómo los socios usan el club. "
                    f"Cada propuesta debe ser ESPECÍFICA, accionable y conectada "
                    f"con el ecosistema completo del club."
                ),
                max_tokens=4096,
            )

            # Parse response
            if isinstance(result, dict):
                proposals_raw = result.get("proposals", [])
                proposals: list[CulturalProposal] = []
                for i, p in enumerate(proposals_raw):
                    p["id"] = f"prop-{i + 1:03d}"
                    try:
                        proposals.append(CulturalProposal(**p))
                    except Exception:
                        logger.warning(
                            "[cultural_social] Skipping invalid proposal %d", i
                        )
                        continue

                # Priority ranking by confidence × impact
                ranked = sorted(
                    proposals,
                    key=lambda p: p.confidence * (1 + p.expected_impact.engagement_lift_pct / 100),
                    reverse=True,
                )

                return CulturalProposalsResponse(
                    status="success",
                    message=(
                        f"🎯 {len(proposals)} propuestas de engagement cultural "
                        f"para {focus_area}"
                    ),
                    proposals=proposals,
                    engagement_score=result.get("engagement_score", 50),
                    total_proposals=len(proposals),
                    focus_area=focus_area,
                    priority_ranking=[p.title for p in ranked[:3]],
                ).model_dump(mode="json")

            return {
                "status": "error",
                "message": "No se pudieron generar propuestas culturales",
                "proposals": [],
                "total_proposals": 0,
            }

        except Exception as exc:
            logger.error("[cultural_social] Proposals error: %s", exc)
            return {
                "status": "error",
                "message": f"Error generando propuestas: {exc}",
                "proposals": [],
                "total_proposals": 0,
            }
