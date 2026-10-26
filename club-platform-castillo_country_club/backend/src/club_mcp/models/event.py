"""Event-related Pydantic models for the Club MCP platform."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


# ── Enums ─────────────────────────────────────────────────


class EventStatus(str, Enum):
    """Lifecycle status of a club event."""

    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    PUBLISHED = "published"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class EventCategory(str, Enum):
    """Category classification for events."""

    SPORTS = "sports"
    CULTURAL = "cultural"
    SOCIAL = "social"
    PRIVATE = "private"
    FESTIVE = "festive"
    CHILDREN = "children"
    FAMILY = "family"
    CORPORATE = "corporate"


class EventType(str, Enum):
    """Access type for events."""

    OPEN = "open"
    PRIVATE = "private"
    SEMI_PRIVATE = "semi_private"


class RecurrencePattern(str, Enum):
    """Recurrence schedule for recurring events."""

    NONE = "none"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"


class EventPricingModel(str, Enum):
    """Pricing model for event attendance."""

    FREE = "free"
    SUBSIDIZED = "subsidized"
    PAID = "paid"
    PREMIUM = "premium"


class RSVPStatus(str, Enum):
    """Status of an RSVP."""

    PENDING = "pending"
    CONFIRMED = "confirmed"
    DECLINED = "declined"
    WAITLISTED = "waitlisted"
    NO_SHOW = "no_show"


class VendorContractStatus(str, Enum):
    """Status of a vendor contract."""

    PENDING = "pending"
    QUOTED = "quoted"
    NEGOTIATING = "negotiating"
    APPROVED = "approved"
    CONTRACTED = "contracted"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


# ── Sub-models ────────────────────────────────────────────


class ProgramItem(BaseModel):
    """A single item in an event's itinerary/program."""

    model_config = ConfigDict(from_attributes=True)

    id: str = ""
    event_id: str = ""
    time_start: str = ""  # "HH:MM"
    time_end: str = ""
    title: str
    description: str = ""
    location: str = ""
    responsible: str = ""
    notes: str = ""
    order: int = 0


class RSVPRecord(BaseModel):
    """RSVP record for a family attending an event."""

    model_config = ConfigDict(from_attributes=True)

    id: str = ""
    event_id: str = ""
    family_id: str = ""
    family_name: str = ""
    member_ids: list[str] = Field(default_factory=list)
    status: RSVPStatus = RSVPStatus.PENDING
    guests_count: int = 0
    dietary_restrictions: str = ""
    notes: str = ""
    total_cost: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class VendorRecord(BaseModel):
    """Vendor/service provider record for an event."""

    model_config = ConfigDict(from_attributes=True)

    id: str = ""
    event_id: str = ""
    name: str = ""
    service_type: str = ""  # catering, entertainment, decoration, av, security
    contact_name: str = ""
    contact_phone: str = ""
    contact_email: str = ""
    quoted_cost: float = 0.0
    final_cost: float | None = None
    contract_status: VendorContractStatus = VendorContractStatus.PENDING
    notes: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ── Request / Create / Update ────────────────────────────


class EventCreate(BaseModel):
    """Schema for creating a new event."""

    title: str
    description: str = ""
    category: EventCategory
    event_type: EventType = EventType.OPEN
    date_start: datetime
    date_end: datetime
    location: str = ""
    facility_ids: list[str] = Field(default_factory=list)
    age_groups: list[str] = Field(default_factory=lambda: ["all"])
    max_capacity: int = 0
    pricing_model: EventPricingModel = EventPricingModel.FREE
    price_per_person: float = 0.0
    is_members_only: bool = True
    allow_guests: bool = False
    max_guests_per_family: int = 0
    recurrence: RecurrencePattern = RecurrencePattern.NONE
    requires_rsvp: bool = True
    dress_code: str = ""
    notes: str = ""
    tags: list[str] = Field(default_factory=list)
    created_by: str = ""


