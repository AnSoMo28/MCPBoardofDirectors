"""
FacilityManagementAgent: Gestión de instalaciones del club.
Club: Castillo Country Club
Production Grade — F33 Living Spaces Intelligence

TOOLS:
  manage_facilities              🟢 AUTO    CRUD de instalaciones
  schedule_maintenance           🔴 HITL    Programar tareas de mantenimiento
  coordinate_event_setup         🔴 HITL    Coordinar montaje para eventos
  get_facility_occupancy         🟢 AUTO    Consultar ocupación en tiempo real
  manage_inspections             🟢 AUTO    Registrar inspecciones
  report_facility_issue          🟢 AUTO    Reportar problemas
  get_maintenance_schedule       🟢 AUTO    Calendario de mantenimiento
  create_facility_reservation    🔴 HITL    Crear reserva de instalación
  get_facility_reservations      🟢 AUTO    Listar reservas
  get_facility_analytics         🟢 AUTO    Inteligencia 9 dimensiones
  get_amenity_utilization        🟢 AUTO    Utilización detallada por amenity
  get_space_optimization         🟢 AUTO    Optimización cross-domain
  get_facility_health            🟢 AUTO    Health score compuesto 5 factores
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from club_mcp.agents.base import BaseAgent, MCPTool
from club_mcp.db.repositories.facility_management_repo import (
    FacilityManagementRepository,
)
from club_mcp.hitl.approval_types import ApprovalLevel
from club_mcp.models.facility_management import (
    CreateEventSetup,
    CreateFacility,
    CreateFacilityReservation,
    CreateInspection,
    CreateMaintenanceTask,
    FacilityStatus,
    FacilityType,
    InspectionResult,
    MaintenancePriority,
    MaintenanceStatus,
    MaintenanceType,
    ReservationStatus,
    SetupStatus,
)

logger = logging.getLogger(__name__)


class FacilityManagementAgent(BaseAgent):
    """
    Agente de gestión de instalaciones de Castillo Country Club.
    13 tools: 7 CRUD + 2 reservation + 4 intelligence.
    """

    agent_name: str = "facility_management"
    description: str = "Gestión de instalaciones del club"

    def __init__(self, repo=None, approval_engine=None, notifier=None) -> None:
        super().__init__()
        self.repo = repo or FacilityManagementRepository()
        if approval_engine is not None:
            self.approval_engine = approval_engine
        self.notifier = notifier

    def _register_tools(self) -> None:
        pass

    # ══════════════════════════════════════════════════
    # EXISTING TOOLS (7) — preserved exactly
    # ══════════════════════════════════════════════════

    # ──────────────────────────────────────────────────
    # 🟢 TOOL: MANAGE FACILITIES (AUTO)
    # ──────────────────────────────────────────────────

    @MCPTool(
        name="manage_facilities",
        description=(
            "Crear, consultar y gestionar las instalaciones del club: "
            "piscinas, gimnasio, canchas, restaurantes, jardines, etc."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def manage_facilities(
        self,
        action: str = "list",
        facility_id: str = "",
        name: str = "",
        facility_type: str = "",
        location: str = "",
        capacity: int = 0,
        description: str = "",
        amenities: str = "",
        opening_time: str = "06:00",
        closing_time: str = "22:00",
        responsible_member_id: str = "",
        new_status: str = "",
        notes: str = "",
    ) -> dict[str, Any]:
        if action == "list":
            type_filter = None
            if facility_type:
                try:
                    type_filter = FacilityType(facility_type)
                except ValueError:
                    pass
            facilities = await self.repo.list_facilities(facility_type=type_filter)
            return {
                "status": "success",
                "message": f"📋 Encontramos {len(facilities)} instalaciones.",
                "facilities": [f.model_dump(mode="json") for f in facilities],
            }

        if action == "get":
            if not facility_id:
                return {"status": "error", "message": "Se requiere facility_id 🤔"}
            facility = await self.repo.get_facility(facility_id)
            if not facility:
                return {
                    "status": "not_found",
                    "message": f"No encontramos la instalación {facility_id} 😊",
                }
            return {"status": "success", "facility": facility.model_dump(mode="json")}

        if action == "create":
            if not all([name, facility_type]):
                return {
                    "status": "error",
                    "message": "Faltan campos obligatorios: name, facility_type 📋",
                }
            try:
                ft = FacilityType(facility_type)
            except ValueError:
                return {
                    "status": "error",
                    "message": (
                        f"Tipo no válido: '{facility_type}'. "
                        f"Opciones: {', '.join(f.value for f in FacilityType)}"
                    ),
                }
            amenity_list = (
                [a.strip() for a in amenities.split(",") if a.strip()]
                if amenities else []
            )
            data = CreateFacility(
                name=name, facility_type=ft, location=location,
                capacity=capacity, description=description,
                amenities=amenity_list, opening_time=opening_time,
                closing_time=closing_time,
                responsible_member_id=responsible_member_id, notes=notes or None,
            )
            facility = await self.repo.create_facility(data)
            logger.info("[facility_mgmt] Facility created: %s", facility.name)
            return {
                "status": "success",
                "message": f"🏗️ Instalación '{facility.name}' creada exitosamente.",
                "facility": facility.model_dump(mode="json"),
            }

        if action == "update_status":
            if not facility_id or not new_status:
                return {
                    "status": "error",
                    "message": "Se requiere facility_id y new_status 🤔",
                }
            facility = await self.repo.get_facility(facility_id)
            if not facility:
                return {
                    "status": "not_found",
                    "message": f"No encontramos la instalación {facility_id} 😊",
                }
            facility = await self.repo.update_facility(
                facility_id, {"status": new_status}
            )
            if facility is None:
                return {
                    "status": "not_found",
                    "message": f"No encontramos la instalación {facility_id} 😊",
                }
            return {
                "status": "success",
                "message": f"✅ Instalación '{facility.name}' actualizada a: {new_status}.",
                "facility": facility.model_dump(mode="json"),
            }

        return {
            "status": "error",
            "message": f"Acción no válida: '{action}'. Usa: list, get, create, update_status 🤔",
        }

    # ──────────────────────────────────────────────────
    # 🔴 TOOL: SCHEDULE MAINTENANCE (HITL)
    # ──────────────────────────────────────────────────

    @MCPTool(
        name="schedule_maintenance",
        description=(
            "Programar tareas de mantenimiento para las instalaciones. "
            "REQUIERE APROBACIÓN HUMANA. "
            "Incluye preventivo, correctivo, emergencia y renovación."
        ),
        approval=ApprovalLevel.HITL,
        approver_roles=["admin"],
    )
    async def schedule_maintenance(
        self,
        facility_id: str = "",
        facility_name: str = "",
        maintenance_type: str = "preventive",
        priority: str = "medium",
        description: str = "",
        scheduled_date: str = "",
        scheduled_time: str = "08:00",
        estimated_duration_hours: float = 2.0,
        assigned_to: str = "",
        cost: float = 0.0,
        notes: str = "",
        requested_by: str = "system",
    ) -> dict[str, Any]:
        if not all([facility_id, description, scheduled_date]):
            return {
                "status": "error",
                "message": "Faltan campos obligatorios: facility_id, description, scheduled_date 📋",
            }
        try:
            mt = MaintenanceType(maintenance_type)
        except ValueError:
            return {
                "status": "error",
                "message": (
                    f"Tipo no válido: '{maintenance_type}'. "
                    f"Opciones: {', '.join(m.value for m in MaintenanceType)}"
                ),
            }
        try:
            pr = MaintenancePriority(priority)
        except ValueError:
            return {
                "status": "error",
                "message": (
                    f"Prioridad no válida: '{priority}'. "
                    f"Opciones: {', '.join(p.value for p in MaintenancePriority)}"
                ),
            }
        if not facility_name:
            facility = await self.repo.get_facility(facility_id)
            facility_name = facility.name if facility else facility_id

        approval = await self.approval_engine.create_request(
            agent=self.agent_name, tool="schedule_maintenance",
            params={
                "facility_id": facility_id, "facility_name": facility_name,
                "maintenance_type": maintenance_type, "priority": priority,
                "description": description, "scheduled_date": scheduled_date,
                "scheduled_time": scheduled_time,
                "estimated_duration_hours": estimated_duration_hours,
                "assigned_to": assigned_to, "cost": cost, "notes": notes,
            },
            requested_by=requested_by, approval_level=ApprovalLevel.HITL,
            risk_summary=(
                f"Mantenimiento {maintenance_type} ({priority}) en "
                f"{facility_name}: {description[:80]}"
            ),
            estimated_impact="Posible cierre temporal de la instalación",
            affected_count=1, approver_roles=["admin"],
        )
        logger.info("[facility_mgmt] Maintenance approval: %s on %s", facility_name, scheduled_date)
        return {
            "status": "pending_approval",
            "request_id": str(approval.request_id),
            "message": f"🔧 Mantenimiento para '{facility_name}' creado. Esperando aprobación.",
            "details": {
                "facility_name": facility_name,
                "maintenance_type": maintenance_type,
                "priority": priority,
                "scheduled_date": scheduled_date, "cost": cost,
            },
        }

    async def execute_maintenance(
        self, facility_id: str, facility_name: str,
        maintenance_type: str = "preventive", priority: str = "medium",
        description: str = "", scheduled_date: str = "",
        scheduled_time: str = "08:00", estimated_duration_hours: float = 2.0,
        assigned_to: str = "", cost: float = 0.0, notes: str = "",
    ) -> dict[str, Any]:
        data = CreateMaintenanceTask(
            facility_id=facility_id, facility_name=facility_name,
            maintenance_type=MaintenanceType(maintenance_type),
            priority=MaintenancePriority(priority),
            description=description, scheduled_date=scheduled_date,
            scheduled_time=scheduled_time,
            estimated_duration_hours=estimated_duration_hours,
            assigned_to=assigned_to, cost=cost, notes=notes or None,
        )
        task = await self.repo.create_maintenance(data)
        if task.maintenance_type in (MaintenanceType.EMERGENCY, MaintenanceType.CORRECTIVE):
            await self.repo.update_facility(
                facility_id, {"status": FacilityStatus.MAINTENANCE}
            )
        logger.info("[facility_mgmt] Maintenance scheduled: %s on %s", facility_name, scheduled_date)
        return {
            "status": "success",
            "message": f"🔧 Mantenimiento de '{facility_name}' aprobado y programado para {scheduled_date}.",
            "maintenance": task.model_dump(mode="json"),
        }

    # ──────────────────────────────────────────────────
    # 🔴 TOOL: COORDINATE EVENT SETUP (HITL)
    # ──────────────────────────────────────────────────

    @MCPTool(
        name="coordinate_event_setup",
        description=(
            "Coordinar el montaje y preparación de una instalación para un evento. "
            "REQUIERE APROBACIÓN HUMANA. "
            "Incluye decoración, mobiliario, AV, catering setup."
        ),
        approval=ApprovalLevel.HITL,
        approver_roles=["admin"],
    )
    async def coordinate_event_setup(
        self,
        event_id: str = "", event_name: str = "",
        facility_id: str = "", facility_name: str = "",
        setup_date: str = "", setup_time: str = "08:00",
        event_start: str = "", event_end: str = "",
        requirements: str = "", assigned_to: str = "",
        coordinator_member_id: str = "", notes: str = "",
        requested_by: str = "system",
    ) -> dict[str, Any]:
        if not all([event_id, event_name, facility_id, facility_name, setup_date]):
            return {
                "status": "error",
                "message": "Faltan campos obligatorios: event_id, event_name, facility_id, facility_name, setup_date 📋",
            }
        req_list = [r.strip() for r in requirements.split(",") if r.strip()] if requirements else []
        approval = await self.approval_engine.create_request(
            agent=self.agent_name, tool="coordinate_event_setup",
            params={
                "event_id": event_id, "event_name": event_name,
                "facility_id": facility_id, "facility_name": facility_name,
                "setup_date": setup_date, "setup_time": setup_time,
                "event_start": event_start, "event_end": event_end,
                "requirements": req_list, "assigned_to": assigned_to,
                "coordinator_member_id": coordinator_member_id, "notes": notes,
            },
            requested_by=requested_by, approval_level=ApprovalLevel.HITL,
            risk_summary=f"Montaje para evento '{event_name}' en {facility_name} el {setup_date}",
            estimated_impact="Reservación de instalación y personal de montaje",
            affected_count=1, approver_roles=["admin"],
        )
        logger.info("[facility_mgmt] Setup approval: %s at %s", event_name, facility_name)
        return {
            "status": "pending_approval",
            "request_id": str(approval.request_id),
            "message": f"🎪 Montaje para '{event_name}' en {facility_name} creado. Esperando aprobación.",
            "details": {
                "event_name": event_name, "facility_name": facility_name,
                "setup_date": setup_date, "requirements": req_list,
            },
        }

    async def execute_event_setup(
        self, event_id: str, event_name: str,
        facility_id: str, facility_name: str,
        setup_date: str, setup_time: str = "08:00",
        event_start: str = "", event_end: str = "",
        requirements: list[str] | None = None,
        assigned_to: str = "", coordinator_member_id: str = "", notes: str = "",
    ) -> dict[str, Any]:
        data = CreateEventSetup(
            event_id=event_id, event_name=event_name,
            facility_id=facility_id, facility_name=facility_name,
            setup_date=setup_date, setup_time=setup_time,
            event_start=event_start, event_end=event_end,
            requirements=requirements or [], assigned_to=assigned_to,
            coordinator_member_id=coordinator_member_id, notes=notes or None,
        )
        setup = await self.repo.create_setup(data)
        await self.repo.update_facility(facility_id, {"status": FacilityStatus.RESERVED})
        logger.info("[facility_mgmt] Event setup confirmed: %s at %s", event_name, facility_name)
        return {
            "status": "success",
            "message": f"🎪 Montaje para '{event_name}' aprobado y confirmado en {facility_name}.",
            "setup": setup.model_dump(mode="json"),
        }

    # ──────────────────────────────────────────────────
    # 🟢 TOOL: GET FACILITY OCCUPANCY (AUTO)
    # ──────────────────────────────────────────────────

    @MCPTool(
        name="get_facility_occupancy",
        description="Consultar la ocupación y disponibilidad actual de las instalaciones del club.",
        approval=ApprovalLevel.AUTO,
    )
    async def get_facility_occupancy(
        self, facility_type: str = "",
    ) -> dict[str, Any]:
        type_filter = None
        if facility_type:
            try:
                type_filter = FacilityType(facility_type)
            except ValueError:
                return {
                    "status": "error",
                    "message": (
                        f"Tipo no válido: '{facility_type}'. "
                        f"Opciones: {', '.join(f.value for f in FacilityType)}"
                    ),
                }
        facilities = await self.repo.list_facilities(facility_type=type_filter)
        setups = await self.repo.list_setups()
        maintenance = await self.repo.list_maintenance()

        occupancy: list[dict[str, Any]] = []
        for f in facilities:
            facility_setups = [s for s in setups if s.facility_id == f.id]
            facility_maint = [
                m for m in maintenance
                if m.facility_id == f.id
                and m.status in (MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS)
            ]
            occupancy.append({
                "facility_id": f.id, "facility_name": f.name,
                "facility_type": f.facility_type.value, "status": f.status.value,
                "current_setups": len(facility_setups),
                "active_maintenance": len(facility_maint),
                "capacity": f.capacity, "opening_time": f.opening_time,
                "closing_time": f.closing_time,
            })
        return {
            "status": "success",
            "message": f"📊 Ocupación de {len(occupancy)} instalación(es).",
            "occupancy": occupancy,
        }

    # ──────────────────────────────────────────────────
    # 🟢 TOOL: MANAGE INSPECTIONS (AUTO)
    # ──────────────────────────────────────────────────

    @MCPTool(
        name="manage_inspections",
        description=(
            "Registrar y consultar inspecciones de instalaciones. "
            "Incluye resultados, hallazgos y acciones correctivas."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def manage_inspections(
        self, action: str = "list", inspection_id: str = "",
        facility_id: str = "", facility_name: str = "",
        result: str = "pass", inspector_member_id: str = "",
        inspection_date: str = "", findings: str = "",
        corrective_actions: str = "", next_inspection_date: str = "",
        notes: str = "",
    ) -> dict[str, Any]:
        if action == "list":
            inspections = await self.repo.list_inspections(facility_id=facility_id or None)
            return {
                "status": "success",
                "message": f"📋 Encontramos {len(inspections)} inspecciones.",
                "inspections": [i.model_dump(mode="json") for i in inspections],
            }
        if action == "get":
            if not inspection_id:
                return {"status": "error", "message": "Se requiere inspection_id 🤔"}
            inspection = await self.repo.get_inspection(inspection_id)
            if not inspection:
                return {"status": "not_found", "message": f"No encontramos la inspección {inspection_id} 😊"}
            return {"status": "success", "inspection": inspection.model_dump(mode="json")}
        if action == "create":
            if not all([facility_id, facility_name, inspector_member_id, inspection_date]):
                return {
                    "status": "error",
                    "message": "Faltan campos obligatorios: facility_id, facility_name, inspector_member_id, inspection_date 📋",
                }
            try:
                ir = InspectionResult(result)
            except ValueError:
                return {
                    "status": "error",
                    "message": (
                        f"Resultado no válido: '{result}'. "
                        f"Opciones: {', '.join(r.value for r in InspectionResult)}"
                    ),
                }
            actions_list = [a.strip() for a in corrective_actions.split(",") if a.strip()] if corrective_actions else []
            data = CreateInspection(
                facility_id=facility_id, facility_name=facility_name,
                result=ir, inspector_member_id=inspector_member_id,
                inspection_date=inspection_date, findings=findings,
                corrective_actions=actions_list,
                next_inspection_date=next_inspection_date or None, notes=notes or None,
            )
            inspection = await self.repo.create_inspection(data)
            logger.info("[facility_mgmt] Inspection created: %s (%s)", facility_name, inspection.result.value)
            return {
                "status": "success",
                "message": f"🔍 Inspección de '{facility_name}' registrada con resultado: {inspection.result.value}.",
                "inspection": inspection.model_dump(mode="json"),
            }
        return {"status": "error", "message": f"Acción no válida: '{action}'. Usa: list, get, create 🤔"}

    # ──────────────────────────────────────────────────
    # 🟢 TOOL: REPORT FACILITY ISSUE (AUTO)
    # ──────────────────────────────────────────────────

    @MCPTool(
        name="report_facility_issue",
        description=(
            "Reportar un problema o desperfecto en una instalación del club. "
            "Crea una tarea de mantenimiento correctivo de baja prioridad."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def report_facility_issue(
        self, facility_id: str = "", facility_name: str = "",
        description: str = "", reported_by: str = "",
        priority: str = "medium",
    ) -> dict[str, Any]:
        if not all([facility_id, description, reported_by]):
            return {
                "status": "error",
                "message": "Faltan campos obligatorios: facility_id, description, reported_by 📋",
            }
        if not facility_name:
            facility = await self.repo.get_facility(facility_id)
            facility_name = facility.name if facility else facility_id
        try:
            pr = MaintenancePriority(priority)
        except ValueError:
            return {
                "status": "error",
                "message": (
                    f"Prioridad no válida: '{priority}'. "
                    f"Opciones: {', '.join(p.value for p in MaintenancePriority)}"
                ),
            }
        from datetime import datetime, timezone
        today = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d")
        data = CreateMaintenanceTask(
            facility_id=facility_id, facility_name=facility_name,
            maintenance_type=MaintenanceType.CORRECTIVE, priority=pr,
            description=f"[REPORTADO POR {reported_by}] {description}",
            scheduled_date=today, assigned_to="",
            notes=f"Reportado por: {reported_by}",
        )
        task = await self.repo.create_maintenance(data)
        logger.info("[facility_mgmt] Issue reported: %s at %s by %s", description[:40], facility_name, reported_by)
        return {
            "status": "success",
            "message": f"📝 Problema reportado en '{facility_name}'. Tarea de mantenimiento #{task.id} creada.",
            "maintenance": task.model_dump(mode="json"),
        }

    # ──────────────────────────────────────────────────
    # 🟢 TOOL: GET MAINTENANCE SCHEDULE (AUTO)
    # ──────────────────────────────────────────────────

    @MCPTool(
        name="get_maintenance_schedule",
        description="Consultar el calendario de mantenimiento de las instalaciones.",
        approval=ApprovalLevel.AUTO,
    )
    async def get_maintenance_schedule(
        self, facility_id: str = "", status: str = "",
    ) -> dict[str, Any]:
        status_filter = None
        if status:
            try:
                status_filter = MaintenanceStatus(status)
            except ValueError:
                return {
                    "status": "error",
                    "message": (
                        f"Estado no válido: '{status}'. "
                        f"Opciones: {', '.join(m.value for m in MaintenanceStatus)}"
                    ),
                }
        tasks = await self.repo.list_maintenance(
            facility_id=facility_id or None, status=status_filter,
        )
        tasks.sort(key=lambda t: t.scheduled_date)
        if not tasks:
            return {
                "status": "success",
                "message": "📅 No hay tareas de mantenimiento programadas.",
                "schedule": [], "total": 0,
            }
        return {
            "status": "success",
            "message": f"📅 Calendario: {len(tasks)} tarea(s) de mantenimiento.",
            "schedule": [t.model_dump(mode="json") for t in tasks],
            "total": len(tasks),
        }

    # ══════════════════════════════════════════════════
    # NEW TOOLS (F33) — 2 reservation + 4 intelligence
    # ══════════════════════════════════════════════════

    # ──────────────────────────────────────────────────
    # 🔴 TOOL: CREATE FACILITY RESERVATION (HITL)
    # ──────────────────────────────────────────────────

    @MCPTool(
        name="create_facility_reservation",
        description=(
            "Crear una reserva de instalación para una familia. "
            "REQUIERE APROBACIÓN HUMANA para espacios premium "
            "(ballroom, restaurant, lounge). "
            "Incluye detección de conflictos de horario."
        ),
        approval=ApprovalLevel.HITL,
        approver_roles=["admin"],
    )
    async def create_facility_reservation(
        self,
        facility_id: str = "",
        facility_name: str = "",
        family_id: str = "",
        family_name: str = "",
        date: str = "",
        start_time: str = "",
        end_time: str = "",
        guest_count: int = 0,
        purpose: str = "",
        notes: str = "",
        requested_by: str = "system",
    ) -> dict[str, Any]:
        if not all([facility_id, date, start_time, end_time]):
            return {
                "status": "error",
                "message": "Faltan campos obligatorios: facility_id, date, start_time, end_time 📋",
            }

        # Resolve facility name
        if not facility_name:
            facility = await self.repo.get_facility(facility_id)
            if not facility:
                return {
                    "status": "not_found",
                    "message": f"No encontramos la instalación {facility_id} 😊",
                }
            facility_name = facility.name

        # Check conflicts
        conflicts = await self.repo.check_reservation_conflict(
            facility_id=facility_id, date=date,
            start_time=start_time, end_time=end_time,
        )
        if conflicts:
            conflict_names = ", ".join(
                f"{c.family_name} ({c.start_time}-{c.end_time})" for c in conflicts
            )
            return {
                "status": "conflict",
                "message": f"⚠️ Conflicto de horario detectado: {conflict_names}",
                "conflicts": [c.model_dump(mode="json") for c in conflicts],
            }

        approval = await self.approval_engine.create_request(
            agent=self.agent_name, tool="create_facility_reservation",
            params={
                "facility_id": facility_id, "facility_name": facility_name,
                "family_id": family_id, "family_name": family_name,
                "date": date, "start_time": start_time, "end_time": end_time,
                "guest_count": guest_count, "purpose": purpose, "notes": notes,
            },
            requested_by=requested_by, approval_level=ApprovalLevel.HITL,
            risk_summary=(
                f"Reserva de {facility_name} por {family_name or 'socio'} "
                f"el {date} ({start_time}-{end_time})"
            ),
            estimated_impact=f"Instalación reservada para {guest_count} persona(s)",
            affected_count=guest_count or 1, approver_roles=["admin"],
        )
        logger.info("[facility_mgmt] Reservation approval: %s at %s", family_name, facility_name)
        return {
            "status": "pending_approval",
            "request_id": str(approval.request_id),
            "message": f"📅 Reserva de '{facility_name}' para {family_name}. Esperando aprobación.",
            "details": {
                "facility_name": facility_name, "family_name": family_name,
                "date": date, "start_time": start_time, "end_time": end_time,
                "guest_count": guest_count, "purpose": purpose,
            },
        }

    async def execute_reservation(
        self, facility_id: str, facility_name: str,
        family_id: str = "", family_name: str = "",
        date: str = "", start_time: str = "", end_time: str = "",
        guest_count: int = 0, purpose: str = "", notes: str = "",
    ) -> dict[str, Any]:
        """Execute reservation after HITL approval."""
        data = CreateFacilityReservation(
            facility_id=facility_id, facility_name=facility_name,
            family_id=family_id, family_name=family_name,
            date=date, start_time=start_time, end_time=end_time,
            guest_count=guest_count, purpose=purpose, notes=notes,
        )
        reservation = await self.repo.create_reservation(data)
        logger.info(
            "[facility_mgmt] Reservation confirmed: %s at %s on %s",
            family_name, facility_name, date,
        )
        return {
            "status": "success",
            "message": f"📅 Reserva de '{facility_name}' aprobada y confirmada para {date}.",
            "reservation": reservation.model_dump(mode="json"),
        }

    # ──────────────────────────────────────────────────
    # 🟢 TOOL: GET FACILITY RESERVATIONS (AUTO)
    # ──────────────────────────────────────────────────

    @MCPTool(
        name="get_facility_reservations",
        description="Listar reservas de instalaciones con filtros.",
        approval=ApprovalLevel.AUTO,
    )
    async def get_facility_reservations(
        self, facility_id: str = "", date_from: str = "",
        date_to: str = "", status: str = "",
    ) -> dict[str, Any]:
        status_filter = None
        if status:
            try:
                status_filter = ReservationStatus(status)
            except ValueError:
                return {
                    "status": "error",
                    "message": (
                        f"Estado no válido: '{status}'. "
                        f"Opciones: {', '.join(s.value for s in ReservationStatus)}"
                    ),
                }
        reservations = await self.repo.list_reservations(
            facility_id=facility_id or None,
            date_from=date_from or None,
            date_to=date_to or None,
            status=status_filter,
        )
        return {
            "status": "success",
            "message": f"📅 {len(reservations)} reserva(s) encontrada(s).",
            "reservations": [r.model_dump(mode="json") for r in reservations],
            "total": len(reservations),
        }

    # ──────────────────────────────────────────────────
    # 🟢 TOOL: GET FACILITY ANALYTICS (AUTO) — 9 DIM
    # ──────────────────────────────────────────────────

    @MCPTool(
        name="get_facility_analytics",
        description=(
            "Análisis de inteligencia de 9 dimensiones para instalaciones. "
            "Incluye: Health Score, Utilización, Mantenimiento, "
            "Optimización de Espacios, Revenue, Cumplimiento, "
            "Preparación de Eventos, Señales Cross-Domain, Predictivo."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_facility_analytics(self) -> dict[str, Any]:
        analytics = await self.repo.get_facility_analytics()
        return {
            "status": "success",
            "message": f"📊 Analytics: score {analytics.overall_score}/100 ({analytics.overall_grade})",
            **analytics.model_dump(mode="json"),
        }


    # ──────────────────────────────────────────────────
    # 🟢 B3 TOOL: GET FACILITY DETAIL (AUTO)
    # VI §6 flagged facilities.get_facility as "capability without tool":
    # the repo had get_facility (L438) but no registered tool. This tool
    # composes the FacilityDetailData contract the page consumes
    # (facility + upcoming_reservations + utilization_history +
    # maintenance_log), derived 100% from repo reads.
    # ──────────────────────────────────────────────────

    @MCPTool(
        name="get_facility",
        description=(
            "Obtener el detalle completo de una instalación: datos, "
            "próximas reservas, historial de utilización y bitácora "
            "de mantenimiento."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_facility(
        self,
        facility_id: str = "",
    ) -> dict[str, Any]:
        if not facility_id:
            return {
                "status": "error",
                "message": "Se requiere facility_id 🏟️",
            }
        facility = await self.repo.get_facility(facility_id)
        if facility is None:
            return {
                "status": "not_found",
                "message": f"No encontramos la instalación '{facility_id}'.",
            }

        reservations = await self.repo.list_reservations(
            facility_id=facility_id,
        )
        upcoming = [
            r.model_dump(mode="json")
            for r in reservations
            if r.status.value in ("pending", "confirmed")
        ][:5]

        utilization = await self.repo.get_amenity_utilization(
            facility_type=facility.facility_type,
        )
        per_facility = {
            item.facility_id: item
            for item in utilization.facilities
        }
        amenity = per_facility.get(facility.id)
        history: list[dict[str, Any]] = []
        if amenity is not None:
            history = [
                {
                    "date": point.get("date", ""),
                    "utilization": point.get("utilization", 0),
                }
                for point in (amenity.time_series or [])[:14]
            ]

        maintenance = await self.repo.list_maintenance(
            facility_id=facility_id,
        )
        maintenance_log = [
            t.model_dump(mode="json") for t in maintenance
        ][:10]

        return {
            "status": "success",
            "message": f"🏟️ {facility.name}: {facility.facility_type.value}",
            "facility": facility.model_dump(mode="json"),
            "upcoming_reservations": upcoming,
            "utilization_history": history,
            "maintenance_log": maintenance_log,
        }

    # ──────────────────────────────────────────────────
    # 🟢 TOOL: GET AMENITY UTILIZATION (AUTO)
    # ──────────────────────────────────────────────────

    @MCPTool(
        name="get_amenity_utilization",
        description=(
            "Análisis detallado de utilización por amenity. "
            "Incluye: % de utilización, horas pico, tendencia, "
            "forecast, time series 7 días, revenue estimado."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_amenity_utilization(
        self, facility_type: str = "",
    ) -> dict[str, Any]:
        type_filter = None
        if facility_type:
            try:
                type_filter = FacilityType(facility_type)
            except ValueError:
                return {
                    "status": "error",
                    "message": (
                        f"Tipo no válido: '{facility_type}'. "
                        f"Opciones: {', '.join(f.value for f in FacilityType)}"
                    ),
                }
        utilization = await self.repo.get_amenity_utilization(facility_type=type_filter)
        return {
            "status": "success",
            "message": f"📊 Utilización promedio: {utilization.overall_utilization_pct}%",
            **utilization.model_dump(mode="json"),
        }

    # ──────────────────────────────────────────────────
    # 🟢 TOOL: GET SPACE OPTIMIZATION (AUTO)
    # ──────────────────────────────────────────────────

    @MCPTool(
        name="get_space_optimization",
        description=(
            "Análisis de optimización de espacios cross-domain. "
            "Detecta: espacios subutilizados, sobrecargados, "
            "ROI negativo, candidatos a expansión."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_space_optimization(self) -> dict[str, Any]:
        optimization = await self.repo.get_space_optimization()
        return {
            "status": "success",
            "message": (
                f"🏗️ {len(optimization.suggestions)} sugerencia(s) de optimización. "
                f"{optimization.underutilized_count} subutilizados, "
                f"{optimization.overutilized_count} sobrecargados."
            ),
            **optimization.model_dump(mode="json"),
        }

    # ──────────────────────────────────────────────────
    # 🟢 TOOL: GET FACILITY HEALTH (AUTO)
    # ──────────────────────────────────────────────────

    @MCPTool(
        name="get_facility_health",
        description=(
            "Health score compuesto de 5 factores para instalaciones. "
            "Factores: Utilización (25%), Mantenimiento (25%), "
            "Inspecciones (20%), Satisfacción (15%), "
            "Eficiencia de costos (15%). "
            "Incluye grade (A-F), level, trend y alertas."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_facility_health(self) -> dict[str, Any]:
        health = await self.repo.get_facility_health()
        return {
            "status": "success",
            "message": f"🏥 Health: {health.score}/100 ({health.grade} — {health.level})",
            **health.model_dump(mode="json"),
        }
