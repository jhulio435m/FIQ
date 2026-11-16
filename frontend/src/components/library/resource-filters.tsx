import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { CatalogSort } from "@/services/resources"

const SORT_LABELS: Record<CatalogSort, string> = {
  recent: "Más recientes",
  views: "Más vistos",
  downloads: "Más descargados",
  year: "Año de publicación",
  title: "Título (A-Z)",
}

interface ResourceFiltersProps {
  sortBy: CatalogSort
  onSortChange: (v: CatalogSort) => void
}

export function ResourceFilters({ sortBy, onSortChange }: ResourceFiltersProps) {
  return (
    <Select value={sortBy} onValueChange={(v: string | null) => v && onSortChange(v as CatalogSort)}>
      <SelectTrigger className="w-[190px]" aria-label="Ordenar resultados">
        <SelectValue placeholder="Ordenar por">{SORT_LABELS[sortBy]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(SORT_LABELS) as CatalogSort[]).map((sort) => (
          <SelectItem key={sort} value={sort}>
            {SORT_LABELS[sort]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
