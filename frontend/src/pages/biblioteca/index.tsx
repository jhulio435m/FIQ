import { useState } from "react"
import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router"
import { SearchBar } from "@/components/library/search-bar"
import { ResourceFilters } from "@/components/library/resource-filters"
import { ResourceGrid } from "@/components/library/resource-grid"
import { ResourceDetail } from "@/components/library/resource-detail"
import { UploadDialog } from "@/components/library/upload-dialog"
import { ExternalCatalogPanel } from "@/components/library/external-catalog-panel"
import { getResource, getResourceCatalog } from "@/services/resources"
import { useDebounce } from "@/hooks/use-debounce"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/stores/auth"
import { SlidersHorizontal, X } from "lucide-react"
import type { CatalogSort, Curso, Recurso, TipoRecurso } from "@/services/resources"
import { useCourses, useResourceTypes } from "@/hooks/use-resource-data"
import { canUpload } from "@/lib/auth"



export default function Biblioteca() {
  const navigate = useNavigate()
  const { resourceId } = useParams()
  const parsedResourceId = resourceId ? Number(resourceId) : null
  const hasValidResourceId = parsedResourceId !== null && Number.isSafeInteger(parsedResourceId) && parsedResourceId > 0
  const [searchScope, setSearchScope] = useState<"local" | "external">("local")
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [sortBy, setSortBy] = useState<CatalogSort>("recent")
  const [selected, setSelected] = useState<Recurso | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [facetOpen, setFacetOpen] = useState(false)
  const [cursoFilter, setCursoFilter] = useState("all")

  const { user } = useAuthStore()
  const userCanUpload = canUpload(user)

  const debouncedSearch = useDebounce(search, 400)

  const { data: tipos = [] } = useResourceTypes()
  const { data: cursos = [] } = useCourses()

  const pageSize = 20
  const resourcesQuery = useInfiniteQuery({
    queryKey: ["resource-catalog", debouncedSearch, typeFilter, cursoFilter, sortBy],
    queryFn: ({ pageParam }) =>
      getResourceCatalog({
        search: debouncedSearch || undefined,
        tipo_recurso_id: typeFilter !== "all" ? Number(typeFilter) : undefined,
        curso_id: cursoFilter !== "all" ? Number(cursoFilter) : undefined,
        sort: sortBy,
        skip: pageParam,
        limit: pageSize,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.skip + lastPage.items.length : undefined,
    enabled: searchScope === "local",
  })

  const resourceQuery = useQuery({
    queryKey: ["resource", parsedResourceId],
    queryFn: () => getResource(parsedResourceId as number),
    enabled: hasValidResourceId,
  })

  const resources = resourcesQuery.data?.pages.flatMap((page) => page.items) ?? []
  const totalResources = resourcesQuery.data?.pages[0]?.total ?? 0
  const displayedResource = resourceQuery.data ?? selected
  const isDetailOpen = detailOpen || (hasValidResourceId && Boolean(resourceQuery.data))

  const handleSelect = (r: Recurso) => {
    setSelected(r)
    setDetailOpen(true)
    void navigate(`/biblioteca/recurso/${r.id}`)
  }

  const handleDetailOpenChange = (nextOpen: boolean) => {
    setDetailOpen(nextOpen)
    if (!nextOpen && resourceId) {
      void navigate("/biblioteca")
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="sticky top-16 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur border-b border-gray-200 dark:border-zinc-800/80 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-brand-900 dark:text-brand-100 mb-3">Biblioteca Virtual</h1>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="inline-flex w-fit rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-zinc-800 dark:bg-zinc-900" aria-label="Origen de búsqueda">
                <Button
                  type="button"
                  size="sm"
                  variant={searchScope === "local" ? "default" : "ghost"}
                  aria-pressed={searchScope === "local"}
                  onClick={() => setSearchScope("local")}
                >
                  Biblioteca local
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={searchScope === "external" ? "default" : "ghost"}
                  aria-pressed={searchScope === "external"}
                  onClick={() => setSearchScope("external")}
                >
                  APIs académicas
                </Button>
              </div>
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder={searchScope === "local"
                  ? "Buscar por título, resumen, autor, curso o DOI..."
                  : "Buscar libros, artículos o un DOI..."}
              />
            </div>
          </div>
          {userCanUpload && (
            <div className="pb-1">
              <UploadDialog />
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {resourceId && (!hasValidResourceId || resourceQuery.isError) && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
            El recurso solicitado no existe o todavía no está aprobado.
          </div>
        )}
        {searchScope === "local" && <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            {resourcesQuery.isLoading
              ? "Buscando..."
              : `${totalResources} resultado${totalResources !== 1 ? "s" : ""}${resources.length < totalResources ? ` · ${resources.length} cargados` : ""}`}
          </p>
          <div className="flex items-center gap-3">
            <ResourceFilters
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFacetOpen(!facetOpen)}
              className="lg:hidden cursor-pointer"
            >
              <SlidersHorizontal className="h-4 w-4 mr-1" />
              Filtros
            </Button>
          </div>
        </div>}

        {searchScope === "local" ? (
        <div className="flex gap-6">
          {facetOpen && (
            <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setFacetOpen(false)}>
              <div className="absolute inset-0 bg-black/20" />
              <div className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-zinc-950 dark:border-r dark:border-zinc-800 shadow-xl p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-brand-700 dark:text-brand-300">Filtros</h3>
                  <Button variant="ghost" size="sm" onClick={() => setFacetOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <FacetPanel
                  tipos={tipos}
                  typeFilter={typeFilter}
                  onTypeChange={setTypeFilter}
                  cursos={cursos}
                  cursoFilter={cursoFilter}
                  onCursoChange={setCursoFilter}
                />
              </div>
            </div>
          )}

          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-56 space-y-6">
              <FacetPanel
                tipos={tipos}
                typeFilter={typeFilter}
                onTypeChange={setTypeFilter}
                cursos={cursos}
                cursoFilter={cursoFilter}
                onCursoChange={setCursoFilter}
              />
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {resourcesQuery.isError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                No se pudo consultar la biblioteca local. Vuelve a intentarlo.
              </div>
            ) : (
              <ResourceGrid
                resources={resources}
                isLoading={resourcesQuery.isLoading}
                onSelect={handleSelect}
              />
            )}
            {resourcesQuery.hasNextPage && (
              <div className="mt-6 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void resourcesQuery.fetchNextPage()}
                  disabled={resourcesQuery.isFetchingNextPage}
                >
                  {resourcesQuery.isFetchingNextPage ? "Cargando..." : "Cargar más recursos"}
                </Button>
              </div>
            )}
          </div>
        </div>
        ) : (
          <ExternalCatalogPanel query={debouncedSearch} tipos={tipos} canImport={userCanUpload} />
        )}
      </div>

      <ResourceDetail
        key={displayedResource?.id ?? "no-resource"}
        resource={displayedResource}
        open={isDetailOpen}
        onOpenChange={handleDetailOpenChange}
      />
    </div>
  )
}

function FacetPanel({
  tipos,
  typeFilter,
  onTypeChange,
  cursos,
  cursoFilter,
  onCursoChange,
}: {
  tipos: TipoRecurso[]
  typeFilter: string
  onTypeChange: (v: string) => void
  cursos: Curso[]
  cursoFilter: string
  onCursoChange: (v: string) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-brand-700 dark:text-brand-300 uppercase tracking-wider mb-3">
          Tipo de Recurso
        </h3>
        <div className="space-y-1">
          <button
            key="all-types"
            onClick={() => onTypeChange("all")}
            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors cursor-pointer ${
              typeFilter === "all"
                ? "bg-brand-50 text-brand-700 dark:bg-brand-950/20 dark:text-brand-300 font-medium"
                : "text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-900/40"
            }`}
          >
            Todos
          </button>
          {tipos.map((t) => (
            <button
              key={t.id}
              onClick={() => onTypeChange(String(t.id))}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors cursor-pointer ${
                typeFilter === String(t.id)
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-950/20 dark:text-brand-300 font-medium"
                  : "text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-900/40"
              }`}
            >
              {t.nombre}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-brand-700 dark:text-brand-300 uppercase tracking-wider mb-3">
          Por Curso
        </h3>
        <div className="space-y-1">
          <button
            key="all-courses"
            onClick={() => onCursoChange("all")}
            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors cursor-pointer ${
              cursoFilter === "all"
                ? "bg-brand-50 text-brand-700 dark:bg-brand-950/20 dark:text-brand-300 font-medium"
                : "text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-900/40"
            }`}
          >
            Todos los cursos
          </button>
          {cursos.map((curso) => (
            <button
              key={curso.id}
              onClick={() => onCursoChange(String(curso.id))}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors cursor-pointer ${
                cursoFilter === String(curso.id)
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-950/20 dark:text-brand-300 font-medium"
                  : "text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-900/40"
              }`}
            >
              {curso.nombre}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
