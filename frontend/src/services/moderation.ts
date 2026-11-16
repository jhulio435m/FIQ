import api from "./api"
import type { Recurso } from "./resources"

export type EstadoRecurso = "Pendiente" | "Aprobado" | "Observado" | "Rechazado" | "Archivado"

export interface ModerationItem extends Recurso {
  estado_nombre: EstadoRecurso
  subido_por_nombre: string | null
  subido_por_email: string | null
  ultimo_comentario: string | null
  ultimo_cambio: string | null
  reenvios: number
}

export interface HistoryEntry {
  id: number
  estado_anterior: EstadoRecurso | null
  estado_nuevo: EstadoRecurso
  comentario: string | null
  cambiado_por_nombre: string | null
  fecha_hora: string
}

export interface MyResources {
  items: ModerationItem[]
  conteos: Partial<Record<EstadoRecurso, number>>
}

export const MIN_COMMENT_LENGTH = 10

const STATUS_LABELS: Record<EstadoRecurso, string> = {
  Pendiente: "En revisión",
  Aprobado: "Publicado",
  Observado: "Requiere cambios",
  Rechazado: "Rechazado",
  Archivado: "Archivado",
}

/** Nombre del estado tal como lo ve el usuario. */
export function statusLabel(estado: EstadoRecurso) {
  return STATUS_LABELS[estado] ?? estado
}

export async function getModerationQueue() {
  const { data } = await api.get<ModerationItem[]>("/resources/pending")
  return data
}

export async function approveResource(id: number, comentario?: string) {
  const { data } = await api.patch<Recurso>(`/resources/${id}/approve`, comentario ? { comentario } : undefined)
  return data
}

export async function observeResource(id: number, comentario: string) {
  const { data } = await api.patch<Recurso>(`/resources/${id}/observe`, { comentario })
  return data
}

export async function rejectResource(id: number, comentario: string) {
  const { data } = await api.patch<Recurso>(`/resources/${id}/reject`, { comentario })
  return data
}

export async function bulkApprove(ids: number[], comentario?: string) {
  const { data } = await api.post<{ procesados: number[]; omitidos: number[] }>("/resources/bulk-approve", {
    ids,
    comentario,
  })
  return data
}

export async function getMyResources(estado?: EstadoRecurso) {
  const { data } = await api.get<MyResources>("/resources/mine", { params: estado ? { estado } : undefined })
  return data
}

export async function getResourceHistory(id: number) {
  const { data } = await api.get<HistoryEntry[]>(`/resources/${id}/history`)
  return data
}

export async function resubmitResource(id: number, nota?: string) {
  const { data } = await api.post<ModerationItem>(`/resources/${id}/resubmit`, nota ? { nota } : undefined)
  return data
}

export async function replaceResourceFile(id: number, file: File) {
  const form = new FormData()
  form.append("file", file)
  const { data } = await api.put<Recurso>(`/resources/${id}/file`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return data
}

/** PDF de un recurso con la sesión del usuario (necesario para los no publicados). */
export async function fetchResourceFile(id: number) {
  const { data } = await api.get<ArrayBuffer>(`/resources/${id}/file`, { responseType: "arraybuffer" })
  return data
}
