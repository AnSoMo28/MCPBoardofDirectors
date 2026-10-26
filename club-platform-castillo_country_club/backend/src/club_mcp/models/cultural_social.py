"""
Pydantic models for Cultural & Social domain.
Club: Castillo Country Club

F31 Enhancement:
  +6 enums (ProgramStatus, ProposalCategory, ImplementationEffort, etc.)
  +15 models (CulturalAnalytics 9-dim, CulturalSummary, CulturalProposal motor)
  +2 update schemas (UpdateCulturalEvent, UpdateCulturalProgram)
  FIX: CulturalProgram.status → ProgramStatus (was EventStatus)
"""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ══════════════════════════════════════════════════════════
#  ENUMS — Domain (9 existing)
# ══════════════════════════════════════════════════════════


class EventType(str, Enum):
    GALA = "gala"
    DINNER = "dinner"
    MIXER = "mixer"
    COCKTAIL = "cocktail"
    BRUNCH = "brunch"
    THEMED_PARTY = "themed_party"
    RECEPTION = "reception"


class EventStatus(str, Enum):
    PLANNED = "planned"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class EntertainmentType(str, Enum):
    LIVE_BAND = "live_band"
    DJ = "dj"
    COMEDIAN = "comedian"
    MAGICIAN = "magician"
    SPEAKER = "speaker"
    CULTURAL_PERFORMANCE = "cultural_performance"
    DANCE_PERFORMANCE = "dance_performance"


class CulturalCategory(str, Enum):
    MUSIC = "music"
    VISUAL_ARTS = "visual_arts"
    THEATER = "theater"
    DANCE = "dance"
    LITERATURE = "literature"
    GASTRONOMY = "gastronomy"
    HERITAGE = "heritage"


class VenueType(str, Enum):
    BALLROOM = "ballroom"
    GARDEN = "garden"
    TERRACE = "terrace"
    LOUNGE = "lounge"
    AUDITORIUM = "auditorium"
    POOLSIDE = "poolside"


class FormalityLevel(str, Enum):
    CASUAL = "casual"
    SEMI_FORMAL = "semi_formal"
    FORMAL = "formal"
    BLACK_TIE = "black_tie"
    WHITE_TIE = "white_tie"


class ExhibitionStatus(str, Enum):
    SCHEDULED = "scheduled"
    SETUP = "setup"
    ACTIVE = "active"
    DISMANTLED = "dismantled"
    CANCELLED = "cancelled"


class PerformanceStatus(str, Enum):
    PROPOSED = "proposed"
    CONTRACTED = "contracted"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ArtistStatus(str, Enum):
    AVAILABLE = "available"
    BOOKED = "booked"
    UNAVAILABLE = "unavailable"


# ══════════════════════════════════════════════════════════
#  ENUMS — F31 New
# ══════════════════════════════════════════════════════════


class ProgramStatus(str, Enum):
    """Lifecycle for cultural programs. Replaces EventStatus for programs."""
    DRAFT = "draft"
    ENROLLING = "enrolling"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ProposalCategory(str, Enum):
    """5 pillars of cultural engagement proposals."""
    ACTIVITY_PROPOSAL = "activity_proposal"
    TARGETED_INVITATION = "targeted_invitation"
    GROUP_COHESION = "group_cohesion"
    SPACE_ACTIVATION = "space_activation"
    LIFESTYLE_INTEGRATION = "lifestyle_integration"


