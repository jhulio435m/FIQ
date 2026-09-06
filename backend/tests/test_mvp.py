from httpx import AsyncClient
from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.external_catalog import router as external_router
from app.api.auth import router as auth_router
from app.api.external_catalog.cache import build_cache_key
from app.api.external_catalog.schemas import ExternalWork
from app.api.resources import uploads_router as resources_router
from app.logs import crud as logs_crud
from app.reports import router as reports_router
from app.models.activity import RegistroActividad
from app.models.resource import Recurso
from tests.conftest import seed_reference_data


VALID_PDF = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n"


async def login(
    client: AsyncClient,
    email: str = "admin@fiq.uncp.edu.pe",
    password: str = "password123",
) -> str:
    response = await client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


async def resource_count(db: AsyncSession) -> int:
    result = await db.exec(select(func.count(Recurso.id)))
    return result.one()


async def upload_pdf(
    client: AsyncClient,
    token: str,
    *,
    filename: str = "documento.pdf",
    content: bytes = VALID_PDF,
    content_type: str = "application/pdf",
) -> tuple[int, dict]:
    response = await client.post(
        "/resources",
        headers={"Authorization": f"Bearer {token}"},
        data={"titulo": "Documento seguro", "tipo_recurso_id": "1", "curso_id": "1"},
        files={"file": (filename, content, content_type)},
    )
    try:
        return response.status_code, response.json()
    except Exception:
        return response.status_code, {}


async def test_health_check(client: AsyncClient) -> None:
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


