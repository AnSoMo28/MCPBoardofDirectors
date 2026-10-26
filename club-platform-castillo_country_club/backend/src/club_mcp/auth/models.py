"""Auth data models: User, roles, schemas."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


class UserRole(str, Enum):
    SOCIO = "socio"
    STAFF = "staff"
    ADMIN = "admin"
    JUNTA = "junta"


class User(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(default_factory=lambda: uuid4().hex[:8])
    name: str
    email: str
    hashed_password: str
    role: UserRole
    family_id: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(tz=timezone.utc)
    )


class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: UserRole
    family_id: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str
