import { Badge } from "@/components/ui/badge"
import { Calendar, FileText, BookOpen } from "lucide-react"
import type { Recurso } from "@/services/resources"

interface Props {
  resource: Recurso
}

export function ResourceMetadataPanel({ resource }: Props) {
  return (
    <>
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="outline" className="text-brand-600 border-brand-300 bg-brand-50/10">
          <FileText className="h-3.5 w-3.5 mr-1" />
          {resource.tipo_recurso_nombre ?? resource.archivo_mime}
        </Badge>
        {resource.curso_nombre && (
          <Badge variant="secondary">
            <BookOpen className="h-3 w-3 mr-1" />
            {resource.curso_nombre}
          </Badge>
        )}
      </div>

      <div className="text-xs text-gray-500 flex items-center gap-1.5">
        <Calendar className="h-4 w-4 text-gray-400" />
        <span>
          Publicado el{" "}
          {new Date(resource.created_at).toLocaleDateString("es-PE", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
      </div>

      {resource.resumen && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Resumen
          </h4>
          <p className="text-gray-600 text-sm leading-relaxed border-l-4 border-brand-400 pl-3 py-1 italic bg-gray-50/30 rounded-r-md">
            {resource.resumen}
          </p>
        </div>
      )}

      <div className="space-y-2.5 border-t pt-4">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Detalles del Documento
        </h4>
        <div className="text-xs space-y-1.5 text-gray-600">
          <p><span className="font-semibold text-gray-500">Autores:</span> {resource.autores ?? "Facultad de Ingeniería Química - UNCP"}</p>
          {resource.editorial && <p><span className="font-semibold text-gray-500">Revista / Editorial:</span> {resource.editorial}</p>}
          {resource.anio && <p><span className="font-semibold text-gray-500">Año de Publicación:</span> {resource.anio}</p>}
          {resource.doi && <p><span className="font-semibold text-gray-500">DOI / ISBN:</span> <span className="font-mono text-brand-600 select-all">{resource.doi}</span></p>}
        </div>
      </div>
    </>
  )
}
