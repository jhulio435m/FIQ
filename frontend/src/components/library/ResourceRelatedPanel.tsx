import { useQuery } from "@tanstack/react-query"
import { Sparkles, BookOpen } from "lucide-react"
import { getRelatedResources } from "@/services/community"
import { useNavigate } from "react-router"

interface Props {
  resourceId: number
}

export function ResourceRelatedPanel({ resourceId }: Props) {
  const navigate = useNavigate()
  const { data: related, isLoading } = useQuery({
    queryKey: ["related-resources", resourceId],
    queryFn: () => getRelatedResources(resourceId),
    staleTime: 60_000,
  })

  if (isLoading || !related || related.length === 0) {
    return null
  }

  return (
    <div className="space-y-2.5 pt-3 border-t">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-brand-600" />
        Recursos recomendados
      </h4>
      <div className="space-y-1.5">
        {related.slice(0, 3).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => navigate(`/biblioteca/recurso/${item.id}`)}
            className="w-full text-left p-2 rounded-lg border bg-muted/20 hover:bg-brand-50/50 hover:border-brand-200 transition-colors flex items-center gap-2 cursor-pointer group"
          >
            <div className="h-7 w-7 rounded bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
              <BookOpen className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 dark:text-zinc-100 truncate group-hover:text-brand-600 transition-colors">
                {item.titulo}
              </p>
              <div className="flex items-center gap-1 text-3xs text-muted-foreground">
                <span>{item.tipo_recurso_nombre ?? "Recurso"}</span>
                {item.curso_nombre && (
                  <>
                    <span>•</span>
                    <span className="truncate">{item.curso_nombre}</span>
                  </>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
