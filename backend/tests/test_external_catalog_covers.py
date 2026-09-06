from app.api.external_catalog.clients import (
    normalize_internet_archive,
    normalize_open_library,
    search_open_library,
)


def test_open_library_prefers_cover_id_even_without_isbn() -> None:
    work = normalize_open_library({
        "key": "/works/OL123W",
        "title": "Química aplicada",
        "cover_i": 12993358,
        "author_name": ["Autora FIQ"],
    })

    assert work is not None
    assert work.cover_url == "https://covers.openlibrary.org/b/id/12993358-M.jpg?default=false"


def test_internet_archive_generates_thumbnail_and_preserves_string_subject() -> None:
    work = normalize_internet_archive({
        "identifier": "quimica-general",
        "title": "Química general",
        "subject": "Chemistry",
    })

    assert work is not None
    assert work.cover_url == "https://archive.org/services/img/quimica-general"
    assert work.subjects == ["Chemistry"]


async def test_open_library_requests_explicit_cover_fields() -> None:
    captured_params = {}

    async def fetcher(_url, params):
        captured_params.update(params or {})
        return {"docs": []}

    await search_open_library("química", None, 3, fetcher=fetcher)

    assert "cover_i" in captured_params["fields"]
    assert "isbn" in captured_params["fields"]
