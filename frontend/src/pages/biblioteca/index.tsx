import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { SearchBar } from "@/components/library/search-bar"
import { ResourceFilters } from "@/components/library/resource-filters"
import { ResourceGrid } from "@/components/library/resource-grid"
import { ResourceDetail } from "@/components/library/resource-detail"
import { UploadDialog } from "@/components/library/upload-dialog"
import { getResources } from "@/services/resources"
import api from "@/services/api"
import { useDebounce } from "@/hooks/use-debounce"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/stores/auth"
import { SlidersHorizontal, X } from "lucide-react"
import type { Recurso } from "@/services/resources"

interface TipoRecurso {
  id: number
  nombre: string
}

export default function Biblioteca() {
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [sortBy, setSortBy] = useState("recent")
  const [selected, setSelected] = useState<Recurso | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [facetOpen, setFacetOpen] = useState(false)
  const [cursoFilter, setCursoFilter] = useState("all")

  const { user } = useAuthStore()
  const canUpload = user?.rol === "Admin" || user?.rol === "Docente"

  const debouncedSearch = useDebounce(search, 400)

  const { data: tipos = [] } = useQuery<TipoRecurso[]>({
    queryKey: ["resource-types"],
    queryFn: async () => {
      const { data } = await api.get("/resources/types")
      return data
    },
    staleTime: 1000 * 60 * 10,
  })

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ["resources", debouncedSearch, typeFilter],
    queryFn: () =>
      getResources({
        search: debouncedSearch || undefined,
        tipo_recurso_id: typeFilter !== "all" ? Number(typeFilter) : undefined,
      }),
  })

  const cursos = [...new Set(resources.map((r) => r.curso_nombre).filter((c): c is string => c !== null))]

  const filtered = resources
    .filter((r) => {
      if (typeFilter !== "all" && r.tipo_recurso_id !== Number(typeFilter)) return false
      if (cursoFilter !== "all" && r.curso_nombre !== cursoFilter) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === "views") return b.visualizaciones - a.visualizaciones
      if (sortBy === "downloads") return b.descargas - a.descargas
      if (sortBy === "title") return a.titulo.localeCompare(b.titulo)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const handleSelect = (r: Recurso) => {
    setSelected(r)
    setDetailOpen(true)
  }

  return (
    <div className="animate-fade-in">
      <div className="sticky top-16 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur border-b border-gray-200 dark:border-zinc-800/80 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-brand-900 dark:text-brand-100 mb-3">Biblioteca Virtual</h1>
            <SearchBar value={search} onChange={setSearch} placeholder="Buscar por título, materia, autor..." />
          </div>
          {canUpload && (
            <div className="pb-1">
              <UploadDialog />
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            {isLoading ? "Buscando..." : `${filtered.length} recurso${filtered.length !== 1 ? "s" : ""} encontrado${filtered.length !== 1 ? "s" : ""}`}
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
        </div>

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
            <ResourceGrid
              resources={filtered}
              isLoading={isLoading}
              onSelect={handleSelect}
            />
          </div>
        </div>
      </div>

      <ResourceDetail
        resource={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
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
  cursos: string[]
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
              key={curso}
              onClick={() => onCursoChange(curso)}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors cursor-pointer ${
                cursoFilter === curso
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-950/20 dark:text-brand-300 font-medium"
                  : "text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-900/40"
              }`}
            >
              {curso}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
