import api from "./api"
import type { Usuario } from "@/types/user"

export interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
  usuario: Usuario
}

export async function login(data: { email: string; password: string }) {
  const { data: response } = await api.post<LoginResponse>("/auth/login", data)
  return response
}

export async function logout() {
  await api.post("/auth/jwt/logout")
}

export async function getMicrosoftAuthorizeUrl(redirectUri: string) {
  const { data } = await api.get<{ url: string }>("/auth/microsoft/authorize-url", {
    params: { redirect_uri: redirectUri },
  })
  return data.url
}

export async function microsoftLogin(code: string, redirectUri: string) {
  const { data: response } = await api.post<LoginResponse>("/auth/microsoft", {
    code,
    redirect_uri: redirectUri,
  })
  return response
}