class EventUpdate(BaseModel):
    """Schema for updating an existing event."""

    title: str | None = None
    description: str | None = None
    category: EventCategory | None = None
    event_type: EventType | None = None
    date_start: datetime | None = None
    date_end: datetime | None = None
    location: str | None = None
    facility_ids: list[str] | None = None
    age_groups: list[str] | None = None
    max_capacity: int | None = None
    pricing_model: EventPricingModel | None = None
    price_per_person: float | None = None
    is_members_only: bool | None = None
    allow_guests: bool | None = None
    max_guests_per_family: int | None = None
    recurrence: RecurrencePattern | None = None
    requires_rsvp: bool | None = None
    dress_code: str | None = None
    notes: str | None = None
    tags: list[str] | None = None
    status: EventStatus | None = None


class EventSearchParams(BaseModel):
    """Parameters for searching / filtering events."""

    query: str | None = None
    category: EventCategory | None = None
    status: EventStatus | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None
    age_group: str | None = None
    pricing_model: EventPricingModel | None = None
    tags: list[str] | None = None
    page: int = 1
    page_size: int = 20


# ── Response models ───────────────────────────────────────


class EventResponse(BaseModel):
    """Full event response model."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: str
    category: EventCategory
    event_type: EventType
    status: EventStatus
    date_start: datetime
    date_end: datetime
    location: str
    facility_ids: list[str] = Field(default_factory=list)
    age_groups: list[str] = Field(default_factory=list)
    max_capacity: int
    current_attendance: int = 0
    waitlist_count: int = 0
    pricing_model: EventPricingModel
    price_per_person: float
    is_members_only: bool
    allow_guests: bool
    max_guests_per_family: int
    recurrence: RecurrencePattern
    requires_rsvp: bool
    dress_code: str = ""
    notes: str = ""
    tags: list[str] = Field(default_factory=list)
    created_by: str = ""
    created_at: datetime
    updated_at: datetime
    programs: list[ProgramItem] = Field(default_factory=list)
    rsvps: list[RSVPRecord] = Field(default_factory=list)
    vendors: list[VendorRecord] = Field(default_factory=list)


class EventBrief(BaseModel):
    """Brief event summary for listings and calendars."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    category: EventCategory
    status: EventStatus
    date_start: datetime
    date_end: datetime
    location: str
    current_attendance: int = 0
    max_capacity: int = 0
    pricing_model: EventPricingModel


# ── Analytics & Reports ───────────────────────────────────


class CapacityInfo(BaseModel):
    """Capacity information for an event."""

    event_id: str
    event_title: str = ""
    max_capacity: int
    current_attendance: int
    waitlist_count: int
    available_spots: int
    occupancy_pct: float = 0.0
    is_full: bool
    is_waitlist_active: bool


class EventAnalytics(BaseModel):
    """Post-event analytics and metrics."""

    event_id: str
    event_title: str = ""
    total_rsvps: int = 0
    confirmed_attendance: int = 0
    declined_count: int = 0
    no_shows: int = 0
    waitlisted_count: int = 0
    attendance_rate: float = 0.0
    cancellation_rate: float = 0.0
    revenue: float = 0.0
    average_guests_per_family: float = 0.0
    age_distribution: dict[str, int] = Field(default_factory=dict)
    peak_rsvp_date: str | None = None
    days_until_event: int | None = None


class CalendarDay(BaseModel):
    """A single day in the event calendar."""

    date: str  # "YYYY-MM-DD"
    events: list[EventBrief] = Field(default_factory=list)
    total_events: int = 0
    has_conflicts: bool = False


class EventReport(BaseModel):
    """Executive or detailed report for a period."""

    model_config = ConfigDict(from_attributes=True)

    report_type: str
    period_start: datetime
    period_end: datetime
    total_events: int = 0
    completed_events: int = 0
    cancelled_events: int = 0
    upcoming_events: int = 0
    total_attendance: int = 0
    average_attendance: float = 0.0
    total_revenue: float = 0.0
    top_categories: list[dict[str, Any]] = Field(default_factory=list)
    top_events: list[EventBrief] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
