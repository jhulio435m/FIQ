from httpx import AsyncClient
from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.external_catalog import router as external_router
from app.api.external_catalog.cache import build_cache_key
from app.api.external_catalog.schemas import ExternalWork
from app.api.resources import router as resources_router
from app.logs import crud as logs_crud
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
    result = await db.execute(select(func.count(Recurso.id)))
    return result.scalar_one()


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
    assert payload["usuario"]["rol"] == "Admin"


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

    activity_result = await db.execute(select(RegistroActividad))
    rejected = [
        activity
        for activity in activity_result.scalars().all()
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
    activity_result = await db.execute(select(RegistroActividad))
    assert len(activity_result.scalars().all()) == 1

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
        "anio": 2025,
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
