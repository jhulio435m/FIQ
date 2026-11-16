import api from "./api"

export interface Recurso {
  id: number
  titulo: string
  resumen: string | null
  url_archivo: string
  archivo_size: number
  archivo_mime: string
  tipo_recurso_id: number
  estado_id: number
  subido_por: string
  visualizaciones: number
  descargas: number
  created_at: string
  tipo_recurso_nombre: string | null
  curso_nombre: string | null
  curso_id: number | null
  autores?: string | null
  editorial?: string | null
  doi?: string | null
  anio?: number | null
}

export interface TipoRecurso {
  id: number
  nombre: string
}

export interface Curso {
  id: number
  nombre: string
}

export type CatalogSort = "recent" | "views" | "downloads" | "title" | "year"

export interface SearchParams {
  search?: string
  tipo_recurso_id?: number
  curso_id?: number
  anio_desde?: number
  anio_hasta?: number
  sort?: CatalogSort
  skip?: number
  limit?: number
}

export interface CatalogPage {
  items: Recurso[]
  total: number
}

export interface FacetCount {
  id: number
  nombre: string
  count: number
}

export interface CatalogFacets {
  total: number
  tipos: FacetCount[]
  cursos: FacetCount[]
  anios: { anio: number; count: number }[]
}

export async function getResources(params: SearchParams = {}) {
  const { data } = await api.get<Recurso[]>("/resources", { params })
  return data
}

/** Página del catálogo con el total de resultados (cabecera X-Total-Count). */
export async function searchCatalog(params: SearchParams): Promise<CatalogPage> {
  const response = await api.get<Recurso[]>("/resources", { params })
  const header = response.headers?.["x-total-count"]
  const total = Number(header)
  return { items: response.data, total: Number.isFinite(total) && header !== undefined ? total : response.data.length }
}

export async function getCatalogFacets(
  params: Omit<SearchParams, "sort" | "skip" | "limit">,
): Promise<CatalogFacets> {
  const { data } = await api.get<CatalogFacets>("/resources/facets", { params })
  return data
}

export async function getResourceTypes() {
  const { data } = await api.get<TipoRecurso[]>("/resources/types")
  return data
}

export async function getCourses() {
  const { data } = await api.get<Curso[]>("/resources/courses")
  return data
}

export async function uploadResource(formData: FormData) {
  const { data } = await api.post<Recurso>("/resources", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return data
}

export async function getPendingResources() {
  const { data } = await api.get<Recurso[]>("/resources/pending")
  return data
}

export async function approveResource(id: number, comentario?: string) {
  const { data } = await api.patch<Recurso>(`/resources/${id}/approve`, { comentario })
  return data
}

export async function observeResource(id: number, comentario: string) {
  const { data } = await api.patch<Recurso>(`/resources/${id}/observe`, { comentario })
  return data
}

export async function trackView(id: number) {
  const { data } = await api.post<Recurso>(`/resources/${id}/view`)
  return data
}

export async function trackDownload(id: number) {
  const { data } = await api.post<{ download_url: string; resource: Recurso }>(`/resources/${id}/download`)
  return data
}

export async function getResourceUrl(id: number) {
  const { data } = await api.get<{ url: string }>(`/resources/${id}/url`)
  return data.url
}

export async function updateResource(
  id: number,
  payload: {
    titulo?: string
    resumen?: string | null
    tipo_recurso_id?: number
    curso_id?: number | null
    autores?: string | null
    editorial?: string | null
    doi?: string | null
    anio?: number | null
  }
) {
  const { data } = await api.patch<Recurso>(`/resources/${id}`, payload)
  return data
}

