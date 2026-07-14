from collections.abc import Awaitable, Callable
from typing import Any
from urllib.parse import quote

import httpx

from app.api.external_catalog.schemas import ExternalWork
from app.core.config import settings

JsonDict = dict[str, Any]
FetchJson = Callable[[str, dict[str, Any] | None], Awaitable[JsonDict | None]]


def _headers() -> dict[str, str]:
    return {
        "User-Agent": settings.EXTERNAL_API_USER_AGENT,
        "Accept": "application/json",
    }


async def fetch_json(url: str, params: dict[str, Any] | None = None) -> JsonDict | None:
    async with httpx.AsyncClient(
        timeout=settings.EXTERNAL_API_TIMEOUT_SECONDS,
        headers=_headers(),
        follow_redirects=True,
    ) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        payload = response.json()
        return payload if isinstance(payload, dict) else None


def _first(values: Any) -> str | None:
    if isinstance(values, list) and values:
        value = values[0]
        return str(value) if value is not None else None
    if isinstance(values, str):
        return values
    return None


def _year_from_date(value: Any) -> int | None:
    if isinstance(value, int):
        return value
    if not isinstance(value, str) or len(value) < 4:
        return None
    try:
        return int(value[:4])
    except ValueError:
        return None


def _open_library_cover(isbn: str | None) -> str | None:
    if not isbn:
        return None
    return f"https://covers.openlibrary.org/b/isbn/{quote(isbn)}-M.jpg"


def _crossref_date(message: JsonDict) -> str | None:
    date_parts = message.get("published-print") or message.get("published-online") or message.get("issued")
    parts = date_parts.get("date-parts") if isinstance(date_parts, dict) else None
    if isinstance(parts, list) and parts and isinstance(parts[0], list):
        return "-".join(str(part) for part in parts[0])
    return None


def _crossref_authors(message: JsonDict) -> list[str]:
    authors = []
    for author in message.get("author") or []:
        if not isinstance(author, dict):
            continue
        name = " ".join(
            part
            for part in [author.get("given"), author.get("family")]
            if isinstance(part, str) and part
        )
        if name:
            authors.append(name)
    return authors


def _openalex_authors(item: JsonDict) -> list[str]:
    authors = []
    for authorship in item.get("authorships") or []:
        author = authorship.get("author") if isinstance(authorship, dict) else None
        name = author.get("display_name") if isinstance(author, dict) else None
        if isinstance(name, str) and name:
            authors.append(name)
    return authors


def normalize_open_library(doc: JsonDict) -> ExternalWork | None:
    title = doc.get("title")
    key = doc.get("key")
    if not isinstance(title, str) or not isinstance(key, str):
        return None
    isbn = _first(doc.get("isbn"))
    return ExternalWork(
        source="open_library",
        external_id=key.removeprefix("/works/"),
        resource_type="book",
        title=title,
        authors=[str(author) for author in doc.get("author_name") or [] if author],
        publisher=_first(doc.get("publisher")),
        published_year=doc.get("first_publish_year") if isinstance(doc.get("first_publish_year"), int) else None,
        isbn=isbn,
        cover_url=_open_library_cover(isbn),
        external_url=f"https://openlibrary.org{key}",
        subjects=[str(subject) for subject in doc.get("subject") or [] if subject][:8],
    )


def normalize_internet_archive(doc: JsonDict) -> ExternalWork | None:
    identifier = doc.get("identifier")
    title = doc.get("title")
    if not isinstance(identifier, str) or not isinstance(title, str):
        return None
    creators = doc.get("creator")
    if isinstance(creators, str):
        authors = [creators]
    elif isinstance(creators, list):
        authors = [str(author) for author in creators if author]
    else:
        authors = []
    return ExternalWork(
        source="internet_archive",
        external_id=identifier,
        resource_type="digitized_book",
        title=title,
        authors=authors,
        publisher=_first(doc.get("publisher")),
        published_year=_year_from_date(doc.get("year") or doc.get("date")),
        external_url=f"https://archive.org/details/{identifier}",
        subjects=[str(subject) for subject in doc.get("subject") or [] if subject][:8],
    )


def normalize_crossref(message: JsonDict) -> ExternalWork | None:
    title = _first(message.get("title"))
    doi = message.get("DOI")
    if not title or not isinstance(doi, str):
        return None
    published_date = _crossref_date(message)
    return ExternalWork(
        source="crossref",
        external_id=doi,
        resource_type="article",
        title=title,
        authors=_crossref_authors(message),
        publisher=message.get("publisher") if isinstance(message.get("publisher"), str) else None,
        published_year=_year_from_date(published_date),
        published_date=published_date,
        doi=doi,
        external_url=message.get("URL") if isinstance(message.get("URL"), str) else f"https://doi.org/{doi}",
        license=_first([
            item.get("URL")
            for item in message.get("license") or []
            if isinstance(item, dict) and item.get("URL")
        ]),
        subjects=[str(subject) for subject in message.get("subject") or [] if subject][:8],
    )


