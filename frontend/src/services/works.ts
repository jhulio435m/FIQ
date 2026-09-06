import api from "./api"


export interface BibliographicFile {
  id: string
  recurso_id: number
  formato: string
  mime_type: string
  tamano: number
}

export interface BibliographicEdition {
  id: string
  titulo: string
  editorial: string | null
  anio: number | null
  idioma: string | null
  doi: string | null
  isbns: string[]
  archivos: BibliographicFile[]
}

export interface BibliographicWork {
  id: string
  titulo_canonico: string
  resumen: string | null
  autores: string | null
  temas: string | null
  idioma: string | null
  created_at: string
  updated_at: string
  ediciones: BibliographicEdition[]
}


export async function getWorkByResource(resourceId: number) {
  const { data } = await api.get<BibliographicWork>(`/works/by-resource/${resourceId}`)
  return data
}
