"""add personal library

Revision ID: a7b8c9d0e1f2
Revises: f6a1b2c3d4e5
Create Date: 2026-09-02 11:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "a7b8c9d0e1f2"
down_revision: Union[str, Sequence[str], None] = "f6a1b2c3d4e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "biblioteca_usuario_recurso",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("usuario_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("recurso_id", sa.BigInteger(), nullable=False),
        sa.Column("favorito", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("estado_lectura", sa.String(length=20), nullable=True),
        sa.Column("progreso_pagina", sa.Integer(), server_default="0", nullable=False),
        sa.Column("ultima_lectura", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint("progreso_pagina >= 0", name="ck_biblioteca_progreso_no_negativo"),
        sa.CheckConstraint(
            "estado_lectura IS NULL OR estado_lectura IN ('quiero_leer', 'leyendo', 'leido')",
            name="ck_biblioteca_estado_lectura",
        ),
        sa.ForeignKeyConstraint(["usuario_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("usuario_id", "recurso_id", name="uq_biblioteca_usuario_recurso"),
    )
    op.create_index("ix_biblioteca_usuario_recurso_usuario_id", "biblioteca_usuario_recurso", ["usuario_id"])
    op.create_index("ix_biblioteca_usuario_recurso_recurso_id", "biblioteca_usuario_recurso", ["recurso_id"])

    op.create_table(
        "listas_biblioteca",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("propietario_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("nombre", sa.String(length=100), nullable=False),
        sa.Column("descripcion", sa.String(length=500), nullable=True),
        sa.Column("es_publica", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["propietario_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_listas_biblioteca_propietario_id", "listas_biblioteca", ["propietario_id"])
    op.create_index("ix_listas_biblioteca_es_publica", "listas_biblioteca", ["es_publica"])

    op.create_table(
        "lista_biblioteca_recursos",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("lista_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("recurso_id", sa.BigInteger(), nullable=False),
        sa.Column("posicion", sa.Integer(), server_default="0", nullable=False),
        sa.Column("agregado_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["lista_id"], ["listas_biblioteca.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("lista_id", "recurso_id", name="uq_lista_biblioteca_recurso"),
    )
    op.create_index("ix_lista_biblioteca_recursos_lista_id", "lista_biblioteca_recursos", ["lista_id"])
    op.create_index("ix_lista_biblioteca_recursos_recurso_id", "lista_biblioteca_recursos", ["recurso_id"])


def downgrade() -> None:
    op.drop_table("lista_biblioteca_recursos")
    op.drop_table("listas_biblioteca")
    op.drop_table("biblioteca_usuario_recurso")
