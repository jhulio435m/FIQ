import { ResourceCard } from "./resource-card"
import { Skeleton } from "@/components/ui/skeleton"
import type { Recurso } from "@/services/resources"

interface ResourceGridProps {
  resources: Recurso[]
  isLoading: boolean
  onSelect: (r: Recurso) => void
}

export function ResourceGrid({ resources, isLoading, onSelect }: ResourceGridProps) {
  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-5 border rounded-xl space-y-3">
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
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg">No se encontraron recursos</p>
        <p className="text-sm mt-1">Intenta con otros términos de búsqueda</p>
      </div>
    )
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {resources.map((r) => (
        <ResourceCard key={r.id} resource={r} onClick={() => onSelect(r)} />
      ))}
    </div>
  )
}