async def test_login_success(client: AsyncClient, db: AsyncSession) -> None:
    await seed_reference_data(db)
    response = await client.post(
        "/auth/login",
        json={"email": "admin@fiq.uncp.edu.pe", "password": "password123"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["access_token"]
    assert "refresh_token" not in payload
    old_cookie = client.cookies.get("fiq_refresh")
    assert old_cookie
    assert payload["usuario"]["rol"] == "Admin"

    refresh_response = await client.post(
        "/auth/refresh",
        headers={"X-Requested-With": "FIQ"},
    )
    assert refresh_response.status_code == 200
    refreshed = refresh_response.json()
    assert refreshed["access_token"]
    assert "refresh_token" not in refreshed
    assert client.cookies.get("fiq_refresh") != old_cookie
    assert refreshed["usuario"]["id"] == payload["usuario"]["id"]


async def test_refresh_rejects_access_or_invalid_token(client: AsyncClient, db: AsyncSession) -> None:
    await seed_reference_data(db)
    response = await client.post(
        "/auth/login",
        json={"email": "admin@fiq.uncp.edu.pe", "password": "password123"},
    )

    access_token = response.json()["access_token"]
    client.cookies.clear()
    access_response = await client.post("/auth/refresh", headers={"X-Requested-With": "FIQ", "Cookie": f"fiq_refresh={access_token}"})
    invalid_response = await client.post("/auth/refresh", headers={"X-Requested-With": "FIQ", "Cookie": "fiq_refresh=invalid"})

    assert access_response.status_code == 401
    assert invalid_response.status_code == 401


async def test_login_rate_limit_returns_429(client: AsyncClient, db: AsyncSession) -> None:
    await seed_reference_data(db)
    previous_limit = auth_router.auth_rate_limiter.requests
    auth_router.auth_rate_limiter.requests = 2
    try:
        for _ in range(2):
            response = await client.post(
                "/auth/login",
                json={"email": "admin@fiq.uncp.edu.pe", "password": "wrong"},
            )
            assert response.status_code == 401
        limited = await client.post(
            "/auth/login",
            json={"email": "admin@fiq.uncp.edu.pe", "password": "wrong"},
        )
        assert limited.status_code == 429
        assert "Retry-After" in limited.headers
    finally:
        auth_router.auth_rate_limiter.requests = previous_limit
        await auth_router.auth_rate_limiter.clear()


async def test_generated_jwt_login_uses_same_rate_limit(client: AsyncClient) -> None:
    previous_limit = auth_router.auth_rate_limiter.requests
    auth_router.auth_rate_limiter.requests = 1
    try:
        first = await client.post(
            "/auth/jwt/login",
            data={"username": "nobody@fiq.uncp.edu.pe", "password": "wrong"},
        )
        limited = await client.post(
            "/auth/jwt/login",
            data={"username": "nobody@fiq.uncp.edu.pe", "password": "wrong"},
        )
        assert first.status_code == 400
        assert limited.status_code == 429
    finally:
        auth_router.auth_rate_limiter.requests = previous_limit
        await auth_router.auth_rate_limiter.clear()


async def test_metrics_endpoint_exposes_http_counters(client: AsyncClient) -> None:
    await client.get("/health")
    response = await client.get("/metrics")
    assert response.status_code == 200
    assert "fiq_http_requests_total" in response.text
    assert 'path="/health"' in response.text


async def test_login_wrong_password(client: AsyncClient, db: AsyncSession) -> None:
    await seed_reference_data(db)
    response = await client.post(
        "/auth/login",
        json={"email": "admin@fiq.uncp.edu.pe", "password": "wrong"},
    )
    assert response.status_code == 401


async def test_resources_public_search_and_types(client: AsyncClient, db: AsyncSession) -> None:
    ids = await seed_reference_data(db)
    db.add(
        Recurso(
            titulo="Balance de Materia y Energia",
            resumen="Guia para procesos quimicos",
            url_archivo="resources/balance.pdf",
            archivo_size=1024,
            archivo_mime="application/pdf",
            tipo_recurso_id=1,
            subido_por=ids["teacher_id"],
            estado_id=2,
            curso_id=1,
            autores="María Quispe",
            doi="10.1000/balance",
        )
    )
    await db.commit()

    types_response = await client.get("/resources/types")
    assert types_response.status_code == 200
    assert types_response.json()[0]["nombre"] == "Libro"

    search_response = await client.get("/resources", params={"search": "Balance"})
    assert search_response.status_code == 200
    resources = search_response.json()
    assert len(resources) == 1
    assert resources[0]["tipo_recurso_nombre"] == "Libro"
    assert resources[0]["curso_nombre"] == "Química General"

    for term in ["María Quispe", "Química General", "10.1000/balance", "Libro"]:
        metadata_search = await client.get("/resources", params={"search": term})
        assert metadata_search.status_code == 200
        assert len(metadata_search.json()) == 1


async def test_resources_fulltext_search_and_snippet(client: AsyncClient, db: AsyncSession) -> None:
    ids = await seed_reference_data(db)
    db.add(
        Recurso(
            titulo="Termodinámica Aplicada",
            resumen="Introducción a la termodinámica química",
            url_archivo="resources/termo.pdf",
            archivo_size=2048,
            archivo_mime="application/pdf",
            tipo_recurso_id=1,
            subido_por=ids["teacher_id"],
            estado_id=2,
            curso_id=1,
            contenido_texto="Se analiza el ciclo de Carnot y los principios de entropía en sistemas cerrados y abiertos con transferencia de calor.",
        )
    )
    await db.commit()

    # Search for term appearing ONLY in contenido_texto
    res = await client.get("/resources", params={"search": "entropía"})
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 1
    assert items[0]["titulo"] == "Termodinámica Aplicada"
    assert items[0]["snippet"] is not None
    assert "entropía" in items[0]["snippet"].lower()


async def test_catalog_returns_total_global_sort_and_public_permalink(
    client: AsyncClient,
    db: AsyncSession,
) -> None:
    ids = await seed_reference_data(db)
    resources = [
        Recurso(
            titulo="Zinc industrial",
            resumen="Metalurgia",
            url_archivo="resources/zinc.pdf",
            archivo_size=1024,
            archivo_mime="application/pdf",
            tipo_recurso_id=1,
            subido_por=ids["teacher_id"],
            estado_id=2,
            curso_id=1,
            visualizaciones=4,
            isbn="9786120000001",
            temas="metalurgia, zinc",
        ),
        Recurso(
            titulo="Ácidos y bases",
            resumen="Química general",
            url_archivo="resources/acidos.pdf",
            archivo_size=1024,
            archivo_mime="application/pdf",
            tipo_recurso_id=1,
            subido_por=ids["teacher_id"],
            estado_id=2,
            curso_id=1,
            visualizaciones=30,
        ),
        Recurso(
            titulo="Documento pendiente",
            resumen="No debe ser público",
            url_archivo="resources/pending.pdf",
            archivo_size=1024,
            archivo_mime="application/pdf",
            tipo_recurso_id=1,
            subido_por=ids["teacher_id"],
            estado_id=1,
            curso_id=1,
        ),
    ]
    db.add_all(resources)
    await db.commit()
    for resource in resources:
        await db.refresh(resource)

    response = await client.get(
        "/resources/catalog",
        params={"sort": "views", "limit": 1},
    )

    assert response.status_code == 200
    page = response.json()
    assert page["total"] == 2
    assert page["has_more"] is True
    assert page["items"][0]["titulo"] == "Ácidos y bases"

    isbn_search = await client.get(
        "/resources/catalog",
        params={"search": "9786120000001"},
    )
    assert isbn_search.status_code == 200
    assert isbn_search.json()["items"][0]["titulo"] == "Zinc industrial"

    public_detail = await client.get(f"/resources/{resources[0].id}")
    pending_detail = await client.get(f"/resources/{resources[2].id}")
    pending_url = await client.get(f"/resources/{resources[2].id}/url")
    pending_view = await client.post(f"/resources/{resources[2].id}/view")
    student_token = await login(client, "estudiante@fiq.uncp.edu.pe")
    pending_download = await client.post(
        f"/resources/{resources[2].id}/download",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert public_detail.status_code == 200
    assert public_detail.json()["isbn"] == "9786120000001"
    assert pending_detail.status_code == 404
    assert pending_url.status_code == 404
    assert pending_view.status_code == 404
    assert pending_download.status_code == 404


async def test_admin_can_list_pending_resources(client: AsyncClient, db: AsyncSession) -> None:
    ids = await seed_reference_data(db)
    token = await login(client)
    db.add(
        Recurso(
            titulo="Tesis de Procesos Quimicos",
            resumen="Investigacion pendiente",
            url_archivo="resources/tesis.pdf",
            archivo_size=2048,
            archivo_mime="application/pdf",
            tipo_recurso_id=2,
            subido_por=ids["teacher_id"],
            estado_id=1,
            curso_id=1,
        )
    )
    await db.commit()

    response = await client.get(
        "/resources/pending",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()[0]["titulo"] == "Tesis de Procesos Quimicos"


async def test_admin_can_archive_resource(client: AsyncClient, db: AsyncSession) -> None:
    ids = await seed_reference_data(db)
    token = await login(client)
    recurso = Recurso(
        titulo="Recurso para Archivar",
        resumen="Documento que debe quedar fuera de la biblioteca publica",
        url_archivo="resources/archive.pdf",
        archivo_size=2048,
        archivo_mime="application/pdf",
        tipo_recurso_id=1,
        subido_por=ids["teacher_id"],
        estado_id=2,
        curso_id=1,
    )
    db.add(recurso)
    await db.commit()
    await db.refresh(recurso)

    response = await client.request(
        "DELETE",
        f"/resources/{recurso.id}",
        json={"comentario": "Retiro administrativo"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["estado_id"] == 5

    search_response = await client.get("/resources", params={"search": "Recurso para Archivar"})
    assert search_response.status_code == 200
    assert search_response.json() == []


async def test_teacher_can_upload_valid_pdf_without_exposing_original_path(
    client: AsyncClient,
    db: AsyncSession,
    monkeypatch,
) -> None:
    await seed_reference_data(db)
    token = await login(client, "docente@fiq.uncp.edu.pe")

    async def fake_upload(file, folder: str = "resources", safe_filename: str | None = None):
        assert folder == "resources"
        assert safe_filename == "documento.pdf"
        return f"resources/server-generated_{safe_filename}"

    monkeypatch.setattr(resources_router.s3_service, "upload_file", fake_upload)

    status_code, payload = await upload_pdf(client, token)

    assert status_code == 201
    assert payload["url_archivo"] == "resources/server-generated_documento.pdf"
    assert "../" not in payload["url_archivo"]


async def test_upload_rejects_invalid_files_and_does_not_create_metadata(
    client: AsyncClient,
    db: AsyncSession,
    monkeypatch,
) -> None:
    await seed_reference_data(db)
    token = await login(client, "docente@fiq.uncp.edu.pe")
    calls: list[str] = []

    async def fake_upload(file, folder: str = "resources", safe_filename: str | None = None):
        calls.append(safe_filename or "")
        return "resources/should-not-exist.pdf"

    monkeypatch.setattr(resources_router.s3_service, "upload_file", fake_upload)

    cases = [
        ("texto.pdf", b"plain text", "application/pdf", 415),
        ("texto.txt", VALID_PDF, "text/plain", 415),
        ("documento.pdf.exe", VALID_PDF, "application/pdf", 415),
        ("../../../archivo.pdf", VALID_PDF, "application/pdf", 422),
        ("vacio.pdf", b"", "application/pdf", 422),
        ("corrupto.pdf", b"%PDF-1.4\nobj\n", "application/pdf", 422),
    ]

    for filename, content, content_type, expected_status in cases:
        before = await resource_count(db)
        status_code, payload = await upload_pdf(
            client,
            token,
            filename=filename,
            content=content,
            content_type=content_type,
        )
        assert status_code == expected_status
        assert "Traceback" not in str(payload)
        assert await resource_count(db) == before

    assert calls == []

    activity_result = await db.exec(select(RegistroActividad))
    rejected = [
        activity
        for activity in activity_result.all()
        if activity.detalle_accion and activity.detalle_accion.get("resultado") == "fallido"
    ]
    assert len(rejected) == len(cases)


async def test_upload_rejects_oversized_file_without_persisting_metadata(
    client: AsyncClient,
    db: AsyncSession,
    monkeypatch,
) -> None:
    await seed_reference_data(db)
    token = await login(client, "docente@fiq.uncp.edu.pe")
    monkeypatch.setattr(resources_router.settings, "MAX_UPLOAD_SIZE", len(VALID_PDF) - 1)

    before = await resource_count(db)
    status_code, _ = await upload_pdf(client, token)

    assert status_code == 413
    assert await resource_count(db) == before


async def test_activity_log_dual_writes_to_sql_and_mongo_document(
    db: AsyncSession,
    monkeypatch,
) -> None:
    ids = await seed_reference_data(db)
    inserted_documents: list[dict[str, object]] = []

    class FakeMongoCollection:
        async def insert_one(self, document: dict[str, object]):
            inserted_documents.append(document)

    monkeypatch.setattr(
        logs_crud,
        "get_activity_events_collection",
        lambda: FakeMongoCollection(),
    )

    activity = await logs_crud.log_activity(
        db,
        usuario_id=ids["teacher_id"],
        tipo_actividad_id=4,
        ip_origen="127.0.0.1",
        user_agent="pytest",
        detalle_accion={"resource_id": 10, "nested": {"owner": ids["teacher_id"]}},
    )

    assert activity.id is not None
    activity_result = await db.exec(select(RegistroActividad))
    assert len(activity_result.all()) == 1

    assert len(inserted_documents) == 1
    document = inserted_documents[0]
    assert document["sql_activity_id"] == activity.id
    assert document["usuario_id"] == str(ids["teacher_id"])
    assert document["tipo_actividad"] == "upload"
    assert document["ip_origen"] == "127.0.0.1"
    assert document["detalle_accion"] == {
        "resource_id": 10,
        "nested": {"owner": str(ids["teacher_id"])},
    }


async def test_upload_requires_authentication_and_allowed_role(
    client: AsyncClient,
    db: AsyncSession,
) -> None:
    await seed_reference_data(db)

    unauthenticated = await client.post(
        "/resources",
        data={"titulo": "Documento seguro", "tipo_recurso_id": "1"},
        files={"file": ("documento.pdf", VALID_PDF, "application/pdf")},
    )
    assert unauthenticated.status_code == 401

    student_token = await login(client, "estudiante@fiq.uncp.edu.pe")
    forbidden = await client.post(
        "/resources",
        headers={"Authorization": f"Bearer {student_token}"},
        data={"titulo": "Documento seguro", "tipo_recurso_id": "1"},
        files={"file": ("documento.pdf", VALID_PDF, "application/pdf")},
    )
    assert forbidden.status_code == 403


async def test_init_upload_rejects_invalid_metadata_before_creating_resource(
    client: AsyncClient,
    db: AsyncSession,
) -> None:
    await seed_reference_data(db)
    token = await login(client, "docente@fiq.uncp.edu.pe")

    before = await resource_count(db)
    response = await client.post(
        "/resources/init-upload",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "titulo": "Carga directa inválida",
            "resumen": "No debe persistir",
            "tipo_recurso_id": 1,
            "file_name": "documento.pdf.exe",
            "file_mime": "application/pdf",
            "file_size": 1024,
        },
    )

    assert response.status_code == 415
    assert await resource_count(db) == before


async def test_external_book_search_aggregates_providers_without_network(
    client: AsyncClient,
    monkeypatch,
) -> None:
    async def fake_open_library(q: str | None, isbn: str | None, limit: int):
        assert q == "termodinamica"
        assert isbn is None
        assert limit == 8
        return [
            ExternalWork(
                source="open_library",
                external_id="OL123W",
                resource_type="book",
                title="Termodinamica aplicada",
                authors=["Autor Uno"],
                isbn="9781234567890",
            )
        ]

    async def fake_archive(q: str | None, limit: int):
        assert q == "termodinamica"
        assert limit == 8
        return [
            ExternalWork(
                source="internet_archive",
                external_id="ia-termo",
                resource_type="digitized_book",
                title="Manual digitalizado de termodinamica",
            )
        ]

    monkeypatch.setattr(external_router, "search_open_library", fake_open_library)
    monkeypatch.setattr(external_router, "search_internet_archive", fake_archive)

    response = await client.get("/external/search/books", params={"q": "termodinamica"})

    assert response.status_code == 200
    payload = response.json()
    assert [item["source"] for item in payload["results"]] == ["open_library", "internet_archive"]
    assert payload["warnings"] == []


async def test_external_book_search_uses_mongo_cache_without_provider_calls(
    client: AsyncClient,
    monkeypatch,
) -> None:
    cache_key = build_cache_key("books", {"q": "termodinamica", "isbn": None, "limit": 8})

    async def fake_cached(key: str):
        assert key == cache_key
        return external_router.ExternalSearchResponse(
            results=[
                ExternalWork(
                    source="mongo_cache",
                    external_id="cached-1",
                    resource_type="book",
                    title="Termodinamica cacheada",
                )
            ],
            warnings=["Resultado servido desde cache documental MongoDB."],
        )

    async def fail_provider(*args, **kwargs):
        raise AssertionError("provider should not be called on cache hit")

    monkeypatch.setattr(external_router, "get_cached_external_search", fake_cached)
    monkeypatch.setattr(external_router, "search_open_library", fail_provider)
    monkeypatch.setattr(external_router, "search_internet_archive", fail_provider)

    response = await client.get("/external/search/books", params={"q": "termodinamica"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["results"][0]["title"] == "Termodinamica cacheada"
    assert payload["warnings"] == ["Resultado servido desde cache documental MongoDB."]


async def test_external_article_search_persists_mongo_cache_after_provider_query(
    client: AsyncClient,
    monkeypatch,
) -> None:
    cached_payloads: list[dict[str, object]] = []

    async def no_cached(key: str):
        return None

    async def fake_set_cached(**kwargs):
        cached_payloads.append(kwargs)

    async def fake_crossref(q: str | None, doi: str | None, limit: int):
        assert q == "catalisis"
        assert doi is None
        assert limit == 8
        return [
            ExternalWork(
                source="crossref",
                external_id="10.1234/catalisis",
                resource_type="article",
                title="Catalisis aplicada",
                doi="10.1234/catalisis",
            )
        ]

    async def empty_provider(*args, **kwargs):
        return []

    monkeypatch.setattr(external_router, "get_cached_external_search", no_cached)
    monkeypatch.setattr(external_router, "set_cached_external_search", fake_set_cached)
    monkeypatch.setattr(external_router, "search_crossref", fake_crossref)
    monkeypatch.setattr(external_router, "search_openalex", empty_provider)
    monkeypatch.setattr(external_router, "search_unpaywall", empty_provider)

    response = await client.get("/external/search/articles", params={"q": "catalisis"})

    assert response.status_code == 200
    assert response.json()["results"][0]["title"] == "Catalisis aplicada"
    assert len(cached_payloads) == 1
    cached = cached_payloads[0]
    assert cached["kind"] == "articles"
    assert cached["params"] == {"q": "catalisis", "doi": None, "limit": 8}
    assert cached["response"].results[0].doi == "10.1234/catalisis"


async def test_external_article_search_deduplicates_same_doi_across_providers(
    client: AsyncClient,
    monkeypatch,
) -> None:
    async def no_cached(key: str):
        return None

    async def no_cache_write(**kwargs):
        return None

    async def crossref(*args, **kwargs):
        return [ExternalWork(
            source="crossref",
            external_id="10.1234/shared",
            resource_type="article",
            title="Artículo compartido",
            doi="10.1234/shared",
        )]

    async def openalex(*args, **kwargs):
        return [ExternalWork(
            source="openalex",
            external_id="W123",
            resource_type="academic_work",
            title="Artículo compartido",
            doi="https://doi.org/10.1234/shared",
        )]

    async def unpaywall(*args, **kwargs):
        return [], None

    monkeypatch.setattr(external_router, "get_cached_external_search", no_cached)
    monkeypatch.setattr(external_router, "set_cached_external_search", no_cache_write)
    monkeypatch.setattr(external_router, "search_crossref", crossref)
    monkeypatch.setattr(external_router, "search_openalex", openalex)
    monkeypatch.setattr(external_router, "search_unpaywall", unpaywall)

    response = await client.get("/external/search/articles", params={"q": "catalisis"})

    assert response.status_code == 200
    assert len(response.json()["results"]) == 1


async def test_teacher_can_import_external_resource_as_pending_and_doi_is_unique(
    client: AsyncClient,
    db: AsyncSession,
) -> None:
    await seed_reference_data(db)
    token = await login(client, "docente@fiq.uncp.edu.pe")

    payload = {
        "source": "crossref",
        "external_id": "10.1234/test",
        "titulo": "Articulo externo de catalisis",
        "tipo_recurso_id": 2,
        "resumen": "Metadatos recuperados desde Crossref.",
        "autores": "Ada Perez, Luis Gomez",
        "editorial": "Journal of Catalysis",
        "doi": "10.1234/test",
        "isbn": "978-612-000-000-2",
        "anio": 2025,
        "idioma": "es",
        "licencia": "CC BY 4.0",
        "temas": ["catálisis", "ingeniería química"],
        "cover_url": "https://covers.openlibrary.org/b/isbn/9786120000002-M.jpg",
        "external_url": "https://doi.org/10.1234/test",
    }
    response = await client.post(
        "/resources/import-external",
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
    )

    assert response.status_code == 201
    created = response.json()
    assert created["estado_id"] == 1
    assert created["archivo_mime"] == "text/html"
    assert created["url_archivo"] == "https://doi.org/10.1234/test"
    assert "Fuente externa: crossref" in created["resumen"]
    assert created["doi"] == "10.1234/test"
    assert created["isbn"] == "9786120000002"
    assert created["idioma"] == "es"
    assert created["licencia"] == "CC BY 4.0"
    assert created["temas"] == "catálisis, ingeniería química"
    assert created["fuente_externa"] == "crossref"

    duplicate = await client.post(
        "/resources/import-external",
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
    )
    assert duplicate.status_code == 409


async def test_external_import_rejects_student_role(
    client: AsyncClient,
    db: AsyncSession,
) -> None:
    await seed_reference_data(db)
    token = await login(client, "estudiante@fiq.uncp.edu.pe")

    response = await client.post(
        "/resources/import-external",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "source": "open_library",
            "external_id": "OL123W",
            "titulo": "Libro externo",
            "tipo_recurso_id": 1,
            "external_url": "https://openlibrary.org/works/OL123W",
        },
    )

    assert response.status_code == 403


async def test_external_import_rejects_unknown_source_and_unsafe_url(
    client: AsyncClient,
    db: AsyncSession,
) -> None:
    await seed_reference_data(db)
    token = await login(client, "docente@fiq.uncp.edu.pe")
    headers = {"Authorization": f"Bearer {token}"}
    base_payload = {
        "external_id": "external-unsafe",
        "titulo": "Recurso externo no confiable",
        "tipo_recurso_id": 1,
    }

    unknown_source = await client.post(
        "/resources/import-external",
        headers=headers,
        json={**base_payload, "source": "unknown_provider"},
    )
    unsafe_url = await client.post(
        "/resources/import-external",
        headers=headers,
        json={
            **base_payload,
            "source": "open_library",
            "external_url": "javascript:alert(1)",
        },
    )

    assert unknown_source.status_code == 422
    assert unsafe_url.status_code == 422


async def test_powerbi_document_metrics_returns_empty_payload_without_mongo(
    client: AsyncClient,
    monkeypatch,
) -> None:
    monkeypatch.setattr(reports_router.settings, "DASHBOARD_API_KEY", "test-key")
    monkeypatch.setattr(reports_router, "get_activity_events_collection", lambda: None)
    monkeypatch.setattr(reports_router, "get_external_cache_collection", lambda: None)

    response = await client.get(
        "/reports/public/document-metrics",
        headers={"X-API-Key": "test-key"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["mongo_enabled"] is False
    assert payload["activity_events"]["total"] == 0
    assert payload["external_catalog_cache"]["recent"] == []


async def test_powerbi_document_metrics_requires_api_key(
    client: AsyncClient,
    monkeypatch,
) -> None:
    monkeypatch.setattr(reports_router.settings, "DASHBOARD_API_KEY", "test-key")

    response = await client.get(
        "/reports/public/document-metrics",
        headers={"X-API-Key": "wrong-key"},
    )

    assert response.status_code == 401


async def test_looker_studio_schema_requires_api_key(
    client: AsyncClient,
    monkeypatch,
) -> None:
    monkeypatch.setattr(reports_router.settings, "DASHBOARD_API_KEY", "test-key")

    response = await client.get(
        "/reports/public/looker-studio/schema/resources",
        headers={"X-API-Key": "wrong-key"},
    )

    assert response.status_code == 401


async def test_looker_studio_resources_returns_flat_rows(
    client: AsyncClient,
    db: AsyncSession,
    monkeypatch,
) -> None:
    monkeypatch.setattr(reports_router.settings, "DASHBOARD_API_KEY", "test-key")
    ids = await seed_reference_data(db)
    db.add(
        Recurso(
            titulo="Balance Data Studio",
            resumen="Dataset de prueba",
            url_archivo="resources/balance-ds.pdf",
            archivo_size=1024,
            archivo_mime="application/pdf",
            tipo_recurso_id=1,
            subido_por=ids["teacher_id"],
            estado_id=2,
            curso_id=1,
            visualizaciones=7,
            descargas=3,
            anio=2026,
        )
    )
    await db.commit()

    schema_response = await client.get(
        "/reports/public/looker-studio/schema/resources",
        headers={"X-API-Key": "test-key"},
    )
    data_response = await client.get(
        "/reports/public/looker-studio/data/resources",
        headers={"X-API-Key": "test-key"},
    )

    assert schema_response.status_code == 200
    assert data_response.status_code == 200
    assert schema_response.json()["fields"][0]["name"] == "id"
    rows = data_response.json()["rows"]
    assert rows[0]["titulo"] == "Balance Data Studio"
    assert rows[0]["visualizaciones"] == 7
    assert rows[0]["created_date"]


async def test_looker_studio_users_omits_email(
    client: AsyncClient,
    db: AsyncSession,
    monkeypatch,
) -> None:
    monkeypatch.setattr(reports_router.settings, "DASHBOARD_API_KEY", "test-key")
    await seed_reference_data(db)

    response = await client.get(
        "/reports/public/looker-studio/data/users",
        headers={"X-API-Key": "test-key"},
    )

    assert response.status_code == 200
    row = response.json()["rows"][0]
    assert "email" not in row
    assert row["rol"] in {"Admin", "Docente", "Estudiante"}


async def test_public_dashboard_users_omits_email(
    client: AsyncClient,
    db: AsyncSession,
    monkeypatch,
) -> None:
    monkeypatch.setattr(reports_router.settings, "DASHBOARD_API_KEY", "test-key")
    await seed_reference_data(db)

    response = await client.get(
        "/reports/public/users",
        headers={"X-API-Key": "test-key"},
    )

    assert response.status_code == 200
    row = response.json()[0]
    assert "email" not in row
    assert row["rol"] in {"Admin", "Docente", "Estudiante"}
