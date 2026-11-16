import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { CatalogFacets, FacetCount } from "@/services/resources"
import type { CatalogParams } from "@/hooks/use-catalog-params"
import { cn } from "@/lib/utils"

const VISIBLE_COURSES = 8

interface Props {
  facets: CatalogFacets | undefined
  params: CatalogParams
  onChange: (changes: Partial<CatalogParams>) => void
}

export function ResourceFacets({ facets, params, onChange }: Props) {
  const [showAllCourses, setShowAllCourses] = useState(false)
  const cursos = facets?.cursos ?? []
  const visibleCursos = showAllCourses ? cursos : cursos.slice(0, VISIBLE_COURSES)
  const years = facets?.anios ?? []

  return (
    <div className="space-y-6">
      <FacetGroup
        title="Tipo de recurso"
        allLabel="Todos los tipos"
        items={(facets?.tipos ?? []).filter((t) => t.count > 0 || t.id === params.tipo)}
        selected={params.tipo}
        onSelect={(tipo) => onChange({ tipo })}
      />

      <FacetGroup
        title="Curso"
        allLabel="Todos los cursos"
        items={visibleCursos}
        selected={params.curso}
        onSelect={(curso) => onChange({ curso })}
        emptyText="Ningún resultado tiene curso asignado"
      >
        {cursos.length > VISIBLE_COURSES && (
          <button
            type="button"
            onClick={() => setShowAllCourses((v) => !v)}
            className="mt-1 px-3 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            {showAllCourses ? "Ver menos" : `Ver los ${cursos.length} cursos`}
          </button>
        )}
      </FacetGroup>

      {years.length > 0 && (
        <section aria-labelledby="facet-anio">
          <h3 id="facet-anio" className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">
            Año de publicación
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <YearSelect
              label="Desde"
              value={params.desde}
              years={years.map((y) => y.anio)}
              onChange={(desde) => onChange({ desde })}
            />
            <YearSelect
              label="Hasta"
              value={params.hasta}
              years={years.map((y) => y.anio)}
              onChange={(hasta) => onChange({ hasta })}
            />
          </div>
        </section>
      )}
    </div>
  )
}

function FacetGroup({
  title,
  allLabel,
  items,
  selected,
  onSelect,
  emptyText,
  children,
}: {
  title: string
  allLabel: string
  items: FacetCount[]
  selected: number | null
  onSelect: (id: number | null) => void
  emptyText?: string
  children?: React.ReactNode
}) {
  const id = `facet-${title.toLowerCase().replace(/\s+/g, "-")}`
  return (
    <section aria-labelledby={id}>
      <h3 id={id} className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">
        {title}
      </h3>
      <ul className="space-y-0.5">
        <li>
          <FacetButton label={allLabel} active={selected === null} onClick={() => onSelect(null)} />
        </li>
        {items.map((item) => (
          <li key={item.id}>
            <FacetButton
              label={item.nombre}
              count={item.count}
              active={selected === item.id}
              onClick={() => onSelect(selected === item.id ? null : item.id)}
            />
          </li>
        ))}
      </ul>
      {items.length === 0 && emptyText && <p className="px-3 pt-1 text-xs text-gray-400 dark:text-zinc-500">{emptyText}</p>}
      {children}
    </section>
  )
}

function FacetButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count?: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors",
        active
          ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-950/30 dark:text-brand-300"
          : "text-gray-600 hover:bg-gray-50 dark:text-zinc-400 dark:hover:bg-zinc-900/50",
      )}
    >
      <span className="truncate">{label}</span>
      {count !== undefined && (
        <span className={cn("shrink-0 text-xs tabular-nums", active ? "text-brand-600" : "text-gray-400 dark:text-zinc-500")}>
          {count}
        </span>
      )}
    </button>
  )
}

function YearSelect({
  label,
  value,
  years,
  onChange,
}: {
  label: string
  value: number | null
  years: number[]
  onChange: (year: number | null) => void
}) {
  // Conserva un año elegido aunque la búsqueda actual ya no lo incluya.
  const options = value !== null && !years.includes(value) ? [value, ...years] : years
  return (
    <Select
      value={value === null ? "any" : String(value)}
      onValueChange={(v: string | null) => onChange(!v || v === "any" ? null : Number(v))}
    >
      <SelectTrigger aria-label={`Año ${label.toLowerCase()}`} className="h-9 w-full text-xs">
        <SelectValue placeholder={label}>{value === null ? label : `${label} ${value}`}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="any">{label}: cualquiera</SelectItem>
        {options.map((year) => (
          <SelectItem key={year} value={String(year)}>
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
