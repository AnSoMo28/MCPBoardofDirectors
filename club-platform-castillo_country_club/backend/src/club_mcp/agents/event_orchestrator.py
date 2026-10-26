"""EventOrchestratorAgent — manages the full event lifecycle.

9 tools covering creation, programs, RSVPs, vendors, capacity,
analytics, cloning, calendar, and executive reports.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from club_mcp.agents.base import BaseAgent, MCPTool
from club_mcp.db.repositories.event_repo import EventRepository
from club_mcp.hitl.approval_types import ApprovalLevel
from club_mcp.models.event import (
    EventCategory,
    EventCreate,
    EventStatus,
    RSVPStatus,
    VendorContractStatus,
)


class EventOrchestratorAgent(BaseAgent):
    """Agente orquestador de eventos del club."""

    agent_name = "event_orchestrator"
    description = "Orquestación completa de eventos del club"

    def __init__(
        self,
        event_repo: EventRepository,
        approval_engine: Any = None,
        notifier: Any = None,
        club_config: dict[str, Any] | None = None,
    ) -> None:
        super().__init__()
        self.event_repo = event_repo
        if approval_engine is not None:
            self.approval_engine = approval_engine
        self.notifier = notifier
        self.club_config = club_config or {}

    # ─────────────────────────────────────────────────────────
    # Tool 1: event_create  🔴 HITL
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "event_create",
        "Crear un nuevo evento en el club. Requiere aprobación del administrador.",
        approval=ApprovalLevel.HITL,
    )
    async def event_create(self, event_data: dict[str, Any]) -> dict[str, Any]:
        """Create a new club event (HITL — requires admin approval)."""
        try:
            validated = EventCreate(**event_data)
        except Exception as exc:
            return {
                "status": "error",
                "message": f"Datos del evento inválidos: {exc}",
            }

        request = await self.approval_engine.create_request(
            agent=self.agent_name,
            tool="event_create",
            params={"event_data": validated.model_dump(mode="json")},
            requested_by="system",
            approval_level=ApprovalLevel.HITL,
        )


        return {
            "status": "pending_approval",
            "message": (
                f'🎉 Evento "{validated.title}" registrado. '
                f"Está pendiente de aprobación por un administrador. "
                f"Te avisamos en cuanto se confirme. 🔔"
            ),
            "request_id": str(request.request_id),
            "event_title": validated.title,
            "event_date": validated.date_start.isoformat(),
        }

    async def execute_event_create(
        self, event_data: dict[str, Any]
    ) -> dict[str, Any]:
        """Execute event creation post-approval."""
        validated = EventCreate(**event_data)
        event = self.event_repo.create_event(validated)
        self.event_repo.update_event(event.id, {"status": EventStatus.APPROVED.value})

        return {
            "status": "success",
            "message": (
                f'✨ ¡Evento "{event.title}" creado exitosamente! '
                f"Ya está aprobado y listo para publicar. 🎊"
            ),
            "data": event.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 2: event_build_program  🟡 SEMI-AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "event_build_program",
        "Armar o actualizar el itinerario / programa de un evento.",
        approval=ApprovalLevel.SEMI_AUTO,
    )
    async def event_build_program(
        self,
        event_id: str,
        program_items: list[dict[str, Any]],
        replace_all: bool = False,
    ) -> dict[str, Any]:
        """Build or update the program / itinerary for an event."""
        event = self.event_repo.get_event(event_id)
        if not event:
            return {
                "status": "error",
                "message": f"No encontramos el evento con ID {event_id}. 🔍",
            }

        if replace_all:
            for item in event.programs:
                self.event_repo.remove_program_item(item.id)

        created: list[dict] = []
        for idx, item in enumerate(program_items):
            pi = self.event_repo.add_program_item(
                event_id=event_id,
                title=item.get("title", f"Actividad {idx + 1}"),
                time_start=item.get("time_start", "00:00"),
                time_end=item.get("time_end", "00:00"),
                description=item.get("description", ""),
                location=item.get("location", ""),
                responsible=item.get("responsible", ""),
                notes=item.get("notes", ""),
                order=item.get("order", idx),
            )
            if pi:
                created.append(pi.model_dump(mode="json"))

        return {
            "status": "success",
            "message": (
                f'📋 Programa de "{event.title}" actualizado con '
                f"{len(created)} actividades. ¡Se ve increíble! 🌟"
            ),
            "event_id": event_id,
            "program_items": created,
            "total_items": len(created),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 3: event_manage_rsvps  🟢 AUTO / 🔴 HITL (bulk)
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "event_manage_rsvps",
        "Gestionar RSVPs de un evento: agregar, actualizar, eliminar o listar.",
        approval=ApprovalLevel.AUTO,
    )
    async def event_manage_rsvps(
        self,
        event_id: str,
        action: str,
        family_id: str | None = None,
        member_ids: list[str] | None = None,
        guests_count: int = 0,
        dietary_restrictions: str = "",
        notes: str = "",
        rsvp_id: str | None = None,
        new_status: str | None = None,
        bulk_rsvps: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """Manage RSVPs for an event."""
        event = self.event_repo.get_event(event_id)
        if not event:
            return {
                "status": "error",
                "message": f"No encontramos el evento con ID {event_id}. 🔍",
            }

        # Bulk ≥ 10 → HITL
        if action == "add_bulk" and bulk_rsvps and len(bulk_rsvps) >= 10:
            request = await self.approval_engine.create_request(
                agent=self.agent_name,
                tool="event_manage_rsvps",
                params={
                    "event_id": event_id,
                    "action": action,
                    "bulk_rsvps": bulk_rsvps,
                },
                requested_by="system",
                approval_level=ApprovalLevel.HITL,
            )


            return {
                "status": "pending_approval",
                "message": (
                    f"📋 Registro masivo de {len(bulk_rsvps)} RSVPs para "
                    f'"{event.title}" pendiente de aprobación. 🔔'
                ),
                "request_id": str(request.request_id),
            }

        return await self._execute_rsvp_action(
            event_id, action, family_id, member_ids,
            guests_count, dietary_restrictions, notes,
            rsvp_id, new_status, bulk_rsvps,
        )

    async def execute_manage_rsvps_bulk(
        self, params: dict[str, Any]
    ) -> dict[str, Any]:
        """Execute bulk RSVP management post-approval."""
        return await self._execute_rsvp_action(**params)

    async def _execute_rsvp_action(
        self,
        event_id: str,
        action: str,
        family_id: str | None,
        member_ids: list[str] | None,
        guests_count: int,
        dietary_restrictions: str,
        notes: str,
        rsvp_id: str | None,
        new_status: str | None,
        bulk_rsvps: list[dict[str, Any]] | None,
    ) -> dict[str, Any]:
        event = self.event_repo.get_event(event_id)
        etitle = event.title if event else ""

        if action == "add":
            if not family_id:
                return {"status": "error", "message": "Se requiere family_id."}
            rsvp = self.event_repo.add_rsvp(
                event_id=event_id,
                family_id=family_id,
                member_ids=member_ids or [],
                guests_count=guests_count,
                dietary_restrictions=dietary_restrictions,
                notes=notes,
            )
            if not rsvp:
                return {"status": "error", "message": "No se pudo crear el RSVP."}
            tag = "en lista de espera" if rsvp.status == RSVPStatus.WAITLISTED else "confirmado"
            return {
                "status": "success",
                "message": (
                    f"🎉 ¡RSVP {tag} para \"{etitle}\"! "
                    f"Nos emociona verlos ahí. 💛"
                ),
                "data": rsvp.model_dump(mode="json"),
            }

        if action == "update":
            if not rsvp_id:
                return {"status": "error", "message": "Se requiere rsvp_id."}
            updates: dict[str, Any] = {}
            if new_status:
                updates["status"] = new_status
            if guests_count:
                updates["guests_count"] = guests_count
            if dietary_restrictions:
                updates["dietary_restrictions"] = dietary_restrictions
            if notes:
                updates["notes"] = notes
            rsvp = self.event_repo.update_rsvp(rsvp_id, updates)
            if not rsvp:
                return {"status": "error", "message": "RSVP no encontrado."}
            return {
                "status": "success",
                "message": f'✅ RSVP actualizado para "{etitle}".',
                "data": rsvp.model_dump(mode="json"),
            }

        if action == "remove":
            if not rsvp_id:
                return {"status": "error", "message": "Se requiere rsvp_id."}
            if not self.event_repo.remove_rsvp(rsvp_id):
                return {"status": "error", "message": "RSVP no encontrado."}
            return {
                "status": "success",
                "message": f'🗑️ RSVP eliminado de "{etitle}".',
            }

        if action == "list":
            sf = None
            if new_status:
                try:
                    sf = RSVPStatus(new_status)
                except ValueError:
                    pass
            rsvps = self.event_repo.list_rsvps(event_id, status=sf)
            return {
                "status": "success",
                "message": f'📋 {len(rsvps)} RSVPs para "{etitle}".',
                "data": [r.model_dump(mode="json") for r in rsvps],
                "total": len(rsvps),
            }

        if action == "add_bulk":
            results = []
            for rd in (bulk_rsvps or []):
                rsvp = self.event_repo.add_rsvp(
                    event_id=event_id,
                    family_id=rd.get("family_id", ""),
                    member_ids=rd.get("member_ids", []),
                    guests_count=rd.get("guests_count", 0),
                    dietary_restrictions=rd.get("dietary_restrictions", ""),
                    notes=rd.get("notes", ""),
                    family_name=rd.get("family_name", ""),
                )
                if rsvp:
                    results.append(rsvp.model_dump(mode="json"))
            return {
                "status": "success",
                "message": (
                    f"🎉 {len(results)} RSVPs registrados para \"{etitle}\". "
                    f"¡Qué emoción! 💛"
                ),
                "data": results,
                "total": len(results),
            }

        return {"status": "error", "message": f"Acción no reconocida: {action}"}

    # ─────────────────────────────────────────────────────────
    # Tool 4: event_coordinate_vendors  🔴 HITL
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "event_coordinate_vendors",
        "Gestionar proveedores y contratos de un evento.",
        approval=ApprovalLevel.HITL,
    )
    async def event_coordinate_vendors(
        self,
        event_id: str,
        action: str,
        vendor_data: dict[str, Any] | None = None,
        vendor_id: str | None = None,
    ) -> dict[str, Any]:
        """Coordinate vendors for an event (HITL for mutations)."""
        event = self.event_repo.get_event(event_id)
        if not event:
            return {
                "status": "error",
                "message": f"No encontramos el evento con ID {event_id}. 🔍",
            }

        if action == "list":
            vendors = self.event_repo.list_vendors(event_id)
            return {
                "status": "success",
                "message": f'📋 {len(vendors)} proveedores para "{event.title}".',
                "data": [v.model_dump(mode="json") for v in vendors],
            }

        request = await self.approval_engine.create_request(
            agent=self.agent_name,
            tool="event_coordinate_vendors",
            params={
                "event_id": event_id,
                "action": action,
                "vendor_data": vendor_data,
                "vendor_id": vendor_id,
            },
            requested_by="system",
            approval_level=ApprovalLevel.HITL,
        )


        labels = {
            "add": "agregar proveedor",
            "update": "actualizar proveedor",
            "remove": "eliminar proveedor",
            "approve_contract": "aprobar contrato",
        }

        return {
            "status": "pending_approval",
            "message": (
                f"📝 Solicitud para {labels.get(action, action)} "
                f'en "{event.title}" enviada al administrador. '
                f"Pendiente de aprobación. 🔔"
            ),
            "request_id": str(request.request_id),
        }

    async def execute_coordinate_vendors(
        self, params: dict[str, Any]
    ) -> dict[str, Any]:
        """Execute vendor coordination post-approval."""
        event_id = params["event_id"]
        action = params["action"]
        vendor_data = params.get("vendor_data")
        vendor_id = params.get("vendor_id")
        event = self.event_repo.get_event(event_id)
        etitle = event.title if event else ""

        if action == "add" and vendor_data:
            vendor = self.event_repo.add_vendor(
                event_id=event_id,
                name=vendor_data.get("name", ""),
                service_type=vendor_data.get("service_type", ""),
                contact_name=vendor_data.get("contact_name", ""),
                contact_phone=vendor_data.get("contact_phone", ""),
                contact_email=vendor_data.get("contact_email", ""),
                quoted_cost=vendor_data.get("quoted_cost", 0.0),
                notes=vendor_data.get("notes", ""),
            )
            if vendor:
                return {
                    "status": "success",
                    "message": (
                        f'✅ Proveedor "{vendor.name}" agregado a "{etitle}". '
                        f"¡Un paso más cerca de un evento increíble! 🎊"
                    ),
                    "data": vendor.model_dump(mode="json"),
                }

        if action == "update" and vendor_id and vendor_data:
            vendor = self.event_repo.update_vendor(vendor_id, vendor_data)
            if vendor:
                return {
                    "status": "success",
                    "message": f'✅ Proveedor "{vendor.name}" actualizado.',
                    "data": vendor.model_dump(mode="json"),
                }

        if action == "remove" and vendor_id:
            if self.event_repo.remove_vendor(vendor_id):
                return {
                    "status": "success",
                    "message": f'🗑️ Proveedor eliminado de "{etitle}".',
                }

        if action == "approve_contract" and vendor_id:
            vendor = self.event_repo.update_vendor(
                vendor_id,
                {"contract_status": VendorContractStatus.APPROVED.value},
            )
            if vendor:
                return {
                    "status": "success",
                    "message": (
                        f'📄 Contrato aprobado con "{vendor.name}" para "{etitle}". '
                        f"¡Listo para el gran día! 🤝"
                    ),
                    "data": vendor.model_dump(mode="json"),
                }

        return {
            "status": "error",
            "message": "No se pudo completar la acción con el proveedor.",
        }

    # ─────────────────────────────────────────────────────────
    # Tool 5: event_manage_capacity  🟢 AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "event_manage_capacity",
        "Consultar o ajustar la capacidad de un evento.",
        approval=ApprovalLevel.AUTO,
    )
    async def event_manage_capacity(
        self,
        event_id: str,
        new_max_capacity: int | None = None,
    ) -> dict[str, Any]:
        """Get capacity info or update max capacity."""
        event = self.event_repo.get_event(event_id)
        if not event:
            return {
                "status": "error",
                "message": f"No encontramos el evento con ID {event_id}. 🔍",
            }

        if new_max_capacity is not None:
            self.event_repo.update_event(event_id, {"max_capacity": new_max_capacity})

        cap = self.event_repo.get_capacity_info(event_id)
        if not cap:
            return {"status": "error", "message": "No se pudo obtener capacidad."}

        if new_max_capacity is not None:
            return {
                "status": "success",
                "message": (
                    f'📊 Capacidad de "{event.title}" actualizada a '
                    f"{cap.max_capacity} personas. "
                    f"Actualmente hay {cap.current_attendance} confirmados "
                    f"({cap.occupancy_pct:.0f}% de ocupación)."
                ),
                "data": cap.model_dump(mode="json"),
            }

        wl = f" — {cap.waitlist_count} en lista de espera." if cap.waitlist_count > 0 else "."
        return {
            "status": "success",
            "message": (
                f'📊 "{event.title}": {cap.current_attendance}/{cap.max_capacity} '
                f"asistentes ({cap.occupancy_pct:.0f}% ocupación){wl}"
            ),
            "data": cap.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 6: event_get_analytics  🟢 AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "event_get_analytics",
        "Obtener analytics y métricas de un evento.",
        approval=ApprovalLevel.AUTO,
    )
    async def event_get_analytics(self, event_id: str) -> dict[str, Any]:
        """Get analytics and metrics for an event."""
        analytics = self.event_repo.compute_analytics(event_id)
        if not analytics:
            return {
                "status": "error",
                "message": f"No encontramos el evento con ID {event_id}. 🔍",
            }

        return {
            "status": "success",
            "message": (
                f'📈 Analytics de "{analytics.event_title}": '
                f"{analytics.confirmed_attendance} confirmados de "
                f"{analytics.total_rsvps} invitados "
                f"({analytics.attendance_rate}% asistencia), "
                f"₡{analytics.revenue:,.0f} en ingresos."
            ),
            "data": analytics.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 7: event_clone_template  🟡 SEMI-AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "event_clone_template",
        "Clonar un evento existente como plantilla para nuevas fechas.",
        approval=ApprovalLevel.SEMI_AUTO,
    )
    async def event_clone_template(
        self,
        event_id: str,
        new_date_start: str,
        new_date_end: str,
        title_suffix: str = "",
    ) -> dict[str, Any]:
        """Clone an event as a template with new dates."""
        try:
            start = datetime.fromisoformat(new_date_start)
            end = datetime.fromisoformat(new_date_end)
        except ValueError:
            return {
                "status": "error",
                "message": "Formato de fecha inválido. Usa YYYY-MM-DD o ISO. 📅",
            }

        source = self.event_repo.get_event(event_id)
        if not source:
            return {
                "status": "error",
                "message": f"No encontramos el evento con ID {event_id}. 🔍",
            }

        suffix = title_suffix or f"— {start.strftime('%d/%m/%Y')}"
        cloned = self.event_repo.clone_event(event_id, start, end, suffix)
        if not cloned:
            return {"status": "error", "message": "No se pudo clonar el evento."}

        return {
            "status": "success",
            "message": (
                f'📋 Evento "{source.title}" clonado como "{cloned.title}" '
                f"para {start.strftime('%d/%m/%Y')}. "
                f"Recuerda revisar y publicar cuando esté listo. ✨"
            ),
            "data": cloned.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 8: event_get_calendar  🟢 AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "event_get_calendar",
        "Obtener el calendario de eventos en un rango de fechas.",
        approval=ApprovalLevel.AUTO,
    )
    async def event_get_calendar(
        self,
        date_from: str,
        date_to: str,
        category: str | None = None,
    ) -> dict[str, Any]:
        """Get the event calendar for a date range."""
        try:
            start = datetime.fromisoformat(date_from)
            end = datetime.fromisoformat(date_to)
        except ValueError:
            return {
                "status": "error",
                "message": "Formato de fecha inválido. Usa YYYY-MM-DD. 📅",
            }

        if category:
            try:
                EventCategory(category)
            except ValueError:
                valid = ", ".join(c.value for c in EventCategory)
                return {
                    "status": "error",
                    "message": f"Categoría no válida: {category}. Opciones: {valid}",
                }

        cal = self.event_repo.get_calendar(start, end, category)
        total = sum(d.total_events for d in cal)
        conflicts = sum(1 for d in cal if d.has_conflicts)

        conflict_msg = (
            f" ({conflicts} días con conflictos de horario)." if conflicts > 0 else "."
        )

        return {
            "status": "success",
            "message": (
                f"📅 Calendario: {total} eventos entre "
                f"{start.strftime('%d/%m/%Y')} y {end.strftime('%d/%m/%Y')}"
                f"{conflict_msg}"
            ),
            "data": [d.model_dump(mode="json") for d in cal],
            "total_events": total,
            "conflict_days": conflicts,
        }

    # ─────────────────────────────────────────────────────────
    # Tool 9: event_generate_report  🟡 SEMI-AUTO / 🔴 HITL
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "event_generate_report",
        "Generar un reporte ejecutivo o financiero de eventos.",
        approval=ApprovalLevel.SEMI_AUTO,
    )
    async def event_generate_report(
        self,
        date_from: str,
        date_to: str,
        report_type: str = "executive",
    ) -> dict[str, Any]:
        """Generate an event report. Financial reports require HITL."""
        try:
            start = datetime.fromisoformat(date_from)
            end = datetime.fromisoformat(date_to)
        except ValueError:
            return {
                "status": "error",
                "message": "Formato de fecha inválido. Usa YYYY-MM-DD. 📅",
            }

        if report_type == "financial":
            request = await self.approval_engine.create_request(
                agent=self.agent_name,
                tool="event_generate_report",
                params={
                    "date_from": date_from,
                    "date_to": date_to,
                    "report_type": report_type,
                },
                requested_by="system",
                approval_level=ApprovalLevel.HITL,
            )

            return {
                "status": "pending_approval",
                "message": (
                    f"📊 Reporte financiero del {start.strftime('%d/%m/%Y')} al "
                    f"{end.strftime('%d/%m/%Y')} requiere aprobación. 🔔"
                ),
                "request_id": str(request.request_id),
            }

        report = self.event_repo.generate_report(start, end, report_type)

        return {
            "status": "success",
            "message": (
                f"📊 Reporte {report_type}: "
                f"{report.total_events} eventos, "
                f"{report.total_attendance} asistentes, "
                f"₡{report.total_revenue:,.0f} ingresos."
            ),
            "data": report.model_dump(mode="json"),
        }

    async def execute_generate_report_financial(
        self, params: dict[str, Any]
    ) -> dict[str, Any]:
        """Execute financial report generation post-approval."""
        start = datetime.fromisoformat(params["date_from"])
        end = datetime.fromisoformat(params["date_to"])
        report = self.event_repo.generate_report(start, end, "financial")
        return {
            "status": "success",
            "message": f"📊 Reporte financiero: {report.total_events} eventos.",
            "data": report.model_dump(mode="json"),
        }
    # ─────────────────────────────────────────────────────────
    # Tool 10: event_get_calendar_enhanced  🟢 AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "event_get_calendar_enhanced",
        (
            "Obtener calendario enriquecido de eventos: incluye "
            "capacidad, resumen RSVPs, desglose por categoría "
            "y detalle de conflictos por día."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def event_get_calendar_enhanced(
        self,
        date_from: str,
        date_to: str,
        category: str | None = None,
    ) -> dict[str, Any]:
        """Get enriched event calendar."""
        try:
            start = datetime.fromisoformat(date_from)
            end = datetime.fromisoformat(date_to)
        except ValueError:
            return {
                "status": "error",
                "message": "Formato de fecha inválido. Usa YYYY-MM-DD. 📅",
            }

        if category:
            try:
                EventCategory(category)
            except ValueError:
                valid = ", ".join(c.value for c in EventCategory)
                return {
                    "status": "error",
                    "message": (
                        f"Categoría no válida: {category}. "
                        f"Opciones: {valid}"
                    ),
                }

        # Base calendar
        cal = self.event_repo.get_calendar(start, end, category)

        # Enrich each day
        enriched_days: list[dict[str, Any]] = []
        total_events = 0
        total_rsvps = 0
        category_counts: dict[str, int] = {}

        for day in cal:
            day_events: list[dict[str, Any]] = []
            day_conflicts: list[dict[str, Any]] = []

            for brief in day.events:
                total_events += 1

                # Category breakdown
                cat = brief.category
                category_counts[cat] = category_counts.get(cat, 0) + 1

                # Capacity per event
                cap = self.event_repo.get_capacity_info(brief.id)

                # RSVP summary per event
                rsvps = self.event_repo.list_rsvps(brief.id)
                confirmed = sum(
                    1 for r in rsvps
                    if r.status == RSVPStatus.CONFIRMED
                )
                waitlisted = sum(
                    1 for r in rsvps
                    if r.status == RSVPStatus.WAITLISTED
                )
                total_rsvps += len(rsvps)

                event_data: dict[str, Any] = {
                    "id": brief.id,
                    "title": brief.title,
                    "category": brief.category,
                    "status": brief.status,
                    "date_start": brief.date_start.isoformat(),
                    "date_end": brief.date_end.isoformat(),
                    "location": brief.location,
                    "rsvp_summary": {
                        "total": len(rsvps),
                        "confirmed": confirmed,
                        "waitlisted": waitlisted,
                    },
                }

                if cap:
                    event_data["capacity"] = {
                        "max": cap.max_capacity,
                        "current": cap.current_attendance,
                        "occupancy_pct": cap.occupancy_pct,
                        "is_full": cap.is_full,
                    }

                day_events.append(event_data)

            # Conflict details for this day
            if day.has_conflicts and len(day.events) >= 2:
                day_start = datetime.fromisoformat(day.date)
                day_end = day_start.replace(
                    hour=23, minute=59, second=59
                )
                conflicts = self.event_repo.get_conflict_details(
                    day_start, day_end, category
                )
                day_conflicts = [
                    c for c in conflicts
                    if c["event_a_start"][:10] == day.date
                    or c["event_b_start"][:10] == day.date
                ]

            enriched_days.append({
                "date": day.date,
                "total_events": day.total_events,
                "has_conflicts": day.has_conflicts,
                "conflict_count": len(day_conflicts),
                "events": day_events,
                "conflicts": day_conflicts,
            })

        # Summary
        conflict_days = sum(
            1 for d in enriched_days if d["has_conflicts"]
        )

        return {
            "status": "success",
            "message": (
                f"📅 Calendario enriquecido: {total_events} eventos, "
                f"{total_rsvps} RSVPs, "
                f"{conflict_days} días con conflictos."
            ),
            "data": enriched_days,
            "summary": {
                "total_events": total_events,
                "total_rsvps": total_rsvps,
                "conflict_days": conflict_days,
                "category_breakdown": category_counts,
            },
        }

    # ─────────────────────────────────────────────────────────
    # Tool 11: event_conflict_detection  🟢 AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "event_conflict_detection",
        (
            "Detectar conflictos detallados entre eventos: "
            "solapamientos horarios, uso compartido de espacios, "
            "recursos en conflicto, con severidad y sugerencias."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def event_conflict_detection(
        self,
        date_from: str,
        date_to: str,
        category: str | None = None,
    ) -> dict[str, Any]:
        """Detect detailed event conflicts."""
        try:
            start = datetime.fromisoformat(date_from)
            end = datetime.fromisoformat(date_to)
        except ValueError:
            return {
                "status": "error",
                "message": "Formato de fecha inválido. Usa YYYY-MM-DD. 📅",
            }

        if category:
            try:
                EventCategory(category)
            except ValueError:
                valid = ", ".join(c.value for c in EventCategory)
                return {
                    "status": "error",
                    "message": (
                        f"Categoría no válida: {category}. "
                        f"Opciones: {valid}"
                    ),
                }

        conflicts = self.event_repo.get_conflict_details(
            start, end, category
        )

        if not conflicts:
            return {
                "status": "success",
                "message": (
                    "✅ No se detectaron conflictos entre "
                    f"{start.strftime('%d/%m/%Y')} y "
                    f"{end.strftime('%d/%m/%Y')}."
                ),
                "conflicts": [],
                "total": 0,
                "by_severity": {"high": 0, "medium": 0, "low": 0},
            }

        # Severity counts
        severity_counts: dict[str, int] = {
            "high": 0, "medium": 0, "low": 0
        }
        for c in conflicts:
            severity_counts[c["severity"]] = (
                severity_counts.get(c["severity"], 0) + 1
            )

        # Summary line
        parts: list[str] = []
        if severity_counts["high"]:
            parts.append(f"🔴 {severity_counts['high']} alto(s)")
        if severity_counts["medium"]:
            parts.append(f"🟡 {severity_counts['medium']} medio(s)")
        if severity_counts["low"]:
            parts.append(f"🟢 {severity_counts['low']} bajo(s)")

        return {
            "status": "success",
            "message": (
                f"⚠️ {len(conflicts)} conflicto(s) detectado(s): "
                + " | ".join(parts)
            ),
            "conflicts": conflicts,
            "total": len(conflicts),
            "by_severity": severity_counts,
        }

    def _register_tools(self) -> None:
        """Not used — tools are registered via @MCPTool decorator."""
        pass
