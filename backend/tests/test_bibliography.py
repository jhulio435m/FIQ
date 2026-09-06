from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.bibliography.service import ensure_resource_bibliography
from app.models.resource import Recurso
from tests.conftest import seed_reference_data
from tests.test_mvp import login


def build_resource(
    *,
    title: str,
    user_id,
    mime_type: str = "application/pdf",
    status_id: int = 2,
    doi: str | None = None,
    isbn: str | None = None,
) -> Recurso:
    return Recurso(
        titulo=title,
        resumen="Edición bibliográfica de prueba",
        url_archivo="https://example.edu/resource",
        archivo_size=4096,
        archivo_mime=mime_type,
        tipo_recurso_id=1,
        subido_por=user_id,
        estado_id=status_id,
        curso_id=1,
        autores="Ada Quispe",
        editorial="FIQ UNCP",
        anio=2026,
        idioma="es",
        doi=doi,
        isbn=isbn,
    )


async def persist_and_link(db: AsyncSession, *resources: Recurso) -> None:
    db.add_all(resources)
    await db.commit()
    for resource in resources:
        await db.refresh(resource)
        assert resource.id is not None
        await ensure_resource_bibliography(db, resource.id, resource)


async def test_catalog_groups_files_by_work_and_hides_pending_files(
    client: AsyncClient,
    db: AsyncSession,
) -> None:
    ids = await seed_reference_data(db)
    pdf = build_resource(
        title="Fenómenos de transporte",
        user_id=ids["teacher_id"],
        doi="10.1000/TRANSPORTE",
        isbn="9786120000018",
    )
    link = build_resource(
        title="Fenómenos de transporte — versión web",
        user_id=ids["teacher_id"],
        mime_type="text/html",
        doi="10.1000/transporte",
        isbn="9786120000025",
    )
    pending = build_resource(
        title="Fenómenos de transporte — borrador",
        user_id=ids["teacher_id"],
        status_id=1,
        doi="10.1000/transporte",
    )
    await persist_and_link(db, pdf, link, pending)

    catalog = await client.get("/resources/catalog")
    assert catalog.status_code == 200
    page = catalog.json()
    assert page["total"] == 1
    assert len(page["items"]) == 1
    assert page["items"][0]["ediciones_disponibles"] == 1
    assert page["items"][0]["archivos_disponibles"] == 2
    assert page["items"][0]["formatos_disponibles"] == ["ENLACE", "PDF"]

    assert pdf.id is not None
    assert link.id is not None
    assert pending.id is not None
    pdf_work = await client.get(f"/works/by-resource/{pdf.id}")
    link_work = await client.get(f"/works/by-resource/{link.id}")
    hidden_work = await client.get(f"/works/by-resource/{pending.id}")

    assert pdf_work.status_code == 200
    assert link_work.status_code == 200
    assert hidden_work.status_code == 404
    assert pdf_work.json()["id"] == link_work.json()["id"]
    edition = pdf_work.json()["ediciones"][0]
    assert edition["isbns"] == ["9786120000018", "9786120000025"]
    assert {item["recurso_id"] for item in edition["archivos"]} == {pdf.id, link.id}

    work_detail = await client.get(f"/works/{pdf_work.json()['id']}")
    assert work_detail.status_code == 200
    assert len(work_detail.json()["ediciones"][0]["archivos"]) == 2


async def test_only_admin_can_merge_distinct_works(
    client: AsyncClient,
    db: AsyncSession,
) -> None:
    ids = await seed_reference_data(db)
    first = build_resource(title="Operaciones unitarias I", user_id=ids["teacher_id"])
    second = build_resource(title="Operaciones unitarias, edición revisada", user_id=ids["teacher_id"])
    await persist_and_link(db, first, second)

    assert first.id is not None
    assert second.id is not None
    first_work = (await client.get(f"/works/by-resource/{first.id}")).json()
    second_work = (await client.get(f"/works/by-resource/{second.id}")).json()
    assert first_work["id"] != second_work["id"]

    unauthenticated = await client.post(
        f"/works/{first_work['id']}/merge/{second_work['id']}",
    )
    assert unauthenticated.status_code == 401

    student_token = await login(client, "estudiante@fiq.uncp.edu.pe")
    forbidden = await client.post(
        f"/works/{first_work['id']}/merge/{second_work['id']}",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert forbidden.status_code == 403

    admin_token = await login(client)
    merged = await client.post(
        f"/works/{first_work['id']}/merge/{second_work['id']}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert merged.status_code == 200
    assert merged.json()["ediciones_movidas"] == 1
    assert len(merged.json()["obra"]["ediciones"]) == 2

    source = await client.get(f"/works/{second_work['id']}")
    moved_resource = await client.get(f"/works/by-resource/{second.id}")
    assert source.status_code == 404
    assert moved_resource.status_code == 200
    assert moved_resource.json()["id"] == first_work["id"]


async def test_admin_can_sync_an_unmapped_resource(
    client: AsyncClient,
    db: AsyncSession,
) -> None:
    ids = await seed_reference_data(db)
    resource = build_resource(title="Catálogo legado", user_id=ids["teacher_id"])
    db.add(resource)
    await db.commit()
    await db.refresh(resource)
    assert resource.id is not None

    admin_token = await login(client)
    synced = await client.post(
        f"/works/resources/{resource.id}/sync",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert synced.status_code == 200
    assert synced.json()["archivos_disponibles"] == 1

    public_work = await client.get(f"/works/by-resource/{resource.id}")
    assert public_work.status_code == 200
