import uuid

from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.resources import moderation
from app.core.security import hash_password
from app.models.resource import EstadoRecurso, Recurso
from app.models.user import User
from tests.conftest import seed_reference_data

PENDIENTE, APROBADO, OBSERVADO, RECHAZADO = 1, 2, 3, 4
COMMENT = "Falta la portada y el índice del documento."
VALID_PDF = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n"


async def setup(db: AsyncSession) -> dict[str, uuid.UUID]:
    ids = await seed_reference_data(db)
    other_id = uuid.uuid4()
    db.add_all(
        [
            EstadoRecurso(id=RECHAZADO, nombre="Rechazado"),
            User(
                id=other_id,
                email="otro@fiq.uncp.edu.pe",
                hashed_password=hash_password("password123"),
                nombre="Otro Docente",
                rol_id=2,
                is_active=True,
                is_verified=True,
            ),
        ]
    )
    await db.commit()
    return {**ids, "other_id": other_id}


async def add_resource(db: AsyncSession, owner: uuid.UUID, estado: int = PENDIENTE, titulo: str = "Guía de destilación") -> int:
    recurso = Recurso(
        titulo=titulo,
        url_archivo=f"resources/{uuid.uuid4()}.pdf",
        archivo_size=10,
        archivo_mime="application/pdf",
        tipo_recurso_id=1,
        subido_por=owner,
        estado_id=estado,
    )
    db.add(recurso)
    await db.commit()
    await db.refresh(recurso)
    return recurso.id


async def auth(client: AsyncClient, email: str) -> dict[str, str]:
    response = await client.post("/auth/login", json={"email": email, "password": "password123"})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


ADMIN, DOCENTE, OTRO, ESTUDIANTE = (
    "admin@fiq.uncp.edu.pe",
    "docente@fiq.uncp.edu.pe",
    "otro@fiq.uncp.edu.pe",
    "estudiante@fiq.uncp.edu.pe",
)


async def test_observe_and_reject_require_a_real_comment(client: AsyncClient, db: AsyncSession) -> None:
    ids = await setup(db)
    rid = await add_resource(db, ids["teacher_id"])
    admin = await auth(client, ADMIN)

    for action in ("observe", "reject"):
        assert (await client.patch(f"/resources/{rid}/{action}", json={}, headers=admin)).status_code == 422
        assert (await client.patch(f"/resources/{rid}/{action}", json={"comentario": "corto"}, headers=admin)).status_code == 422

    observed = await client.patch(f"/resources/{rid}/observe", json={"comentario": COMMENT}, headers=admin)
    assert observed.status_code == 200
    assert observed.json()["estado_id"] == OBSERVADO


async def test_invalid_transitions_are_409(client: AsyncClient, db: AsyncSession) -> None:
    ids = await setup(db)
    approved = await add_resource(db, ids["teacher_id"], estado=APROBADO)
    observed = await add_resource(db, ids["teacher_id"], estado=OBSERVADO)
    admin = await auth(client, ADMIN)

    assert (await client.patch(f"/resources/{approved}/approve", headers=admin)).status_code == 409
    assert (await client.patch(f"/resources/{approved}/reject", json={"comentario": COMMENT}, headers=admin)).status_code == 409
    assert (await client.patch(f"/resources/{observed}/approve", headers=admin)).status_code == 409
    # Un observado sí puede rechazarse.
    rejected = await client.patch(f"/resources/{observed}/reject", json={"comentario": COMMENT}, headers=admin)
    assert rejected.status_code == 200
    assert rejected.json()["estado_id"] == RECHAZADO


async def test_moderation_is_admin_only(client: AsyncClient, db: AsyncSession) -> None:
    ids = await setup(db)
    rid = await add_resource(db, ids["teacher_id"])
    docente = await auth(client, DOCENTE)
    assert (await client.patch(f"/resources/{rid}/approve", headers=docente)).status_code == 403
    assert (await client.get("/resources/pending", headers=docente)).status_code == 403
    assert (await client.post("/resources/bulk-approve", json={"ids": [rid]}, headers=docente)).status_code == 403


async def test_pending_queue_is_fifo_and_shows_uploader(client: AsyncClient, db: AsyncSession) -> None:
    ids = await setup(db)
    first = await add_resource(db, ids["teacher_id"], titulo="Primero")
    second = await add_resource(db, ids["other_id"], titulo="Segundo")
    admin = await auth(client, ADMIN)

    queue = (await client.get("/resources/pending", headers=admin)).json()
    assert [item["id"] for item in queue] == [first, second]
    assert queue[1]["subido_por_nombre"] == "Otro Docente"
    assert queue[1]["subido_por_email"] == OTRO
    assert queue[0]["estado_nombre"] == "Pendiente"


async def test_bulk_approve_skips_non_pending(client: AsyncClient, db: AsyncSession) -> None:
    ids = await setup(db)
    a = await add_resource(db, ids["teacher_id"])
    b = await add_resource(db, ids["teacher_id"])
    already = await add_resource(db, ids["teacher_id"], estado=APROBADO)
    admin = await auth(client, ADMIN)

    response = await client.post("/resources/bulk-approve", json={"ids": [a, b, already, 9999, a]}, headers=admin)
    assert response.status_code == 200
    assert response.json() == {"procesados": [a, b], "omitidos": [already, 9999]}
    assert (await client.get("/resources/pending", headers=admin)).json() == []


