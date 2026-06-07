import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ResourceFiltersProps {
  sortBy: string
  onSortChange: (v: string) => void
}

export function ResourceFilters({ sortBy, onSortChange }: ResourceFiltersProps) {
  return (
    <Select value={sortBy} onValueChange={(v: string | null) => v && onSortChange(v)}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Ordenar por" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="recent">Más recientes</SelectItem>
        <SelectItem value="views">Más vistos</SelectItem>
        <SelectItem value="downloads">Más descargados</SelectItem>
        <SelectItem value="title">A-Z</SelectItem>
      </SelectContent>
    </Select>
  )
}
