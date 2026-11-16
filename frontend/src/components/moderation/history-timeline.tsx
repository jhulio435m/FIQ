import { Loader2 } from "lucide-react"
import { useResourceHistory } from "@/hooks/use-moderation"
import { formatDateTime } from "@/lib/dates"
import { statusLabel } from "@/services/moderation"

export function HistoryTimeline({ resourceId }: { resourceId: number }) {
  const { data: history = [], isLoading, isError } = useResourceHistory(resourceId)

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin text-gray-400" aria-label="Cargando historial" />
  }
  if (isError) return <p className="text-xs text-red-600">No se pudo cargar el historial.</p>
  if (history.length === 0) {
    return <p className="text-xs text-gray-500 dark:text-zinc-400">Sin cambios de estado todavía: es su primera revisión.</p>
  }

  return (
    <ol className="relative space-y-4 border-l border-gray-200 pl-4 dark:border-zinc-800">
      {history.map((entry) => (
        <li key={entry.id} className="relative">
          <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-500 dark:border-zinc-950" aria-hidden />
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            <time>{formatDateTime(entry.fecha_hora)}</time>
            {entry.cambiado_por_nombre && <> · {entry.cambiado_por_nombre}</>}
          </p>
          <p className="text-sm font-medium text-gray-800 dark:text-zinc-200">
            {entry.estado_anterior ? `${statusLabel(entry.estado_anterior)} → ` : ""}
            {statusLabel(entry.estado_nuevo)}
          </p>
          {entry.comentario && (
            <p className="mt-1 whitespace-pre-line rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-zinc-900 dark:text-zinc-300">
              {entry.comentario}
            </p>
          )}
        </li>
      ))}
    </ol>
  )
}
