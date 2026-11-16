import { X } from "lucide-react"
import type { CatalogParams } from "@/hooks/use-catalog-params"
import type { ActiveFilter } from "@/lib/catalog"

interface Props {
  filters: ActiveFilter[]
  onRemove: (clear: Partial<CatalogParams>) => void
  onClearAll: () => void
}

export function ActiveFilters({ filters, onRemove, onClearAll }: Props) {
  if (filters.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Filtros activos">
      {filters.map((filter) => (
        <button
          key={filter.key}
          type="button"
          onClick={() => onRemove(filter.clear)}
          className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-brand-200 bg-brand-50 py-0.5 pl-2.5 pr-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 dark:border-brand-900 dark:bg-brand-950/30 dark:text-brand-300"
          aria-label={`Quitar filtro ${filter.label}`}
        >
          {filter.label}
          <X className="h-3 w-3" aria-hidden />
        </button>
      ))}
      {filters.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="cursor-pointer text-xs font-medium text-gray-500 hover:text-brand-600 hover:underline dark:text-zinc-400"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  )
}
