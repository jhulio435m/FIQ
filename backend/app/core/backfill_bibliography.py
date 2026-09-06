"""Idempotent backfill from legacy resources to works, editions and files."""

import asyncio

from sqlmodel import select

from app.api.bibliography.service import ensure_resource_bibliography
from app.core.database import async_session_maker
from app.core.sharding import (
    encode_resource_id,
    resource_session,
    resource_shard_count,
    resource_sharding_enabled,
)
from app.models.resource import Recurso


async def backfill_bibliography() -> int:
    processed = 0
    async with async_session_maker() as db:
        if resource_sharding_enabled():
            for shard_index in range(resource_shard_count()):
                async with resource_session(shard_index, read=True) as shard_db:
                    result = await shard_db.execute(select(Recurso).order_by(Recurso.id))
                    resources = list(result.scalars().all())
                for resource in resources:
                    public_id = encode_resource_id(shard_index, resource.id)
                    if public_id is not None:
                        await ensure_resource_bibliography(db, public_id, resource)
                        processed += 1
            return processed

        result = await db.execute(select(Recurso).order_by(Recurso.id))
        for resource in result.scalars().all():
            if resource.id is not None:
                await ensure_resource_bibliography(db, resource.id, resource)
                processed += 1
    return processed


if __name__ == "__main__":
    count = asyncio.run(backfill_bibliography())
    print(f"Bibliographic resources processed: {count}")
