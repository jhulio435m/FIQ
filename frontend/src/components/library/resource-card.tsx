import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, FileText, Download, Eye, Video, PenLine, Presentation, FlaskConical } from "lucide-react"
import type { Recurso } from "@/services/resources"
import { formatBytes } from "@/lib/utils"
import { Highlight } from "./highlight"

const typeMeta: Record<number, { color: string; icon: typeof BookOpen }> = {
  1: { color: "bg-blue-100 text-blue-700 border-blue-200", icon: BookOpen },
  2: { color: "bg-gray-100 text-gray-700 border-gray-200", icon: PenLine },
  3: { color: "bg-amber-100 text-amber-700 border-amber-200", icon: FlaskConical },
  4: { color: "bg-purple-100 text-purple-700 border-purple-200", icon: FileText },
  5: { color: "bg-green-100 text-green-700 border-green-200", icon: FileText },
  6: { color: "bg-red-100 text-red-700 border-red-200", icon: Video },
  7: { color: "bg-indigo-100 text-indigo-700 border-indigo-200", icon: Presentation },
  8: { color: "bg-teal-100 text-teal-700 border-teal-200", icon: PenLine },
}

interface Props {
  resource: Recurso
  onClick?: () => void
  /** Términos de búsqueda a resaltar (ya plegados, ver lib/highlight). */
  terms?: string[]
}

export function ResourceCard({ resource, onClick, terms = [] }: Props) {
  const meta = typeMeta[resource.tipo_recurso_id]
  const Icon = meta?.icon ?? FileText
  const badgeClass = meta?.color ?? "bg-gray-100 text-gray-600"

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`Ver detalle de ${resource.titulo}`}
      className="group p-4 hover:shadow-md hover:border-brand-200 dark:hover:border-brand-900 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick?.()
        }
      }}
    >
      <div className="flex gap-4">
        <div className={`shrink-0 w-11 h-11 rounded-lg flex items-center justify-center ${badgeClass.split(" ")[0]} ${badgeClass.split(" ")[1]}`}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-zinc-100 line-clamp-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
              <Highlight text={resource.titulo} terms={terms} />
            </h3>
            <span className="shrink-0 text-xs font-mono text-gray-400 dark:text-zinc-500">
              {formatBytes(resource.archivo_size)}
            </span>
          </div>

          {(resource.autores || resource.anio) && (
            <p className="text-xs text-gray-600 dark:text-zinc-400 mt-0.5 truncate">
              {resource.autores && <Highlight text={resource.autores} terms={terms} />}
              {resource.autores && resource.anio && " · "}
              {resource.anio && <Highlight text={String(resource.anio)} terms={terms} />}
            </p>
          )}

          {resource.resumen && (
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1 line-clamp-2">
              <Highlight text={resource.resumen} terms={terms} />
            </p>
          )}

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="outline" className={`text-xs font-normal ${badgeClass}`}>
              {resource.tipo_recurso_nombre ?? "Recurso"}
            </Badge>
            {resource.curso_nombre && (
              <span className="text-xs text-gray-500 dark:text-zinc-400">
                <Highlight text={resource.curso_nombre} terms={terms} />
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-zinc-500">
            <span className="flex items-center gap-1" title="Vistas">
              <Eye className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">Vistas:</span>
              {resource.visualizaciones}
            </span>
            <span className="flex items-center gap-1" title="Descargas">
              <Download className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">Descargas:</span>
              {resource.descargas}
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}
