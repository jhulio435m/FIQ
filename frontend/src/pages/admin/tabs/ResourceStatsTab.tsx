import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { usePendingResources, useReportsData } from "@/hooks/use-reports-data"

export function ResourceStatsTab() {
  const { query } = usePendingResources()
  const { mostViewedQuery, labsUsageQuery } = useReportsData()

  const pending = query.data || []
  const mostViewed = mostViewedQuery.data || []
  const labsUsage = labsUsageQuery.data

  return (
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
            <p className="mt-2 text-3xl font-bold text-brand-700 dark:text-brand-400">
              {labsUsage?.total_accesos_laboratorios ?? labsUsage?.total ?? 0}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
