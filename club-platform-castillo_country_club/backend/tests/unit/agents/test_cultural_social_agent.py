"""
Tests for CulturalSocialAgent.
Club: Castillo Country Club
"""

from __future__ import annotations

from unittest.mock import AsyncMock
from uuid import UUID

import pytest

from club_mcp.agents.cultural_social_agent import CulturalSocialAgent
from club_mcp.db.repositories.cultural_social_repo import CulturalSocialRepository
from club_mcp.hitl.approval_types import ApprovalStatus
from club_mcp.models.cultural_social import (
    CreateArtExhibition,
    CreateCulturalEvent,
    CreateCulturalProgram,
    CreateEntertainmentAct,
    CulturalCategory,
    EntertainmentType,
    EventType,
    ExhibitionStatus,
    FormalityLevel,
    PerformanceStatus,
    VenueType,
)


# ── Fixtures ───────────────────────────────────────────

@pytest.fixture
def cultural_social_repo():
    return CulturalSocialRepository()


@pytest.fixture
def cultural_social_agent(cultural_social_repo, approval_engine):
    agent = CulturalSocialAgent(repo=cultural_social_repo)
    agent.approval_engine = approval_engine
    return agent


# ── Seed helpers ───────────────────────────────────────

async def _seed_event(repo, **overrides):
    data = CreateCulturalEvent(
        name=overrides.get("name", "Cena de Gala Anual"),
        event_type=overrides.get("event_type", EventType.DINNER),
        formality=overrides.get("formality", FormalityLevel.SEMI_FORMAL),
        venue=overrides.get("venue", "Salón Principal"),
        venue_type=overrides.get("venue_type", VenueType.BALLROOM),
        date=overrides.get("date", "2026-06-15"),
        start_time=overrides.get("start_time", "19:00"),
        end_time=overrides.get("end_time", "23:00"),
        organizer_member_id=overrides.get("organizer_member_id", "M001"),
        description=overrides.get("description", "Cena anual del club"),
        guest_count=overrides.get("guest_count", 150),
        budget=overrides.get("budget", 5000000.0),
    )
    return await repo.create_event(data)


async def _seed_act(repo, **overrides):
    data = CreateEntertainmentAct(
        artist_name=overrides.get("artist_name", "Los del Caribe"),
        entertainment_type=overrides.get(
            "entertainment_type", EntertainmentType.LIVE_BAND
        ),
        genre=overrides.get("genre", "salsa"),
        duration_minutes=overrides.get("duration_minutes", 90),
        cost=overrides.get("cost", 500000.0),
        contact_person=overrides.get("contact_person", "Pedro Pascal"),
        contact_phone=overrides.get("contact_phone", "+50688889999"),
    )
    return await repo.create_act(data)


async def _seed_program(repo, **overrides):
    data = CreateCulturalProgram(
        name=overrides.get("name", "Tardes de Jazz"),
        category=overrides.get("category", CulturalCategory.MUSIC),
        description=overrides.get("description", "Serie de conciertos de jazz"),
        season=overrides.get("season", "2026-Q2"),
        start_date=overrides.get("start_date", "2026-04-01"),
        end_date=overrides.get("end_date", "2026-06-30"),
        coordinator_member_id=overrides.get("coordinator_member_id", "M002"),
        max_participants=overrides.get("max_participants", 50),
        budget=overrides.get("budget", 2000000.0),
    )
    return await repo.create_program(data)


async def _seed_exhibition(repo, **overrides):
    data = CreateArtExhibition(
        title=overrides.get("title", "Costa Rica en Colores"),
        artist_name=overrides.get("artist_name", "María Fernanda López"),
        category=overrides.get("category", CulturalCategory.VISUAL_ARTS),
        venue=overrides.get("venue", "Galería del Club"),
        start_date=overrides.get("start_date", "2026-05-01"),
        end_date=overrides.get("end_date", "2026-05-31"),
        num_pieces=overrides.get("num_pieces", 25),
        curator_member_id=overrides.get("curator_member_id", "M003"),
        opening_reception=overrides.get("opening_reception", True),
    )
    return await repo.create_exhibition(data)


