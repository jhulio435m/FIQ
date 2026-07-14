import { create } from "zustand"
import type { Usuario } from "@/types/user"

interface AuthState {
  user: Usuario | null
  accessToken: string | null
  setAuth: (user: Usuario, token: string) => void
  logout: () => void
  isAuthenticated: () => boolean
}

const memoryStorage = new Map<string, string>()

function getStorage() {
  if (typeof globalThis.localStorage !== "undefined") {
    return globalThis.localStorage
  }
  return {
    getItem: (key: string) => memoryStorage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memoryStorage.set(key, value)
    },
    removeItem: (key: string) => {
      memoryStorage.delete(key)
    },
    clear: () => {
      memoryStorage.clear()
    },
  }
}

function loadAuth(): { user: Usuario | null; accessToken: string | null } {
  try {
    const storage = getStorage()
    const token = storage.getItem("access_token")
    const user = storage.getItem("user")
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
      const storage = getStorage()
      storage.setItem("access_token", token)
      storage.setItem("user", JSON.stringify(user))
      set({ user, accessToken: token })
    },
    logout: () => {
      const storage = getStorage()
      storage.removeItem("access_token")
      storage.removeItem("user")
      set({ user: null, accessToken: null })
    },
    isAuthenticated: () => get().accessToken !== null,
  }
})
