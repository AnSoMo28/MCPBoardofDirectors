
## Archivo 1/4: `facility_management.py` — REWRITE COMPLETO


"""
Pydantic models for Facility Management domain.
Club: Castillo Country Club
Production Grade — F33 Living Spaces Intelligence
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Enums ──────────────────────────────────────────────

class FacilityType(str, Enum):
    POOL = "pool"
    GYM = "gym"
    TENNIS_COURT = "tennis_court"
    SQUASH_COURT = "squash_court"
    GOLF_COURSE = "golf_course"
    RESTAURANT = "restaurant"
    LOUNGE = "lounge"
    BALLROOM = "ballroom"
    GARDEN = "garden"
    PARKING = "parking"
    PLAYGROUND = "playground"
    SPA = "spa"
    KIDS_AREA = "kids_area"


class FacilityStatus(str, Enum):
    OPERATIONAL = "operational"
    MAINTENANCE = "maintenance"
    CLOSED = "closed"
    RESERVED = "reserved"
    RENOVATION = "renovation"


class MaintenanceType(str, Enum):
    PREVENTIVE = "preventive"
    CORRECTIVE = "corrective"
    EMERGENCY = "emergency"
    RENOVATION = "renovation"
    CLEANING = "cleaning"
    INSPECTION = "inspection"


class MaintenanceStatus(str, Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ON_HOLD = "on_hold"


class MaintenancePriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class SetupStatus(str, Enum):
    REQUESTED = "requested"
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class InspectionResult(str, Enum):
    PASS = "pass"
    MINOR_ISSUES = "minor_issues"
    MAJOR_ISSUES = "major_issues"
    FAIL = "fail"


class ReservationStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    NO_SHOW = "no_show"


# ── Entity Schemas ─────────────────────────────────────

class Facility(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    facility_type: FacilityType
    status: FacilityStatus = FacilityStatus.OPERATIONAL
    location: str = ""
    capacity: int = 0
    description: str = ""
    amenities: list[str] = Field(default_factory=list)
    opening_time: str = "06:00"
    closing_time: str = "22:00"
    responsible_member_id: str = ""
    base_rate: float = 0.0
    notes: Optional[str] = None


class MaintenanceTask(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    facility_id: str
    facility_name: str
    maintenance_type: MaintenanceType
    status: MaintenanceStatus = MaintenanceStatus.SCHEDULED
    priority: MaintenancePriority = MaintenancePriority.MEDIUM
    description: str
    scheduled_date: str
    scheduled_time: str = "08:00"
    estimated_duration_hours: float = 2.0
    assigned_to: str = ""
    cost: float = 0.0
    completed_at: Optional[str] = None
    notes: Optional[str] = None


class EventSetup(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    event_id: str
    event_name: str
    facility_id: str
    facility_name: str
    status: SetupStatus = SetupStatus.REQUESTED
    setup_date: str
    setup_time: str = "08:00"
    event_start: str = ""
    event_end: str = ""
    requirements: list[str] = Field(default_factory=list)
    assigned_to: str = ""
    coordinator_member_id: str = ""
    notes: Optional[str] = None


class Inspection(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    facility_id: str
    facility_name: str
    result: InspectionResult = InspectionResult.PASS
    inspector_member_id: str
    inspection_date: str
    findings: str = ""
    corrective_actions: list[str] = Field(default_factory=list)
    next_inspection_date: Optional[str] = None
    notes: Optional[str] = None


class FacilityOccupancy(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    facility_id: str
    facility_name: str
    facility_type: FacilityType
    status: FacilityStatus
    current_reservations: int = 0
    capacity: int = 0
    utilization_pct: float = 0.0
    next_available: Optional[str] = None


class FacilityReservation(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    facility_id: str
    facility_name: str
    family_id: str = ""
    family_name: str = ""
    date: str
    start_time: str
    end_time: str
    status: ReservationStatus = ReservationStatus.PENDING
    guest_count: int = 0
    purpose: str = ""
    notes: Optional[str] = None
    created_by: str = "system"
    created_at: Optional[str] = None


# ── Create Schemas ─────────────────────────────────────

class CreateFacility(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    facility_type: FacilityType
    location: str = ""
    capacity: int = 0
    description: str = ""
    amenities: list[str] = Field(default_factory=list)
    opening_time: str = "06:00"
    closing_time: str = "22:00"
    responsible_member_id: str = ""
    base_rate: float = 0.0
    notes: Optional[str] = None


class CreateMaintenanceTask(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    facility_id: str
    facility_name: str
    maintenance_type: MaintenanceType
    priority: MaintenancePriority = MaintenancePriority.MEDIUM
    description: str
    scheduled_date: str
    scheduled_time: str = "08:00"
    estimated_duration_hours: float = 2.0
    assigned_to: str = ""
    cost: float = 0.0
    notes: Optional[str] = None


class CreateEventSetup(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    event_id: str
    event_name: str
    facility_id: str
    facility_name: str
    setup_date: str
    setup_time: str = "08:00"
    event_start: str = ""
    event_end: str = ""
    requirements: list[str] = Field(default_factory=list)
    assigned_to: str = ""
    coordinator_member_id: str = ""
    notes: Optional[str] = None


class CreateInspection(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    facility_id: str
    facility_name: str
    result: InspectionResult = InspectionResult.PASS
    inspector_member_id: str
    inspection_date: str
    findings: str = ""
    corrective_actions: list[str] = Field(default_factory=list)
    next_inspection_date: Optional[str] = None
    notes: Optional[str] = None


class CreateFacilityReservation(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    facility_id: str
    facility_name: str
    family_id: str = ""
    family_name: str = ""
    date: str
    start_time: str
    end_time: str
    guest_count: int = 0
    purpose: str = ""
    notes: Optional[str] = None
    created_by: str = "system"


# ── Update Schemas ─────────────────────────────────────

class UpdateFacility(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: Optional[str] = None
    status: Optional[FacilityStatus] = None
    location: Optional[str] = None
    capacity: Optional[int] = None
    description: Optional[str] = None
    amenities: Optional[list[str]] = None
    opening_time: Optional[str] = None
    closing_time: Optional[str] = None
    responsible_member_id: Optional[str] = None
    base_rate: Optional[float] = None
    notes: Optional[str] = None


class UpdateMaintenanceTask(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    status: Optional[MaintenanceStatus] = None
    priority: Optional[MaintenancePriority] = None
    assigned_to: Optional[str] = None
    cost: Optional[float] = None
    notes: Optional[str] = None


# ── Analytics Response Models (F33) ───────────────────

class CrossDomainSignal(BaseModel):
    """Signal from/to another domain."""
    model_config = ConfigDict(from_attributes=True)

    domain: str
    signal: str
    impact: str
    severity: str = "low"


class AnalyticsDimension(BaseModel):
    """Single dimension in the 9-dimension facility analysis."""
    model_config = ConfigDict(from_attributes=True)

    dimension_id: str
    name: str
    score: int = Field(ge=0, le=100)
    status: str = ""
    findings: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    data: dict = Field(default_factory=dict)


class FacilityAnalyticsResponse(BaseModel):
    """9-dimension facility intelligence analysis."""
    model_config = ConfigDict(from_attributes=True)

    overall_score: int = Field(ge=0, le=100)
    overall_grade: str = ""
    overall_level: str = ""
    trend: str = "stable"
    dimensions: list[AnalyticsDimension] = Field(default_factory=list)
    cross_domain_signals: list[CrossDomainSignal] = Field(default_factory=list)
    generated_at: str = ""


class AmenityUtilizationItem(BaseModel):
    """Per-facility utilization detail."""
    model_config = ConfigDict(from_attributes=True)

    facility_id: str
    facility_name: str
    facility_type: str
    status: str
    current_occupancy: int = 0
    capacity: int = 0
    utilization_pct: float = 0.0
    peak_hours: list[str] = Field(default_factory=list)
    trend: str = "stable"
    forecast_pct: float = 0.0
    time_series: list[dict] = Field(default_factory=list)
    base_rate: float = 0.0
    estimated_monthly_revenue: float = 0.0


class AmenityUtilizationResponse(BaseModel):
    """Aggregated amenity utilization across all facilities."""
    model_config = ConfigDict(from_attributes=True)

    overall_utilization_pct: float = 0.0
    facilities: list[AmenityUtilizationItem] = Field(default_factory=list)
    total_capacity: int = 0
    total_occupancy: int = 0
    peak_facility: str = ""
    lowest_facility: str = ""
    generated_at: str = ""


class SpaceOptimizationSuggestion(BaseModel):
    """Cross-domain space optimization suggestion."""
    model_config = ConfigDict(from_attributes=True)

    facility_id: str
    facility_name: str
    suggestion_type: str = ""
    current_use: str = ""
    suggested_use: str = ""
    estimated_impact: str = ""
    priority: str = "medium"
    roi_estimate: Optional[str] = None


class SpaceOptimizationResponse(BaseModel):
    """Aggregated space optimization analysis."""
    model_config = ConfigDict(from_attributes=True)

    suggestions: list[SpaceOptimizationSuggestion] = Field(default_factory=list)
    underutilized_count: int = 0
    overutilized_count: int = 0
    total_potential_savings: float = 0.0
    generated_at: str = ""


class HealthFactor(BaseModel):
    """Single factor contributing to facility health score."""
    model_config = ConfigDict(from_attributes=True)

    name: str
    score: int = Field(ge=0, le=100)
    weight: float = Field(ge=0.0, le=1.0)
    detail: str = ""
    contribution: float = 0.0


class FacilityHealthResponse(BaseModel):
    """Composite facility health score with factor breakdown."""
    model_config = ConfigDict(from_attributes=True)

    score: int = Field(ge=0, le=100)
    grade: str = ""
    level: str = ""
    trend: str = "stable"
    factors: list[HealthFactor] = Field(default_factory=list)
    alerts: list[str] = Field(default_factory=list)
    generated_at: str = ""
