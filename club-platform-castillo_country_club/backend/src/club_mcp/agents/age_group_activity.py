"""Age group activity models for the Club MCP platform."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class AgeGroupCategory(str, Enum):
    """Standard age group categories in the club."""

    TODDLER = "toddler"        # 0-3
    KIDS = "kids"              # 4-12
    TEENS = "teens"            # 13-17
    YOUNG_ADULTS = "young_adults"  # 18-25
    ADULTS = "adults"          # 26-59
    SENIORS = "seniors"        # 60+


class ActivityDifficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class AgeGroupActivityStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SEASONAL = "seasonal"


# ── Core models ───────────────────────────────────────────


class AgeGroupActivity(BaseModel):
    """An activity available for a specific age group."""

    model_config = ConfigDict(from_attributes=True)

    id: str = ""
    name: str
    description: str = ""
    age_group: AgeGroupCategory
    difficulty: ActivityDifficulty = ActivityDifficulty.EASY
    location: str = ""
    max_participants: int = 0
    duration_minutes: int = 60
    requires_instructor: bool = False
    instructor_name: str = ""
    equipment_needed: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    status: AgeGroupActivityStatus = AgeGroupActivityStatus.ACTIVE
    schedule_days: list[str] = Field(default_factory=list)
    schedule_time: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AgeGroupDemographics(BaseModel):
    """Demographics breakdown for an age group."""

    model_config = ConfigDict(from_attributes=True)

    age_group: str
    total_members: int = 0
    total_families: int = 0
    percentage_of_club: float = 0.0
    active_participants: int = 0
    activity_count: int = 0


class ParticipationRecord(BaseModel):
    """Participation metrics for an age group activity."""

    model_config = ConfigDict(from_attributes=True)

    activity_id: str
    activity_name: str = ""
    age_group: str
    total_enrolled: int = 0
    average_attendance: float = 0.0
    sessions_held: int = 0
    satisfaction_score: float = 0.0
    retention_rate: float = 0.0


class ActivityRecommendation(BaseModel):
    """An activity recommendation for a member/family."""

    model_config = ConfigDict(from_attributes=True)

    activity_id: str
    activity_name: str
    age_group: str
    match_reason: str
    confidence: float = 0.0


# ── Request / Response ────────────────────────────────────


class AgeGroupActivityCreate(BaseModel):
    """Schema for registering a new age group activity."""

    name: str
    description: str = ""
    age_group: AgeGroupCategory
    difficulty: ActivityDifficulty = ActivityDifficulty.EASY
    location: str = ""
    max_participants: int = 0
    duration_minutes: int = 60
    requires_instructor: bool = False
    instructor_name: str = ""
    equipment_needed: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    schedule_days: list[str] = Field(default_factory=list)
    schedule_time: str = ""


class AgeGroupActivityUpdate(BaseModel):
    """Schema for updating an age group activity."""

    name: str | None = None
    description: str | None = None
    difficulty: ActivityDifficulty | None = None
    location: str | None = None
    max_participants: int | None = None
    duration_minutes: int | None = None
    requires_instructor: bool | None = None
    instructor_name: str | None = None
    equipment_needed: list[str] | None = None
    tags: list[str] | None = None
    status: AgeGroupActivityStatus | None = None
    schedule_days: list[str] | None = None
    schedule_time: str | None = None


class AgeGroupSummary(BaseModel):
    """Summary of an age group with counts."""

    model_config = ConfigDict(from_attributes=True)

    age_group: str
    description: str
    member_count: int = 0
    family_count: int = 0
    activity_count: int = 0
    activities: list[AgeGroupActivity] = Field(default_factory=list)
