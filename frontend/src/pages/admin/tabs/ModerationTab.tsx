import { useState } from "react"
import { CheckCircle2, ChevronDown, ChevronUp, FileText, Inbox, Loader2, MessageSquareWarning, RotateCcw, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PdfViewer } from "@/components/library/pdf-viewer"
import { DecisionDialog } from "@/components/moderation/decision-dialog"
import { HistoryTimeline } from "@/components/moderation/history-timeline"
import { useModerationActions, useModerationQueue } from "@/hooks/use-moderation"
import { formatBytes, cn } from "@/lib/utils"
import { formatDateTime, timeAgo } from "@/lib/dates"
import type { ModerationItem } from "@/services/moderation"

export function ModerationTab() {
  const { data: queue = [], isLoading, isError, refetch } = useModerationQueue()
  const { decide, approveMany } = useModerationActions()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [dialog, setDialog] = useState<"observe" | "reject" | null>(null)

  // Si el seleccionado sale de la cola (aprobado, observado…), se pasa al siguiente.
  const current = queue.find((item) => item.id === selectedId) ?? queue[0] ?? null
  const checkedIds = queue.filter((item) => checked.has(item.id)).map((item) => item.id)
  const allChecked = queue.length > 0 && checkedIds.length === queue.length

  const toggle = (id: number) =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const decideCurrent = (action: "approve" | "observe" | "reject", comentario?: string) => {
    if (!current) return
    decide.mutate(
      { id: current.id, action, comentario },
      {
        onSuccess: () => {
          setDialog(null)
          const index = queue.findIndex((item) => item.id === current.id)
          setSelectedId(queue[index + 1]?.id ?? queue[index - 1]?.id ?? null)
        },
      },
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" aria-label="Cargando cola de moderación" />
      </div>
    )
  }

  if (isError) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-gray-600 dark:text-zinc-400">No se pudo cargar la cola de moderación.</p>
        <Button variant="outline" size="sm" className="mt-3 cursor-pointer" onClick={() => refetch()}>
          <RotateCcw className="mr-1 h-4 w-4" /> Reintentar
        </Button>
      </Card>
    )
  }

  if (queue.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 p-12 text-center">
        <Inbox className="h-10 w-10 text-gray-300 dark:text-zinc-600" aria-hidden />
        <p className="font-medium text-gray-700 dark:text-zinc-200">No hay recursos por revisar</p>
        <p className="text-sm text-gray-500 dark:text-zinc-400">Cuando un docente suba material, aparecerá aquí.</p>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <Card className="flex max-h-[75vh] flex-col overflow-hidden p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={allChecked}
              onChange={() => setChecked(allChecked ? new Set() : new Set(queue.map((item) => item.id)))}
              className="h-4 w-4 accent-brand-500"
              aria-label="Seleccionar todos"
            />
            {queue.length} por revisar
          </label>
          {checkedIds.length > 0 && (
            <Button
              size="sm"
              className="cursor-pointer bg-brand-500 text-white hover:bg-brand-600"
              disabled={approveMany.isPending}
              onClick={() => approveMany.mutate(checkedIds, { onSuccess: () => setChecked(new Set()) })}
            >
              {approveMany.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
              Aprobar {checkedIds.length}
            </Button>
          )}
        </div>
        <ul className="flex-1 divide-y divide-border overflow-y-auto" aria-label="Cola de moderación">
          {queue.map((item) => (
            <QueueRow
              key={item.id}
              item={item}
              active={current?.id === item.id}
              checked={checked.has(item.id)}
              onSelect={() => setSelectedId(item.id)}
              onToggle={() => toggle(item.id)}
            />
          ))}
        </ul>
      </Card>

      {current && (
        <ReviewPanel
          key={current.id}
          item={current}
          busy={decide.isPending}
          onApprove={() => decideCurrent("approve")}
          onObserve={() => setDialog("observe")}
          onReject={() => setDialog("reject")}
        />
      )}

      {current && dialog && (
        <DecisionDialog
          key={`${current.id}-${dialog}`}
          action={dialog}
          titulo={current.titulo}
          open
          pending={decide.isPending}
          onOpenChange={(open) => !open && setDialog(null)}
          onConfirm={(comentario) => decideCurrent(dialog, comentario)}
        />
      )}
    </div>
  )
}