# ══════════════════════════════════════════════════════
# TEST CLASS 1: organize_formal_gala
# ══════════════════════════════════════════════════════


class TestOrganizeFormalGala:

    @pytest.mark.asyncio
    async def test_gala_success_pending_approval(self, cultural_social_agent):
        result = await cultural_social_agent.organize_formal_gala(
            name="Gala de Verano 2026",
            venue="Salón Principal",
            venue_type="ballroom",
            date="2026-07-20",
            start_time="19:00",
            end_time="23:30",
            formality="black_tie",
            organizer_member_id="M001",
            guest_count=200,
            budget=8000000.0,
            menu_theme="Cocina Mediterránea",
            dress_code="Smoking o vestido largo",
            requested_by="admin@castillo.cr",
        )

        assert result["status"] == "pending_approval"
        assert "request_id" in result
        assert "Gala de Verano 2026" in result["message"]

    @pytest.mark.asyncio
    async def test_gala_approve_and_execute(self, cultural_social_agent, approval_engine):
        result = await cultural_social_agent.organize_formal_gala(
            name="Gala Benéfica",
            venue="Jardín Botánico",
            venue_type="garden",
            date="2026-08-10",
            start_time="18:00",
            end_time="22:00",
            formality="formal",
            organizer_member_id="M005",
            guest_count=120,
            budget=6000000.0,
            requested_by="admin@castillo.cr",
        )

        assert result["status"] == "pending_approval"
        request_id = result["request_id"]

        approval = await approval_engine.approve(
            UUID(request_id),
            approved_by="admin@castillo.cr",
            note="Gala aprobada. Presupuesto confirmado.",
        )
        assert approval.status == ApprovalStatus.APPROVED

        execute_result = await cultural_social_agent.execute_formal_gala(
            name="Gala Benéfica",
            venue="Jardín Botánico",
            venue_type="garden",
            date="2026-08-10",
            start_time="18:00",
            end_time="22:00",
            formality="formal",
            organizer_member_id="M005",
            guest_count=120,
            budget=6000000.0,
        )

        assert execute_result["status"] == "success"
        assert execute_result["event"]["status"] == "confirmed"
        assert execute_result["event"]["name"] == "Gala Benéfica"

    @pytest.mark.asyncio
    async def test_gala_confirmation_missing_after_create(
        self, cultural_social_agent, monkeypatch,
    ):
        monkeypatch.setattr(
            cultural_social_agent.repo,
            "update_event",
            AsyncMock(return_value=None),
        )

        result = await cultural_social_agent.execute_formal_gala(
            name="Gala Benéfica",
            venue="Jardín Botánico",
            venue_type="garden",
            date="2026-08-10",
            start_time="18:00",
            end_time="22:00",
            formality="formal",
            organizer_member_id="M005",
        )

        assert result["status"] == "error"

    @pytest.mark.asyncio
    async def test_gala_missing_fields(self, cultural_social_agent):
        result = await cultural_social_agent.organize_formal_gala(
            name="Gala Incompleta",
        )
        assert result["status"] == "error"
        assert "Faltan campos" in result["message"]

    @pytest.mark.asyncio
    async def test_gala_invalid_formality(self, cultural_social_agent):
        result = await cultural_social_agent.organize_formal_gala(
            name="Gala Test",
            venue="Salón",
            date="2026-07-01",
            start_time="19:00",
            end_time="23:00",
            formality="pajama_party",
            organizer_member_id="M001",
        )
        assert result["status"] == "error"
        assert "Formalidad no válida" in result["message"]

    @pytest.mark.asyncio
    async def test_gala_invalid_venue_type(self, cultural_social_agent):
        result = await cultural_social_agent.organize_formal_gala(
            name="Gala Test",
            venue="Salón",
            venue_type="spaceship",
            date="2026-07-01",
            start_time="19:00",
            end_time="23:00",
            formality="black_tie",
            organizer_member_id="M001",
        )
        assert result["status"] == "error"
        assert "Tipo de venue no válido" in result["message"]



