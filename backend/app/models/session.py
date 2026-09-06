import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime
from sqlmodel import Field, SQLModel


class RefreshSession(SQLModel, table=True):
    __tablename__ = "refresh_sessions"

    token_hash: str = Field(primary_key=True, max_length=64)
    user_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE", index=True)
    auth_version: int
    expires_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))
    consumed: bool = Field(default=False)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)
