import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertCircle, BookOpen, ExternalLink, FileSearch, Loader2, Plus, RefreshCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  importExternalResource,
  searchExternalArticles,
  searchExternalBooks,
  type ExternalWork,
} from "@/services/external-catalog"
import { toast } from "sonner"

import type { TipoRecurso } from "@/services/resources"

interface ExternalCatalogPanelProps {
  query: string
  tipos: TipoRecurso[]
  canImport: boolean
}

type ExternalMode = "books" | "articles"

const providerNames: Record<string, string> = {
  open_library: "Open Library",
  internet_archive: "Internet Archive",
  crossref: "Crossref",
  openalex: "OpenAlex",
  unpaywall: "Unpaywall",
}

function findTypeId(tipos: TipoRecurso[], work: ExternalWork) {
  const normalized = work.resource_type.includes("book") ? "libro" : "tesis"
  const preferred = tipos.find((tipo) => tipo.nombre.toLowerCase().includes(normalized))
  return preferred?.id ?? tipos[0]?.id ?? 1
}

function workSummary(work: ExternalWork) {
  const parts = [
    work.authors.length > 0 ? work.authors.slice(0, 3).join(", ") : null,
    work.publisher,
    work.published_year ? String(work.published_year) : null,
  ].filter((part): part is string => Boolean(part))
  return parts.join(" · ")
}

export function ExternalCatalogPanel({ query, tipos, canImport }: ExternalCatalogPanelProps) {
  const [mode, setMode] = useState<ExternalMode>("books")
  const queryClient = useQueryClient()
  const cleanQuery = query.trim()
  const isEnabled = cleanQuery.length >= 3

  const searchQuery = useQuery({
    queryKey: ["external-catalog", mode, cleanQuery],
    enabled: isEnabled,
    queryFn: () =>
      mode === "books"
        ? searchExternalBooks({ q: cleanQuery, limit: 6 })
        : searchExternalArticles({ q: cleanQuery, limit: 6 }),
    staleTime: 1000 * 60 * 15,
  })

  const importMutation = useMutation({
    mutationFn: (work: ExternalWork) =>
      importExternalResource({
        source: work.source,
        external_id: work.external_id,
        titulo: work.title,
        tipo_recurso_id: findTypeId(tipos, work),
        resumen: work.summary,
        autores: work.authors.join(", ") || null,
        editorial: work.publisher,
        doi: work.doi ?? work.isbn,
        anio: work.published_year,
        external_url: work.external_url,
        open_access_url: work.open_access_url,
        cover_url: work.cover_url,
      }),
    onSuccess: (resource) => {
      toast.success("Recurso externo importado para revisión")
      queryClient.invalidateQueries({ queryKey: ["resources"] })
      queryClient.invalidateQueries({ queryKey: ["external-catalog"] })
      queryClient.invalidateQueries({ queryKey: ["pending-resources"] })
      void resource
    },
    onError: (error: unknown) => {
      const response = typeof error === "object" && error !== null && "response" in error
        ? (error as { response?: { data?: { detail?: string } } }).response
        : undefined
      toast.error(response?.data?.detail ?? "No se pudo importar el recurso externo")
    },
  })

  const results = searchQuery.data?.results ?? []
  const warnings = useMemo(() => searchQuery.data?.warnings ?? [], [searchQuery.data?.warnings])

  return (
    <section className="mt-8 border-t border-gray-200 pt-6" aria-labelledby="external-catalog-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="external-catalog-title" className="text-lg font-semibold text-brand-900">
            Fuentes externas
          </h2>
          <p className="text-sm text-gray-500">
            Consulta catálogos abiertos y bases académicas antes de registrar nuevos recursos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={mode === "books" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("books")}
          >
            <BookOpen className="h-4 w-4" />
            Libros
          </Button>
          <Button
            type="button"
            variant={mode === "articles" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("articles")}
          >
            <FileSearch className="h-4 w-4" />
            Artículos
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => searchQuery.refetch()}
            disabled={!isEnabled || searchQuery.isFetching}
            aria-label="Refrescar fuentes externas"
          >
            {searchQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {!isEnabled && (
        <div className="mt-4 rounded-lg border border-dashed border-gray-200 p-5 text-sm text-gray-500">
          Escribe al menos 3 caracteres en la búsqueda para consultar fuentes externas.
        </div>
      )}

      {searchQuery.isError && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          No se pudo consultar el catálogo externo. Intenta nuevamente.
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {warnings.join(" ")}
        </div>
      )}

      {searchQuery.isLoading && isEnabled && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="h-32 animate-pulse bg-gray-50" />
          ))}
        </div>
      )}

      {!searchQuery.isLoading && isEnabled && results.length === 0 && !searchQuery.isError && (
        <div className="mt-4 rounded-lg border border-gray-200 p-5 text-sm text-gray-500">
          No hay resultados externos para esta búsqueda.
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {results.map((work) => (
            <Card key={`${work.source}-${work.external_id}`} className="p-4">
              <div className="flex gap-3">
                {work.cover_url ? (
                  <img
                    src={work.cover_url}
                    alt=""
                    className="h-20 w-14 shrink-0 rounded border border-gray-200 object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded border border-gray-200 bg-gray-50 text-gray-400">
                    <BookOpen className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{providerNames[work.source] ?? work.source}</Badge>
                    {work.open_access_url && <Badge className="bg-green-100 text-green-700">Acceso abierto</Badge>}
                  </div>
                  <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-gray-900">{work.title}</h3>
                  {workSummary(work) && <p className="mt-1 text-xs text-gray-500">{workSummary(work)}</p>}
                  {(work.doi || work.isbn) && (
                    <p className="mt-1 truncate text-xs text-gray-400">{work.doi ? `DOI: ${work.doi}` : `ISBN: ${work.isbn}`}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(work.open_access_url || work.external_url) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        render={
                          <a href={work.open_access_url ?? work.external_url ?? "#"} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4" />
                            Ver fuente
                          </a>
                        }
                      />
                    )}
                    {canImport && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => importMutation.mutate(work)}
                        disabled={importMutation.isPending}
                      >
                        {importMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Importar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
