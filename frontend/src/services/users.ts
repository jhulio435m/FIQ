import api from "./api"
import type { Usuario } from "@/types/user"

export interface UsuarioUpdate {
  nombre?: string
  email?: string
  password?: string
}

export async function getMe() {
  const { data } = await api.get<Usuario>("/users/me")
  return data
}

export async function updateMe(values: UsuarioUpdate) {
  const { data } = await api.patch<Usuario>("/users/me", values)
  return data
}

export async function getUsers() {
  const { data } = await api.get<Usuario[]>("/users")
  return data
}

export async function updateUserRole(userId: number | string, rolId: number) {
  const { data } = await api.patch<Usuario>(`/users/${userId}/role`, { rol_id: rolId })
  return data
}

export async function updateUserStatus(userId: number | string, estaActivo: boolean) {
  const { data } = await api.patch<Usuario>(`/users/${userId}/status`, { esta_activo: estaActivo })
  return data
}
