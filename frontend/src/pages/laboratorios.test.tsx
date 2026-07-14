import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import Laboratorios from "./laboratorios"
import { getLab, getLabs } from "@/services/labs"
import { renderWithProviders } from "@/test/render"

vi.mock("@/services/labs", () => ({
  getLabs: vi.fn(),
  getLab: vi.fn(),
}))

describe("Laboratorios", () => {
  beforeEach(() => {
    const lab = {
      id: 1,
      titulo: "Destilación fraccionada",
      descripcion: "Simula separación por volatilidad relativa.",
      url_simulacion: "/labs/destilacion",
      nivel_id: 1,
      esta_activo: true,
    }
    vi.mocked(getLabs).mockResolvedValue([lab])
    vi.mocked(getLab).mockResolvedValue(lab)
  })

  it("renderiza estructura educativa y permite marcar completado", async () => {
    renderWithProviders(<Laboratorios />)

    expect(await screen.findByText(/destilación fraccionada/i)).toBeInTheDocument()
    expect(screen.getByText(/objetivo/i)).toBeInTheDocument()
    expect(screen.getAllByText(/reflexión/i).length).toBeGreaterThan(0)

    await userEvent.click(screen.getByRole("button", { name: /completar/i }))

    expect(screen.getByText(/completado/i)).toBeInTheDocument()
  })
})