def normalize_openalex(item: JsonDict) -> ExternalWork | None:
    title = item.get("title") or item.get("display_name")
    external_id = item.get("id")
    if not isinstance(title, str) or not isinstance(external_id, str):
        return None
    doi = item.get("doi")
    source = item.get("primary_location", {}).get("source") if isinstance(item.get("primary_location"), dict) else None
    return ExternalWork(
        source="openalex",
        external_id=external_id.rsplit("/", 1)[-1],
        resource_type="academic_work",
        title=title,
        authors=_openalex_authors(item),
        publisher=source.get("display_name") if isinstance(source, dict) else None,
        published_year=item.get("publication_year") if isinstance(item.get("publication_year"), int) else None,
        published_date=item.get("publication_date") if isinstance(item.get("publication_date"), str) else None,
        doi=doi.removeprefix("https://doi.org/") if isinstance(doi, str) else None,
        external_url=external_id,
        open_access_url=(
            item.get("open_access", {}).get("oa_url")
            if isinstance(item.get("open_access"), dict)
            else None
        ),
        subjects=[
            topic.get("display_name")
            for topic in item.get("topics") or []
            if isinstance(topic, dict) and isinstance(topic.get("display_name"), str)
        ][:8],
    )


def normalize_unpaywall(message: JsonDict) -> ExternalWork | None:
    doi = message.get("doi")
    title = message.get("title")
    if not isinstance(doi, str) or not isinstance(title, str):
        return None
    best = message.get("best_oa_location")
    return ExternalWork(
        source="unpaywall",
        external_id=doi,
        resource_type="open_access_article",
        title=title,
        authors=[],
        publisher=message.get("journal_name") if isinstance(message.get("journal_name"), str) else None,
        published_year=message.get("year") if isinstance(message.get("year"), int) else None,
        doi=doi,
        external_url=f"https://doi.org/{doi}",
        open_access_url=best.get("url") if isinstance(best, dict) and isinstance(best.get("url"), str) else None,
        license=best.get("license") if isinstance(best, dict) and isinstance(best.get("license"), str) else None,
    )


async def search_open_library(
    query: str | None,
    isbn: str | None,
    limit: int,
    fetcher: FetchJson = fetch_json,
) -> list[ExternalWork]:
    params: dict[str, Any] = {"limit": limit}
    if isbn:
        params["isbn"] = isbn
    elif query:
        params["q"] = query
    else:
        return []
    payload = await fetcher("https://openlibrary.org/search.json", params)
    return [
        item
        for doc in (payload or {}).get("docs", [])
        if isinstance(doc, dict)
        for item in [normalize_open_library(doc)]
        if item is not None
    ]


async def search_internet_archive(
    query: str | None,
    limit: int,
    fetcher: FetchJson = fetch_json,
) -> list[ExternalWork]:
    if not query:
        return []
    payload = await fetcher(
        "https://archive.org/advancedsearch.php",
        {
            "q": f'title:({query}) AND mediatype:(texts)',
            "fl[]": ["identifier", "title", "creator", "publisher", "year", "date", "subject"],
            "rows": limit,
            "output": "json",
        },
    )
    docs = ((payload or {}).get("response") or {}).get("docs", [])
    return [
        item
        for doc in docs
        if isinstance(doc, dict)
        for item in [normalize_internet_archive(doc)]
        if item is not None
    ]


async def search_crossref(
    query: str | None,
    doi: str | None,
    limit: int,
    fetcher: FetchJson = fetch_json,
) -> list[ExternalWork]:
    mailto = settings.EXTERNAL_API_EMAIL or None
    if doi:
        payload = await fetcher(
            f"https://api.crossref.org/works/{quote(doi, safe='')}",
            {"mailto": mailto} if mailto else None,
        )
        message = (payload or {}).get("message")
        item = normalize_crossref(message) if isinstance(message, dict) else None
        return [item] if item else []
    if not query:
        return []
    payload = await fetcher(
        "https://api.crossref.org/works",
        {"query.bibliographic": query, "rows": limit, **({"mailto": mailto} if mailto else {})},
    )
    items = ((payload or {}).get("message") or {}).get("items", [])
    return [
        item
        for message in items
        if isinstance(message, dict)
        for item in [normalize_crossref(message)]
        if item is not None
    ]


async def search_openalex(
    query: str | None,
    doi: str | None,
    limit: int,
    fetcher: FetchJson = fetch_json,
) -> list[ExternalWork]:
    params: dict[str, Any] = {"per-page": limit}
    if settings.EXTERNAL_API_EMAIL:
        params["mailto"] = settings.EXTERNAL_API_EMAIL
    if doi:
        params["filter"] = f"doi:{doi}"
    elif query:
        params["search"] = query
    else:
        return []
    payload = await fetcher("https://api.openalex.org/works", params)
    return [
        item
        for doc in (payload or {}).get("results", [])
        if isinstance(doc, dict)
        for item in [normalize_openalex(doc)]
        if item is not None
    ]


async def search_unpaywall(
    doi: str | None,
    fetcher: FetchJson = fetch_json,
) -> tuple[list[ExternalWork], str | None]:
    if not doi:
        return [], None
    if not settings.EXTERNAL_API_EMAIL:
        return [], "Unpaywall requiere configurar EXTERNAL_API_EMAIL."
    payload = await fetcher(
        f"https://api.unpaywall.org/v2/{quote(doi, safe='')}",
        {"email": settings.EXTERNAL_API_EMAIL},
    )
    item = normalize_unpaywall(payload or {})
    return ([item] if item else []), None