# ══════════════════════════════════════════════════════
# TEST CLASS 2: manage_entertainment_acts
# ══════════════════════════════════════════════════════


class TestManageEntertainmentActs:

    @pytest.mark.asyncio
    async def test_list_empty(self, cultural_social_agent):
        result = await cultural_social_agent.manage_entertainment_acts(action="list")
        assert result["status"] == "success"
        assert result["acts"] == []

    @pytest.mark.asyncio
    async def test_create_hitl_pending(self, cultural_social_agent):
        result = await cultural_social_agent.manage_entertainment_acts(
            action="create",
            artist_name="Sonora Típica",
            entertainment_type="live_band",
            genre="cumbia",
            duration_minutes=120,
            cost=750000.0,
            contact_person="Juan Pérez",
            contact_phone="+50688881111",
            requested_by="admin@castillo.cr",
        )

        assert result["status"] == "pending_approval"
        assert "Sonora Típica" in result["message"]

    @pytest.mark.asyncio
    async def test_create_approve_and_execute(
        self, cultural_social_agent, approval_engine
    ):
        result = await cultural_social_agent.manage_entertainment_acts(
            action="create",
            artist_name="DJ Carlos",
            entertainment_type="dj",
            genre="house",
            duration_minutes=180,
            cost=350000.0,
            contact_person="Ana Vargas",
            requested_by="admin@castillo.cr",
        )

        assert result["status"] == "pending_approval"
        request_id = result["request_id"]

        approval = await approval_engine.approve(
            UUID(request_id),
            approved_by="admin@castillo.cr",
            note="DJ aprobado para evento.",
        )
        assert approval.status == ApprovalStatus.APPROVED

        execute_result = await cultural_social_agent.execute_entertainment_act(
            artist_name="DJ Carlos",
            entertainment_type="dj",
            genre="house",
            duration_minutes=180,
            cost=350000.0,
            contact_person="Ana Vargas",
        )

        assert execute_result["status"] == "success"
        assert execute_result["act"]["artist_name"] == "DJ Carlos"
        assert execute_result["act"]["status"] == "contracted"

    @pytest.mark.asyncio
    async def test_create_missing_fields(self, cultural_social_agent):
        result = await cultural_social_agent.manage_entertainment_acts(
            action="create",
            artist_name="Solo el nombre",
        )
        assert result["status"] == "error"
        assert "Faltan campos" in result["message"]

    @pytest.mark.asyncio
    async def test_get_not_found(self, cultural_social_agent):
        result = await cultural_social_agent.manage_entertainment_acts(
            action="get", act_id="no_existe"
        )
        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_get_success(self, cultural_social_agent, cultural_social_repo):
        act = await _seed_act(cultural_social_repo)
        result = await cultural_social_agent.manage_entertainment_acts(
            action="get", act_id=act.id
        )
        assert result["status"] == "success"
        assert result["act"]["artist_name"] == "Los del Caribe"

    @pytest.mark.asyncio
    async def test_update_status(
        self, cultural_social_agent, cultural_social_repo
    ):
        act = await _seed_act(cultural_social_repo)
        result = await cultural_social_agent.manage_entertainment_acts(
            action="update_status",
            act_id=act.id,
            new_status="confirmed",
        )
        assert result["status"] == "success"
        assert "confirmed" in result["message"]

    @pytest.mark.asyncio
    async def test_update_status_missing_after_lookup(
        self, cultural_social_agent, cultural_social_repo, monkeypatch,
    ):
        act = await _seed_act(cultural_social_repo)
        monkeypatch.setattr(
            cultural_social_agent.repo,
            "update_act",
            AsyncMock(return_value=None),
        )

        result = await cultural_social_agent.manage_entertainment_acts(
            action="update_status", act_id=act.id, new_status="confirmed",
        )

        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_contract_missing_after_create(
        self, cultural_social_agent, monkeypatch,
    ):
        monkeypatch.setattr(
            cultural_social_agent.repo,
            "update_act",
            AsyncMock(return_value=None),
        )

        result = await cultural_social_agent.execute_entertainment_act(
            artist_name="DJ Carlos",
            entertainment_type="dj",
            contact_person="Ana Vargas",
        )

        assert result["status"] == "error"

    @pytest.mark.asyncio
    async def test_invalid_action(self, cultural_social_agent):
        result = await cultural_social_agent.manage_entertainment_acts(
            action="dance"
        )
        assert result["status"] == "error"
        assert "no válida" in result["message"]


