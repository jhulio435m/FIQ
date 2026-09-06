from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.resource import Recurso
from tests.conftest import seed_reference_data
from tests.test_mvp import login


async def create_sample_resource(
    db: AsyncSession,
    user_id,
    titulo: str,
    curso_id: int = 1,
    views: int = 0,
    downloads: int = 0,
    temas: str = "quimica, reactores",
) -> Recurso:
    resource = Recurso(
        titulo=titulo,
        resumen=f"Resumen de {titulo}",
        url_archivo=f"resources/{titulo.lower().replace(' ', '_')}.pdf",
        archivo_size=2048,
        archivo_mime="application/pdf",
        tipo_recurso_id=1,
        subido_por=user_id,
        estado_id=2,  # Aprobado
        curso_id=curso_id,
        visualizaciones=views,
        descargas=downloads,
        temas=temas,
    )
    db.add(resource)
    await db.commit()
    await db.refresh(resource)
    return resource


async def test_featured_and_related_resources(client: AsyncClient, db: AsyncSession) -> None:
    ids = await seed_reference_data(db)
    r1 = await create_sample_resource(db, ids["teacher_id"], "Cálculo de Reactores", curso_id=1, views=10, downloads=5)
    r2 = await create_sample_resource(db, ids["teacher_id"], "Reactores Catalíticos", curso_id=1, views=50, downloads=20)
    r3 = await create_sample_resource(db, ids["teacher_id"], "Química Orgánica Avanzada", curso_id=2, views=5, downloads=1)

    # 1. Featured carousels
    feat = await client.get("/resources/featured")
    assert feat.status_code == 200
    data = feat.json()
    assert "recientes" in data
    assert "mas_vistos" in data
    assert "mas_descargados" in data
    assert len(data["recientes"]) >= 3
    # Most viewed first item should be r2 (views=50)
    assert data["mas_vistos"][0]["id"] == r2.id

    # 2. Related resources for r1 (should recommend r2 because same course_id=1)
    related = await client.get(f"/resources/{r1.id}/related")
    assert related.status_code == 200
    related_items = related.json()
    assert len(related_items) >= 1
    # r1 must not be in its own related list
    assert all(item["id"] != r1.id for item in related_items)
    # r2 should be in related
    assert any(item["id"] == r2.id for item in related_items)


async def test_resource_reviews_crud_and_average(client: AsyncClient, db: AsyncSession) -> None:
    ids = await seed_reference_data(db)
    resource = await create_sample_resource(db, ids["teacher_id"], "Termodinámica Estadística")
    student_token = await login(client, "estudiante@fiq.uncp.edu.pe")
    teacher_token = await login(client, "docente@fiq.uncp.edu.pe")

    # Initial reviews: empty
    empty_reviews = await client.get(f"/resources/{resource.id}/reviews")
    assert empty_reviews.status_code == 200
    assert empty_reviews.json()["promedio"] == 0.0
    assert empty_reviews.json()["total"] == 0

    # Student reviews with 5 stars
    r1 = await client.post(
        f"/resources/{resource.id}/reviews",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"puntuacion": 5, "comentario": "Excelente material"},
    )
    assert r1.status_code == 200
    assert r1.json()["puntuacion"] == 5

    # Teacher reviews with 3 stars
    r2 = await client.post(
        f"/resources/{resource.id}/reviews",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={"puntuacion": 3, "comentario": "Contenido adecuado"},
    )
    assert r2.status_code == 200

    # Average should now be 4.0 ((5 + 3) / 2)
    summary = await client.get(f"/resources/{resource.id}/reviews")
    assert summary.status_code == 200
    assert summary.json()["promedio"] == 4.0
    assert summary.json()["total"] == 2

    # Student updates review to 4 stars -> (4 + 3) / 2 = 3.5
    r1_updated = await client.post(
        f"/resources/{resource.id}/reviews",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"puntuacion": 4, "comentario": "Muy buen material, corregido"},
    )
    assert r1_updated.status_code == 200
    assert r1_updated.json()["puntuacion"] == 4

    summary2 = await client.get(f"/resources/{resource.id}/reviews")
    assert summary2.json()["promedio"] == 3.5
    assert summary2.json()["total"] == 2

    # Student deletes review
    del_res = await client.delete(
        f"/resources/{resource.id}/reviews/me",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert del_res.status_code == 204

    # Only teacher review remains (3 stars) -> promedio 3.0
    summary3 = await client.get(f"/resources/{resource.id}/reviews")
    assert summary3.json()["promedio"] == 3.0
    assert summary3.json()["total"] == 1


async def test_resource_reports_flow_and_rbac(client: AsyncClient, db: AsyncSession) -> None:
    ids = await seed_reference_data(db)
    resource = await create_sample_resource(db, ids["teacher_id"], "Manual de Laboratorio")
    student_token = await login(client, "estudiante@fiq.uncp.edu.pe")
    admin_token = await login(client, "admin@fiq.uncp.edu.pe")

    # 1. Student creates an issue report
    created = await client.post(
        f"/resources/{resource.id}/reports",
        headers={"Authorization": f"Bearer {student_token}"},
        json={
            "motivo": "metadatos_incorrectos",
            "descripcion": "El autor no es el correcto en el catálogo.",
        },
    )
    assert created.status_code == 201
    report = created.json()
    report_id = report["id"]
    assert report["estado"] == "pendiente"
    assert report["motivo"] == "metadatos_incorrectos"

    # 2. Student cannot access pending reports (Admin only)
    forbidden = await client.get(
        "/resources/reports/pending",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert forbidden.status_code == 403

    # 3. Admin lists pending reports
    admin_list = await client.get(
        "/resources/reports/pending",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert admin_list.status_code == 200
    items = admin_list.json()
    assert len(items) >= 1
    assert any(it["id"] == report_id for it in items)

    # 4. Admin updates report resolution
    patch_res = await client.patch(
        f"/resources/reports/{report_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"estado": "resuelto", "resolucion": "Metadatos corregidos con éxito."},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["estado"] == "resuelto"
    assert patch_res.json()["resolucion"] == "Metadatos corregidos con éxito."

    # Verify no longer in pending
    empty_pending = await client.get(
        "/resources/reports/pending",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert not any(it["id"] == report_id for it in empty_pending.json())
