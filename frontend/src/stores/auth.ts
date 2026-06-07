import { create } from "zustand"
import type { Usuario } from "@/types/user"

interface AuthState {
  user: Usuario | null
  accessToken: string | null
  setAuth: (user: Usuario, token: string) => void
  logout: () => void
  isAuthenticated: () => boolean
}

function loadAuth(): { user: Usuario | null; accessToken: string | null } {
  try {
    const token = localStorage.getItem("access_token")
    const user = localStorage.getItem("user")
    return {
      accessToken: token,
      user: user ? JSON.parse(user) : null,
    }
  } catch {
    return { user: null, accessToken: null }
  }
}

export const useAuthStore = create<AuthState>((set, get) => {
  const initial = loadAuth()
  return {
    user: initial.user,
    accessToken: initial.accessToken,
    setAuth: (user, token) => {
      localStorage.setItem("access_token", token)
      localStorage.setItem("user", JSON.stringify(user))
      set({ user, accessToken: token })
    },
    logout: () => {
      localStorage.removeItem("access_token")
      localStorage.removeItem("user")
      set({ user: null, accessToken: null })
    },
    isAuthenticated: () => get().accessToken !== null,
  }
})