# ══════════════════════════════════════════════════════
# TEST CLASS 3: manage_cultural_program
# ══════════════════════════════════════════════════════


class TestManageCulturalProgram:

    @pytest.mark.asyncio
    async def test_list_empty(self, cultural_social_agent):
        result = await cultural_social_agent.manage_cultural_program(action="list")
        assert result["status"] == "success"
        assert result["programs"] == []

    @pytest.mark.asyncio
    async def test_create_hitl_pending(self, cultural_social_agent):
        result = await cultural_social_agent.manage_cultural_program(
            action="create",
            name="Taller de Acuarela",
            category="visual_arts",
            description="Taller de pintura con acuarela",
            season="2026-Q3",
            start_date="2026-07-01",
            end_date="2026-09-30",
            coordinator_member_id="M010",
            max_participants=15,
            budget=800000.0,
            requested_by="admin@castillo.cr",
        )

        assert result["status"] == "pending_approval"
        assert "Taller de Acuarela" in result["message"]

    @pytest.mark.asyncio
    async def test_create_approve_and_execute(
        self, cultural_social_agent, approval_engine
    ):
        result = await cultural_social_agent.manage_cultural_program(
            action="create",
            name="Club de Lectura",
            category="literature",
            description="Encuentros mensuales de lectura",
            season="2026-Q2",
            start_date="2026-04-01",
            end_date="2026-06-30",
            coordinator_member_id="M011",
            max_participants=20,
            requested_by="admin@castillo.cr",
        )

        assert result["status"] == "pending_approval"
        request_id = result["request_id"]

        approval = await approval_engine.approve(
            UUID(request_id),
            approved_by="admin@castillo.cr",
            note="Programa aprobado.",
        )
        assert approval.status == ApprovalStatus.APPROVED

        execute_result = await cultural_social_agent.execute_cultural_program(
            name="Club de Lectura",
            category="literature",
            description="Encuentros mensuales de lectura",
            season="2026-Q2",
            start_date="2026-04-01",
            end_date="2026-06-30",
            coordinator_member_id="M011",
            max_participants=20,
        )

        assert execute_result["status"] == "success"
        assert execute_result["program"]["status"] == "active"

    @pytest.mark.asyncio
    async def test_create_missing_fields(self, cultural_social_agent):
        result = await cultural_social_agent.manage_cultural_program(
            action="create",
            name="Solo nombre",
        )
        assert result["status"] == "error"
        assert "Faltan campos" in result["message"]

    @pytest.mark.asyncio
    async def test_create_invalid_category(self, cultural_social_agent):
        result = await cultural_social_agent.manage_cultural_program(
            action="create",
            name="Test",
            category="quantum_physics",
            description="Desc",
            season="2026-Q1",
            start_date="2026-01-01",
            end_date="2026-03-31",
            coordinator_member_id="M001",
        )
        assert result["status"] == "error"
        assert "Categoría no válida" in result["message"]

    @pytest.mark.asyncio
    async def test_get_success(self, cultural_social_agent, cultural_social_repo):
        program = await _seed_program(cultural_social_repo)
        result = await cultural_social_agent.manage_cultural_program(
            action="get", program_id=program.id
        )
        assert result["status"] == "success"
        assert result["program"]["name"] == "Tardes de Jazz"

    @pytest.mark.asyncio
    async def test_update_status(
        self, cultural_social_agent, cultural_social_repo
    ):
        program = await _seed_program(cultural_social_repo)
        result = await cultural_social_agent.manage_cultural_program(
            action="update_status",
            program_id=program.id,
            new_status="completed",
        )
        assert result["status"] == "success"
        assert "completed" in result["message"]

    @pytest.mark.asyncio
    async def test_update_status_missing_after_lookup(
        self, cultural_social_agent, cultural_social_repo, monkeypatch,
    ):
        program = await _seed_program(cultural_social_repo)
        monkeypatch.setattr(
            cultural_social_agent.repo,
            "update_program",
            AsyncMock(return_value=None),
        )

        result = await cultural_social_agent.manage_cultural_program(
            action="update_status", program_id=program.id, new_status="completed",
        )

        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_activation_missing_after_create(
        self, cultural_social_agent, monkeypatch,
    ):
        monkeypatch.setattr(
            cultural_social_agent.repo,
            "update_program",
            AsyncMock(return_value=None),
        )

        result = await cultural_social_agent.execute_cultural_program(
            name="Club de Lectura",
            category="literature",
            description="Encuentros mensuales",
            season="2026-Q2",
            start_date="2026-04-01",
            end_date="2026-06-30",
            coordinator_member_id="M011",
        )

        assert result["status"] == "error"


