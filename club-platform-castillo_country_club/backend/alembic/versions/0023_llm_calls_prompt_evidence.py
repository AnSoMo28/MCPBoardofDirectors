"""RV-1 (retro vanguardia Ola 3) — evidencia de prompt en llm_calls.

Deuda ADR-0009 pagada: el registro de costo LLM ES también registro
de evidencia golden. Tres columnas NULL-ables (la llamada sin spec
queda honesta en NULL, no inventada) espejo 1:1 del canon de
ai/prompt_registry.PromptSpec:

  * prompt_name    String(64)  — nombre canónico del registry
  * prompt_version String(16)  — semántico del spec
  * prompt_sha256  String(16)  — fingerprint del template EXACTO
    (mismo canon que PromptSpec.sha256 y que el golden set de Ola 3.4
    pinea: cualquier drift entre lo que CORRIÓ y lo que la suite
    PINEA es visible con un JOIN — con la fila, no con el recuerdo)

Sin índice nuevo: la consulta de auditoría calls_by_prompt es por
prompt_name sobre tabla de ledger (rango pequeño por diseño — el
registro completo vive por rango temporal, ix_llm_calls_called_at
del 0022 ya lo sirve). Sin CHECK ni default: NULL es el estado
truthful de las llamadas históricas y de las que no traen spec.

Revision ID: 0023
Revises: 0022
Create Date: 2026-11-28
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op


revision: str = "0023"
down_revision: str | None = "0022"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """3 columnas de evidencia de prompt (NULL-ables, honestas)."""
    op.add_column(
        "llm_calls",
        sa.Column("prompt_name", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "llm_calls",
        sa.Column("prompt_version", sa.String(length=16), nullable=True),
    )
    op.add_column(
        "llm_calls",
        sa.Column("prompt_sha256", sa.String(length=16), nullable=True),
    )


def downgrade() -> None:
    """Determinista: exactamente lo que upgrade creó, inverso."""
    op.drop_column("llm_calls", "prompt_sha256")
    op.drop_column("llm_calls", "prompt_version")
    op.drop_column("llm_calls", "prompt_name")
