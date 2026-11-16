import type { ReactNode } from "react"
import { ResourceCard } from "./resource-card"
import { Skeleton } from "@/components/ui/skeleton"
import type { Recurso } from "@/services/resources"

interface ResourceGridProps {
  resources: Recurso[]
  isLoading: boolean
  onSelect: (r: Recurso) => void
  terms?: string[]
  /** Contenido a mostrar cuando no hay resultados. */
  emptyState?: ReactNode
}

export function ResourceGrid({ resources, isLoading, onSelect, terms = [], emptyState }: ResourceGridProps) {
  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 gap-4" aria-busy="true" aria-label="Cargando recursos">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-5 border rounded-xl space-y-3 dark:border-zinc-800">
            <div className="flex gap-4">
              <Skeleton className="w-12 h-12 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (resources.length === 0) {
    return (
      emptyState ?? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No se encontraron recursos</p>
          <p className="text-sm mt-1">Intenta con otros términos de búsqueda</p>
        </div>
      )
    )
  }

  return (
    <ul className="grid md:grid-cols-2 gap-4">
      {resources.map((r) => (
        <li key={r.id}>
          <ResourceCard resource={r} onClick={() => onSelect(r)} terms={terms} />
        </li>
      ))}
    </ul>
  )
}
