"""add fulltext content column and reading notes markers

Revision ID: e2f3a4b5c6d7
Revises: d1e2f3a4b5c6
"""
from alembic import op
import sqlalchemy as sa

revision = "e2f3a4b5c6d7"
down_revision = "d1e2f3a4b5c6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("recursos", sa.Column("contenido_texto", sa.Text(), nullable=True))
    
    op.create_table(
        "marcador_lectura",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("usuario_id", sa.Uuid(), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("recurso_id", sa.Integer(), sa.ForeignKey("recursos.id", ondelete="CASCADE"), nullable=False),
        sa.Column("pagina", sa.Integer(), nullable=False),
        sa.Column("titulo", sa.String(120), nullable=True),
        sa.Column("contenido", sa.Text(), nullable=True),
        sa.Column("color", sa.String(20), nullable=False, server_default="brand"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_marcador_lectura_usuario_id", "marcador_lectura", ["usuario_id"])
    op.create_index("ix_marcador_lectura_recurso_id", "marcador_lectura", ["recurso_id"])

    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute(
            """
            CREATE INDEX IF NOT EXISTS ix_recursos_fulltext ON recursos
            USING gin(to_tsvector('spanish', coalesce(titulo, '') || ' ' || coalesce(resumen, '') || ' ' || coalesce(autores, '') || ' ' || coalesce(temas, '') || ' ' || coalesce(contenido_texto, '')));
            """
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP INDEX IF EXISTS ix_recursos_fulltext;")

    op.drop_index("ix_marcador_lectura_recurso_id", table_name="marcador_lectura")
    op.drop_index("ix_marcador_lectura_usuario_id", table_name="marcador_lectura")
    op.drop_table("marcador_lectura")
    op.drop_column("recursos", "contenido_texto")
