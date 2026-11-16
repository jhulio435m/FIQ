import { useState } from "react"
import { Link } from "react-router"
import { ChevronDown, ChevronUp, ExternalLink, FolderOpen, Loader2, Pencil, RotateCcw, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { UploadDialog } from "@/components/library/upload-dialog"
import { StatusBadge } from "@/components/moderation/status-badge"
import { HistoryTimeline } from "@/components/moderation/history-timeline"
import { CorrectResourceDialog } from "@/components/moderation/correct-resource-dialog"
import { useMyResources } from "@/hooks/use-moderation"
import { timeAgo } from "@/lib/dates"
import { cn } from "@/lib/utils"
import type { EstadoRecurso, ModerationItem } from "@/services/moderation"

const FILTERS: { estado?: EstadoRecurso; label: string }[] = [
  { label: "Todos" },
  { estado: "Observado", label: "Requieren cambios" },
  { estado: "Pendiente", label: "En revisión" },
  { estado: "Aprobado", label: "Publicados" },
  { estado: "Rechazado", label: "Rechazados" },
]

export default function MisRecursos() {
  const [estado, setEstado] = useState<EstadoRecurso | undefined>(undefined)
  const { data, isLoading, isError, refetch, isFetching } = useMyResources(estado)
  const conteos = data?.conteos ?? {}
  const total = Object.values(conteos).reduce((sum, n) => sum + (n ?? 0), 0)
  const items = data?.items ?? []
  const observados = conteos.Observado ?? 0

  return (
    <div className="animate-fade-in mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-900 dark:text-brand-100">Mis recursos</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">El estado de todo lo que has subido a la biblioteca.</p>
        </div>
        <UploadDialog />
      </div>

      {observados > 0 && estado !== "Observado" && (
        <button
          type="button"
          onClick={() => setEstado("Observado")}
          className="mb-5 flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-left text-sm text-orange-900 hover:bg-orange-100 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200"
        >
          <span>
            <strong>{observados}</strong> recurso{observados !== 1 ? "s" : ""} necesita{observados !== 1 ? "n" : ""} cambios antes de publicarse.
          </span>
          <span className="font-medium underline">Ver</span>
        </button>
      )}

      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Filtrar por estado">
        {FILTERS.map((filter) => {
          const count = filter.estado ? conteos[filter.estado] ?? 0 : total
          const active = estado === filter.estado
          return (
            <button
              key={filter.label}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setEstado(filter.estado)}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1 text-sm transition-colors",
                active
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-gray-200 text-gray-600 hover:border-brand-300 dark:border-zinc-700 dark:text-zinc-300",
              )}
            >
              {filter.label} <span className={cn("ml-1 tabular-nums", active ? "text-white/80" : "text-gray-400")}>{count}</span>
            </button>
          )
        })}
        {isFetching && !isLoading && <Loader2 className="h-4 w-4 animate-spin self-center text-gray-400" aria-label="Actualizando" />}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" aria-label="Cargando tus recursos" />
        </div>
      ) : isError ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-gray-600 dark:text-zinc-400">No se pudieron cargar tus recursos.</p>
          <Button variant="outline" size="sm" className="mt-3 cursor-pointer" onClick={() => refetch()}>
            <RotateCcw className="mr-1 h-4 w-4" /> Reintentar
          </Button>
        </Card>
      ) : items.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <FolderOpen className="h-10 w-10 text-gray-300 dark:text-zinc-600" aria-hidden />
          <p className="font-medium text-gray-700 dark:text-zinc-200">
            {estado ? "No tienes recursos en este estado" : "Todavía no has subido recursos"}
          </p>
          {!estado && <p className="text-sm text-gray-500 dark:text-zinc-400">Usa «Subir recurso» para compartir material con tus estudiantes.</p>}
        </Card>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <MyResourceCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function MyResourceCard({ item }: { item: ModerationItem }) {
  const [showHistory, setShowHistory] = useState(false)
  const [correcting, setCorrecting] = useState(false)
  const needsAction = item.estado_nombre === "Observado"
  const showComment = (item.estado_nombre === "Observado" || item.estado_nombre === "Rechazado") && item.ultimo_comentario

  return (
    <Card className={cn("p-4", needsAction && "border-orange-300 dark:border-orange-500/40")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-gray-900 dark:text-zinc-100">{item.titulo}</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
            {[item.tipo_recurso_nombre, item.curso_nombre].filter(Boolean).join(" · ")}
            {" · "}Subido {timeAgo(item.created_at)}
            {item.ultimo_cambio && <> · Última revisión {timeAgo(item.ultimo_cambio)}</>}
          </p>
        </div>
        <StatusBadge estado={item.estado_nombre} />
      </div>

      {showComment && (
        <div
          className={cn(
            "mt-3 rounded-lg border p-3 text-sm",
            item.estado_nombre === "Rechazado"
              ? "border-red-200 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
              : "border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200",
          )}
        >
          <p className="font-medium">{item.estado_nombre === "Rechazado" ? "Motivo del rechazo" : "Comentario del revisor"}</p>
          <p className="mt-1 whitespace-pre-line opacity-90">{item.ultimo_comentario}</p>
        </div>
      )}

      {item.estado_nombre === "Aprobado" && (
        <p className="mt-2 text-xs text-gray-500 dark:text-zinc-400">
          {item.visualizaciones} vistas · {item.descargas} descargas
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {needsAction && (
          <Button size="sm" className="cursor-pointer bg-brand-500 text-white hover:bg-brand-600" onClick={() => setCorrecting(true)}>
            <Send className="mr-1 h-4 w-4" /> Corregir y reenviar
          </Button>
        )}
        {item.estado_nombre === "Pendiente" && (
          <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => setCorrecting(true)}>
            <Pencil className="mr-1 h-4 w-4" /> Editar
          </Button>
        )}
        {item.estado_nombre === "Aprobado" && (
          <Button size="sm" variant="outline" className="cursor-pointer" nativeButton={false} render={<Link to={`/biblioteca?q=${encodeURIComponent(item.titulo)}`} />}>
            <ExternalLink className="mr-1 h-4 w-4" /> Ver en la biblioteca
          </Button>
        )}
        <Button size="sm" variant="ghost" className="cursor-pointer" onClick={() => setShowHistory((v) => !v)} aria-expanded={showHistory}>
          Historial {showHistory ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
        </Button>
      </div>

      {showHistory && (
        <div className="mt-3 border-t border-border pt-3">
          <HistoryTimeline resourceId={item.id} />
        </div>
      )}

      {correcting && <CorrectResourceDialog item={item} open onOpenChange={setCorrecting} />}
    </Card>
  )
}
