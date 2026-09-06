"""add bibliographic works editions and files

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-09-02 11:30:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "b8c9d0e1f2a3"
down_revision: Union[str, Sequence[str], None] = "a7b8c9d0e1f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "obras_bibliograficas",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("titulo_canonico", sa.String(length=300), nullable=False),
        sa.Column("resumen", sa.Text(), nullable=True),
        sa.Column("autores", sa.String(length=300), nullable=True),
        sa.Column("temas", sa.String(length=1000), nullable=True),
        sa.Column("idioma", sa.String(length=16), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_obras_bibliograficas_titulo_canonico", "obras_bibliograficas", ["titulo_canonico"])

    op.create_table(
        "ediciones_bibliograficas",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("obra_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("titulo", sa.String(length=300), nullable=False),
        sa.Column("editorial", sa.String(length=200), nullable=True),
        sa.Column("anio", sa.Integer(), nullable=True),
        sa.Column("idioma", sa.String(length=16), nullable=True),
        sa.Column("doi", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["obra_id"], ["obras_bibliograficas.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("doi", name="uq_ediciones_bibliograficas_doi"),
    )
    op.create_index("ix_ediciones_bibliograficas_obra_id", "ediciones_bibliograficas", ["obra_id"])
    op.create_index("ix_ediciones_bibliograficas_doi", "ediciones_bibliograficas", ["doi"])

    op.create_table(
        "edicion_isbn",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("edicion_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("isbn", sa.String(length=32), nullable=False),
        sa.ForeignKeyConstraint(["edicion_id"], ["ediciones_bibliograficas.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("isbn", name="uq_edicion_isbn_isbn"),
    )
    op.create_index("ix_edicion_isbn_edicion_id", "edicion_isbn", ["edicion_id"])
    op.create_index("ix_edicion_isbn_isbn", "edicion_isbn", ["isbn"])

    op.create_table(
        "archivos_bibliograficos",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("edicion_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("recurso_id", sa.BigInteger(), nullable=False),
        sa.Column("formato", sa.String(length=20), nullable=False),
        sa.Column("mime_type", sa.String(length=100), nullable=False),
        sa.Column("tamano", sa.BigInteger(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint("tamano >= 0", name="ck_archivo_bibliografico_tamano"),
        sa.ForeignKeyConstraint(["edicion_id"], ["ediciones_bibliograficas.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("recurso_id", name="uq_archivos_bibliograficos_recurso_id"),
        sa.UniqueConstraint("edicion_id", "recurso_id", name="uq_archivo_edicion_recurso"),
    )
    op.create_index("ix_archivos_bibliograficos_edicion_id", "archivos_bibliograficos", ["edicion_id"])
    op.create_index("ix_archivos_bibliograficos_recurso_id", "archivos_bibliograficos", ["recurso_id"])


def downgrade() -> None:
    op.drop_table("archivos_bibliograficos")
    op.drop_table("edicion_isbn")
    op.drop_table("ediciones_bibliograficas")
    op.drop_table("obras_bibliograficas")
