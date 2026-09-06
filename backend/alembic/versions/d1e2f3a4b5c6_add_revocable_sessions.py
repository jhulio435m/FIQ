"""Add revocable sessions; existing JWTs require a new login.

Revision ID: d1e2f3a4b5c6
Revises: c9d0e1f2a3b4
"""
from alembic import op
import sqlalchemy as sa

revision = "d1e2f3a4b5c6"
down_revision = "c9d0e1f2a3b4"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("user", sa.Column("auth_version", sa.Integer(), nullable=False, server_default="0"))
    op.create_table(
        "refresh_sessions",
        sa.Column("token_hash", sa.String(64), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("auth_version", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index("ix_refresh_sessions_user_id", "refresh_sessions", ["user_id"])


def downgrade():
    op.drop_table("refresh_sessions")
    op.drop_column("user", "auth_version")
