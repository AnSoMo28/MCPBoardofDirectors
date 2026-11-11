"""
GuestManagementAgent: Gesti\u00f3n de invitados y eventos privados.
Club: Castillo Country Club

TOOLS:
  plan_private_event          \U0001f534 HITL        Planificar eventos privados
  manage_trial_memberships    \U0001f534 HITL        Gestionar membres\u00edas de prueba
  register_guest              \U0001f7e1 SEMI_AUTO   Registrar invitados de socios
  manage_guest_privileges     \U0001f7e2 AUTO        Gestionar privilegios de invitados
  get_guest_analytics         \U0001f7e2 AUTO        Anal\u00edtica de invitados
"""

from __future__ import annotations

import logging
from datetime import date as date_type
from datetime import datetime, timezone
from typing import Any

from club_mcp.agents.base import BaseAgent, MCPTool
from club_mcp.db.repositories.guest_management_repo import (
    GuestManagementRepository,
)
from club_mcp.hitl.approval_types import ApprovalLevel
from club_mcp.models.guest_management import (
    CreateGuest,
    CreatePrivateEvent,
    CreateTrialMembership,
    GuestPrivilegeType,
    GuestStatus,
    PrivateEventStatus,
    PrivateEventType,
    TrialMembershipStatus,
    TrialMembershipType,
)


logger = logging.getLogger(__name__)


