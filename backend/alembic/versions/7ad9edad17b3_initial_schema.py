"""initial_schema

Revision ID: 7ad9edad17b3
Revises:
Create Date: 2026-06-06 21:50:56.892787
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "7ad9edad17b3"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(length=50), nullable=False),
        sa.Column("descripcion", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("nombre"),
    )
    op.create_index("ix_roles_nombre", "roles", ["nombre"])

    op.create_table(
        "user",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("hashed_password", sa.String(length=1024), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("is_superuser", sa.Boolean(), nullable=False),
        sa.Column("is_verified", sa.Boolean(), nullable=False),
        sa.Column("nombre", sa.String(length=255), nullable=False),
        sa.Column("rol_id", sa.Integer(), nullable=False),
        sa.Column("esta_activo", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["rol_id"], ["roles.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_user_email", "user", ["email"], unique=True)
    op.create_index("ix_user_nombre", "user", ["nombre"])

    op.create_table(
        "tipos_recurso",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("nombre"),
    )
    op.create_index("ix_tipos_recurso_nombre", "tipos_recurso", ["nombre"])

    op.create_table(
        "estados_recurso",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("nombre"),
    )
    op.create_index("ix_estados_recurso_nombre", "estados_recurso", ["nombre"])

    op.create_table(
        "cursos",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(), nullable=False),
        sa.Column("codigo", sa.String(), nullable=False),
        sa.Column("ciclo", sa.Integer(), nullable=True),
        sa.Column("esta_activo", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("codigo"),
    )
    op.create_index("ix_cursos_codigo", "cursos", ["codigo"], unique=True)
    op.create_index("ix_cursos_nombre", "cursos", ["nombre"])

    op.create_table(
        "niveles_dificultad",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(length=50), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("nombre"),
    )
    op.create_index("ix_niveles_dificultad_nombre", "niveles_dificultad", ["nombre"])

    op.create_table(
        "tipos_actividad",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("nombre"),
    )
    op.create_index("ix_tipos_actividad_nombre", "tipos_actividad", ["nombre"])

    op.create_table(
        "modulos_laboratorio",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("titulo", sa.String(length=200), nullable=False),
        sa.Column("descripcion", sa.String(), nullable=True),
        sa.Column("url_simulacion", sa.String(length=500), nullable=False),
        sa.Column("nivel_id", sa.Integer(), nullable=False),
        sa.Column("esta_activo", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["nivel_id"], ["niveles_dificultad.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_modulos_laboratorio_titulo", "modulos_laboratorio", ["titulo"])

    op.create_table(
        "recursos",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("titulo", sa.String(length=300), nullable=False),
        sa.Column("resumen", sa.String(), nullable=True),
        sa.Column("fecha_publicacion", sa.Date(), nullable=True),
        sa.Column("url_archivo", sa.String(length=500), nullable=False),
        sa.Column("archivo_size", sa.Integer(), nullable=False),
        sa.Column("archivo_mime", sa.String(length=100), nullable=False),
        sa.Column("tipo_recurso_id", sa.Integer(), nullable=False),
        sa.Column("subido_por", sa.Uuid(), nullable=False),
        sa.Column("estado_id", sa.Integer(), nullable=False),
        sa.Column("curso_id", sa.Integer(), nullable=True),
        sa.Column("visualizaciones", sa.Integer(), nullable=False),
        sa.Column("descargas", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["curso_id"], ["cursos.id"]),
        sa.ForeignKeyConstraint(["estado_id"], ["estados_recurso.id"]),
        sa.ForeignKeyConstraint(["subido_por"], ["user.id"]),
        sa.ForeignKeyConstraint(["tipo_recurso_id"], ["tipos_recurso.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_recursos_titulo", "recursos", ["titulo"])
    op.create_index("ix_recursos_estado_id", "recursos", ["estado_id"])
    op.create_index("ix_recursos_tipo_recurso_id", "recursos", ["tipo_recurso_id"])
    op.create_index("ix_recursos_curso_id", "recursos", ["curso_id"])

    op.create_table(
        "recurso_estado_historial",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("recurso_id", sa.Integer(), nullable=False),
        sa.Column("estado_anterior_id", sa.Integer(), nullable=True),
        sa.Column("estado_nuevo_id", sa.Integer(), nullable=False),
        sa.Column("comentario", sa.String(), nullable=True),
        sa.Column("cambiado_por", sa.Uuid(), nullable=False),
        sa.Column("fecha_hora", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["cambiado_por"], ["user.id"]),
        sa.ForeignKeyConstraint(["estado_anterior_id"], ["estados_recurso.id"]),
        sa.ForeignKeyConstraint(["estado_nuevo_id"], ["estados_recurso.id"]),
        sa.ForeignKeyConstraint(["recurso_id"], ["recursos.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "registro_actividades",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("usuario_id", sa.Uuid(), nullable=False),
        sa.Column("tipo_actividad_id", sa.Integer(), nullable=False),
        sa.Column("entidad_relacionada_id", sa.Uuid(), nullable=True),
        sa.Column("fecha_hora", sa.DateTime(), nullable=False),
        sa.Column("ip_origen", sa.String(), nullable=True),
        sa.Column("user_agent", sa.String(), nullable=True),
        sa.Column("detalle_accion", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(["tipo_actividad_id"], ["tipos_actividad.id"]),
        sa.ForeignKeyConstraint(["usuario_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("registro_actividades")
    op.drop_table("recurso_estado_historial")
    op.drop_index("ix_recursos_curso_id", table_name="recursos")
    op.drop_index("ix_recursos_tipo_recurso_id", table_name="recursos")
    op.drop_index("ix_recursos_estado_id", table_name="recursos")
    op.drop_index("ix_recursos_titulo", table_name="recursos")
    op.drop_table("recursos")
    op.drop_index("ix_modulos_laboratorio_titulo", table_name="modulos_laboratorio")
    op.drop_table("modulos_laboratorio")
    op.drop_index("ix_tipos_actividad_nombre", table_name="tipos_actividad")
    op.drop_table("tipos_actividad")
    op.drop_index("ix_niveles_dificultad_nombre", table_name="niveles_dificultad")
    op.drop_table("niveles_dificultad")
    op.drop_index("ix_cursos_nombre", table_name="cursos")
    op.drop_index("ix_cursos_codigo", table_name="cursos")
    op.drop_table("cursos")
    op.drop_index("ix_estados_recurso_nombre", table_name="estados_recurso")
    op.drop_table("estados_recurso")
    op.drop_index("ix_tipos_recurso_nombre", table_name="tipos_recurso")
    op.drop_table("tipos_recurso")
    op.drop_index("ix_user_nombre", table_name="user")
    op.drop_index("ix_user_email", table_name="user")
    op.drop_table("user")
    op.drop_index("ix_roles_nombre", table_name="roles")
    op.drop_table("roles")
