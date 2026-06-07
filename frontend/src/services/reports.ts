import api from "./api"

export interface MostViewedResource {
  id: number
  titulo: string
  visualizaciones: number
  descargas: number
}

export interface LabsUsage {
  total_accesos_laboratorios?: number
  total?: number
}

export async function getMostViewedResources() {
  const { data } = await api.get<MostViewedResource[]>("/reports/most-viewed")
  return data
}

export async function getLabsUsage() {
  const { data } = await api.get<LabsUsage>("/reports/labs-usage")
  return data
}
