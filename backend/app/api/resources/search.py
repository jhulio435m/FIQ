"""Búsqueda del catálogo: filtros, orden estable, paginación y facetas en el servidor.

La búsqueda divide el texto en términos y exige que cada término aparezca en
alguno de los campos (título, resumen, autores, editorial, DOI, año, curso).
Se ignoran mayúsculas y tildes: "termodinamica" encuentra "Termodinámica".
"""

import unicodedata
from dataclasses import dataclass, field
from typing import Literal

from sqlalchemy import String, and_, cast, func, or_
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.sql.functions import FunctionElement
from sqlmodel import select
from sqlmodel.sql.expression import Select

from app.models.resource import Curso, Recurso

SortOption = Literal["recent", "views", "downloads", "title", "year"]

_MAX_TERMS = 8
_ACCENTED = "áàäâãéèëêíìïîóòöôõúùüûñç"
_PLAIN = "aaaaaeeeeiiiiooooouuuunc"


class fold(FunctionElement):
    """lower() + quitar tildes, compilado según el motor de base de datos."""

    type = String()
    inherit_cache = True


@compiles(fold, "postgresql")
def _fold_postgresql(element, compiler, **kw) -> str:
    arg = compiler.process(element.clauses, **kw)
    return f"translate(lower({arg}), '{_ACCENTED}', '{_PLAIN}')"


@compiles(fold)
def _fold_default(element, compiler, **kw) -> str:
    # SQLite (tests) no tiene translate(); lower() basta para términos ASCII.
    return f"lower({compiler.process(element.clauses, **kw)})"


def normalize(text: str) -> str:
    decomposed = unicodedata.normalize("NFKD", text.lower())
    return "".join(ch for ch in decomposed if not unicodedata.combining(ch))


def search_terms(search: str | None) -> list[str]:
    if not search:
        return []
    terms = [term for term in normalize(search).split() if term]
    return terms[:_MAX_TERMS]


def _escape_like(term: str) -> str:
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


_SEARCHABLE = (
    Recurso.titulo,
    Recurso.resumen,
    Recurso.autores,
    Recurso.editorial,
    Recurso.doi,
    cast(Recurso.anio, String),
    Curso.nombre,
    Curso.codigo,
)


@dataclass
class CatalogFilters:
    estado_id: int
    terms: list[str] = field(default_factory=list)
    tipo_recurso_id: int | None = None
    curso_id: int | None = None
    anio_desde: int | None = None
    anio_hasta: int | None = None

    def conditions(self, *, exclude: frozenset[str] = frozenset()) -> list:
        """Condiciones WHERE. `exclude` omite filtros de una faceta para que sus
        conteos muestren las alternativas disponibles, no solo la elegida."""
        conds: list = [Recurso.estado_id == self.estado_id]
        for term in self.terms:
            pattern = f"%{_escape_like(term)}%"
            conds.append(or_(*(fold(func.coalesce(col, "")).like(pattern, escape="\\") for col in _SEARCHABLE)))
        if self.tipo_recurso_id is not None and "tipo" not in exclude:
            conds.append(Recurso.tipo_recurso_id == self.tipo_recurso_id)
        if self.curso_id is not None and "curso" not in exclude:
            conds.append(Recurso.curso_id == self.curso_id)
        if "anio" not in exclude:
            if self.anio_desde is not None:
                conds.append(Recurso.anio >= self.anio_desde)
            if self.anio_hasta is not None:
                conds.append(Recurso.anio <= self.anio_hasta)
        return conds


def _with_course(query: Select) -> Select:
    return query.outerjoin(Curso, Curso.id == Recurso.curso_id)


def catalog_query(filters: CatalogFilters, sort: SortOption) -> Select:
    query = _with_course(select(Recurso)).where(and_(*filters.conditions()))
    # Recurso.id como desempate: el orden es estable entre páginas.
    order = {
        "recent": (Recurso.created_at.desc(), Recurso.id.desc()),
        "views": (Recurso.visualizaciones.desc(), Recurso.id.desc()),
        "downloads": (Recurso.descargas.desc(), Recurso.id.desc()),
        "title": (func.lower(Recurso.titulo).asc(), Recurso.id.asc()),
        "year": (Recurso.anio.is_(None), Recurso.anio.desc(), Recurso.id.desc()),
    }[sort]
    return query.order_by(*order)


def count_query(filters: CatalogFilters) -> Select:
    return _with_course(select(func.count(Recurso.id))).where(and_(*filters.conditions()))


def facet_query(filters: CatalogFilters, column, facet: str) -> Select:
    return (
        _with_course(select(column, func.count(Recurso.id)))
        .where(and_(*filters.conditions(exclude=frozenset({facet}))))
        .group_by(column)
    )
