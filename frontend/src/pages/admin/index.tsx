import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { UserManagement } from "@/components/admin/user-management"
import { approveResource, getPendingResources, observeResource } from "@/services/resources"
import { getLabsUsage, getMostViewedResources } from "@/services/reports"
import { CheckCircle, Eye, FileText, Loader2, XCircle } from "lucide-react"
import { toast } from "sonner"

export default function Admin() {
  const queryClient = useQueryClient()
  const { data: pending = [], isLoading: pendingLoading } = useQuery({
    queryKey: ["pending-resources"],
    queryFn: getPendingResources,
  })

  const { data: mostViewed = [] } = useQuery({
    queryKey: ["reports", "most-viewed"],
    queryFn: getMostViewedResources,
  })

  const { data: labsUsage } = useQuery({
    queryKey: ["reports", "labs-usage"],
    queryFn: getLabsUsage,
  })

  const approveMutation = useMutation({
    mutationFn: (id: number) => approveResource(id),
    onSuccess: () => {
      toast.success("Recurso aprobado")
      queryClient.invalidateQueries({ queryKey: ["pending-resources"] })
      queryClient.invalidateQueries({ queryKey: ["resources"] })
    },
  })

  const observeMutation = useMutation({
    mutationFn: (id: number) => observeResource(id, "Revisar metadatos o archivo antes de publicar."),
    onSuccess: () => {
      toast.success("Recurso observado")
      queryClient.invalidateQueries({ queryKey: ["pending-resources"] })
    },
  })

  return (
    <div className="animate-fade-in max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-brand-900 dark:text-brand-100 mb-8">Panel Administrativo</h1>

      <Tabs defaultValue="pending">
        <TabsList className="mb-6">
          <TabsTrigger value="pending">Pendientes</TabsTrigger>
          <TabsTrigger value="resources">Recursos</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="reports">Reportes</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="text-brand-700 dark:text-brand-400 text-lg">Recursos Pendientes de Aprobación</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingLoading ? (
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
                                className="bg-brand-500 hover:bg-brand-600 cursor-pointer"
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
        </TabsContent>

        <TabsContent value="resources">
          <Card>
            <CardHeader>
              <CardTitle className="text-brand-700 dark:text-brand-400 text-lg">Gestión de Recursos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-md border border-border p-4">
                  <p className="text-xs uppercase text-gray-500 dark:text-zinc-400">Pendientes</p>
                  <p className="mt-2 text-3xl font-bold text-brand-700 dark:text-brand-400">{pending.length}</p>
                </div>
                <div className="rounded-md border border-border p-4">
                  <p className="text-xs uppercase text-gray-500 dark:text-zinc-400">Más vistos</p>
                  <p className="mt-2 text-3xl font-bold text-brand-700 dark:text-brand-400">{mostViewed.length}</p>
                </div>
                <div className="rounded-md border border-border p-4">
                  <p className="text-xs uppercase text-gray-500 dark:text-zinc-400">Accesos a labs</p>
                  <p className="mt-2 text-3xl font-bold text-brand-700 dark:text-brand-400">{labsUsage?.total_accesos_laboratorios ?? labsUsage?.total ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="text-brand-700 dark:text-brand-400 text-lg">Gestión de Usuarios</CardTitle>
            </CardHeader>
            <CardContent>
              <UserManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle className="text-brand-700 dark:text-brand-400 text-lg">Reportes y Métricas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mostViewed.map((resource) => (
                  <div key={resource.id} className="flex items-center justify-between rounded-md border border-border px-4 py-3">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-brand-500" />
                      <span className="font-medium text-gray-800 dark:text-zinc-200">{resource.titulo}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {resource.visualizaciones}
                      </span>
                      <span>{resource.descargas} descargas</span>
                    </div>
                  </div>
                ))}
                {mostViewed.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-zinc-400">Aún no hay métricas suficientes.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
