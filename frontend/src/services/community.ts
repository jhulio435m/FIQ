import api from "./api"
import type { Recurso } from "./resources"

export interface Review {
  id: string
  recurso_id: number
  usuario_id: string
  usuario_nombre: string
  puntuacion: number
  comentario: string | null
  created_at: string
  updated_at: string
}

export interface ReviewsSummary {
  promedio: number
  total: number
  reviews: Review[]
}

export interface ReviewCreate {
  puntuacion: number
  comentario?: string | null
}

export interface FeaturedResources {
  recientes: Recurso[]
  mas_vistos: Recurso[]
  mas_descargados: Recurso[]
}

export interface ReportCreate {
  motivo: "archivo_corrupto" | "duplicado" | "metadatos_incorrectos" | "otro"
  descripcion: string
}

export interface Report {
  id: string
  recurso_id: number
  recurso_titulo?: string | null
  usuario_id: string
  usuario_email?: string | null
  motivo: string
  descripcion: string
  estado: "pendiente" | "resuelto" | "descartado"
  resolucion?: string | null
  created_at: string
  updated_at: string
}

export async function getFeaturedResources() {
  const { data } = await api.get<FeaturedResources>("/resources/featured")
  return data
}

export async function getRelatedResources(resourceId: number) {
  const { data } = await api.get<Recurso[]>(`/resources/${resourceId}/related`)
  return data
}

export async function getResourceReviews(resourceId: number) {
  const { data } = await api.get<ReviewsSummary>(`/resources/${resourceId}/reviews`)
  return data
}

export async function submitResourceReview(resourceId: number, payload: ReviewCreate) {
  const { data } = await api.post<Review>(`/resources/${resourceId}/reviews`, payload)
  return data
}

export async function deleteMyResourceReview(resourceId: number) {
  await api.delete(`/resources/${resourceId}/reviews/me`)
}

export async function createResourceReport(resourceId: number, payload: ReportCreate) {
  const { data } = await api.post<Report>(`/resources/${resourceId}/reports`, payload)
  return data
}

export async function getPendingReports() {
  const { data } = await api.get<Report[]>("/resources/reports/pending")
  return data
}

export async function updateReport(reportId: string, payload: { estado: string; resolucion?: string }) {
  const { data } = await api.patch<Report>(`/resources/reports/${reportId}`, payload)
  return data
}
