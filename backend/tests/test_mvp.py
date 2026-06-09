from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.resource import Recurso
from tests.conftest import seed_reference_data


async def login(client: AsyncClient, email: str = "admin@fiq.uncp.edu.pe") -> str:
    response = await client.post(
        "/auth/login",
        json={"email": email, "password": "password123"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


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
