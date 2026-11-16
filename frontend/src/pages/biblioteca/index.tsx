import { useEffect, useMemo, useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { SlidersHorizontal } from "lucide-react"
import { SearchBar } from "@/components/library/search-bar"
import { ResourceFilters } from "@/components/library/resource-filters"
import { ResourceFacets } from "@/components/library/resource-facets"
import { ActiveFilters } from "@/components/library/active-filters"
import { activeFilters } from "@/lib/catalog"
import { CatalogPagination } from "@/components/library/catalog-pagination"
import { CatalogEmptyState } from "@/components/library/catalog-empty-state"
import { ResourceGrid } from "@/components/library/resource-grid"
import { ResourceDetail } from "@/components/library/resource-detail"
import { UploadDialog } from "@/components/library/upload-dialog"
import { ExternalCatalogPanel } from "@/components/library/external-catalog-panel"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { getCatalogFacets, searchCatalog } from "@/services/resources"
import type { Recurso } from "@/services/resources"
import { CATALOG_PAGE_SIZE, useCatalogParams, type CatalogParams } from "@/hooks/use-catalog-params"
import { useDebounce } from "@/hooks/use-debounce"
import { useResourceTypes } from "@/hooks/use-resource-data"
import { useAuthStore } from "@/stores/auth"
import { canUpload } from "@/lib/auth"
import { searchTerms } from "@/lib/highlight"

export default function Biblioteca() {
  const { params, update, setQuery, clearFilters, apiFilters, activeFilterCount } = useCatalogParams()
  const [selected, setSelected] = useState<Recurso | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [facetsOpen, setFacetsOpen] = useState(false)

  const { user } = useAuthStore()
  const userCanUpload = canUpload(user)
  const { data: tipos = [] } = useResourceTypes()

  // El input escribe en un borrador; la URL (y la consulta) se actualiza con debounce.
  const [draft, setDraft] = useState(params.q)
  const debouncedDraft = useDebounce(draft, 400)
  // Si la URL cambia desde fuera (atrás/adelante, "Borrar búsqueda"), el input la sigue.
  const [syncedQ, setSyncedQ] = useState(params.q)
  if (params.q !== syncedQ) {
    setSyncedQ(params.q)
    if (params.q !== debouncedDraft) setDraft(params.q)
  }
  useEffect(() => {
    setQuery(debouncedDraft.trim())
  }, [debouncedDraft, setQuery])

  const catalog = useQuery({
    queryKey: ["resources", "catalog", apiFilters, params.orden, params.pagina],
    queryFn: () =>
      searchCatalog({
        ...apiFilters,
        sort: params.orden,
        skip: (params.pagina - 1) * CATALOG_PAGE_SIZE,
        limit: CATALOG_PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })

  const facets = useQuery({
    queryKey: ["resources", "facets", apiFilters],
    queryFn: () => getCatalogFacets(apiFilters),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })

  const items = catalog.data?.items ?? []
  const total = catalog.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE))
  const firstShown = total === 0 ? 0 : (params.pagina - 1) * CATALOG_PAGE_SIZE + 1
  const lastShown = Math.min(params.pagina * CATALOG_PAGE_SIZE, total)
  const terms = useMemo(() => searchTerms(params.q), [params.q])
  const filters = activeFilters(params, facets.data)

  const changeFilters = (changes: Partial<CatalogParams>) => update(changes)
  const goToPage = (pagina: number) => {
    update({ pagina })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }
  const clearSearch = () => {
    setDraft("")
    setQuery("")
  }
  const handleSelect = (r: Recurso) => {
    setSelected(r)
    setDetailOpen(true)
  }

  const facetPanel = <ResourceFacets facets={facets.data} params={params} onChange={changeFilters} />

  return (
    <div className="animate-fade-in">
      <div className="sticky top-16 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur border-b border-gray-200 dark:border-zinc-800/80 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-brand-900 dark:text-brand-100 mb-3">Biblioteca Virtual</h1>
            <SearchBar value={draft} onChange={setDraft} placeholder="Título, autor, curso, DOI o año…" />
          </div>
          {userCanUpload && (
            <div className="pb-1">
              <UploadDialog />
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <p className="text-sm text-gray-500 dark:text-zinc-400" aria-live="polite">
            {catalog.isLoading
              ? "Buscando..."
              : total === 0
                ? "Sin resultados"
                : `Mostrando ${firstShown}–${lastShown} de ${total} recurso${total !== 1 ? "s" : ""}`}
            {catalog.isFetching && !catalog.isLoading && <span className="ml-2 text-xs text-gray-400">Actualizando…</span>}
          </p>
          <div className="flex items-center gap-3">
            <ResourceFilters sortBy={params.orden} onSortChange={(orden) => update({ orden })} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFacetsOpen(true)}
              className="lg:hidden cursor-pointer"
              aria-label={activeFilterCount ? `Filtros (${activeFilterCount} activos)` : "Filtros"}
            >
              <SlidersHorizontal className="h-4 w-4 mr-1" />
              Filtros
              {activeFilterCount > 0 && (
                <span className="ml-1.5 rounded-full bg-brand-500 px-1.5 text-[10px] font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        <div className="mb-4">
          <ActiveFilters filters={filters} onRemove={changeFilters} onClearAll={clearFilters} />
        </div>

        <Sheet open={facetsOpen} onOpenChange={setFacetsOpen}>
          <SheetContent side="left" className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-brand-700 dark:text-brand-300">Filtros</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-6">{facetPanel}</div>
          </SheetContent>
        </Sheet>

        <div className="flex gap-6">
          <aside className="hidden lg:block w-60 shrink-0" aria-label="Filtros">
            <div className="sticky top-56">{facetPanel}</div>
          </aside>

          <div className="flex-1 min-w-0">
            <ResourceGrid
              resources={items}
              isLoading={catalog.isLoading}
              onSelect={handleSelect}
              terms={terms}
              emptyState={
                total > 0 && params.pagina > 1 ? (
                  <div className="py-14 text-center text-sm text-gray-500 dark:text-zinc-400">
                    <p>Esta página ya no tiene resultados.</p>
                    <Button variant="outline" size="sm" className="mt-3 cursor-pointer" onClick={() => goToPage(1)}>
                      Ir a la primera página
                    </Button>
                  </div>
                ) : (
                  <CatalogEmptyState query={params.q} filters={filters} onRemove={changeFilters} onClearSearch={clearSearch} />
                )
              }
            />
            <CatalogPagination page={params.pagina} totalPages={totalPages} onChange={goToPage} />
            <ExternalCatalogPanel query={params.q} tipos={tipos} canImport={userCanUpload} />
          </div>
        </div>
      </div>

      <ResourceDetail resource={selected} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  )
}
