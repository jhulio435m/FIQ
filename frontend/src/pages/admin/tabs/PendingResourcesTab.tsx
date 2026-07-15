import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Loader2, XCircle } from "lucide-react"
import { usePendingResources } from "@/hooks/use-reports-data"

export function PendingResourcesTab() {
  const { query, approveMutation, observeMutation } = usePendingResources()
  const pending = query.data || []
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-brand-700 dark:text-brand-400 text-lg">Recursos Pendientes de Aprobación</CardTitle>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        ) : pending.length === 0 ? (
          <p className="text-gray-500 dark:text-zinc-400 text-sm">No hay recursos pendientes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-gray-50 dark:bg-zinc-900/50 text-left text-gray-600 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Recurso</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Curso</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pending.map((resource) => (
                  <tr key={resource.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-brand-900 dark:text-brand-300">{resource.titulo}</div>
                      <div className="text-xs text-gray-500 dark:text-zinc-400">{resource.resumen ?? "Sin resumen"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{resource.tipo_recurso_nombre ?? resource.archivo_mime}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-zinc-400">{resource.curso_nombre ?? "Sin curso"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          className="bg-brand-500 hover:bg-brand-600 cursor-pointer text-white"
                          onClick={() => approveMutation.mutate(resource.id)}
                          disabled={approveMutation.isPending || observeMutation.isPending}
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() => observeMutation.mutate(resource.id)}
                          disabled={approveMutation.isPending || observeMutation.isPending}
                        >
                          <XCircle className="mr-1 h-4 w-4" />
                          Observar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
