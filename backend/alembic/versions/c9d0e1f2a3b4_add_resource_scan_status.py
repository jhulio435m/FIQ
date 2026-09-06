"""add resource antivirus scan status

Revision ID: c9d0e1f2a3b4
Revises: b8c9d0e1f2a3
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c9d0e1f2a3b4"
down_revision: str | Sequence[str] | None = "b8c9d0e1f2a3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "recursos",
        sa.Column("scan_status", sa.String(length=20), nullable=False, server_default="clean"),
    )
    op.create_index("ix_recursos_scan_status", "recursos", ["scan_status"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_recursos_scan_status", table_name="recursos")
    op.drop_column("recursos", "scan_status")