# ══════════════════════════════════════════════════════
# TEST CLASS 4: manage_social_events
# ══════════════════════════════════════════════════════


class TestManageSocialEvents:

    @pytest.mark.asyncio
    async def test_create_success(self, cultural_social_agent):
        result = await cultural_social_agent.manage_social_events(
            action="create",
            name="Happy Hour Viernes",
            event_type="cocktail",
            venue="Terraza del Bar",
            venue_type="terrace",
            date="2026-05-23",
            start_time="17:00",
            end_time="20:00",
            organizer_member_id="M003",
            guest_count=40,
            description="Cóctel de viernes con música en vivo",
        )

        assert result["status"] == "success"
        assert "Happy Hour Viernes" in result["message"]
        assert result["event"]["event_type"] == "cocktail"

    @pytest.mark.asyncio
    async def test_create_gala_blocked(self, cultural_social_agent):
        result = await cultural_social_agent.manage_social_events(
            action="create",
            name="Gala Intento",
            event_type="gala",
            venue="Salón",
            date="2026-06-01",
            start_time="19:00",
            end_time="23:00",
            organizer_member_id="M001",
        )

        assert result["status"] == "error"
        assert "organize_formal_gala" in result["message"]

    @pytest.mark.asyncio
    async def test_create_missing_fields(self, cultural_social_agent):
        result = await cultural_social_agent.manage_social_events(
            action="create",
            name="Incompleto",
        )
        assert result["status"] == "error"
        assert "Faltan campos" in result["message"]

    @pytest.mark.asyncio
    async def test_get_success(self, cultural_social_agent, cultural_social_repo):
        event = await _seed_event(cultural_social_repo)
        result = await cultural_social_agent.manage_social_events(
            action="get", event_id=event.id
        )
        assert result["status"] == "success"
        assert result["event"]["name"] == "Cena de Gala Anual"

    @pytest.mark.asyncio
    async def test_get_not_found(self, cultural_social_agent):
        result = await cultural_social_agent.manage_social_events(
            action="get", event_id="no_existe"
        )
        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_list_with_data(
        self, cultural_social_agent, cultural_social_repo
    ):
        await _seed_event(cultural_social_repo)
        await _seed_event(cultural_social_repo, name="Brunch Dominical", event_type=EventType.BRUNCH)
        result = await cultural_social_agent.manage_social_events(action="list")
        assert result["status"] == "success"
        assert len(result["events"]) == 2

    @pytest.mark.asyncio
    async def test_cancel_event(
        self, cultural_social_agent, cultural_social_repo
    ):
        event = await _seed_event(cultural_social_repo)
        result = await cultural_social_agent.manage_social_events(
            action="cancel", event_id=event.id
        )
        assert result["status"] == "success"
        assert "cancelado" in result["message"].lower()

    @pytest.mark.asyncio
    async def test_cancel_missing_after_lookup(
        self, cultural_social_agent, cultural_social_repo, monkeypatch,
    ):
        event = await _seed_event(cultural_social_repo)
        monkeypatch.setattr(
            cultural_social_agent.repo,
            "cancel_event",
            AsyncMock(return_value=None),
        )

        result = await cultural_social_agent.manage_social_events(
            action="cancel", event_id=event.id,
        )

        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_update_event(
        self, cultural_social_agent, cultural_social_repo
    ):
        event = await _seed_event(cultural_social_repo)
        result = await cultural_social_agent.manage_social_events(
            action="update",
            event_id=event.id,
            guest_count=200,
            description="Actualizado",
        )
        assert result["status"] == "success"
        assert result["event"]["guest_count"] == 200


