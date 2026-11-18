import pytest
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.core.seed_guard import existing_data, guard_reset, parse_reset_flag
from tests.conftest import seed_reference_data, test_engine


def test_reset_flag_is_opt_in() -> None:
    assert parse_reset_flag("app.core.seed", []) is False
    assert parse_reset_flag("app.core.seed", ["--reset"]) is True


async def test_empty_database_runs_without_reset() -> None:
    assert await existing_data(test_engine) == {"usuarios": 0, "recursos": 0}
    await guard_reset(test_engine, "app.core.seed", reset=False)


async def test_database_with_data_requires_reset(db: AsyncSession) -> None:
    await seed_reference_data(db)

    with pytest.raises(SystemExit, match=r"(?s)3 usuarios.*--reset"):
        await guard_reset(test_engine, "app.core.seed", reset=False)

    await guard_reset(test_engine, "app.core.seed", reset=True)


async def test_missing_tables_count_as_empty() -> None:
    from sqlmodel import SQLModel

    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
    assert await existing_data(test_engine) == {"usuarios": 0, "recursos": 0}


@pytest.mark.parametrize("environment", ["staging", "production"])
async def test_never_runs_outside_development(monkeypatch, environment: str) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", environment)
    with pytest.raises(SystemExit, match="prohibido"):
        await guard_reset(test_engine, "app.core.seed", reset=True)
