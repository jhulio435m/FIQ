import api from "./api"
import type { Recurso } from "./resources"

export interface ExternalWork {
  source: string
  external_id: string
  resource_type: string
  title: string
  authors: string[]
  summary: string | null
  publisher: string | null
  published_year: number | null
  published_date: string | null
  isbn: string | null
  doi: string | null
  cover_url: string | null
  external_url: string | null
  open_access_url: string | null
  license: string | null
  subjects: string[]
}

export interface ExternalSearchResponse {
  results: ExternalWork[]
  warnings: string[]
}

export interface ImportExternalResourcePayload {
  source: string
  external_id: string
  titulo: string
  tipo_recurso_id: number
  resumen?: string | null
  curso_id?: number | null
  autores?: string | null
  editorial?: string | null
  doi?: string | null
  anio?: number | null
  external_url?: string | null
  open_access_url?: string | null
  cover_url?: string | null
}

export async function searchExternalBooks(params: { q?: string; isbn?: string; limit?: number }) {
  const { data } = await api.get<ExternalSearchResponse>("/external/search/books", { params })
  return data
}

export async function searchExternalArticles(params: { q?: string; doi?: string; limit?: number }) {
  const { data } = await api.get<ExternalSearchResponse>("/external/search/articles", { params })
  return data
}

export async function importExternalResource(payload: ImportExternalResourcePayload) {
  const { data } = await api.post<Recurso>("/resources/import-external", payload)
  return data
}
