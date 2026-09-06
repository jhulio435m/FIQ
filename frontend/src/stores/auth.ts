import { create } from "zustand"
import type { Usuario } from "@/types/user"
import { logout as apiLogout } from "@/services/auth"
import { queryClient } from "@/lib/query-client"

interface AuthState {
  user: Usuario | null
  accessToken: string | null
  setAuth: (user: Usuario, token: string) => void
  clearAuth: () => void
  logout: () => Promise<void>
  isAuthenticated: () => boolean
}

// Remove credentials persisted by earlier releases. New tokens live only in memory.
try {
  for (const key of ["access_token", "refresh_token", "user"]) {
    globalThis.localStorage?.removeItem(key)
  }
} catch { /* Storage can be disabled; session restoration uses an HttpOnly cookie. */ }

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  setAuth: (user, accessToken) => {
    if (get().user?.id !== user.id) queryClient.clear()
    set({ user, accessToken })
  },
  clearAuth: () => {
    queryClient.clear()
    set({ user: null, accessToken: null })
  },
  logout: async () => {
    // Keep the session visible when revocation fails, allowing the user to retry.
    await apiLogout()
    get().clearAuth()
  },
  isAuthenticated: () => get().accessToken !== null,
}))