class ImplementationEffort(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class SuggestedTimeline(str, Enum):
    IMMEDIATE = "immediate"
    THIS_MONTH = "this_month"
    THIS_SEASON = "this_season"
    NEXT_SEASON = "next_season"


class FocusArea(str, Enum):
    ALL = "all"
    LIFESTYLE = "lifestyle"
    COHESION = "cohesion"
    SPACE = "space"
    EVENTS = "events"
    FAMILIES = "families"


class TargetDemographic(str, Enum):
    ALL = "all"
    YOUNG_PROFESSIONALS = "young_professionals"
    FAMILIES = "families"
    SENIORS = "seniors"


# ══════════════════════════════════════════════════════════
#  ENTITY SCHEMAS
# ══════════════════════════════════════════════════════════


class CulturalEvent(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    event_type: EventType
    status: EventStatus = EventStatus.PLANNED
    formality: FormalityLevel = FormalityLevel.SEMI_FORMAL
    venue: str
    venue_type: VenueType = VenueType.BALLROOM
    date: str
    start_time: str
    end_time: str
    organizer_member_id: str
    description: str = ""
    guest_count: int = 0
    budget: float = 0.0
    menu_theme: str = ""
    dress_code: str = ""
    entertainment_ids: list[str] = Field(default_factory=list)
    notes: Optional[str] = None
    created_at: str = ""


class EntertainmentAct(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    artist_name: str
    entertainment_type: EntertainmentType
    status: PerformanceStatus = PerformanceStatus.PROPOSED
    genre: str = ""
    description: str = ""
    duration_minutes: int = 60
    cost: float = 0.0
    contact_person: str = ""
    contact_phone: str = ""
    requirements: list[str] = Field(default_factory=list)
    event_id: Optional[str] = None
    notes: Optional[str] = None


class CulturalProgram(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    category: CulturalCategory
    description: str
    season: str
    start_date: str
    end_date: str
    coordinator_member_id: str
    max_participants: int = 0
    current_participants: int = 0
    budget: float = 0.0
    status: ProgramStatus = ProgramStatus.DRAFT  # F31 FIX: was EventStatus
    event_ids: list[str] = Field(default_factory=list)
    notes: Optional[str] = None


class ArtExhibition(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    artist_name: str
    category: CulturalCategory = CulturalCategory.VISUAL_ARTS
    description: str = ""
    venue: str
    venue_type: VenueType = VenueType.LOUNGE
    start_date: str
    end_date: str
    status: ExhibitionStatus = ExhibitionStatus.SCHEDULED
    num_pieces: int = 0
    curator_member_id: str = ""
    opening_reception: bool = False
    notes: Optional[str] = None


# ══════════════════════════════════════════════════════════
#  CREATE SCHEMAS
# ══════════════════════════════════════════════════════════


class CreateCulturalEvent(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    event_type: EventType
    formality: FormalityLevel = FormalityLevel.SEMI_FORMAL
    venue: str
    venue_type: VenueType = VenueType.BALLROOM
    date: str
    start_time: str
    end_time: str
    organizer_member_id: str
    description: str = ""
    guest_count: int = 0
    budget: float = 0.0
    menu_theme: str = ""
    dress_code: str = ""
    notes: Optional[str] = None


class CreateEntertainmentAct(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    artist_name: str
    entertainment_type: EntertainmentType
    genre: str = ""
    description: str = ""
    duration_minutes: int = 60
    cost: float = 0.0
    contact_person: str = ""
    contact_phone: str = ""
    requirements: list[str] = Field(default_factory=list)
    notes: Optional[str] = None


class CreateCulturalProgram(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    category: CulturalCategory
    description: str
    season: str
    start_date: str
    end_date: str
    coordinator_member_id: str
    max_participants: int = 0
    budget: float = 0.0
    notes: Optional[str] = None


class CreateArtExhibition(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    title: str
    artist_name: str
    category: CulturalCategory = CulturalCategory.VISUAL_ARTS
    description: str = ""
    venue: str
    venue_type: VenueType = VenueType.LOUNGE
    start_date: str
    end_date: str
    num_pieces: int = 0
    curator_member_id: str = ""
    opening_reception: bool = False
    notes: Optional[str] = None


# ══════════════════════════════════════════════════════════
#  UPDATE SCHEMAS
# ══════════════════════════════════════════════════════════


class UpdateCulturalEvent(BaseModel):
    """F31 NEW: Typed update schema (was dict raw)."""
    model_config = ConfigDict(from_attributes=True)

    name: Optional[str] = None
    event_type: Optional[EventType] = None
    formality: Optional[FormalityLevel] = None
    venue: Optional[str] = None
    venue_type: Optional[VenueType] = None
    date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    description: Optional[str] = None
    guest_count: Optional[int] = None
    budget: Optional[float] = None
    menu_theme: Optional[str] = None
    dress_code: Optional[str] = None
    status: Optional[EventStatus] = None
    notes: Optional[str] = None


class UpdateEntertainmentAct(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    artist_name: Optional[str] = None
    entertainment_type: Optional[EntertainmentType] = None
    genre: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    cost: Optional[float] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    requirements: Optional[list[str]] = None
    status: Optional[PerformanceStatus] = None
    notes: Optional[str] = None


class UpdateCulturalProgram(BaseModel):
    """F31 NEW: Typed update schema (was dict raw)."""
    model_config = ConfigDict(from_attributes=True)

    name: Optional[str] = None
    category: Optional[CulturalCategory] = None
    description: Optional[str] = None
    season: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    coordinator_member_id: Optional[str] = None
    max_participants: Optional[int] = None
    budget: Optional[float] = None
    status: Optional[ProgramStatus] = None
    notes: Optional[str] = None


class UpdateArtExhibition(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    title: Optional[str] = None
    artist_name: Optional[str] = None
    category: Optional[CulturalCategory] = None
    description: Optional[str] = None
    venue: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[ExhibitionStatus] = None
    num_pieces: Optional[int] = None
    opening_reception: Optional[bool] = None
    notes: Optional[str] = None


# ══════════════════════════════════════════════════════════
#  ANALYTICS MODELS (F31 — 9 Dimensions)
# ══════════════════════════════════════════════════════════


class CategoryPerformance(BaseModel):
    """Dimension 1: Performance metrics per CulturalCategory."""
    model_config = ConfigDict(from_attributes=True)

    category: str
    event_count: int = 0
    total_attendance: int = 0
    avg_attendance: float = 0.0
    total_budget: float = 0.0
    avg_budget_per_event: float = 0.0
    engagement_score: float = 0.0


class VenueUtilizationAnalytics(BaseModel):
    """Dimension 2: Venue usage statistics."""
    model_config = ConfigDict(from_attributes=True)

    venue: str
    venue_type: str = ""
    total_bookings: int = 0
    total_guests: int = 0
    avg_guests: float = 0.0
    total_budget: float = 0.0
    utilization_rate: float = 0.0


class EntertainmentROI(BaseModel):
    """Dimension 3: Entertainment cost-effectiveness."""
    model_config = ConfigDict(from_attributes=True)

    entertainment_type: str
    total_acts: int = 0
    contracted: int = 0
    contracted_rate: float = 0.0
    total_cost: float = 0.0
    avg_cost: float = 0.0
    total_duration: int = 0
    cost_per_minute: float = 0.0


class SeasonalPattern(BaseModel):
    """Dimension 6: Performance by CR season."""
    model_config = ConfigDict(from_attributes=True)

    season: str
    program_count: int = 0
    total_budget: float = 0.0
    total_participants: int = 0
    max_participants: int = 0
    enrollment_rate: float = 0.0
    top_category: str = ""


class CulturalAnalytics(BaseModel):
    """
    9-dimension cultural analytics.
    Analogous to Finance's generate_ai_analysis.
    """
    model_config = ConfigDict(from_attributes=True)

    status: str = "success"
    message: str = ""

    # D1: Category Performance
    category_performance: list[CategoryPerformance] = Field(default_factory=list)
    # D2: Venue Utilization
    venue_utilization: list[VenueUtilizationAnalytics] = Field(default_factory=list)
    # D3: Entertainment ROI
    entertainment_roi: list[EntertainmentROI] = Field(default_factory=list)
    # D4: Attendance Trends
    attendance_trend: str = "stable"
    attendance_trend_pct: float = 0.0
    avg_attendance_30d: float = 0.0
    total_events_30d: int = 0
    # D5: Budget Analysis
    total_budget_planned: float = 0.0
    total_budget_spent: float = 0.0
    budget_utilization_pct: float = 0.0
    budget_variance_pct: float = 0.0
    # D6: Seasonal Patterns
    seasonal_patterns: list[SeasonalPattern] = Field(default_factory=list)
    current_season: str = ""
    # D7: Program Enrollment
    total_programs: int = 0
    active_programs: int = 0
    avg_enrollment_pct: float = 0.0
    programs_below_threshold: int = 0
    # D8: Exhibition Engagement
    total_exhibitions: int = 0
    active_exhibitions: int = 0
    avg_exhibition_duration_days: float = 0.0
    exhibitions_with_reception_pct: float = 0.0
    # D9: Cross-domain Signals
    cross_domain_signals: list[str] = Field(default_factory=list)


# ══════════════════════════════════════════════════════════
#  SUMMARY MODEL (F31 — Executive Dashboard Feed)
# ══════════════════════════════════════════════════════════


class CulturalSummary(BaseModel):
    """KPI summary for Executive Dashboard + Sidebar badges."""
    model_config = ConfigDict(from_attributes=True)

    status: str = "success"
    message: str = ""

    # KPIs
    upcoming_events_30d: int = 0
    active_exhibitions: int = 0
    active_programs: int = 0
    total_entertainment_acts: int = 0
    total_budget: float = 0.0
    budget_utilized_pct: float = 0.0

    # Health
    cultural_health_score: int = 0
    health_level: str = "unknown"

    # Highlights
    next_gala: Optional[dict] = None
    featured_exhibition: Optional[dict] = None
    top_program: Optional[dict] = None

    # Alerts
    alerts: list[str] = Field(default_factory=list)

    # Calendar density
    events_this_week: int = 0
    events_next_week: int = 0


# ══════════════════════════════════════════════════════════
#  PROPOSAL MODELS (F31 — THE GAME CHANGER)
# ══════════════════════════════════════════════════════════


class ProposalImpact(BaseModel):
    """Expected impact of a cultural engagement proposal."""
    model_config = ConfigDict(from_attributes=True)

    attendance_estimate: int = 0
    engagement_lift_pct: float = 0.0
    revenue_potential_crc: float = 0.0


class CrossDomainConnections(BaseModel):
    """How a proposal connects to other platform domains."""
    model_config = ConfigDict(from_attributes=True)

    finance_budget_estimate: float = 0.0
    communication_campaign_idea: str = ""
    related_events: list[str] = Field(default_factory=list)
    family_connection: str = ""
    wellness_integration: str = ""


class CulturalProposal(BaseModel):
    """
    A single cultural engagement proposal.
    Generated by generate_cultural_proposals AI tool.

    Each proposal is actionable, specific, and connected
    to the broader club ecosystem.
    """
    model_config = ConfigDict(from_attributes=True)

    id: str = ""
    category: ProposalCategory
    title: str
    description: str
    target_members: list[str] = Field(default_factory=list)
    target_families: list[str] = Field(default_factory=list)
    target_demographic: str = ""
    venue_recommendation: str = ""
    expected_impact: ProposalImpact = Field(default_factory=ProposalImpact)
    cross_domain: CrossDomainConnections = Field(default_factory=CrossDomainConnections)
    confidence: int = 70
    implementation_effort: ImplementationEffort = ImplementationEffort.MEDIUM
    suggested_timeline: SuggestedTimeline = SuggestedTimeline.THIS_MONTH
    action_steps: list[str] = Field(default_factory=list)


class CulturalProposalsResponse(BaseModel):
    """
    Response from generate_cultural_proposals.
    The Cultural Engagement Motor output.
    """
    model_config = ConfigDict(from_attributes=True)

    status: str = "success"
    message: str = ""
    proposals: list[CulturalProposal] = Field(default_factory=list)
    engagement_score: int = 0
    total_proposals: int = 0
    focus_area: str = "all"
    priority_ranking: list[str] = Field(default_factory=list)


class CulturalInsights(BaseModel):
    """
    Combined intelligence output for Advisor integration.
    Aggregates analytics + proposals + health.
    """
    model_config = ConfigDict(from_attributes=True)

    status: str = "success"
    message: str = ""
    analytics_summary: str = ""
    top_proposals: list[CulturalProposal] = Field(default_factory=list)
    engagement_score: int = 0
    health_score: int = 0
    health_level: str = "unknown"
    alerts: list[str] = Field(default_factory=list)
    positive_trends: list[str] = Field(default_factory=list)
