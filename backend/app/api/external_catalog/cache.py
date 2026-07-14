from datetime import datetime, timedelta, timezone
import hashlib
import json
from typing import Any

from pymongo.errors import DuplicateKeyError, PyMongoError

from app.api.external_catalog.schemas import ExternalSearchResponse, ExternalWork
from app.core.config import settings
from app.core.mongo import get_external_cache_collection


def build_cache_key(kind: str, params: dict[str, Any]) -> str:
    normalized = {
        key: value.strip().lower() if isinstance(value, str) else value
        for key, value in sorted(params.items())
        if value not in (None, "")
    }
    payload = json.dumps(
        {"kind": kind, "params": normalized},
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


async def get_cached_external_search(cache_key: str) -> ExternalSearchResponse | None:
    collection = get_external_cache_collection()
    if collection is None:
        return None

    now = datetime.now(timezone.utc)
    try:
        document = await collection.find_one(
            {"cache_key": cache_key, "expires_at": {"$gt": now}}
        )
    except PyMongoError:
        return None
    if not document:
        return None

    results = [
        ExternalWork.model_validate(item)
        for item in document.get("results", [])
        if isinstance(item, dict)
    ]
    warnings = [
        str(item)
        for item in document.get("warnings", [])
        if item is not None
    ]
    warnings.append("Resultado servido desde cache documental MongoDB.")
    return ExternalSearchResponse(results=results, warnings=warnings)


async def set_cached_external_search(
    *,
    cache_key: str,
    kind: str,
    params: dict[str, Any],
    response: ExternalSearchResponse,
) -> None:
    collection = get_external_cache_collection()
    if collection is None:
        return

    now = datetime.now(timezone.utc)
    document = {
        "cache_key": cache_key,
        "kind": kind,
        "params": {
            key: value
            for key, value in params.items()
            if value not in (None, "")
        },
        "results": [item.model_dump(mode="json") for item in response.results],
        "warnings": response.warnings,
        "created_at": now,
        "expires_at": now + timedelta(seconds=settings.EXTERNAL_CACHE_TTL_SECONDS),
    }
    try:
        await collection.replace_one(
            {"cache_key": cache_key},
            document,
            upsert=True,
        )
    except (DuplicateKeyError, PyMongoError):
        return
