import { Eye, Download, FileText } from "lucide-react"
import { formatBytes } from "@/lib/utils"
import type { Recurso } from "@/services/resources"

interface Props {
  resource: Recurso
}

export function ResourceStatsPanel({ resource }: Props) {
  return (
    <div className="space-y-2 border-t pt-4">
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Métricas del Recurso
      </h4>
      <div className="grid grid-cols-3 gap-2 bg-gray-50/80 p-3.5 rounded-xl border border-gray-100 text-center">
        <div className="flex flex-col items-center justify-center">
          <span className="text-2xs text-gray-500 font-medium flex items-center gap-1 mb-0.5">
            <Eye className="h-3.5 w-3.5 text-brand-500" /> Vistas
          </span>
          <span className="text-sm font-bold text-gray-800">{resource.visualizaciones}</span>
        </div>
        <div className="flex flex-col items-center justify-center border-x border-gray-200">
          <span className="text-2xs text-gray-500 font-medium flex items-center gap-1 mb-0.5">
            <Download className="h-3.5 w-3.5 text-brand-500" /> Descargas
          </span>
          <span className="text-sm font-bold text-gray-800">{resource.descargas}</span>
        </div>
        <div className="flex flex-col items-center justify-center">
          <span className="text-2xs text-gray-500 font-medium flex items-center gap-1 mb-0.5">
            <FileText className="h-3.5 w-3.5 text-brand-500" /> Tamaño
          </span>
          <span className="text-sm font-bold text-gray-800 font-mono">
            {formatBytes(resource.archivo_size)}
          </span>
        </div>
      </div>
    </div>
  )
}
