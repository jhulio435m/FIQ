import type { CatalogFacets } from "@/services/resources"
import type { CatalogParams } from "@/hooks/use-catalog-params"

export interface ActiveFilter {
  key: string
  label: string
  clear: Partial<CatalogParams>
}

export function activeFilters(params: CatalogParams, facets: CatalogFacets | undefined): ActiveFilter[] {
  const filters: ActiveFilter[] = []
  if (params.tipo !== null) {
    const nombre = facets?.tipos.find((t) => t.id === params.tipo)?.nombre ?? "Tipo"
    filters.push({ key: "tipo", label: nombre, clear: { tipo: null } })
  }
  if (params.curso !== null) {
    const nombre = facets?.cursos.find((c) => c.id === params.curso)?.nombre ?? "Curso"
    filters.push({ key: "curso", label: nombre, clear: { curso: null } })
  }
  if (params.desde !== null || params.hasta !== null) {
    const label =
      params.desde !== null && params.hasta !== null
        ? `${params.desde}–${params.hasta}`
        : params.desde !== null
          ? `Desde ${params.desde}`
          : `Hasta ${params.hasta}`
    filters.push({ key: "anio", label, clear: { desde: null, hasta: null } })
  }
  return filters
}

/** Páginas a mostrar: primera, última y vecinas de la actual, con huecos ("…"). */
export function pageWindow(current: number, totalPages: number): (number | "gap")[] {
  const pages = new Set([1, totalPages, current - 1, current, current + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)
  const result: (number | "gap")[] = []
  sorted.forEach((page, i) => {
    if (i > 0 && page - sorted[i - 1] > 1) result.push("gap")
    result.push(page)
  })
  return result
}
