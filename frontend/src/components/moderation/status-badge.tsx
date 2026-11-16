import { CheckCircle2, Clock, Archive, MessageSquareWarning, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { statusLabel, type EstadoRecurso } from "@/services/moderation"

const STYLES: Record<EstadoRecurso, { className: string; icon: typeof Clock }> = {
  Pendiente: { className: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30", icon: Clock },
  Aprobado: { className: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30", icon: CheckCircle2 },
  Observado: { className: "bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/30", icon: MessageSquareWarning },
  Rechazado: { className: "bg-red-50 text-red-800 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30", icon: XCircle },
  Archivado: { className: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700", icon: Archive },
}

export function StatusBadge({ estado, className }: { estado: EstadoRecurso; className?: string }) {
  const style = STYLES[estado] ?? STYLES.Pendiente
  const Icon = style.icon
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", style.className, className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {statusLabel(estado)}
    </span>
  )
}
