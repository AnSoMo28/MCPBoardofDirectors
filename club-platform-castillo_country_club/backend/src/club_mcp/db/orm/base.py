"""Declarative Base con naming convention determinista (Ola 2.1).

POR QUÉ: alembic autogenerate compara metadata vs DB y nombra las
constraints SIN nombre en el modelo. Sin convention, Postgres
genera users_pkey / ix_users_email_key — impredecibles y con
migraciones que diffan ruido. Con convention TODO constraint nace
con nombre estable (pk_users / ix_users_email / fk_...): el diff
de una migración futura solo contiene el cambio REAL. Es lo que
separa alembic-pro de alembic-junior (craft, guía §1.3).
"""
from __future__ import annotations

from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase


NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

#: metadata COMPARTIDA — naming convention para TODAS las tablas
#: (los constraint names deterministas son la base de las migraciones
#: limpias: ver versions/0001_users.py).
club_metadata = MetaData(naming_convention=NAMING_CONVENTION)


class Base(DeclarativeBase):
    """Base declarativa compartida por TODAS las tablas del club."""

    metadata = club_metadata
