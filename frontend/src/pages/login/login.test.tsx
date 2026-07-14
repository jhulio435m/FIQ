import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import Login from "./index"
import { login } from "@/services/auth"
import { useAuthStore } from "@/stores/auth"
import { renderWithProviders } from "@/test/render"

vi.mock("@/services/auth", () => ({
  login: vi.fn(),
}))

describe("Login", () => {
  beforeEach(() => {
    vi.mocked(login).mockReset()
    vi.mocked(login).mockResolvedValue({
      access_token: "test-token",
      refresh_token: "refresh-token",
      token_type: "bearer",
      usuario: {
        id: "admin-id",
        email: "admin@fiq.uncp.edu.pe",
        nombre: "Admin FIQ",
        rol_id: 1,
        rol: "Admin",
        esta_activo: true,
      },
    })
  })

  it("autentica credenciales válidas y guarda la sesión", async () => {
    renderWithProviders(<Login />, { route: "/login" })

    await userEvent.type(screen.getByLabelText(/correo institucional/i), "admin@fiq.uncp.edu.pe")
    await userEvent.type(screen.getByLabelText(/contraseña/i), "password123")
    await userEvent.click(screen.getByRole("button", { name: /ingresar/i }))

    await waitFor(() => {
      expect(useAuthStore.getState().user?.rol).toBe("Admin")
      expect(useAuthStore.getState().accessToken).toBe("test-token")
    })
  })

  it("muestra error accesible cuando las credenciales son inválidas", async () => {
    vi.mocked(login).mockRejectedValueOnce(new Error("invalid"))
    renderWithProviders(<Login />, { route: "/login" })

    await userEvent.type(screen.getByLabelText(/correo institucional/i), "wrong@example.com")
    await userEvent.type(screen.getByLabelText(/contraseña/i), "wrong")
    await userEvent.click(screen.getByRole("button", { name: /ingresar/i }))

    expect(await screen.findByText(/credenciales inválidas/i)).toBeInTheDocument()
    expect(useAuthStore.getState().user).toBeNull()
  })
})