async def test_teacher_sees_observation_and_resubmits(client: AsyncClient, db: AsyncSession) -> None:
    ids = await setup(db)
    rid = await add_resource(db, ids["teacher_id"])
    await add_resource(db, ids["teacher_id"], estado=APROBADO, titulo="Ya publicado")
    await add_resource(db, ids["other_id"], titulo="De otro docente")
    admin = await auth(client, ADMIN)
    docente = await auth(client, DOCENTE)

    await client.patch(f"/resources/{rid}/observe", json={"comentario": COMMENT}, headers=admin)

    mine = (await client.get("/resources/mine", headers=docente)).json()
    assert [item["titulo"] for item in mine["items"]] == ["Guía de destilación", "Ya publicado"]  # observados primero
    assert mine["items"][0]["ultimo_comentario"] == COMMENT
    assert mine["conteos"]["Observado"] == 1
    assert mine["conteos"]["Aprobado"] == 1

    only_observed = (await client.get("/resources/mine", params={"estado": "Observado"}, headers=docente)).json()
    assert [item["id"] for item in only_observed["items"]] == [rid]

    # Corrige metadatos y reenvía.
    edited = await client.patch(f"/resources/{rid}", json={"titulo": "Guía de destilación (v2)"}, headers=docente)
    assert edited.status_code == 200
    resubmitted = await client.post(f"/resources/{rid}/resubmit", json={"nota": "Agregué portada e índice."}, headers=docente)
    assert resubmitted.status_code == 200
    assert resubmitted.json()["estado_nombre"] == "Pendiente"
    assert resubmitted.json()["reenvios"] == 1

    # No se puede reenviar algo que no está observado.
    assert (await client.post(f"/resources/{rid}/resubmit", headers=docente)).status_code == 409

    history = (await client.get(f"/resources/{rid}/history", headers=docente)).json()
    assert [(h["estado_anterior"], h["estado_nuevo"]) for h in history] == [("Observado", "Pendiente"), ("Pendiente", "Observado")]
    assert history[0]["comentario"] == "Agregué portada e índice."
    assert history[1]["comentario"] == COMMENT
    assert history[1]["cambiado_por_nombre"]


async def test_authors_cannot_touch_others_or_published_resources(client: AsyncClient, db: AsyncSession) -> None:
    ids = await setup(db)
    ajeno = await add_resource(db, ids["other_id"], estado=OBSERVADO)
    publicado = await add_resource(db, ids["teacher_id"], estado=APROBADO)
    docente = await auth(client, DOCENTE)

    assert (await client.patch(f"/resources/{ajeno}", json={"titulo": "x"}, headers=docente)).status_code == 404
    assert (await client.post(f"/resources/{ajeno}/resubmit", headers=docente)).status_code == 404
    assert (await client.get(f"/resources/{ajeno}/history", headers=docente)).status_code == 404
    assert (await client.patch(f"/resources/{publicado}", json={"titulo": "x"}, headers=docente)).status_code == 409

    estudiante = await auth(client, ESTUDIANTE)
    assert (await client.get("/resources/mine", headers=estudiante)).status_code == 403


async def test_unpublished_files_are_private(client: AsyncClient, db: AsyncSession) -> None:
    ids = await setup(db)
    pendiente = await add_resource(db, ids["teacher_id"])
    publicado = await add_resource(db, ids["teacher_id"], estado=APROBADO)

    # Anónimo: el publicado sí, el pendiente no existe para él.
    assert (await client.get(f"/resources/{publicado}/url")).status_code == 200
    assert (await client.get(f"/resources/{pendiente}/url")).status_code == 404
    assert (await client.get(f"/resources/{pendiente}/file")).status_code == 404
    assert (await client.post(f"/resources/{pendiente}/view")).status_code == 404

    # Otro docente tampoco; el autor y el admin sí.
    assert (await client.get(f"/resources/{pendiente}/url", headers=await auth(client, OTRO))).status_code == 404
    assert (await client.get(f"/resources/{pendiente}/url", headers=await auth(client, DOCENTE))).status_code == 200
    assert (await client.get(f"/resources/{pendiente}/url", headers=await auth(client, ADMIN))).status_code == 200

    # Revisar un pendiente no suma vistas.
    viewed = await client.post(f"/resources/{pendiente}/view", headers=await auth(client, ADMIN))
    assert viewed.status_code == 200
    assert viewed.json()["visualizaciones"] == 0


async def test_author_replaces_file_of_observed_resource(client: AsyncClient, db: AsyncSession, monkeypatch) -> None:
    ids = await setup(db)
    rid = await add_resource(db, ids["teacher_id"], estado=OBSERVADO)
    publicado = await add_resource(db, ids["teacher_id"], estado=APROBADO)
    docente = await auth(client, DOCENTE)

    async def fake_upload(file, folder: str = "resources", safe_filename: str | None = None):
        return f"{folder}/nuevo_{safe_filename}"

    deleted: list[str] = []

    class FakeS3:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return False

        async def delete_object(self, Bucket: str, Key: str):
            deleted.append(Key)

    monkeypatch.setattr(moderation.s3_service, "upload_file", fake_upload)
    monkeypatch.setattr(moderation.s3_service.session, "client", lambda **_: FakeS3())

    files = {"file": ("corregido.pdf", VALID_PDF, "application/pdf")}
    response = await client.put(f"/resources/{rid}/file", files=files, headers=docente)
    assert response.status_code == 200, response.text
    assert response.json()["url_archivo"] == "resources/nuevo_corregido.pdf"
    assert response.json()["archivo_size"] == len(VALID_PDF)
    assert len(deleted) == 1

    bad = await client.put(f"/resources/{rid}/file", files={"file": ("x.pdf", b"no es pdf", "application/pdf")}, headers=docente)
    assert bad.status_code in (415, 422)
    assert (await client.put(f"/resources/{publicado}/file", files=files, headers=docente)).status_code == 409
