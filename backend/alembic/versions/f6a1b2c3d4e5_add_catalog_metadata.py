"""add catalog metadata

Revision ID: f6a1b2c3d4e5
Revises: c4d7e8f901ab
Create Date: 2026-09-01 17:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f6a1b2c3d4e5"
down_revision: Union[str, Sequence[str], None] = "c4d7e8f901ab"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("recursos", sa.Column("isbn", sa.String(length=32), nullable=True))
    op.add_column("recursos", sa.Column("idioma", sa.String(length=16), nullable=True))
    op.add_column("recursos", sa.Column("cover_url", sa.String(length=500), nullable=True))
    op.add_column("recursos", sa.Column("licencia", sa.String(length=300), nullable=True))
    op.add_column("recursos", sa.Column("temas", sa.String(length=1000), nullable=True))
    op.add_column("recursos", sa.Column("fuente_externa", sa.String(length=50), nullable=True))
    op.add_column("recursos", sa.Column("external_id", sa.String(length=200), nullable=True))
    op.create_index("ix_recursos_doi", "recursos", ["doi"], unique=False)
    op.create_index("ix_recursos_isbn", "recursos", ["isbn"], unique=False)
    op.create_index(
        "ix_recursos_fuente_external_id",
        "recursos",
        ["fuente_externa", "external_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_recursos_fuente_external_id", table_name="recursos")
    op.drop_index("ix_recursos_isbn", table_name="recursos")
    op.drop_index("ix_recursos_doi", table_name="recursos")
    op.drop_column("recursos", "external_id")
    op.drop_column("recursos", "fuente_externa")
    op.drop_column("recursos", "temas")
    op.drop_column("recursos", "licencia")
    op.drop_column("recursos", "cover_url")
    op.drop_column("recursos", "idioma")
    op.drop_column("recursos", "isbn")