function QueueRow({
  item,
  active,
  checked,
  onSelect,
  onToggle,
}: {
  item: ModerationItem
  active: boolean
  checked: boolean
  onSelect: () => void
  onToggle: () => void
}) {
  return (
    <li className={cn("flex gap-3 px-4 py-3", active ? "bg-brand-50/70 dark:bg-brand-950/20" : "hover:bg-gray-50 dark:hover:bg-zinc-900/40")}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="mt-1 h-4 w-4 shrink-0 accent-brand-500"
        aria-label={`Seleccionar ${item.titulo}`}
      />
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 cursor-pointer text-left" aria-current={active || undefined}>
        <p className="line-clamp-2 text-sm font-medium text-gray-900 dark:text-zinc-100">{item.titulo}</p>
        <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-zinc-400">
          {item.subido_por_nombre ?? "Autor desconocido"} · {timeAgo(item.created_at)}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {item.tipo_recurso_nombre && <Badge variant="outline" className="text-[11px] font-normal">{item.tipo_recurso_nombre}</Badge>}
          {item.reenvios > 0 && (
            <Badge variant="outline" className="border-orange-200 bg-orange-50 text-[11px] font-normal text-orange-800 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300">
              Reenviado{item.reenvios > 1 ? ` ×${item.reenvios}` : ""}
            </Badge>
          )}
        </div>
      </button>
    </li>
  )
}

function ReviewPanel({
  item,
  busy,
  onApprove,
  onObserve,
  onReject,
}: {
  item: ModerationItem
  busy: boolean
  onApprove: () => void
  onObserve: () => void
  onReject: () => void
}) {
  const [showPdf, setShowPdf] = useState(false)

  return (
    <Card role="region" className="flex flex-col gap-5 p-5" aria-label={`Revisión de ${item.titulo}`}>
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">{item.titulo}</h2>
        <p className="text-sm text-gray-500 dark:text-zinc-400">
          Subido por <span className="font-medium text-gray-700 dark:text-zinc-300">{item.subido_por_nombre ?? "—"}</span>
          {item.subido_por_email && <> ({item.subido_por_email})</>} · {formatDateTime(item.created_at)}
        </p>
      </header>

      {item.reenvios > 0 && item.ultimo_comentario && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm dark:border-orange-500/30 dark:bg-orange-500/10">
          <p className="font-medium text-orange-900 dark:text-orange-200">Nota del autor al reenviar</p>
          <p className="mt-1 whitespace-pre-line text-orange-900/80 dark:text-orange-200/80">{item.ultimo_comentario}</p>
        </div>
      )}

      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <Meta label="Tipo" value={item.tipo_recurso_nombre} />
        <Meta label="Curso" value={item.curso_nombre} missing="Sin curso asignado" />
        <Meta label="Autores" value={item.autores} missing="Sin autores" />
        <Meta label="Año" value={item.anio ? String(item.anio) : null} missing="Sin año" />
        <Meta label="Editorial" value={item.editorial} />
        <Meta label="DOI" value={item.doi} />
        <div className="sm:col-span-2">
          <Meta label="Resumen" value={item.resumen} missing="Sin resumen" />
        </div>
      </dl>

      <section>
        <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setShowPdf((v) => !v)} aria-expanded={showPdf}>
          <FileText className="mr-1 h-4 w-4" />
          {showPdf ? "Ocultar PDF" : `Ver PDF (${formatBytes(item.archivo_size)})`}
          {showPdf ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
        </Button>
        {showPdf && (
          <div className="mt-3 h-[60vh] overflow-hidden rounded-lg border border-border">
            <PdfViewer resourceId={item.id} />
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">Historial</h3>
        <HistoryTimeline resourceId={item.id} />
      </section>

      <footer className="sticky bottom-0 -mx-5 -mb-5 flex flex-wrap justify-end gap-2 border-t border-border bg-card px-5 py-3">
        <Button variant="outline" className="cursor-pointer text-red-700 hover:bg-red-50 dark:text-red-400" onClick={onReject} disabled={busy}>
          <XCircle className="mr-1 h-4 w-4" /> Rechazar
        </Button>
        <Button variant="outline" className="cursor-pointer" onClick={onObserve} disabled={busy}>
          <MessageSquareWarning className="mr-1 h-4 w-4" /> Pedir cambios
        </Button>
        <Button className="cursor-pointer bg-brand-500 text-white hover:bg-brand-600" onClick={onApprove} disabled={busy}>
          {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
          Aprobar y publicar
        </Button>
      </footer>
    </Card>
  )
}

function Meta({ label, value, missing }: { label: string; value: string | null | undefined; missing?: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-zinc-400">{label}</dt>
      <dd className={cn("mt-0.5", value ? "text-gray-800 dark:text-zinc-200" : "text-gray-400 italic dark:text-zinc-500")}>
        {value || missing || "—"}
      </dd>
    </div>
  )
}
