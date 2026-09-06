import { describe, expect, it } from "vitest"
import { http, HttpResponse } from "msw"
import { server } from "@/test/server"
import { restoreSession } from "./api"
import { useAuthStore } from "@/stores/auth"

describe("sesión HttpOnly", () => {
  it("comparte una sola renovación concurrente sin persistir tokens", async () => {
    let calls = 0
    server.use(http.post("http://localhost/api/auth/refresh", ({ request }) => {
      calls += 1
      expect(request.headers.get("X-Requested-With")).toBe("FIQ")
      return HttpResponse.json({ access_token: "memory-only", usuario: {
        id: "user-1", nombre: "Estudiante", email: "estudiante@uncp.edu.pe",
        rol: "Estudiante", rol_id: 3, esta_activo: true,
      } })
    }))
    await Promise.all([restoreSession(), restoreSession(), restoreSession()])
    expect(calls).toBe(1)
    expect(useAuthStore.getState().accessToken).toBe("memory-only")
    expect(localStorage.getItem("access_token")).toBeNull()
    expect(localStorage.getItem("refresh_token")).toBeNull()
  })

  it("permite reintentar logout si el servidor no revoca la sesión", async () => {
    const store = useAuthStore.getState()
    store.setAuth({ id: "user-1", nombre: "Usuario", email: "u@uncp.edu.pe",
      rol: "Estudiante", rol_id: 3, esta_activo: true }, "active-token")
    server.use(http.post("http://localhost/api/auth/logout", () => new HttpResponse(null, { status: 503 })))
    await expect(store.logout()).rejects.toThrow()
    expect(useAuthStore.getState().isAuthenticated()).toBe(true)
    server.use(http.post("http://localhost/api/auth/logout", () => HttpResponse.json({ message: "ok" })))
    await store.logout()
    expect(useAuthStore.getState().isAuthenticated()).toBe(false)
  })
})
