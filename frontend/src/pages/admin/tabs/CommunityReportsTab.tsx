import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertTriangle, CheckCircle, ExternalLink, Loader2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { getPendingReports, updateReport, type Report } from "@/services/community"

const motivoLabels: Record<string, { label: string; color: string }> = {
  archivo_corrupto: { label: "Archivo corrupto", color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300" },
  duplicado: { label: "Duplicado", color: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300" },
  metadatos_incorrectos: { label: "Metadatos incorrectos", color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300" },
  otro: { label: "Otro problema", color: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-zinc-800 dark:text-zinc-300" },
}

export function CommunityReportsTab() {
  const queryClient = useQueryClient()
  const [resolvingReport, setResolvingReport] = useState<Report | null>(null)
  const [resolutionText, setResolutionText] = useState("")
  const [actionType, setActionType] = useState<"resuelto" | "descartado">("resuelto")

  const { data: reports = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-pending-reports"],
    queryFn: getPendingReports,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, estado, resolucion }: { id: string; estado: string; resolucion?: string }) =>
      updateReport(id, { estado, resolucion }),
    onSuccess: (_, vars) => {
      toast.success(vars.estado === "resuelto" ? "Reporte resuelto exitosamente" : "Reporte descartado")
      queryClient.invalidateQueries({ queryKey: ["admin-pending-reports"] })
      setResolvingReport(null)
      setResolutionText("")
    },
    onError: () => {
      toast.error("Error al procesar el reporte")
    },
  })

  const openResolutionDialog = (report: Report, type: "resuelto" | "descartado") => {
    setResolvingReport(report)
    setActionType(type)
    setResolutionText("")
  }

  const handleConfirmAction = (e: React.FormEvent) => {
    e.preventDefault()
    if (!resolvingReport) return

    updateMutation.mutate({
      id: resolvingReport.id,
      estado: actionType,
      resolucion: resolutionText.trim() || undefined,
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-brand-700 dark:text-brand-400 text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Reportes de Calidad e Incidencias
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {reports.length} pendiente{reports.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        ) : isError ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
            No se pudieron cargar los reportes. Revisa la conexión o vuelve a intentar.
            <Button variant="outline" size="sm" onClick={() => void refetch()} className="ml-3">
              Reintentar
            </Button>
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-8 text-center">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700 dark:text-zinc-200">
              No hay reportes ni incidencias pendientes.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Los avisos emitidos por los alumnos o docentes sobre archivos corruptos o metadatos erróneos aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-gray-50 dark:bg-zinc-900/50 text-left text-gray-600 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Recurso</th>
                  <th className="px-4 py-3">Motivo</th>
                  <th className="px-4 py-3">Reportado por</th>
                  <th className="px-4 py-3">Observación</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reports.map((report) => {
                  const motivoInfo = motivoLabels[report.motivo] ?? motivoLabels.otro
                  return (
                    <tr key={report.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 max-w-[220px]">
                        <Link
                          to={`/biblioteca/recurso/${report.recurso_id}`}
                          target="_blank"
                          className="font-medium text-brand-900 dark:text-brand-300 hover:text-brand-600 flex items-center gap-1 group"
                        >
                          <span className="truncate">{report.recurso_titulo ?? `Recurso #${report.recurso_id}`}</span>
                          <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                        <span className="text-3xs text-muted-foreground">ID: {report.recurso_id}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="outline" className={`text-xs ${motivoInfo.color}`}>
                          {motivoInfo.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 max-w-[180px]">
                        <div className="text-xs text-gray-800 dark:text-zinc-200 truncate">
                          {report.usuario_email ?? report.usuario_id}
                        </div>
                        <div className="text-3xs text-muted-foreground">
                          {new Date(report.created_at).toLocaleDateString("es-PE", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[260px]">
                        <p className="text-xs text-gray-600 dark:text-zinc-400 line-clamp-2" title={report.descripcion}>
                          {report.descripcion}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            className="bg-brand-500 hover:bg-brand-600 text-white cursor-pointer h-7 text-xs"
                            onClick={() => openResolutionDialog(report, "resuelto")}
                            disabled={updateMutation.isPending}
                          >
                            <CheckCircle className="mr-1 h-3.5 w-3.5" />
                            Resolver
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="cursor-pointer h-7 text-xs text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                            onClick={() => openResolutionDialog(report, "descartado")}
                            disabled={updateMutation.isPending}
                          >
                            <XCircle className="mr-1 h-3.5 w-3.5" />
                            Descartar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Resolution Dialog */}
        <Dialog open={resolvingReport !== null} onOpenChange={(open) => !open && setResolvingReport(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-brand-700 dark:text-brand-300">
                {actionType === "resuelto" ? "Resolver Incidencia" : "Descartar Reporte"}
              </DialogTitle>
              <DialogDescription>
                {actionType === "resuelto"
                  ? "Indica las acciones tomadas para resolver la observación editorial reportada."
                  : "Explica el motivo por el cual este reporte fue descartado (opcional)."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleConfirmAction} className="space-y-3 py-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Nota de resolución editorial</label>
                <Input
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                  placeholder={
                    actionType === "resuelto"
                      ? "Ej: Metadatos corregidos y archivo resubido..."
                      : "Ej: El archivo se visualiza correctamente en los visores compatibles..."
                  }
                  className="text-xs"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setResolvingReport(null)}
                  disabled={updateMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className={actionType === "resuelto" ? "bg-brand-500 hover:bg-brand-600 text-white" : "bg-zinc-700 hover:bg-zinc-800 text-white"}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Procesando...
                    </>
                  ) : actionType === "resuelto" ? (
                    "Confirmar resolución"
                  ) : (
                    "Confirmar descarte"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
