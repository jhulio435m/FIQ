import { SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ActiveFilter } from "@/lib/catalog"
import type { CatalogParams } from "@/hooks/use-catalog-params"

interface Props {
  query: string
  filters: ActiveFilter[]
  onRemove: (clear: Partial<CatalogParams>) => void
  onClearSearch: () => void
}

export function CatalogEmptyState({ query, filters, onRemove, onClearSearch }: Props) {
  const hasQuery = query.trim().length > 0
  return (
    <div className="rounded-xl border border-dashed border-gray-200 px-6 py-14 text-center dark:border-zinc-800">
      <SearchX className="mx-auto h-10 w-10 text-gray-300 dark:text-zinc-600" aria-hidden />
      <p className="mt-4 text-base font-medium text-gray-700 dark:text-zinc-200">
        {hasQuery ? <>No encontramos recursos para «{query.trim()}»</> : "No se encontraron recursos"}
      </p>
      <p className="mx-auto mt-1 max-w-md text-sm text-gray-500 dark:text-zinc-400">
        {filters.length > 0
          ? "Prueba quitando alguno de estos filtros:"
          : hasQuery
            ? "Revisa la ortografía o usa términos más generales, como el curso o el autor."
            : "Todavía no hay recursos publicados."}
      </p>
      {(filters.length > 0 || hasQuery) && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {filters.map((filter) => (
            <Button key={filter.key} variant="outline" size="sm" onClick={() => onRemove(filter.clear)} className="cursor-pointer">
              Quitar «{filter.label}»
            </Button>
          ))}
          {hasQuery && (
            <Button variant="outline" size="sm" onClick={onClearSearch} className="cursor-pointer">
              Borrar búsqueda
            </Button>
          )}
        </div>
      )}
      {hasQuery && (
        <p className="mt-4 text-xs text-gray-400 dark:text-zinc-500">
          Más abajo puedes buscar también en catálogos académicos externos.
        </p>
      )}
    </div>
  )
}