class GuestManagementAgent(BaseAgent):
    """
    Agente de gesti\u00f3n de invitados de Castillo Country Club.
    Gestiona registro de invitados, eventos privados,
    membres\u00edas de prueba y privilegios.
    """

    agent_name: str = "guest_management"
    description: str = "Gesti\u00f3n de invitados y eventos privados"

    _GUEST_LIMIT: int = 4  # M\u00e1ximo de invitados por familia por d\u00eda

    def __init__(
        self,
        repo: GuestManagementRepository | None = None,
        approval_engine: Any = None,
        notifier: Any = None,
    ) -> None:
        super().__init__()
        self.repo = repo if repo is not None else GuestManagementRepository()
        if approval_engine is not None:
            self.approval_engine = approval_engine
        self.notifier = notifier

    def _register_tools(self) -> None:
        pass

    @staticmethod
    def _parse_privileges(privileges_str: str) -> list[str]:
        return [p.strip() for p in privileges_str.split(",") if p.strip()]

    @staticmethod
    def _invalid_privileges(privileges: list[str]) -> list[str]:
        allowed = {item.value for item in GuestPrivilegeType}
        return sorted(set(privileges) - allowed)

    @staticmethod
    def _validate_date_range(start_date: str, end_date: str) -> str | None:
        try:
            parsed_start = date_type.fromisoformat(start_date)
            parsed_end = date_type.fromisoformat(end_date)
        except ValueError:
            return "Las fechas deben usar el formato AAAA-MM-DD."
        if parsed_end < parsed_start:
            return "La fecha de fin no puede ser anterior a la fecha de inicio."
        return None

    # \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
    # \U0001f534 TOOL: PLAN PRIVATE EVENT (HITL)
    # \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

    @MCPTool(
        name="plan_private_event",
        description=(
            "Planificar eventos privados en el club: bodas, bautizos, "
            "cumplea\u00f1os, aniversarios y eventos corporativos. "
            "REQUIERE APROBACI\u00d3N HUMANA. "
            "Alto valor y compromisos m\u00faltiples."
        ),
        approval=ApprovalLevel.HITL,
        approver_roles=["admin"],
    )
    async def plan_private_event(
        self,
        action: str = "list",
        event_id: str = "",
        family_id: str = "",
        event_name: str = "",
        event_type: str = "",
        venue: str = "",
        date: str = "",
        start_time: str = "",
        end_time: str = "",
        guest_count: int = 0,
        budget: float = 0.0,
        coordinator_member_id: str = "",
        description: str = "",
        special_requirements: str = "",
        catering_required: bool = False,
        decoration_required: bool = False,
        entertainment_required: bool = False,
        notes: str = "",
        new_status: str = "",
        requested_by: str = "system",
    ) -> dict[str, Any]:
        # \u2500\u2500 List \u2500\u2500
        if action == "list":
            events = await self.repo.list_private_events(
                family_id=family_id,
                event_type=event_type,
            )
            return {
                "status": "success",
                "message": (
                    f"\U0001f389 Encontramos {len(events)} evento(s) privado(s)."
                ),
                "events": [e.model_dump(mode="json") for e in events],
            }

        # \u2500\u2500 Get \u2500\u2500
        if action == "get":
            if not event_id:
                return {
                    "status": "error",
                    "message": "Se requiere event_id \U0001f50d",
                }
            event = await self.repo.get_private_event(event_id)
            if not event:
                return {
                    "status": "not_found",
                    "message": (
                        f"No encontramos el evento {event_id} \U0001f614"
                    ),
                }
            return {
                "status": "success",
                "event": event.model_dump(mode="json"),
            }

        # \u2500\u2500 Create \u2192 HITL \u2500\u2500
        if action == "create":
            if not all(
                [
                    family_id,
                    event_name,
                    event_type,
                    venue,
                    date,
                    coordinator_member_id,
                ]
            ):
                return {
                    "status": "error",
                    "message": (
                        "Faltan campos obligatorios: family_id, event_name, "
                        "event_type, venue, date, coordinator_member_id \U0001f4cb"
                    ),
                }

            try:
                date_type.fromisoformat(date)
            except ValueError:
                return {
                    "status": "error",
                    "message": "La fecha del evento debe usar el formato AAAA-MM-DD.",
                }

            if budget < 0:
                return {
                    "status": "error",
                    "message": "El presupuesto del evento no puede ser negativo.",
                }

            try:
                PrivateEventType(event_type)
            except ValueError:
                return {
                    "status": "error",
                    "message": (
                        f"Tipo de evento no v\u00e1lido: '{event_type}'. "
                        f"Opciones: {', '.join(e.value for e in PrivateEventType)}"
                    ),
                }

            approval = await self.approval_engine.create_request(
                agent=self.agent_name,
                tool="plan_private_event",
                params={
                    "action": "create",
                    "family_id": family_id,
                    "event_name": event_name,
                    "event_type": event_type,
                    "venue": venue,
                    "date": date,
                    "start_time": start_time,
                    "end_time": end_time,
                    "guest_count": guest_count,
                    "budget": budget,
                    "coordinator_member_id": coordinator_member_id,
                    "description": description,
                    "special_requirements": special_requirements,
                    "catering_required": catering_required,
                    "decoration_required": decoration_required,
                    "entertainment_required": entertainment_required,
                    "notes": notes,
                },
                requested_by=requested_by,
                approval_level=ApprovalLevel.HITL,
                risk_summary=(
                    f"Evento privado: {event_name} ({event_type}) "
                    f"en {venue} para {guest_count} invitados. "
                    f"Presupuesto: ${budget:,.0f}"
                ),
                estimated_impact=(
                    "Reservaci\u00f3n de venue, catering, "
                    "decoraci\u00f3n y log\u00edstica"
                ),
                affected_count=guest_count,
                approver_roles=["admin"],
            )

            logger.info(
                "[guest_management] Private event approval requested for family %s",
                family_id,
            )

            return {
                "status": "pending_approval",
                "request_id": str(approval.request_id),
                "message": (
                    f"\U0001f38a Evento privado '{event_name}' registrado. "
                    f"Esperando aprobaci\u00f3n del administrador."
                ),
                "details": {
                    "event_name": event_name,
                    "event_type": event_type,
                    "venue": venue,
                    "date": date,
                    "guest_count": guest_count,
                    "budget": budget,
                },
            }

        # \u2500\u2500 Update Status \u2500\u2500
        if action == "update_status":
            if not event_id or not new_status:
                return {
                    "status": "error",
                    "message": (
                        "Se requiere event_id y new_status \U0001f50d"
                    ),
                }
            try:
                status = PrivateEventStatus(new_status)
            except ValueError:
                valid = ", ".join(item.value for item in PrivateEventStatus)
                return {
                    "status": "error",
                    "message": f"Estado no válido: '{new_status}'. Opciones: {valid}",
                }
            event = await self.repo.get_private_event(event_id)
            if not event:
                return {
                    "status": "not_found",
                    "message": (
                        f"No encontramos el evento {event_id} \U0001f614"
                    ),
                }
            event = await self.repo.update_private_event(
                event_id, {"status": status.value}
            )
            if event is None:
                return {
                    "status": "not_found",
                    "message": f"No encontramos el evento {event_id}.",
                }
            return {
                "status": "success",
                "message": (
                    f"\u2705 Evento '{event.event_name}' "
                    f"actualizado a: {new_status}."
                ),
                "event": event.model_dump(mode="json"),
            }

        return {
            "status": "error",
            "message": (
                f"Acci\u00f3n no v\u00e1lida: '{action}'. "
                f"Usa: list, get, create, update_status \U0001f50d"
            ),
        }

    # \u2500\u2500 INTERNAL: Execute private event after HITL approval \u2500\u2500

    async def execute_private_event(
        self,
        family_id: str,
        event_name: str,
        event_type: str,
        venue: str,
        date: str,
        start_time: str = "",
        end_time: str = "",
        guest_count: int = 0,
        budget: float = 0.0,
        coordinator_member_id: str = "",
        description: str = "",
        special_requirements: str = "",
        catering_required: bool = False,
        decoration_required: bool = False,
        entertainment_required: bool = False,
        notes: str = "",
    ) -> dict[str, Any]:
        """Crea el evento privado despu\u00e9s de la aprobaci\u00f3n HITL."""
        data = CreatePrivateEvent(
            family_id=family_id,
            event_name=event_name,
            event_type=PrivateEventType(event_type),
            venue=venue,
            date=date,
            start_time=start_time,
            end_time=end_time,
            guest_count=guest_count,
            budget=budget,
            coordinator_member_id=coordinator_member_id,
            description=description,
            special_requirements=special_requirements,
            catering_required=catering_required,
            decoration_required=decoration_required,
            entertainment_required=entertainment_required,
            notes=notes,
        )
        event = await self.repo.create_private_event(data)

        # Confirmar inmediatamente tras aprobaci\u00f3n
        event = await self.repo.update_private_event(
            event.id, {"status": PrivateEventStatus.APPROVED.value}
        )
        if event is None:
            return {
                "status": "error",
                "message": "El evento se creó, pero no se pudo confirmar.",
            }

        logger.info(
            "[guest_management] Private event confirmed: %s",
            event.id,
        )

        return {
            "status": "success",
            "message": (
                f"\U0001f38a Evento privado '{event.event_name}' "
                f"aprobado y confirmado. \u00a1A planificar los detalles!"
            ),
            "event": event.model_dump(mode="json"),
        }

    # \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
    # \U0001f534 TOOL: MANAGE TRIAL MEMBERSHIPS (HITL)
    # \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

    @MCPTool(
        name="manage_trial_memberships",
        description=(
            "Gestionar membres\u00edas de prueba para invitados. "
            "REQUIERE APROBACI\u00d3N HUMANA. "
            "Ofrecer trial implica un compromiso impl\u00edcito "
            "con el candidato."
        ),
        approval=ApprovalLevel.HITL,
        approver_roles=["admin"],
    )
    async def manage_trial_memberships(
        self,
        action: str = "list",
        trial_id: str = "",
        guest_name: str = "",
        guest_email: str = "",
        guest_phone: str = "",
        referred_by_family_id: str = "",
        trial_type: str = "",
        start_date: str = "",
        end_date: str = "",
        privileges: str = "",
        notes: str = "",
        new_status: str = "",
        requested_by: str = "system",
    ) -> dict[str, Any]:
        # \u2500\u2500 List \u2500\u2500
        if action == "list":
            trials = await self.repo.list_trial_memberships(
                referred_by_family_id=referred_by_family_id,
                trial_type=trial_type,
            )
            return {
                "status": "success",
                "message": (
                    f"\U0001f4cb Encontramos "
                    f"{len(trials)} membres\u00eda(s) de prueba."
                ),
                "trial_memberships": [
                    t.model_dump(mode="json") for t in trials
                ],
            }

        # \u2500\u2500 Get \u2500\u2500
        if action == "get":
            if not trial_id:
                return {
                    "status": "error",
                    "message": "Se requiere trial_id \U0001f50d",
                }
            trial = await self.repo.get_trial_membership(trial_id)
            if not trial:
                return {
                    "status": "not_found",
                    "message": (
                        f"No encontramos la membres\u00eda "
                        f"{trial_id} \U0001f614"
                    ),
                }
            return {
                "status": "success",
                "trial_membership": trial.model_dump(mode="json"),
            }

        # \u2500\u2500 Create \u2192 HITL \u2500\u2500
        if action == "create":
            if not all(
                [
                    guest_name,
                    referred_by_family_id,
                    trial_type,
                    start_date,
                    end_date,
                ]
            ):
                return {
                    "status": "error",
                    "message": (
                        "Faltan campos obligatorios: guest_name, "
                        "referred_by_family_id, trial_type, "
                        "start_date, end_date \U0001f4cb"
                    ),
                }

            date_error = self._validate_date_range(start_date, end_date)
            if date_error:
                return {"status": "error", "message": date_error}

            try:
                TrialMembershipType(trial_type)
            except ValueError:
                return {
                    "status": "error",
                    "message": (
                        f"Tipo de trial no v\u00e1lido: '{trial_type}'. "
                        f"Opciones: "
                        f"{', '.join(t.value for t in TrialMembershipType)}"
                    ),
                }

            priv_list = (
                self._parse_privileges(privileges) if privileges else []
            )
            invalid_privileges = self._invalid_privileges(priv_list)
            if invalid_privileges:
                return {
                    "status": "error",
                    "message": (
                        "Privilegios no válidos: "
                        f"{', '.join(invalid_privileges)}. "
                        f"Opciones: "
                        f"{', '.join(item.value for item in GuestPrivilegeType)}"
                    ),
                }

            approval = await self.approval_engine.create_request(
                agent=self.agent_name,
                tool="manage_trial_memberships",
                params={
                    "action": "create",
                    "guest_name": guest_name,
                    "guest_email": guest_email,
                    "guest_phone": guest_phone,
                    "referred_by_family_id": referred_by_family_id,
                    "trial_type": trial_type,
                    "start_date": start_date,
                    "end_date": end_date,
                    "privileges": priv_list,
                    "notes": notes,
                },
                requested_by=requested_by,
                approval_level=ApprovalLevel.HITL,
                risk_summary=(
                    f"Membres\u00eda de prueba: {guest_name} "
                    f"({trial_type}), referida por familia "
                    f"{referred_by_family_id}"
                ),
                estimated_impact=(
                    "Acceso a instalaciones del club "
                    "por per\u00edodo de prueba"
                ),
                affected_count=1,
                approver_roles=["admin"],
            )

            logger.info(
                "[guest_management] Trial membership approval requested for family %s",
                referred_by_family_id,
            )

            return {
                "status": "pending_approval",
                "request_id": str(approval.request_id),
                "message": (
                    f"\U0001f3ab Membres\u00eda de prueba para "
                    f"'{guest_name}' registrada. "
                    f"Esperando aprobaci\u00f3n del administrador."
                ),
                "details": {
                    "guest_name": guest_name,
                    "trial_type": trial_type,
                    "start_date": start_date,
                    "end_date": end_date,
                    "referred_by_family_id": referred_by_family_id,
                },
            }

        # \u2500\u2500 Update Status \u2500\u2500
        if action == "update_status":
            if not trial_id or not new_status:
                return {
                    "status": "error",
                    "message": (
                        "Se requiere trial_id y new_status \U0001f50d"
                    ),
                }
            try:
                status = TrialMembershipStatus(new_status)
            except ValueError:
                valid = ", ".join(item.value for item in TrialMembershipStatus)
                return {
                    "status": "error",
                    "message": f"Estado no válido: '{new_status}'. Opciones: {valid}",
                }
            trial = await self.repo.get_trial_membership(trial_id)
            if not trial:
                return {
                    "status": "not_found",
                    "message": (
                        f"No encontramos la membres\u00eda "
                        f"{trial_id} \U0001f614"
                    ),
                }
            trial = await self.repo.update_trial_membership(
                trial_id, {"status": status.value}
            )
            if trial is None:
                return {
                    "status": "not_found",
                    "message": f"No encontramos la membresía {trial_id}.",
                }
            return {
                "status": "success",
                "message": (
                    f"\u2705 Membres\u00eda de '{trial.guest_name}' "
                    f"actualizada a: {new_status}."
                ),
                "trial_membership": trial.model_dump(mode="json"),
            }

        return {
            "status": "error",
            "message": (
                f"Acci\u00f3n no v\u00e1lida: '{action}'. "
                f"Usa: list, get, create, update_status \U0001f50d"
            ),
        }

    # \u2500\u2500 INTERNAL: Execute trial after HITL approval \u2500\u2500

    async def execute_trial_membership(
        self,
        guest_name: str,
        referred_by_family_id: str,
        trial_type: str,
        start_date: str,
        end_date: str,
        guest_email: str = "",
        guest_phone: str = "",
        privileges: list[str] | None = None,
        notes: str = "",
    ) -> dict[str, Any]:
        """Crea la membres\u00eda de prueba tras aprobaci\u00f3n HITL."""
        date_error = self._validate_date_range(start_date, end_date)
        if date_error:
            return {"status": "error", "message": date_error}

        try:
            parsed_trial_type = TrialMembershipType(trial_type)
        except ValueError:
            valid = ", ".join(item.value for item in TrialMembershipType)
            return {
                "status": "error",
                "message": f"Tipo de trial no válido: '{trial_type}'. Opciones: {valid}",
            }

        validated_privileges = privileges or []
        invalid_privileges = self._invalid_privileges(validated_privileges)
        if invalid_privileges:
            return {
                "status": "error",
                "message": (
                    "Privilegios no válidos: "
                    f"{', '.join(invalid_privileges)}. "
                    f"Opciones: "
                    f"{', '.join(item.value for item in GuestPrivilegeType)}"
                ),
            }

        data = CreateTrialMembership(
            guest_name=guest_name,
            guest_email=guest_email,
            guest_phone=guest_phone,
            referred_by_family_id=referred_by_family_id,
            trial_type=parsed_trial_type,
            start_date=start_date,
            end_date=end_date,
            privileges=validated_privileges,
            notes=notes,
        )
        trial = await self.repo.create_trial_membership(data)

        # Aprobar inmediatamente tras aprobaci\u00f3n HITL
        trial = await self.repo.update_trial_membership(
            trial.id, {"status": TrialMembershipStatus.APPROVED.value}
        )
        if trial is None:
            return {
                "status": "error",
                "message": "La membresía se creó, pero no se pudo aprobar.",
            }

        logger.info(
            "[guest_management] Trial membership approved: %s",
            trial.id,
        )

        return {
            "status": "success",
            "message": (
                f"\U0001f3ab Membres\u00eda de prueba de "
                f"'{trial.guest_name}' aprobada. "
                f"\u00a1Bienvenido al club!"
            ),
            "trial_membership": trial.model_dump(mode="json"),
        }

    # \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
    # \U0001f7e1 TOOL: REGISTER GUEST (SEMI_AUTO)
    # \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

    @MCPTool(
        name="register_guest",
        description=(
            "Registrar invitados de socios en el club. "
            "Hasta 4 invitados por familia por d\u00eda. "
            "Si se excede el l\u00edmite, "
            "requiere aprobaci\u00f3n administrativa."
        ),
        approval=ApprovalLevel.SEMI_AUTO,
    )
    async def register_guest(
        self,
        action: str = "list",
        guest_id: str = "",
        family_id: str = "",
        host_member_id: str = "",
        guest_name: str = "",
        guest_email: str = "",
        guest_phone: str = "",
        visit_date: str = "",
        purpose: str = "",
        privileges: str = "",
        notes: str = "",
        requested_by: str = "system",
    ) -> dict[str, Any]:
        # \u2500\u2500 List \u2500\u2500
        if action == "list":
            guests = await self.repo.list_guests(
                family_id=family_id,
                visit_date=visit_date,
            )
            return {
                "status": "success",
                "message": (
                    f"\U0001f465 Encontramos {len(guests)} invitado(s)."
                ),
                "guests": [g.model_dump(mode="json") for g in guests],
            }

        # \u2500\u2500 Get \u2500\u2500
        if action == "get":
            if not guest_id:
                return {
                    "status": "error",
                    "message": "Se requiere guest_id \U0001f50d",
                }
            guest = await self.repo.get_guest(guest_id)
            if not guest:
                return {
                    "status": "not_found",
                    "message": (
                        f"No encontramos el invitado "
                        f"{guest_id} \U0001f614"
                    ),
                }
            return {
                "status": "success",
                "guest": guest.model_dump(mode="json"),
            }

        # \u2500\u2500 Create \u2500\u2500
        if action == "create":
            if not all(
                [family_id, host_member_id, guest_name, visit_date]
            ):
                return {
                    "status": "error",
                    "message": (
                        "Faltan campos obligatorios: family_id, "
                        "host_member_id, guest_name, visit_date \U0001f4cb"
                    ),
                }

            try:
                date_type.fromisoformat(visit_date)
            except ValueError:
                return {
                    "status": "error",
                    "message": "La fecha de visita debe usar el formato AAAA-MM-DD.",
                }

            privilege_list = self._parse_privileges(privileges)
            valid_privileges = {item.value for item in GuestPrivilegeType}
            invalid_privileges = sorted(set(privilege_list) - valid_privileges)
            if invalid_privileges:
                return {
                    "status": "error",
                    "message": (
                        "Privilegios no válidos: "
                        f"{', '.join(invalid_privileges)}. "
                        f"Opciones: {', '.join(sorted(valid_privileges))}"
                    ),
                }

            # Verificar l\u00edmite de invitados
            all_guests = await self.repo.list_guests(
                family_id=family_id,
                visit_date=visit_date,
            )
            active_statuses = {
                GuestStatus.REGISTERED,
                GuestStatus.CHECKED_IN,
            }
            total_active = sum(
                1
                for g in all_guests
                if g.status in active_statuses
            )

            if total_active >= self._GUEST_LIMIT:
                # Excede l\u00edmite \u2192 HITL
                approval = await self.approval_engine.create_request(
                    agent=self.agent_name,
                    tool="register_guest",
                    params={
                        "action": "create",
                        "family_id": family_id,
                        "host_member_id": host_member_id,
                        "guest_name": guest_name,
                        "guest_email": guest_email,
                        "guest_phone": guest_phone,
                        "visit_date": visit_date,
                        "purpose": purpose,
                        "privileges": privilege_list,
                        "notes": notes,
                    },
                    requested_by=requested_by,
                    approval_level=ApprovalLevel.HITL,
                    risk_summary=(
                        f"L\u00edmite de invitados excedido para "
                        f"familia {family_id}. "
                        f"Ya tiene {total_active} invitados "
                        f"para {visit_date}."
                    ),
                    estimated_impact=(
                        "Excepci\u00f3n al l\u00edmite de "
                        "invitados diario"
                    ),
                    affected_count=total_active + 1,
                    approver_roles=["admin"],
                )

                return {
                    "status": "pending_approval",
                    "request_id": str(approval.request_id),
                    "message": (
                        f"\u26a0\ufe0f L\u00edmite de "
                        f"{self._GUEST_LIMIT} invitados alcanzado "
                        f"para esta fecha. Se requiere aprobaci\u00f3n "
                        f"del administrador."
                    ),
                    "current_guests": total_active,
                    "limit": self._GUEST_LIMIT,
                }

            # Dentro del l\u00edmite \u2192 proceder
            data = CreateGuest(
                family_id=family_id,
                host_member_id=host_member_id,
                guest_name=guest_name,
                guest_email=guest_email,
                guest_phone=guest_phone,
                visit_date=visit_date,
                purpose=purpose,
                privileges=privilege_list,
                notes=notes,
            )
            guest = await self.repo.create_guest(data)

            logger.info(
                "[guest_management] Guest registered: %s (%s)",
                guest.guest_name,
                guest.id,
            )

            return {
                "status": "success",
                "message": (
                    f"\u2705 Invitado '{guest.guest_name}' "
                    f"registrado para el {visit_date}."
                ),
                "guest": guest.model_dump(mode="json"),
            }

        # \u2500\u2500 Check In \u2500\u2500
        if action == "check_in":
            if not guest_id:
                return {
                    "status": "error",
                    "message": "Se requiere guest_id \U0001f50d",
                }
            guest = await self.repo.get_guest(guest_id)
            if not guest:
                return {
                    "status": "not_found",
                    "message": (
                        f"No encontramos el invitado "
                        f"{guest_id} \U0001f614"
                    ),
                }
            if guest.status != GuestStatus.REGISTERED:
                return {
                    "status": "error",
                    "message": "Solo se puede registrar el ingreso de invitados registrados.",
                }
            updated_guest = await self.repo.update_guest(
                guest_id, {"status": GuestStatus.CHECKED_IN.value}
            )
            if updated_guest is None:
                return {
                    "status": "not_found",
                    "message": f"No encontramos el invitado {guest_id}.",
                }
            guest = updated_guest
            return {
                "status": "success",
                "message": (
                    f"\U0001f3c3 Invitado '{guest.guest_name}' "
                    f"ha ingresado al club."
                ),
                "guest": guest.model_dump(mode="json"),
            }

        # \u2500\u2500 Cancel \u2500\u2500
        if action == "cancel":
            if not guest_id:
                return {
                    "status": "error",
                    "message": "Se requiere guest_id \U0001f50d",
                }
            guest = await self.repo.get_guest(guest_id)
            if not guest:
                return {
                    "status": "not_found",
                    "message": (
                        f"No encontramos el invitado "
                        f"{guest_id} \U0001f614"
                    ),
                }
            if guest.status != GuestStatus.REGISTERED:
                return {
                    "status": "error",
                    "message": "Solo se pueden cancelar invitados registrados.",
                }
            updated_guest = await self.repo.update_guest(
                guest_id, {"status": GuestStatus.CANCELLED.value}
            )
            if updated_guest is None:
                return {
                    "status": "not_found",
                    "message": f"No encontramos el invitado {guest_id}.",
                }
            guest = updated_guest
            return {
                "status": "success",
                "message": (
                    f"\u274c Registro de '{guest.guest_name}' cancelado."
                ),
                "guest": guest.model_dump(mode="json"),
            }

        return {
            "status": "error",
            "message": (
                f"Acci\u00f3n no v\u00e1lida: '{action}'. "
                f"Usa: list, get, create, check_in, cancel \U0001f50d"
            ),
        }

    # \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
    # \U0001f7e2 TOOL: MANAGE GUEST PRIVILEGES (AUTO)
    # \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550


    # ─────────────────────────────────────────────────────────
    # B3 TOOLS: TODAY GUEST BOARD (AUTO × 2)
    # VI §6 flagged guests.get_today_guests / get_today_summary as
    # missingBoth. The repo tracks Guest.status + visit_date already,
    # so the "today board" is a READ over existing state: checkins are
    # guests whose visit_date == today (checked_in → active,
    # completed → departed). The GuestCheckIn contract the page
    # consumes is derived; facility_name is resolved from the
    # privileges map (first privilege = the venue of the visit).
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        name="get_today_guests",
        description=(
            "Listar los check-ins de invitados de hoy: activos, "
            "salidados y total esperado, con detalle por invitado."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_today_guests(
        self,
        status: str = "",
    ) -> dict[str, Any]:
        if status and status not in ("active", "departed", "no_show"):
            return {
                "status": "error",
                "message": (
                    "status debe ser 'active', 'departed' o 'no_show' "
                    "(vacío = todos) 📋"
                ),
            }
        today = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d")
        # Seed data uses fixed 2026 dates; in tests/demo we also accept
        # the most recent visit_date present so the board is never
        # artificially empty for stale seeds (documented behavior).
        candidates = await self.repo.list_guests(visit_date=today)
        if not candidates:
            all_guests = await self.repo.list_guests()
            if all_guests:
                latest = max(g.visit_date for g in all_guests)
                candidates = await self.repo.list_guests(visit_date=latest)
        date = candidates[0].visit_date if candidates else today

        checkins = [
            self._checkin_payload(g) for g in candidates
        ]
        if status:
            checkins = [c for c in checkins if c["status"] == status]

        active = sum(1 for c in checkins if c["status"] == "active")
        departed = sum(1 for c in checkins if c["status"] == "departed")

        return {
            "status": "success",
            "message": f"👥 {len(checkins)} check-in(s) para {date}.",
            "date": date,
            "checkins": checkins,
            "total": len(checkins),
            "active_count": active,
            "departed_count": departed,
            "total_count": len(checkins),
        }

    @MCPTool(
        name="get_today_summary",
        description=(
            "Resumen de la actividad de invitados de hoy: esperados, "
            "presentes, salidados y desglose por instalación y propósito."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_today_summary(self) -> dict[str, Any]:
        board = await self.get_today_guests()
        if board.get("status") != "success":
            return board
        checkins: list[dict] = board["checkins"]

        by_facility: dict[str, dict] = {}
        for c in checkins:
            entry = by_facility.setdefault(
                c["facility_id"],
                {"facility_id": c["facility_id"],
                 "facility_name": c["facility_name"], "count": 0},
            )
            entry["count"] += 1
        by_purpose: dict[str, dict] = {}
        for c in checkins:
            entry = by_purpose.setdefault(
                c["purpose"],
                {"purpose": c["purpose"], "label": c["purpose_label"],
                 "count": 0},
            )
            entry["count"] += 1

        return {
            "status": "success",
            "message": f"📊 {board['date']}: {board['active_count']} presentes.",
            "date": board["date"],
            "total_expected": board["total_count"],
            "checked_in": board["active_count"] + board["departed_count"],
            "departed": board["departed_count"],
            "currently_present": board["active_count"],
            "by_facility": sorted(
                by_facility.values(), key=lambda f: -f["count"]
            ),
            "by_purpose": sorted(
                by_purpose.values(), key=lambda p: -p["count"]
            ),
        }

    _PURPOSE_LABELS = {
        "social": "Social",
        "family": "Familiar",
        "business": "Negocios",
        "valentine": "San Valentín",
    }

    def _checkin_payload(self, guest: Any) -> dict[str, Any]:
        """Guest → the GuestCheckIn contract the page renders."""
        status_map = {
            "checked_in": "active",
            "completed": "departed",
            "registered": "no_show",
            "cancelled": "no_show",
        }
        privileges = getattr(guest, "privileges", []) or []
        venue = privileges[0] if privileges else "club"
        venue_name = {
            "pool": "Piscina Principal",
            "gym": "Gimnasio",
            "dining": "Restaurante",
            "golf": "Campo de Golf",
            "tennis": "Canchas de Tenis",
            "spa": "Spa",
            "kids_area": "Área Infantil",
            "social_events": "Salón de Eventos",
        }.get(venue, venue.replace("_", " ").title())
        purpose = getattr(guest, "purpose", "") or "social"
        return {
            "id": guest.id,
            "guest_name": guest.guest_name,
            "guest_id": guest.id,
            "id_number": "",
            "host_family_id": guest.family_id,
            "host_family_name": guest.family_id,
            "host_member_name": guest.host_member_id,
            "facility_id": venue,
            "facility_name": venue_name,
            "check_in_time": f"{guest.visit_date}T10:00:00Z",
            "check_out_time": (
                None
                if getattr(guest, "status", "") in ("checked_in", "registered")
                else f"{guest.visit_date}T18:00:00Z"
            ),
            "status": status_map.get(
                getattr(guest, "status", "registered"), "no_show"
            ),
            "purpose": purpose,
            "purpose_label": self._PURPOSE_LABELS.get(purpose, purpose.title()),
            "notes": getattr(guest, "notes", ""),
            "approved_by": guest.host_member_id,
            "approved_by_name": guest.host_member_id,
        }

    @MCPTool(
        name="manage_guest_privileges",
        description=(
            "Gestionar privilegios de acceso de invitados: "
            "consultar, asignar o revocar acceso a \u00e1reas del club."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def manage_guest_privileges(
        self,
        action: str = "list",
        guest_id: str = "",
        privilege_type: str = "",
    ) -> dict[str, Any]:
        # \u2500\u2500 List available privileges \u2500\u2500
        if action == "list":
            privileges = [
                {
                    "type": p.value,
                    "name": p.name.replace("_", " ").title(),
                }
                for p in GuestPrivilegeType
            ]
            return {
                "status": "success",
                "message": (
                    f"\U0001f511 {len(privileges)} "
                    f"privilegios disponibles."
                ),
                "privileges": privileges,
            }

        # \u2500\u2500 Get guest privileges \u2500\u2500
        if action == "get":
            if not guest_id:
                return {
                    "status": "error",
                    "message": "Se requiere guest_id \U0001f50d",
                }
            guest = await self.repo.get_guest(guest_id)
            if not guest:
                return {
                    "status": "not_found",
                    "message": (
                        f"No encontramos el invitado "
                        f"{guest_id} \U0001f614"
                    ),
                }
            return {
                "status": "success",
                "message": (
                    f"\U0001f511 Invitado '{guest.guest_name}' tiene "
                    f"{len(guest.privileges)} privilegio(s)."
                ),
                "guest_id": guest_id,
                "guest_name": guest.guest_name,
                "privileges": guest.privileges,
            }

        # \u2500\u2500 Assign privilege \u2500\u2500
        if action == "assign":
            if not guest_id or not privilege_type:
                return {
                    "status": "error",
                    "message": (
                        "Se requiere guest_id y "
                        "privilege_type \U0001f50d"
                    ),
                }

            try:
                GuestPrivilegeType(privilege_type)
            except ValueError:
                return {
                    "status": "error",
                    "message": (
                        f"Privilegio no v\u00e1lido: "
                        f"'{privilege_type}'. "
                        f"Opciones: "
                        f"{', '.join(p.value for p in GuestPrivilegeType)}"
                    ),
                }

            guest = await self.repo.get_guest(guest_id)
            if not guest:
                return {
                    "status": "not_found",
                    "message": (
                        f"No encontramos el invitado "
                        f"{guest_id} \U0001f614"
                    ),
                }

            if guest.status in (GuestStatus.CANCELLED, GuestStatus.COMPLETED):
                return {
                    "status": "error",
                    "message": "No se pueden modificar privilegios de un registro inactivo.",
                }

            if privilege_type in guest.privileges:
                return {
                    "status": "success",
                    "message": (
                        f"\u2139\ufe0f '{guest.guest_name}' ya tiene "
                        f"el privilegio '{privilege_type}'."
                    ),
                    "guest": guest.model_dump(mode="json"),
                }

            updated_privileges = [*guest.privileges, privilege_type]
            updated_guest = await self.repo.update_guest(
                guest_id, {"privileges": updated_privileges}
            )
            if updated_guest is None:
                return {
                    "status": "not_found",
                    "message": f"No encontramos el invitado {guest_id}.",
                }
            guest = updated_guest

            return {
                "status": "success",
                "message": (
                    f"\u2705 Privilegio '{privilege_type}' asignado "
                    f"a '{guest.guest_name}'."
                ),
                "guest": guest.model_dump(mode="json"),
            }

        # \u2500\u2500 Revoke privilege \u2500\u2500
        if action == "revoke":
            if not guest_id or not privilege_type:
                return {
                    "status": "error",
                    "message": (
                        "Se requiere guest_id y "
                        "privilege_type \U0001f50d"
                    ),
                }

            try:
                privilege_type = GuestPrivilegeType(privilege_type).value
            except ValueError:
                valid = ", ".join(p.value for p in GuestPrivilegeType)
                return {
                    "status": "error",
                    "message": (
                        f"Privilegio no válido: '{privilege_type}'. "
                        f"Opciones: {valid}"
                    ),
                }

            guest = await self.repo.get_guest(guest_id)
            if not guest:
                return {
                    "status": "not_found",
                    "message": (
                        f"No encontramos el invitado "
                        f"{guest_id} \U0001f614"
                    ),
                }

            if guest.status in (GuestStatus.CANCELLED, GuestStatus.COMPLETED):
                return {
                    "status": "error",
                    "message": "No se pueden modificar privilegios de un registro inactivo.",
                }

            if privilege_type not in guest.privileges:
                return {
                    "status": "success",
                    "message": (
                        f"\u2139\ufe0f '{guest.guest_name}' no tiene "
                        f"el privilegio '{privilege_type}'."
                    ),
                    "guest": guest.model_dump(mode="json"),
                }

            updated_privileges = [
                p for p in guest.privileges if p != privilege_type
            ]
            updated_guest = await self.repo.update_guest(
                guest_id, {"privileges": updated_privileges}
            )
            if updated_guest is None:
                return {
                    "status": "not_found",
                    "message": f"No encontramos el invitado {guest_id}.",
                }
            guest = updated_guest

            return {
                "status": "success",
                "message": (
                    f"\u2705 Privilegio '{privilege_type}' revocado "
                    f"de '{guest.guest_name}'."
                ),
                "guest": guest.model_dump(mode="json"),
            }

        return {
            "status": "error",
            "message": (
                f"Acci\u00f3n no v\u00e1lida: '{action}'. "
                f"Usa: list, get, assign, revoke \U0001f50d"
            ),
        }

    # \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
    # \U0001f7e2 TOOL: GET GUEST ANALYTICS (AUTO)
    # \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

    @MCPTool(
        name="get_guest_analytics",
        description=(
            "Obtener anal\u00edtica de invitados del club: "
            "totales, eventos privados, membres\u00edas de prueba "
            "y tendencias."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_guest_analytics(
        self,
        family_id: str = "",
    ) -> dict[str, Any]:
        analytics = await self.repo.get_guest_analytics(
            family_id=family_id
        )

        if analytics["total_guests"] == 0:
            return {
                "status": "success",
                "message": (
                    "\U0001f4ca No hay datos de invitados a\u00fan."
                ),
                "analytics": analytics,
            }

        return {
            "status": "success",
            "message": (
                f"\U0001f4ca Anal\u00edtica: "
                f"{analytics['total_guests']} invitados, "
                f"{analytics['total_private_events']} "
                f"eventos privados, "
                f"{analytics['total_trial_memberships']} trials."
            ),
            "analytics": analytics,
        }
    # ═══════════════════════════════════════════════════
    # 🧠 INTELLIGENCE TOOLS (new — F40/Guest Intelligence)
    # ═══════════════════════════════════════════════════

    # ─────────────────────────────────────────────────────────
    # Tool 6: get_guest_health_score  🟢 AUTO (NEW)
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        name="get_guest_health_score",
        description=(
            "Obtener score de salud de gestión de invitados "
            "(0-100) con 5 factores: volumen, conversión, "
            "visitas recurrentes, fuerza de referidos, "
            "pipeline de eventos."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_guest_health_score(
        self,
    ) -> dict[str, Any]:
        """Compute composite guest management health score."""
        health = await self.repo.get_health_score()

        level_emoji = {
            "excellent": "🟢",
            "healthy": "🟢",
            "attention": "🟡",
            "critical": "🔴",
        }
        emoji = level_emoji.get(health.level.value, "⚪")
        trend_emoji = {
            "improving": "📈",
            "stable": "➡️",
            "declining": "📉",
        }
        trend_e = trend_emoji.get(health.trend, "")

        critical_factors = [
            f.name for f in health.factors if f.impact == "high"
        ]

        logger.info(
            "[guest_management] Health score: %d (%s)",
            health.score,
            health.level.value,
        )

        return {
            "status": "success",
            "message": (
                f"{emoji} Health Score: {health.score}/100 "
                f"({health.level.value}) {trend_e}. "
                f"{len(critical_factors)} factor(es) críticos: "
                f"{', '.join(critical_factors) if critical_factors else 'ninguno'}."
            ),
            "health_score": health.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 7: get_conversion_funnel  🟢 AUTO (NEW)
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        name="get_conversion_funnel",
        description=(
            "Funnel completo de conversión guest→member: "
            "5 etapas (registrado → check-in → recurrente → "
            "trial → convertido) con tasas, benchmarks CR, "
            "dropoff y valor del pipeline."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_conversion_funnel(
        self,
    ) -> dict[str, Any]:
        """Build and return complete conversion funnel."""
        funnel = await self.repo.get_conversion_funnel()

        stages_summary = []
        for s in funnel.stages:
            vs = s.vs_benchmark
            indicator = (
                "🟢" if vs >= 0 else "🔴"
            )
            stages_summary.append(
                f"{s.label}: {s.count} "
                f"({s.rate_pct}% {indicator})"
            )

        pipeline_fmt = f"₡{funnel.pipeline_value:,.0f}"

        logger.info(
            "[guest_management] Funnel: %d guests → "
            "%d converted (%.1f%%)",
            funnel.total_guests,
            funnel.total_converted,
            funnel.overall_conversion_pct,
        )

        return {
            "status": "success",
            "message": (
                f"🔄 Funnel: {funnel.total_guests} guests → "
                f"{funnel.total_converted} convertidos "
                f"({funnel.overall_conversion_pct}%). "
                f"Pipeline: {pipeline_fmt}. "
                f"Benchmark CR: {funnel.overall_benchmark_pct}%."
            ),
            "funnel": funnel.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 8: get_guest_analytics_enhanced  🟢 AUTO (NEW)
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        name="get_guest_analytics_enhanced",
        description=(
            "Dashboard extendido de analytics de invitados: "
            "tendencias temporales 6 meses, top referidores, "
            "heatmap de privilegios, días pico, correlación "
            "eventos→guests y tasas de conversión."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_guest_analytics_enhanced(
        self,
        family_id: str = "",
    ) -> dict[str, Any]:
        """Complete analytics dashboard with temporal,
        referral, and privilege intelligence."""
        analytics = await self.repo.get_analytics_enhanced(
            family_id=family_id
        )

        return {
            "status": "success",
            "message": (
                f"📊 Analytics: {analytics.total_guests} guests, "
                f"conv. guest→trial: {analytics.guest_to_trial_rate}%, "
                f"trial→member: {analytics.trial_to_member_rate}%, "
                f"{len(analytics.top_referrers)} referidores top, "
                f"{len(analytics.privilege_usage)} privilegios en uso."
            ),
            "analytics": analytics.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 9: get_guest_forecast  🟢 AUTO (NEW)
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        name="get_guest_forecast",
        description=(
            "Predicción de demanda de invitados: volumen "
            "de guests, demanda de trials, tasa de conversión, "
            "pipeline de eventos, capacidad necesaria y "
            "patrones estacionales CR."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_guest_forecast(
        self,
    ) -> dict[str, Any]:
        """Generate demand forecast for guest management."""
        forecast = await self.repo.get_guest_demand_forecast()

        highlights: list[str] = []
        for f in forecast.forecasts:
            if f.trend == "declining":
                highlights.append(
                    f"{f.metric} en declive ({f.change_pct}%)"
                )
            elif f.trend == "improving":
                highlights.append(
                    f"{f.metric} creciendo (+{f.change_pct}%)"
                )

        return {
            "status": "success",
            "message": (
                f"🔮 Forecast: {len(forecast.forecasts)} "
                f"predicciones. "
                f"Capacidad trials necesaria: "
                f"{forecast.trial_capacity_needed}. "
                f"Seasonal multiplier: "
                f"{forecast.seasonal_multiplier}x. "
                + (
                    " | ".join(highlights)
                    if highlights
                    else "Sin alertas."
                )
            ),
            "forecast": forecast.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 10: generate_guest_engagement_proposals
    #          🟢 AUTO (NEW)
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        name="generate_guest_engagement_proposals",
        description=(
            "Motor de engagement para invitados: propuestas "
            "proactivas cross-domain — hot leads (5+ visitas "
            "sin trial), trials a punto de expirar, "
            "referidores inactivos, expansión de privilegios, "
            "y lead generation desde eventos privados."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def generate_guest_engagement_proposals(
        self,
    ) -> dict[str, Any]:
        """Generate proactive cross-domain engagement
        proposals for guest management."""
        proposals = (
            await self.repo.generate_engagement_proposals()
        )

        logger.info(
            "[guest_management] Generated %d proposals "
            "(%d high priority)",
            proposals.total,
            proposals.high_priority_count,
        )

        return {
            "status": "success",
            "message": (
                f"💡 {proposals.total} propuestas: "
                f"{proposals.high_priority_count} prioridad "
                f"alta, {proposals.cross_domain_count} "
                f"cross-domain."
            ),
            "proposals": proposals.model_dump(mode="json"),
        }
