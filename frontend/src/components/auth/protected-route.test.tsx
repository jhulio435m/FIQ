import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { MemoryRouter, Route, Routes } from "react-router"

import { ProtectedRoute } from "./protected-route"
import { useAuthStore } from "@/stores/auth"

function renderProtectedRoute() {
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route path="/login" element={<p>Login requerido</p>} />
        <Route path="/" element={<p>Inicio</p>} />
        <Route element={<ProtectedRoute allowedRoles={["Admin"]} />}>
          <Route path="/admin" element={<p>Panel privado</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe("ProtectedRoute", () => {
  it("redirige usuarios no autenticados al login", () => {
    renderProtectedRoute()

    expect(screen.getByText(/login requerido/i)).toBeInTheDocument()
  })

  it("bloquea roles no autorizados", () => {
    useAuthStore.getState().setAuth({
      id: "student-id",
      email: "estudiante@fiq.uncp.edu.pe",
      nombre: "Estudiante",
      rol_id: 3,
      rol: "Estudiante",
      esta_activo: true,
    }, "token")

    renderProtectedRoute()

    expect(screen.getByText("Inicio")).toBeInTheDocument()
  })
})
