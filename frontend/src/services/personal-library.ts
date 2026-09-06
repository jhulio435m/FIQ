import api from "./api"
import type { Recurso } from "./resources"

export type ReadingStatus = "quiero_leer" | "leyendo" | "leido"

export interface PersonalResource {
  recurso: Recurso
  favorito: boolean
  estado_lectura: ReadingStatus | null
  progreso_pagina: number
  ultima_lectura: string | null
  updated_at: string
}

export interface PersonalResourceUpdate {
  favorito: boolean
  estado_lectura: ReadingStatus | null
  progreso_pagina: number
}

export interface LibraryListSummary {
  id: string
  nombre: string
  descripcion: string | null
  es_publica: boolean
  created_at: string
  updated_at: string
}

export interface LibraryList extends LibraryListSummary {
  recursos: Recurso[]
}

export interface PersonalHistoryEntry {
  id: number
  accion: "view" | "download"
  recurso_id: number | null
  titulo: string | null
  fecha_hora: string
}

export interface Bookmark {
  id: string
  usuario_id: string
  recurso_id: number
  pagina: number
  titulo: string
  contenido: string | null
  color: string | null
  created_at: string
  updated_at: string
}

export interface BookmarkCreate {
  pagina: number
  titulo: string
  contenido?: string | null
  color?: string | null
}

export interface BookmarkUpdate {
  pagina?: number
  titulo?: string
  contenido?: string | null
  color?: string | null
}

export async function getMyResources() {
  const { data } = await api.get<PersonalResource[]>("/library/me/resources")
  return data
}

export async function getMyResource(resourceId: number) {
  const { data } = await api.get<PersonalResource | null>(`/library/me/resources/${resourceId}`)
  return data
}

export async function saveMyResource(resourceId: number, payload: PersonalResourceUpdate) {
  const { data } = await api.put<PersonalResource>(`/library/me/resources/${resourceId}`, payload)
  return data
}

export async function removeMyResource(resourceId: number) {
  await api.delete(`/library/me/resources/${resourceId}`)
}

export async function getMyLists() {
  const { data } = await api.get<LibraryList[]>("/library/me/lists")
  return data
}

export async function createList(payload: { nombre: string; descripcion?: string; es_publica: boolean }) {
  const { data } = await api.post<LibraryListSummary>("/library/me/lists", payload)
  return data
}

export async function deleteList(listId: string) {
  await api.delete(`/library/me/lists/${listId}`)
}

export async function updateList(listId: string, payload: { es_publica: boolean }) {
  const { data } = await api.patch<LibraryListSummary>(`/library/me/lists/${listId}`, payload)
  return data
}

export async function addResourceToList(listId: string, resourceId: number) {
  const { data } = await api.post<LibraryList>(`/library/me/lists/${listId}/resources/${resourceId}`)
  return data
}

export async function removeResourceFromList(listId: string, resourceId: number) {
  const { data } = await api.delete<LibraryList>(`/library/me/lists/${listId}/resources/${resourceId}`)
  return data
}

export async function getMyHistory() {
  const { data } = await api.get<PersonalHistoryEntry[]>("/library/me/history")
  return data
}

export async function clearMyHistory() {
  await api.delete("/library/me/history")
}

export async function getBookmarks(resourceId: number) {
  const { data } = await api.get<Bookmark[]>(`/library/me/resources/${resourceId}/bookmarks`)
  return data
}

export async function createBookmark(resourceId: number, payload: BookmarkCreate) {
  const { data } = await api.post<Bookmark>(`/library/me/resources/${resourceId}/bookmarks`, payload)
  return data
}

export async function updateBookmark(bookmarkId: string, payload: BookmarkUpdate) {
  const { data } = await api.patch<Bookmark>(`/library/me/bookmarks/${bookmarkId}`, payload)
  return data
}

export async function deleteBookmark(bookmarkId: string) {
  await api.delete(`/library/me/bookmarks/${bookmarkId}`)
}

