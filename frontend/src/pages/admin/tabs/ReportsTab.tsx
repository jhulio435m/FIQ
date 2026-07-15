import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Download, Eye, FileText, Loader2, RefreshCw } from "lucide-react"
import { useReportsData } from "@/hooks/use-reports-data"
import { exportReportsCsv } from "@/lib/exportCsv"

export function ReportsTab() {
  const { mostViewedQuery } = useReportsData()
  const { data: mostViewed = [], isLoading, isError, refetch } = mostViewedQuery

  const [reportSearch, setReportSearch] = useState("")
  const [reportOrder, setReportOrder] = useState<"views" | "downloads" | "title">("views")

  const filteredReports = useMemo(() => {
    const search = reportSearch.trim().toLowerCase()
    return mostViewed
      .filter((resource) => !search || resource.titulo.toLowerCase().includes(search))
      .sort((a, b) => {
        if (reportOrder === "downloads") return b.descargas - a.descargas
        if (reportOrder === "title") return a.titulo.localeCompare(b.titulo)
        return b.visualizaciones - a.visualizaciones
      })
  }, [mostViewed, reportOrder, reportSearch])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-brand-700 dark:text-brand-400 text-lg">Reportes y Métricas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto_auto]">
          <Input
            value={reportSearch}
            onChange={(event) => setReportSearch(event.target.value)}
            placeholder="Filtrar por título o referencia"
            aria-label="Filtrar reportes"
          />
          <select
            value={reportOrder}
            onChange={(event) => setReportOrder(event.target.value as typeof reportOrder)}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
            aria-label="Ordenar reportes"
          >
            <option value="views">Más consultados</option>
            <option value="downloads">Más descargados</option>
            <option value="title">Título</option>
          </select>
          <Button type="button" variant="outline" onClick={() => void refetch()} className="cursor-pointer">
            <RefreshCw className="mr-1 h-4 w-4" />
            Refrescar
          </Button>
          <Button type="button" onClick={() => exportReportsCsv(filteredReports)} disabled={filteredReports.length === 0} className="cursor-pointer">
            <Download className="mr-1 h-4 w-4" />
            CSV
          </Button>
        </div>

        <div className="space-y-4" aria-live="polite">
          {isLoading && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            </div>
          )}
          {isError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              No se pudieron cargar los reportes. Revisa la conexión o vuelve a intentar.
            </div>
          )}
          {!isLoading && !isError && filteredReports.map((resource) => (
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
          {!isLoading && !isError && filteredReports.length === 0 && (
            <div className="rounded-md border border-dashed border-border p-6 text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-zinc-200">Sin resultados para los filtros actuales.</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">Limpia el texto o cambia el ordenamiento para revisar otras métricas.</p>
              <Button type="button" variant="outline" className="mt-3 cursor-pointer" onClick={() => setReportSearch("")}>
                Limpiar filtros
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
