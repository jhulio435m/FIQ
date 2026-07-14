from collections.abc import Awaitable, Callable

from fastapi import APIRouter, Query

from app.api.external_catalog.cache import (
    build_cache_key,
    get_cached_external_search,
    set_cached_external_search,
)
from app.api.external_catalog.clients import (
    search_crossref,
    search_internet_archive,
    search_open_library,
    search_openalex,
    search_unpaywall,
)
from app.api.external_catalog.schemas import ExternalSearchResponse, ExternalWork

router = APIRouter()


async def _collect(
    provider: str,
    task: Callable[[], Awaitable[list[ExternalWork] | tuple[list[ExternalWork], str | None]]],
) -> tuple[list[ExternalWork], str | None]:
    try:
        result = await task()
    except Exception:
        return [], f"{provider} no respondió correctamente."
    if isinstance(result, tuple):
        return result
    return result, None


def _dedupe(results: list[ExternalWork]) -> list[ExternalWork]:
    seen: set[tuple[str | None, str, str]] = set()
    deduped: list[ExternalWork] = []
    for item in results:
        key = (item.doi.lower() if item.doi else None, item.source, item.external_id)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
    return deduped


@router.get("/search/books", response_model=ExternalSearchResponse)
async def search_books(
    q: str | None = Query(default=None, min_length=2, max_length=120),
    isbn: str | None = Query(default=None, min_length=5, max_length=32),
    limit: int = Query(default=8, ge=1, le=20),
):
    cache_params = {"q": q, "isbn": isbn, "limit": limit}
    cache_key = build_cache_key("books", cache_params)
    cached = await get_cached_external_search(cache_key)
    if cached:
        return cached

    results: list[ExternalWork] = []
    warnings: list[str] = []
    for provider, task in [
        ("Open Library", lambda: search_open_library(q, isbn, limit)),
        ("Internet Archive", lambda: search_internet_archive(q, limit)),
    ]:
        provider_results, warning = await _collect(provider, task)
        results.extend(provider_results)
        if warning:
            warnings.append(warning)
    response = ExternalSearchResponse(results=_dedupe(results)[: limit * 2], warnings=warnings)
    await set_cached_external_search(
        cache_key=cache_key,
        kind="books",
        params=cache_params,
        response=response,
    )
    return response


@router.get("/search/articles", response_model=ExternalSearchResponse)
async def search_articles(
    q: str | None = Query(default=None, min_length=2, max_length=160),
    doi: str | None = Query(default=None, min_length=4, max_length=180),
    limit: int = Query(default=8, ge=1, le=20),
):
    cache_params = {"q": q, "doi": doi, "limit": limit}
    cache_key = build_cache_key("articles", cache_params)
    cached = await get_cached_external_search(cache_key)
    if cached:
        return cached

    results: list[ExternalWork] = []
    warnings: list[str] = []
    for provider, task in [
        ("Crossref", lambda: search_crossref(q, doi, limit)),
        ("OpenAlex", lambda: search_openalex(q, doi, limit)),
        ("Unpaywall", lambda: search_unpaywall(doi)),
    ]:
        provider_results, warning = await _collect(provider, task)
        results.extend(provider_results)
        if warning:
            warnings.append(warning)
    response = ExternalSearchResponse(results=_dedupe(results)[: limit * 3], warnings=warnings)
    await set_cached_external_search(
        cache_key=cache_key,
        kind="articles",
        params=cache_params,
        response=response,
    )
    return response
