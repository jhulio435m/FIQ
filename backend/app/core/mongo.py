from collections.abc import AsyncGenerator
import logging

from pymongo import ASCENDING, DESCENDING, AsyncMongoClient
from pymongo.asynchronous.collection import AsyncCollection
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import PyMongoError

from app.core.config import settings

logger = logging.getLogger(__name__)

_mongo_client: AsyncMongoClient | None = None
_mongo_db: AsyncDatabase | None = None


def mongo_is_enabled() -> bool:
    return settings.MONGO_ENABLED


async def init_mongo() -> None:
    global _mongo_client, _mongo_db
    if not settings.MONGO_ENABLED:
        return

    client = AsyncMongoClient(
        settings.MONGO_URL,
        serverSelectionTimeoutMS=settings.MONGO_SERVER_SELECTION_TIMEOUT_MS,
    )
    db = client[settings.MONGO_DB_NAME]
    try:
        await client.admin.command("ping")
        collection = db[settings.MONGO_ACTIVITY_COLLECTION]
        await collection.create_index([("occurred_at", DESCENDING)])
        await collection.create_index([("usuario_id", ASCENDING), ("occurred_at", DESCENDING)])
        await collection.create_index([("tipo_actividad", ASCENDING), ("occurred_at", DESCENDING)])
        cache_collection = db[settings.MONGO_EXTERNAL_CACHE_COLLECTION]
        await cache_collection.create_index([("cache_key", ASCENDING)], unique=True)
        await cache_collection.create_index([("expires_at", ASCENDING)], expireAfterSeconds=0)
        await cache_collection.create_index([("kind", ASCENDING), ("created_at", DESCENDING)])
    except PyMongoError:
        client.close()
        logger.exception("MongoDB initialization failed; continuing without document storage")
        return

    _mongo_client = client
    _mongo_db = db


async def close_mongo() -> None:
    global _mongo_client, _mongo_db
    if _mongo_client is not None:
        _mongo_client.close()
    _mongo_client = None
    _mongo_db = None


def get_mongo_db() -> AsyncDatabase | None:
    return _mongo_db


def get_activity_events_collection() -> AsyncCollection | None:
    if _mongo_db is None:
        return None
    return _mongo_db[settings.MONGO_ACTIVITY_COLLECTION]


def get_external_cache_collection() -> AsyncCollection | None:
    if _mongo_db is None:
        return None
    return _mongo_db[settings.MONGO_EXTERNAL_CACHE_COLLECTION]


async def mongo_db_dependency() -> AsyncGenerator[AsyncDatabase, None]:
    if _mongo_db is None:
        raise RuntimeError("MongoDB is not configured")
    yield _mongo_db
