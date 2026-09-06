from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.resource import Recurso
from app.api.personal_library import router as library_router
from tests.conftest import seed_reference_data
from tests.test_mvp import login


async def approved_resource(db: AsyncSession, user_id) -> Recurso:
    resource = Recurso(
        titulo="Manual de operaciones unitarias",
        resumen="Recurso aprobado para pruebas",
        url_archivo="resources/manual.pdf",
        archivo_size=2048,
        archivo_mime="application/pdf",
        tipo_recurso_id=1,
        subido_por=user_id,
        estado_id=2,
        curso_id=1,
    )
    db.add(resource)
    await db.commit()
    await db.refresh(resource)
    return resource


async def test_personal_resource_is_private_and_validated(client: AsyncClient, db: AsyncSession) -> None:
    ids = await seed_reference_data(db)
    resource = await approved_resource(db, ids["teacher_id"])
    student = await login(client, "estudiante@fiq.uncp.edu.pe")
    teacher = await login(client, "docente@fiq.uncp.edu.pe")

    saved = await client.put(
        f"/library/me/resources/{resource.id}",
        headers={"Authorization": f"Bearer {student}"},
        json={"favorito": True, "estado_lectura": "leyendo", "progreso_pagina": 17},
    )
    assert saved.status_code == 200
    assert saved.json()["favorito"] is True
    assert saved.json()["progreso_pagina"] == 17

    own = await client.get("/library/me/resources", headers={"Authorization": f"Bearer {student}"})
    other = await client.get("/library/me/resources", headers={"Authorization": f"Bearer {teacher}"})
    assert len(own.json()) == 1
    assert other.json() == []

    invalid = await client.put(
        f"/library/me/resources/{resource.id}",
        headers={"Authorization": f"Bearer {student}"},
        json={"favorito": False, "estado_lectura": "leyendo", "progreso_pagina": -1},
    )
    assert invalid.status_code == 422


async def test_lists_enforce_visibility_and_ownership(client: AsyncClient, db: AsyncSession) -> None:
    ids = await seed_reference_data(db)
    resource = await approved_resource(db, ids["teacher_id"])
    student = await login(client, "estudiante@fiq.uncp.edu.pe")
    teacher = await login(client, "docente@fiq.uncp.edu.pe")

    created = await client.post(
        "/library/me/lists",
        headers={"Authorization": f"Bearer {student}"},
        json={"nombre": "Semestre 1", "descripcion": "Lecturas", "es_publica": False},
    )
    assert created.status_code == 201
    list_id = created.json()["id"]
    added = await client.post(
        f"/library/me/lists/{list_id}/resources/{resource.id}",
        headers={"Authorization": f"Bearer {student}"},
    )
    assert added.status_code == 200
    assert added.json()["recursos"][0]["id"] == resource.id
    own_lists = await client.get("/library/me/lists", headers={"Authorization": f"Bearer {student}"})
    assert own_lists.json()[0]["recursos"][0]["titulo"] == resource.titulo

    hidden = await client.get(f"/library/lists/{list_id}")
    foreign_edit = await client.patch(
        f"/library/me/lists/{list_id}",
        headers={"Authorization": f"Bearer {teacher}"},
        json={"nombre": "No permitido"},
    )
    assert hidden.status_code == 404
    assert foreign_edit.status_code == 404

    shared = await client.patch(
        f"/library/me/lists/{list_id}",
        headers={"Authorization": f"Bearer {student}"},
        json={"es_publica": True},
    )
    public = await client.get(f"/library/lists/{list_id}")
    assert shared.status_code == 200
    assert public.status_code == 200


async def test_owner_can_clear_only_personal_history(client: AsyncClient, db: AsyncSession, monkeypatch) -> None:
    ids = await seed_reference_data(db)
    resource = await approved_resource(db, ids["teacher_id"])
    student = await login(client, "estudiante@fiq.uncp.edu.pe")

    viewed = await client.post(
        f"/resources/{resource.id}/view",
        headers={"Authorization": f"Bearer {student}"},
    )
    history = await client.get("/library/me/history", headers={"Authorization": f"Bearer {student}"})
    assert viewed.status_code == 200
    assert history.status_code == 200
    assert history.json()[0]["accion"] == "view"

    deleted_filters = []

    class FakeCollection:
        async def delete_many(self, query):
            deleted_filters.append(query)

    monkeypatch.setattr(library_router, "get_activity_events_collection", lambda: FakeCollection())
    cleared = await client.delete("/library/me/history", headers={"Authorization": f"Bearer {student}"})
    empty = await client.get("/library/me/history", headers={"Authorization": f"Bearer {student}"})
    assert cleared.status_code == 204
    assert empty.json() == []
    assert deleted_filters == [{
        "usuario_id": str(ids["student_id"]),
        "tipo_actividad": {"$in": ["view", "download"]},
    }]


async def test_bookmarks_crud_flow(client: AsyncClient, db: AsyncSession) -> None:
    ids = await seed_reference_data(db)
    resource = await approved_resource(db, ids["teacher_id"])
    student = await login(client, "estudiante@fiq.uncp.edu.pe")
    teacher = await login(client, "docente@fiq.uncp.edu.pe")

    # 1. Create bookmark
    created = await client.post(
        f"/library/me/resources/{resource.id}/bookmarks",
        headers={"Authorization": f"Bearer {student}"},
        json={
            "pagina": 5,
            "titulo": "Ecuación de Bernoulli",
            "contenido": "Revisar términos de pérdidas por fricción",
            "color": "#2563eb",
        },
    )
    assert created.status_code == 201
    bookmark = created.json()
    bookmark_id = bookmark["id"]
    assert bookmark["pagina"] == 5
    assert bookmark["titulo"] == "Ecuación de Bernoulli"
    assert bookmark["color"] == "#2563eb"

    # 2. List bookmarks (isolation: teacher sees empty, student sees 1)
    student_bms = await client.get(
        f"/library/me/resources/{resource.id}/bookmarks",
        headers={"Authorization": f"Bearer {student}"},
    )
    assert student_bms.status_code == 200
    assert len(student_bms.json()) == 1

    teacher_bms = await client.get(
        f"/library/me/resources/{resource.id}/bookmarks",
        headers={"Authorization": f"Bearer {teacher}"},
    )
    assert teacher_bms.status_code == 200
    assert len(teacher_bms.json()) == 0

    # 3. Update bookmark
    updated = await client.patch(
        f"/library/me/bookmarks/{bookmark_id}",
        headers={"Authorization": f"Bearer {student}"},
        json={"titulo": "Bernoulli Modificado", "color": "#16a34a"},
    )
    assert updated.status_code == 200
    assert updated.json()["titulo"] == "Bernoulli Modificado"
    assert updated.json()["color"] == "#16a34a"

    # Teacher cannot edit student bookmark
    foreign_edit = await client.patch(
        f"/library/me/bookmarks/{bookmark_id}",
        headers={"Authorization": f"Bearer {teacher}"},
        json={"titulo": "Hacked"},
    )
    assert foreign_edit.status_code == 404

    # 4. Delete bookmark
    deleted = await client.delete(
        f"/library/me/bookmarks/{bookmark_id}",
        headers={"Authorization": f"Bearer {student}"},
    )
    assert deleted.status_code == 204

    # Verify deleted
    empty_bms = await client.get(
        f"/library/me/resources/{resource.id}/bookmarks",
        headers={"Authorization": f"Bearer {student}"},
    )
    assert empty_bms.status_code == 200
    assert len(empty_bms.json()) == 0

