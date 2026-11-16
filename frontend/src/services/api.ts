import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios"
import { useAuthStore } from "@/stores/auth"
import type { Usuario } from "@/types/user"

function getStoredAccessToken() {
  try {
    return globalThis.localStorage?.getItem("access_token") ?? null
  } catch {
    return null
  }
}

const defaultBaseURL = import.meta.env.MODE === "test" ? "http://localhost/api" : "/api"
const baseURL = import.meta.env.VITE_API_URL || defaultBaseURL

const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
})

// Cliente sin interceptores: evita bucles cuando el propio refresh devuelve 401.
const refreshClient = axios.create({ baseURL, withCredentials: true })

interface RefreshResponse {
  access_token: string
  usuario: Usuario
}

interface RetriableRequest extends InternalAxiosRequestConfig {
  _retried?: boolean
}

const AUTH_ENDPOINTS = ["/auth/login", "/auth/refresh", "/auth/logout", "/auth/microsoft"]

// Un solo refresh en vuelo: varias peticiones que fallan a la vez esperan el mismo.
let refreshInFlight: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = refreshClient
      .post<RefreshResponse>("/auth/refresh")
      .then(({ data }) => {
        useAuthStore.getState().setAuth(data.usuario, data.access_token)
        return data.access_token
      })
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}

api.interceptors.request.use((config) => {
  const token = getStoredAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = err.config as RetriableRequest | undefined
    const isAuthEndpoint = AUTH_ENDPOINTS.some((path) => original?.url?.startsWith(path))

    if (err.response?.status === 401 && original && !original._retried && !isAuthEndpoint) {
      original._retried = true
      const newToken = await refreshAccessToken()
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      }
    }

    if (err.response?.status === 401 && !isAuthEndpoint && !window.location.pathname.includes("/login")) {
      useAuthStore.getState().logout()
      window.location.href = "/login"
    }
    return Promise.reject(err)
  },
)

export default api
