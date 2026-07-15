export function exportReportsCsv(filteredReports: { id: number; titulo: string; visualizaciones: number; descargas: number }[]) {
  const header = ["id", "titulo", "visualizaciones", "descargas"]
  const rows = filteredReports.map((resource) => [
    resource.id,
    `"${resource.titulo.replaceAll('"', '""')}"`,
    resource.visualizaciones,
    resource.descargas,
  ])
  const csv = [header, ...rows].map((row) => row.join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "reportes-fiq.csv"
  link.click()
  URL.revokeObjectURL(url)
}
