import axios, { type InternalAxiosRequestConfig } from "axios"
import { useAuthStore } from "@/stores/auth"
import type { Usuario } from "@/types/user"

const defaultBaseURL = import.meta.env.MODE === "test" ? "http://localhost/api" : "/api"
const baseURL = import.meta.env.VITE_API_URL || defaultBaseURL
const options = {
  baseURL,
  headers: { "Content-Type": "application/json", "X-Requested-With": "FIQ" },
  withCredentials: true,
  timeout: 15000,
}
const api = axios.create(options)
const sessionApi = axios.create(options)

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _refreshAttempted?: boolean
}

interface RefreshResponse {
  access_token: string
  usuario: Usuario
}

let refreshing: Promise<RefreshResponse> | null = null

export function restoreSession(): Promise<RefreshResponse> {
  if (!refreshing) {
    const refresh = async () => {
      const { data } = await sessionApi.post<RefreshResponse>("/auth/refresh")
      useAuthStore.getState().setAuth(data.usuario, data.access_token)
      return data
    }
    // Web Locks serialize rotation across tabs sharing the same refresh cookie.
    refreshing = (typeof navigator !== "undefined" && navigator.locks
      ? navigator.locks.request("fiq-refresh", refresh)
      : refresh()).finally(() => { refreshing = null })
  }
  return refreshing
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error)
    const request = error.config as RetryableRequestConfig | undefined
    if (error.response?.status !== 401 || !request || request.url?.startsWith("/auth/")) {
      return Promise.reject(error)
    }
    if (!request._refreshAttempted && useAuthStore.getState().user) {
      request._refreshAttempted = true
      try {
        const data = await restoreSession()
        request.headers.Authorization = `Bearer ${data.access_token}`
        return api(request)
      } catch {
        useAuthStore.getState().clearAuth()
      }
    }
    return Promise.reject(error)
  },
)

export default api
