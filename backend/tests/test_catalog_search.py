from datetime import datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.resources.search import normalize, search_terms
from app.models.resource import Curso, Recurso
from tests.conftest import seed_reference_data

APPROVED, PENDING = 2, 1


async def seed_catalog(db: AsyncSession) -> None:
    ids = await seed_reference_data(db)
    db.add(Curso(id=2, nombre="Termodinamica", codigo="QUI202"))
    base = datetime(2026, 1, 1)
    rows = [
        # titulo, autores, doi, anio, tipo, curso, vistas, descargas, estado
        ("Balance de materia", "Perez J.", None, 2020, 1, 1, 50, 5, APPROVED),
        ("Equilibrio de fases", "Gomez A.", "10.1016/j.fluid.2024", 2024, 2, 2, 10, 40, APPROVED),
        ("Ciclos de potencia", "Perez J.; Rojas M.", None, 2022, 2, 2, 30, 1, APPROVED),
        ("Apuntes sin año", None, None, None, 1, None, 0, 0, APPROVED),
        ("Borrador pendiente de balance", "Perez J.", None, 2025, 1, 1, 99, 99, PENDING),
    ]
    for i, (titulo, autores, doi, anio, tipo, curso, vistas, descargas, estado) in enumerate(rows):
        db.add(
            Recurso(
                titulo=titulo,
                autores=autores,
                doi=doi,
                anio=anio,
                url_archivo=f"resources/{i}.pdf",
                archivo_size=1024,
                archivo_mime="application/pdf",
                tipo_recurso_id=tipo,
                curso_id=curso,
                subido_por=ids["teacher_id"],
                estado_id=estado,
                visualizaciones=vistas,
                descargas=descargas,
                created_at=base + timedelta(days=i),
            )
        )
    await db.commit()


def titles(response) -> list[str]:
    return [r["titulo"] for r in response.json()]


def test_normalize_strips_accents_and_case() -> None:
    assert normalize("Termodinámica ÑANDÚ") == "termodinamica nandu"
    assert search_terms("  balance   MATERIA ") == ["balance", "materia"]
    assert search_terms(None) == []


async def test_total_count_header_and_pagination(client: AsyncClient, db: AsyncSession) -> None:
    await seed_catalog(db)
    first = await client.get("/resources", params={"limit": 2})
    assert first.headers["x-total-count"] == "4"  # el pendiente no cuenta
    assert len(first.json()) == 2

    second = await client.get("/resources", params={"limit": 2, "skip": 2})
    assert second.headers["x-total-count"] == "4"
    assert set(titles(first)).isdisjoint(titles(second))
    assert len(titles(first) + titles(second)) == 4


async def test_search_matches_authors_doi_course_and_year(client: AsyncClient, db: AsyncSession) -> None:
    await seed_catalog(db)
    by_author = await client.get("/resources", params={"search": "perez"})
    assert sorted(titles(by_author)) == ["Balance de materia", "Ciclos de potencia"]

    by_doi = await client.get("/resources", params={"search": "10.1016"})
    assert titles(by_doi) == ["Equilibrio de fases"]

    by_course = await client.get("/resources", params={"search": "qui202"})
    assert sorted(titles(by_course)) == ["Ciclos de potencia", "Equilibrio de fases"]

    by_year = await client.get("/resources", params={"search": "2022"})
    assert titles(by_year) == ["Ciclos de potencia"]


async def test_every_term_must_match(client: AsyncClient, db: AsyncSession) -> None:
    await seed_catalog(db)
    response = await client.get("/resources", params={"search": "perez potencia"})
    assert titles(response) == ["Ciclos de potencia"]
    assert response.headers["x-total-count"] == "1"


async def test_like_wildcards_are_literal(client: AsyncClient, db: AsyncSession) -> None:
    await seed_catalog(db)
    response = await client.get("/resources", params={"search": "%"})
    assert response.json() == []


@pytest.mark.parametrize(
    ("sort", "expected_first"),
    [
        ("recent", "Apuntes sin año"),
        ("views", "Balance de materia"),
        ("downloads", "Equilibrio de fases"),
        ("title", "Apuntes sin año"),
        ("year", "Equilibrio de fases"),
    ],
)
async def test_server_side_sort(client: AsyncClient, db: AsyncSession, sort: str, expected_first: str) -> None:
    await seed_catalog(db)
    response = await client.get("/resources", params={"sort": sort})
    assert response.status_code == 200
    assert titles(response)[0] == expected_first
    if sort == "year":
        assert titles(response)[-1] == "Apuntes sin año"  # sin año al final


async def test_course_and_year_range_filters(client: AsyncClient, db: AsyncSession) -> None:
    await seed_catalog(db)
    by_course = await client.get("/resources", params={"curso_id": 2})
    assert sorted(titles(by_course)) == ["Ciclos de potencia", "Equilibrio de fases"]

    by_years = await client.get("/resources", params={"anio_desde": 2021, "anio_hasta": 2023})
    assert titles(by_years) == ["Ciclos de potencia"]


async def test_invalid_params_are_rejected(client: AsyncClient, db: AsyncSession) -> None:
    await seed_catalog(db)
    assert (await client.get("/resources", params={"limit": 500})).status_code == 422
    assert (await client.get("/resources", params={"sort": "random"})).status_code == 422
    assert (await client.get("/resources", params={"skip": -1})).status_code == 422


async def test_facets_count_alternatives(client: AsyncClient, db: AsyncSession) -> None:
    await seed_catalog(db)
    response = await client.get("/resources/facets", params={"tipo_recurso_id": 2})
    assert response.status_code == 200
    facets = response.json()
    assert facets["total"] == 2

    # La faceta de tipo ignora su propio filtro: muestra cuántos hay de cada tipo.
    tipos = {t["nombre"]: t["count"] for t in facets["tipos"]}
    assert tipos == {"Libro": 2, "Tesis": 2}

    # Las demás facetas sí respetan el tipo elegido.
    cursos = {c["nombre"]: c["count"] for c in facets["cursos"]}
    assert cursos == {"Termodinamica": 2}
    assert [y["anio"] for y in facets["anios"]] == [2024, 2022]


async def test_facets_follow_search(client: AsyncClient, db: AsyncSession) -> None:
    await seed_catalog(db)
    facets = (await client.get("/resources/facets", params={"search": "perez"})).json()
    assert facets["total"] == 2
    assert {c["nombre"]: c["count"] for c in facets["cursos"]} == {
        "Química General": 1,
        "Termodinamica": 1,
    }
