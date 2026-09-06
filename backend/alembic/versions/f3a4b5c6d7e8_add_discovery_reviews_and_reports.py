"""add discovery reviews and issue reports tables

Revision ID: f3a4b5c6d7e8
Revises: e2f3a4b5c6d7
"""
from alembic import op
import sqlalchemy as sa

revision = "f3a4b5c6d7e8"
down_revision = "e2f3a4b5c6d7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "valoraciones_recurso",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("recurso_id", sa.Integer(), sa.ForeignKey("recursos.id", ondelete="CASCADE"), nullable=False),
        sa.Column("usuario_id", sa.Uuid(), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("puntuacion", sa.Integer(), nullable=False),
        sa.Column("comentario", sa.String(1000), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("recurso_id", "usuario_id", name="uq_valoraciones_usuario_recurso"),
    )
    op.create_index("ix_valoraciones_recurso_recurso_id", "valoraciones_recurso", ["recurso_id"])
    op.create_index("ix_valoraciones_recurso_usuario_id", "valoraciones_recurso", ["usuario_id"])

    op.create_table(
        "reportes_recurso",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("recurso_id", sa.Integer(), sa.ForeignKey("recursos.id", ondelete="CASCADE"), nullable=False),
        sa.Column("usuario_id", sa.Uuid(), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("motivo", sa.String(50), nullable=False),
        sa.Column("descripcion", sa.String(1000), nullable=False),
        sa.Column("estado", sa.String(20), nullable=False, server_default="pendiente"),
        sa.Column("resolucion", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_reportes_recurso_recurso_id", "reportes_recurso", ["recurso_id"])
    op.create_index("ix_reportes_recurso_usuario_id", "reportes_recurso", ["usuario_id"])
    op.create_index("ix_reportes_recurso_estado", "reportes_recurso", ["estado"])


def downgrade() -> None:
    op.drop_index("ix_reportes_recurso_estado", table_name="reportes_recurso")
    op.drop_index("ix_reportes_recurso_usuario_id", table_name="reportes_recurso")
    op.drop_index("ix_reportes_recurso_recurso_id", table_name="reportes_recurso")
    op.drop_table("reportes_recurso")

    op.drop_index("ix_valoraciones_recurso_usuario_id", table_name="valoraciones_recurso")
    op.drop_index("ix_valoraciones_recurso_recurso_id", table_name="valoraciones_recurso")
    op.drop_table("valoraciones_recurso")
