import { useQuery } from "@tanstack/react-query"
import { FileStack, Loader2 } from "lucide-react"
import { Link } from "react-router"

import { Badge } from "@/components/ui/badge"
import { getWorkByResource } from "@/services/works"


interface ResourceVersionsPanelProps {
  resourceId: number
}


export function ResourceVersionsPanel({ resourceId }: ResourceVersionsPanelProps) {
  const workQuery = useQuery({
    queryKey: ["bibliographic-work", resourceId],
    queryFn: () => getWorkByResource(resourceId),
    retry: false,
  })

  if (workQuery.isLoading) {
    return <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando ediciones…</p>
  }

  if (workQuery.isError || !workQuery.data) {
    return <p className="text-xs text-muted-foreground">Información de ediciones no disponible.</p>
  }

  const fileCount = workQuery.data.ediciones.reduce((total, edition) => total + edition.archivos.length, 0)

  return (
    <section className="space-y-3 border-t pt-4" aria-labelledby="resource-versions-title">
      <div className="flex items-center justify-between gap-2">
        <h4 id="resource-versions-title" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
          <FileStack className="h-4 w-4" /> Ediciones y formatos
        </h4>
        <span className="text-xs text-muted-foreground">{workQuery.data.ediciones.length} edición(es) · {fileCount} archivo(s)</span>
      </div>
      <div className="space-y-2">
        {workQuery.data.ediciones.map((edition) => (
          <div key={edition.id} className="rounded-lg border bg-muted/20 p-3">
            <p className="text-sm font-medium">{edition.titulo}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {[edition.editorial, edition.anio, edition.idioma?.toUpperCase()].filter(Boolean).join(" · ") || "Edición sin datos adicionales"}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {edition.archivos.map((file) => (
                <Link key={file.id} to={`/biblioteca/recurso/${file.recurso_id}`}>
                  <Badge variant={file.recurso_id === resourceId ? "default" : "outline"}>
                    {file.formato}{file.recurso_id === resourceId ? " · actual" : ""}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
