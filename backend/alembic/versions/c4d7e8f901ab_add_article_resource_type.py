"""add article resource type

Revision ID: c4d7e8f901ab
Revises: a99844a39edd
Create Date: 2026-09-01 15:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c4d7e8f901ab"
down_revision: Union[str, Sequence[str], None] = "a99844a39edd"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text("""
        INSERT INTO tipos_recurso (id, nombre)
        SELECT COALESCE(MAX(id), 0) + 1, 'Artículo'
        FROM tipos_recurso
        WHERE NOT EXISTS (
            SELECT 1 FROM tipos_recurso WHERE lower(nombre) IN ('artículo', 'articulo')
        )
    """))
    op.execute(sa.text("""
        SELECT setval(
            pg_get_serial_sequence('tipos_recurso', 'id'),
            GREATEST((SELECT COALESCE(MAX(id), 1) FROM tipos_recurso), 1),
            true
        )
    """))


def downgrade() -> None:
    op.execute(sa.text("""
        UPDATE recursos
        SET tipo_recurso_id = (SELECT id FROM tipos_recurso WHERE lower(nombre) = 'tesis' LIMIT 1)
        WHERE tipo_recurso_id IN (
            SELECT id FROM tipos_recurso WHERE lower(nombre) IN ('artículo', 'articulo')
        )
        AND EXISTS (SELECT 1 FROM tipos_recurso WHERE lower(nombre) = 'tesis')
    """))
    op.execute(sa.text("""
        DELETE FROM tipos_recurso
        WHERE lower(nombre) IN ('artículo', 'articulo')
        AND NOT EXISTS (
            SELECT 1 FROM recursos WHERE recursos.tipo_recurso_id = tipos_recurso.id
        )
    """))
