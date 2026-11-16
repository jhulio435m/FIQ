import { useCallback, useMemo } from "react"
import { useSearchParams } from "react-router"
import type { CatalogSort, SearchParams } from "@/services/resources"

export const CATALOG_PAGE_SIZE = 24

const SORTS: readonly CatalogSort[] = ["recent", "views", "downloads", "title", "year"]

/** Estado de la búsqueda guardado en la URL: se puede compartir, recargar y usar "atrás". */
export interface CatalogParams {
  q: string
  tipo: number | null
  curso: number | null
  desde: number | null
  hasta: number | null
  orden: CatalogSort
  pagina: number
}

type CatalogUpdate = Partial<CatalogParams>

const KEYS: Record<keyof CatalogParams, string> = {
  q: "q",
  tipo: "tipo",
  curso: "curso",
  desde: "desde",
  hasta: "hasta",
  orden: "orden",
  pagina: "pagina",
}

function positiveInt(value: string | null): number | null {
  if (!value) return null
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : null
}

export function useCatalogParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const params = useMemo<CatalogParams>(() => {
    const orden = searchParams.get(KEYS.orden)
    return {
      q: searchParams.get(KEYS.q) ?? "",
      tipo: positiveInt(searchParams.get(KEYS.tipo)),
      curso: positiveInt(searchParams.get(KEYS.curso)),
      desde: positiveInt(searchParams.get(KEYS.desde)),
      hasta: positiveInt(searchParams.get(KEYS.hasta)),
      orden: SORTS.includes(orden as CatalogSort) ? (orden as CatalogSort) : "recent",
      pagina: positiveInt(searchParams.get(KEYS.pagina)) ?? 1,
    }
  }, [searchParams])

  const update = useCallback(
    (changes: CatalogUpdate, { replace = false }: { replace?: boolean } = {}) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          for (const [field, value] of Object.entries(changes) as [keyof CatalogParams, CatalogParams[keyof CatalogParams]][]) {
            const key = KEYS[field]
            const isDefault =
              value === null || value === "" || (field === "orden" && value === "recent") || (field === "pagina" && value === 1)
            if (isDefault) next.delete(key)
            else next.set(key, String(value))
          }
          // Cualquier cambio de búsqueda u orden vuelve a la primera página.
          if (!("pagina" in changes)) next.delete(KEYS.pagina)
          return next
        },
        { replace },
      )
    },
    [setSearchParams],
  )

  /** Sincroniza el texto de búsqueda (debounced) sin crear entradas de historial. */
  const setQuery = useCallback(
    (q: string) => {
      setSearchParams(
        (current) => {
          if ((current.get(KEYS.q) ?? "") === q) return current
          const next = new URLSearchParams(current)
          if (q) next.set(KEYS.q, q)
          else next.delete(KEYS.q)
          next.delete(KEYS.pagina)
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const clearFilters = useCallback(() => {
    update({ tipo: null, curso: null, desde: null, hasta: null })
  }, [update])

  const apiFilters = useMemo<Omit<SearchParams, "sort" | "skip" | "limit">>(
    () => ({
      search: params.q.trim() || undefined,
      tipo_recurso_id: params.tipo ?? undefined,
      curso_id: params.curso ?? undefined,
      anio_desde: params.desde ?? undefined,
      anio_hasta: params.hasta ?? undefined,
    }),
    [params],
  )

  const activeFilterCount = [params.tipo, params.curso, params.desde, params.hasta].filter((v) => v !== null).length

  return { params, update, setQuery, clearFilters, apiFilters, activeFilterCount }
}