# ══════════════════════════════════════════════════════
# TEST CLASS 5: manage_art_exhibitions
# ══════════════════════════════════════════════════════


class TestManageArtExhibitions:

    @pytest.mark.asyncio
    async def test_create_success(self, cultural_social_agent):
        result = await cultural_social_agent.manage_art_exhibitions(
            action="create",
            title="Paisajes Ticos",
            artist_name="Carlos Vallejo",
            category="visual_arts",
            venue="Galería Norte",
            venue_type="lounge",
            start_date="2026-06-01",
            end_date="2026-06-30",
            num_pieces=15,
            curator_member_id="M007",
            opening_reception=True,
        )

        assert result["status"] == "success"
        assert "Paisajes Ticos" in result["message"]

    @pytest.mark.asyncio
    async def test_create_missing_fields(self, cultural_social_agent):
        result = await cultural_social_agent.manage_art_exhibitions(
            action="create",
            title="Solo título",
        )
        assert result["status"] == "error"
        assert "Faltan campos" in result["message"]

    @pytest.mark.asyncio
    async def test_create_invalid_category(self, cultural_social_agent):
        result = await cultural_social_agent.manage_art_exhibitions(
            action="create",
            title="Test",
            artist_name="Artista",
            category="space_time",
            venue="Galería",
            start_date="2026-06-01",
            end_date="2026-06-30",
        )
        assert result["status"] == "error"
        assert "Categoría no válida" in result["message"]

    @pytest.mark.asyncio
    async def test_get_success(
        self, cultural_social_agent, cultural_social_repo
    ):
        exhibition = await _seed_exhibition(cultural_social_repo)
        result = await cultural_social_agent.manage_art_exhibitions(
            action="get", exhibition_id=exhibition.id
        )
        assert result["status"] == "success"
        assert result["exhibition"]["title"] == "Costa Rica en Colores"

    @pytest.mark.asyncio
    async def test_get_not_found(self, cultural_social_agent):
        result = await cultural_social_agent.manage_art_exhibitions(
            action="get", exhibition_id="no_existe"
        )
        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_list_empty(self, cultural_social_agent):
        result = await cultural_social_agent.manage_art_exhibitions(action="list")
        assert result["status"] == "success"
        assert result["exhibitions"] == []

    @pytest.mark.asyncio
    async def test_update_status(
        self, cultural_social_agent, cultural_social_repo
    ):
        exhibition = await _seed_exhibition(cultural_social_repo)
        result = await cultural_social_agent.manage_art_exhibitions(
            action="update_status",
            exhibition_id=exhibition.id,
            new_status="active",
        )
        assert result["status"] == "success"
        assert "active" in result["message"]

    @pytest.mark.asyncio
    async def test_update_status_missing_after_lookup(
        self, cultural_social_agent, cultural_social_repo, monkeypatch,
    ):
        exhibition = await _seed_exhibition(cultural_social_repo)
        monkeypatch.setattr(
            cultural_social_agent.repo,
            "update_exhibition",
            AsyncMock(return_value=None),
        )

        result = await cultural_social_agent.manage_art_exhibitions(
            action="update_status",
            exhibition_id=exhibition.id,
            new_status="active",
        )

        assert result["status"] == "not_found"


