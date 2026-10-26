"""
Sports & Recreation domain models.
Pydantic schemas for validation, serialization, and API contracts.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Enums ──────────────────────────────────────────────────────────────────


class SportType(str, Enum):
    TENNIS = "tennis"
    GOLF = "golf"
    SWIMMING = "swimming"
    FITNESS = "fitness"
    BASKETBALL = "basketball"
    VOLLEYBALL = "volleyball"
    FOOTBALL = "football"
    SQUASH = "squash"
    PADEL = "padel"
    YOGA = "yoga"
    PILATES = "pilates"


class ReservationStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    BLOCKED = "blocked"


class TournamentFormat(str, Enum):
    SINGLE_ELIMINATION = "single_elimination"
    DOUBLE_ELIMINATION = "double_elimination"
    ROUND_ROBIN = "round_robin"
    GROUPS_THEN_KNOCKOUT = "groups_then_knockout"


class TournamentStatus(str, Enum):
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    CONFIRMED = "confirmed"
    REGISTRATION_OPEN = "registration_open"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ClassType(str, Enum):
    GROUP = "group"
    PRIVATE = "private"
    SEMI_PRIVATE = "semi_private"
    DROP_IN = "drop_in"


class SkillLevel(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    ALL_LEVELS = "all_levels"


class EquipmentCondition(str, Enum):
    NEW = "new"
    GOOD = "good"
    FAIR = "fair"
    NEEDS_REPAIR = "needs_repair"
    RETIRED = "retired"


class LeagueFormat(str, Enum):
    ROUND_ROBIN = "round_robin"
    DOUBLE_ROUND_ROBIN = "double_round_robin"
    DIVISIONS = "divisions"


class LeagueStatus(str, Enum):
    PROPOSED = "proposed"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"


# ── Court Reservation ──────────────────────────────────────────────────────


class CourtReservation(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    court_name: str
    sport: SportType
    member_id: str
    member_name: str
    date: str
    start_time: str
    end_time: str
    status: ReservationStatus = ReservationStatus.CONFIRMED
    purpose: str = "regular"
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CreateReservation(BaseModel):
    court_name: str
    sport: SportType
    member_id: str
    member_name: str
    date: str
    start_time: str
    end_time: str
    purpose: str = "regular"
    notes: Optional[str] = None


# ── Tournament ─────────────────────────────────────────────────────────────


class Tournament(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    sport: SportType
    format: TournamentFormat
    start_date: str
    end_date: str
    registration_deadline: str
    max_participants: int
    current_participants: int = 0
    venue: str
    organizer_member_id: str
    entry_fee: float = 0.0
    prizes: list[str] = Field(default_factory=list)
    rules: Optional[str] = None
    status: TournamentStatus = TournamentStatus.DRAFT
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CreateTournament(BaseModel):
    name: str
    sport: SportType
    format: TournamentFormat
    start_date: str
    end_date: str
    registration_deadline: str
    max_participants: int
    venue: str
    organizer_member_id: str
    entry_fee: float = 0.0
    prizes: list[str] = Field(default_factory=list)
    rules: Optional[str] = None


class TournamentUpdate(BaseModel):
    name: Optional[str] = None
    format: Optional[TournamentFormat] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    registration_deadline: Optional[str] = None
    max_participants: Optional[int] = None
    venue: Optional[str] = None
    entry_fee: Optional[float] = None
    prizes: Optional[list[str]] = None
    rules: Optional[str] = None
    status: Optional[TournamentStatus] = None


# ── Fitness Class ──────────────────────────────────────────────────────────


class FitnessClass(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    sport: SportType
    class_type: ClassType
    instructor: str
    skill_level: SkillLevel = SkillLevel.ALL_LEVELS
    schedule_day: str
    schedule_time: str
    duration_minutes: int
    max_capacity: int
    current_enrolled: int = 0
    location: str
    equipment_needed: list[str] = Field(default_factory=list)
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CreateFitnessClass(BaseModel):
    name: str
    sport: SportType
    class_type: ClassType
    instructor: str
    skill_level: SkillLevel = SkillLevel.ALL_LEVELS
    schedule_day: str
    schedule_time: str
    duration_minutes: int
    max_capacity: int
    location: str
    equipment_needed: list[str] = Field(default_factory=list)


class UpdateFitnessClass(BaseModel):
    name: Optional[str] = None
    instructor: Optional[str] = None
    skill_level: Optional[SkillLevel] = None
    schedule_day: Optional[str] = None
    schedule_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    max_capacity: Optional[int] = None
    location: Optional[str] = None
    equipment_needed: Optional[list[str]] = None
    is_active: Optional[bool] = None


# ── Coaching Session ───────────────────────────────────────────────────────


class CoachingSession(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    sport: SportType
    coach_name: str
    member_id: str
    member_name: str
    skill_level: SkillLevel = SkillLevel.BEGINNER
    date: str
    start_time: str
    end_time: str
    location: str
    focus_areas: list[str] = Field(default_factory=list)
    notes: Optional[str] = None
    status: str = "scheduled"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CreateCoachingSession(BaseModel):
    sport: SportType
    coach_name: str
    member_id: str
    member_name: str
    skill_level: SkillLevel = SkillLevel.BEGINNER
    date: str
    start_time: str
    end_time: str
    location: str
    focus_areas: list[str] = Field(default_factory=list)


# ── Equipment ──────────────────────────────────────────────────────────────


class Equipment(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    sport: SportType
    location: str
    condition: EquipmentCondition = EquipmentCondition.GOOD
    total_quantity: int
    available_quantity: int
    brand: Optional[str] = None
    notes: Optional[str] = None
    last_maintenance: Optional[str] = None


class CreateEquipment(BaseModel):
    name: str
    sport: SportType
    location: str
    condition: EquipmentCondition = EquipmentCondition.GOOD
    total_quantity: int
    available_quantity: int
    brand: Optional[str] = None


class UpdateEquipment(BaseModel):
    name: Optional[str] = None
    condition: Optional[EquipmentCondition] = None
    available_quantity: Optional[int] = None
    total_quantity: Optional[int] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    last_maintenance: Optional[str] = None


# ── Sport League ───────────────────────────────────────────────────────────


class SportLeague(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    sport: SportType
    format: LeagueFormat = LeagueFormat.ROUND_ROBIN
    teams: list[str] = Field(default_factory=list)
    season: str
    start_date: str
    end_date: str
    coordinator_member_id: str
    max_teams: int
    current_round: int = 0
    standings: dict = Field(default_factory=dict)
    status: LeagueStatus = LeagueStatus.PROPOSED
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CreateSportLeague(BaseModel):
    name: str
    sport: SportType
    format: LeagueFormat = LeagueFormat.ROUND_ROBIN
    teams: list[str] = Field(default_factory=list)
    season: str
    start_date: str
    end_date: str
    coordinator_member_id: str
    max_teams: int


# ── Sports Recommendation ──────────────────────────────────────────────────


class SportsRecommendation(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    member_id: str
    sport: SportType
    reason: str
    confidence_score: float = 0.0
    suggested_class: Optional[str] = None
    suggested_coach: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CreateSportsRecommendation(BaseModel):
    member_id: str
    sport: SportType
    reason: str
    confidence_score: float = 0.0
    suggested_class: Optional[str] = None
    suggested_coach: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════
# INTELLIGENCE MODELS — F32 Sports & Recreation Intelligence
# ═══════════════════════════════════════════════════════════════════════════


# ── Intelligence Enums ────────────────────────────────────────────────────


class CalendarItemType(str, Enum):
    """Unified calendar entity types."""

    RESERVATION = "reservation"
    TOURNAMENT = "tournament"
    CLASS = "class"
    COACHING = "coaching"
    LEAGUE = "league"


# ── Intelligence Sub-Models ───────────────────────────────────────────────


class SportPopularity(BaseModel):
    """Activity ranking by sport across all entity types."""

    model_config = ConfigDict(from_attributes=True)

    sport: SportType
    total_activity: int = 0
    reservation_count: int = 0
    class_count: int = 0
    tournament_count: int = 0
    coaching_count: int = 0
    popularity_rank: int = 0
    activity_share_pct: float = 0.0


class CourtUtilizationStat(BaseModel):
    """Per-court utilization metrics over a lookback period."""

    model_config = ConfigDict(from_attributes=True)

    court_name: str
    sport: SportType
    total_slots: int = 0
    booked_slots: int = 0
    utilization_pct: float = 0.0
    peak_hours: list[str] = Field(default_factory=list)
    avg_daily_bookings: float = 0.0
    trend: str = "stable"  # "increasing" | "stable" | "decreasing"


class ClassEnrollmentStat(BaseModel):
    """Per-class enrollment performance metric."""

    model_config = ConfigDict(from_attributes=True)

    class_id: str
    name: str
    sport: SportType
    class_type: ClassType
    enrolled: int = 0
    capacity: int = 0
    fill_rate_pct: float = 0.0
    is_underperforming: bool = False
    instructor: str = ""
    schedule_day: str = ""


class TournamentMetrics(BaseModel):
    """Aggregate tournament statistics."""

    model_config = ConfigDict(from_attributes=True)

    total_tournaments: int = 0
    by_status: dict[str, int] = Field(default_factory=dict)
    avg_participation_rate: float = 0.0
    total_revenue: float = 0.0
    upcoming_count: int = 0
    in_progress_count: int = 0
    completed_count: int = 0
    avg_entry_fee: float = 0.0


class EquipmentLifecycleItem(BaseModel):
    """Per-item equipment lifecycle assessment."""

    model_config = ConfigDict(from_attributes=True)

    equipment_id: str
    name: str
    sport: SportType
    condition: EquipmentCondition
    urgency_score: float = 0.0  # 0-100
    needs_attention: bool = False
    days_since_maintenance: Optional[int] = None
    recommended_action: str = "ok"  # "ok" | "schedule_maintenance" | "replace_soon" | "replace_urgent"


class CoachStat(BaseModel):
    """Per-coach effectiveness metric."""

    model_config = ConfigDict(from_attributes=True)

    name: str
    session_count: int = 0
    unique_members: int = 0
    popular_sports: list[str] = Field(default_factory=list)
    avg_sessions_per_member: float = 0.0


class CoachingEffectiveness(BaseModel):
    """Aggregate coaching program statistics."""

    model_config = ConfigDict(from_attributes=True)

    coaches: list[CoachStat] = Field(default_factory=list)
    total_sessions: int = 0
    avg_sessions_per_member: float = 0.0
    unique_members_coached: int = 0
    top_coach: Optional[str] = None


class SeasonalPattern(BaseModel):
    """Monthly activity distribution with Costa Rica seasonal context."""

    model_config = ConfigDict(from_attributes=True)

    month: int
    month_name: str
    activity_count: int = 0
    dominant_sport: Optional[str] = None
    is_peak_season: bool = False  # CR high season: Dec-Apr
    reservation_count: int = 0
    class_count: int = 0
    tournament_count: int = 0


class MemberSportProfile(BaseModel):
    """Complete sport profile for an individual member."""

    model_config = ConfigDict(from_attributes=True)

    member_id: str
    sports_played: list[str] = Field(default_factory=list)
    total_sessions: int = 0
    favorite_sport: Optional[str] = None
    coaching_sessions: int = 0
    tournament_participations: int = 0
    active_reservations: int = 0
    skill_levels: dict[str, str] = Field(default_factory=dict)


# ── Intelligence Aggregate Models ─────────────────────────────────────────


class SportsAnalytics(BaseModel):
    """
    9-dimension sports analytics output.
    Consumed by: SportsIntelligencePanel.tsx
    Generated by: get_sports_analytics tool.
    """

    model_config = ConfigDict(from_attributes=True)

    sport_popularity: list[SportPopularity] = Field(default_factory=list)
    court_utilization: list[CourtUtilizationStat] = Field(default_factory=list)
    class_enrollment: list[ClassEnrollmentStat] = Field(default_factory=list)
    tournament_metrics: TournamentMetrics = Field(default_factory=TournamentMetrics)
    equipment_health: list[EquipmentLifecycleItem] = Field(default_factory=list)
    coaching_stats: CoachingEffectiveness = Field(default_factory=CoachingEffectiveness)
    seasonal_patterns: list[SeasonalPattern] = Field(default_factory=list)
    member_engagement_score: float = 0.0
    peak_hours: dict[str, int] = Field(default_factory=dict)
    total_active_reservations: int = 0
    total_active_classes: int = 0
    lookback_days: int = 30


class SportsHealthFactor(BaseModel):
    """Individual factor contributing to the composite health score."""

    model_config = ConfigDict(from_attributes=True)

    name: str
    score: float = 0.0  # 0-100
    weight: float = 0.0
    weighted_score: float = 0.0
    status: str = "good"  # "excellent" | "good" | "attention" | "critical"
    detail: str = ""


class SportsHealthSummary(BaseModel):
    """
    Composite health score (0-100) based on 5 weighted factors:
    Court utilization (25%), class enrollment (20%), tournament activity (20%),
    equipment condition (15%), member participation (20%).
    """

    model_config = ConfigDict(from_attributes=True)

    health_score: float = 0.0
    level: str = "Saludable"  # "Excepcional" | "Saludable" | "Atención" | "Crítico"
    factors: list[SportsHealthFactor] = Field(default_factory=list)
    trend: str = "stable"  # "improving" | "stable" | "declining"
    alerts: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class SportsCalendarItem(BaseModel):
    """
    Polymorphic calendar item unifying all sports entity types.
    Includes conflict detection and CR weather risk assessment.
    """

    model_config = ConfigDict(from_attributes=True)

    id: str
    type: CalendarItemType
    title: str
    sport: SportType
    date: str
    start_time: str
    end_time: str
    location: str
    participants: Optional[int] = None
    status: str
    is_conflict: bool = False
    conflict_reason: Optional[str] = None
    weather_risk: Optional[str] = None  # "low" | "medium" | "high"
    entity_id: str


class SportsProposal(BaseModel):
    """
    Output of the Sports Engagement Motor (generate_sports_proposals).
    Each proposal is a deterministic recommendation based on
    current state analysis + cross-domain signals.
    """

    model_config = ConfigDict(from_attributes=True)

    id: str
    type: str  # "new_activity" | "tournament_idea" | "class_suggestion" | "cross_sell" | "partnership"
    title: str
    description: str
    target_sport: SportType
    expected_participants: int = 0
    confidence_score: float = 0.0  # 0-1
    reasoning: str = ""
    cross_domain_signals: list[str] = Field(default_factory=list)
    estimated_revenue: Optional[float] = None
    suggested_date: Optional[str] = None
    action_label: str = ""
    approval: str = "AUTO"
