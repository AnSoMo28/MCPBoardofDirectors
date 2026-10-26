"""
Member domain models.
Pydantic schemas for validation, serialization, and API contracts.
"""

from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, computed_field


class AgeGroup(str, Enum):
    TODDLER = "toddler"
    KIDS = "kids"
    TEENS = "teens"
    YOUNG = "young"
    ADULT = "adult"
    SENIOR = "senior"


class MemberRole(str, Enum):
    PRIMARY = "primary"
    SPOUSE = "spouse"
    CHILD = "child"
    DEPENDENT = "dependent"


def compute_age(dob: date) -> int:
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def compute_age_group(dob: date) -> AgeGroup:
    age = compute_age(dob)
    if age <= 4:
        return AgeGroup.TODDLER
    if age <= 11:
        return AgeGroup.KIDS
    if age <= 17:
        return AgeGroup.TEENS
    if age <= 30:
        return AgeGroup.YOUNG
    if age <= 59:
        return AgeGroup.ADULT
    return AgeGroup.SENIOR


class MemberCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, examples=["Carlos Garcia"])
    date_of_birth: date
    role: MemberRole
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=30)
    allergies: Optional[str] = Field(None, max_length=500)
    dietary_restrictions: Optional[str] = Field(None, max_length=500)


class MemberUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    role: Optional[MemberRole] = None
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=30)
    allergies: Optional[str] = Field(None, max_length=500)
    dietary_restrictions: Optional[str] = Field(None, max_length=500)


class MemberResponse(BaseModel):
    id: UUID
    family_id: UUID
    name: str
    date_of_birth: date
    role: MemberRole
    email: Optional[str] = None
    phone: Optional[str] = None
    allergies: Optional[str] = None
    dietary_restrictions: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @computed_field
    @property
    def age(self) -> int:
        return compute_age(self.date_of_birth)

    @computed_field
    @property
    def age_group(self) -> AgeGroup:
        return compute_age_group(self.date_of_birth)