# ══════════════════════════════════════════════════════
# TEST CLASS 6: get_cultural_calendar
# ══════════════════════════════════════════════════════


class TestGetCulturalCalendar:

    @pytest.mark.asyncio
    async def test_calendar_empty(self, cultural_social_agent):
        result = await cultural_social_agent.get_cultural_calendar()
        assert result["status"] == "success"
        assert result["total_items"] == 0

    @pytest.mark.asyncio
    async def test_calendar_with_events(
        self, cultural_social_agent, cultural_social_repo
    ):
        await _seed_event(cultural_social_repo)
        await _seed_event(
            cultural_social_repo,
            name="Mixer Networking",
            event_type=EventType.MIXER,
            date="2026-07-01",
        )

        result = await cultural_social_agent.get_cultural_calendar()
        assert result["status"] == "success"
        assert result["total_items"] == 2

    @pytest.mark.asyncio
    async def test_calendar_with_exhibitions(
        self, cultural_social_agent, cultural_social_repo
    ):
        await _seed_exhibition(cultural_social_repo)

        result = await cultural_social_agent.get_cultural_calendar()
        assert result["status"] == "success"
        assert result["total_items"] == 1
        assert result["calendar"][0]["type"] == "exhibition"

    @pytest.mark.asyncio
    async def test_calendar_mixed(
        self, cultural_social_agent, cultural_social_repo
    ):
        await _seed_event(cultural_social_repo)
        await _seed_exhibition(cultural_social_repo)

        result = await cultural_social_agent.get_cultural_calendar()
        assert result["status"] == "success"
        assert result["total_items"] == 2

        types = [item["type"] for item in result["calendar"]]
        assert "event" in types
        assert "exhibition" in types

    @pytest.mark.asyncio
    async def test_calendar_date_filter(
        self, cultural_social_agent, cultural_social_repo
    ):
        await _seed_event(cultural_social_repo, date="2026-06-15")
        await _seed_event(
            cultural_social_repo,
            name="Evento Futuro",
            event_type=EventType.RECEPTION,
            date="2026-12-25",
        )

        result = await cultural_social_agent.get_cultural_calendar(
            date_from="2026-06-01",
            date_to="2026-06-30",
        )
        assert result["status"] == "success"
        assert result["total_items"] == 1
        assert result["calendar"][0]["title"] == "Cena de Gala Anual"

    @pytest.mark.asyncio
    async def test_calendar_sorted_by_date(
        self, cultural_social_agent, cultural_social_repo
    ):
        await _seed_event(
            cultural_social_repo,
            name="Evento Julio",
            event_type=EventType.DINNER,
            date="2026-07-10",
        )
        await _seed_event(
            cultural_social_repo,
            name="Evento Mayo",
            event_type=EventType.COCKTAIL,
            date="2026-05-10",
        )

        result = await cultural_social_agent.get_cultural_calendar()
        assert result["status"] == "success"
        assert result["calendar"][0]["date"] == "2026-05-10"
        assert result["calendar"][1]["date"] == "2026-07-10"
