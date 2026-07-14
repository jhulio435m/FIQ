import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import Biblioteca from "./index"
import api from "@/services/api"
import { getResources } from "@/services/resources"
import { mockResources } from "@/test/server"
import { renderWithProviders } from "@/test/render"

vi.mock("@/services/api", () => ({
  default: {
    get: vi.fn(),
    defaults: {},
  },
}))

vi.mock("@/services/resources", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/resources")>()
  return {
    ...actual,
    getResources: vi.fn(),
  }
})

describe("Biblioteca", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockResolvedValue({ data: [{ id: 1, nombre: "Libro" }] })
    vi.mocked(getResources).mockResolvedValue(mockResources)
  })

  it("carga recursos, permite búsqueda y muestra filtros", async () => {
    renderWithProviders(<Biblioteca />)

    expect(screen.getByText(/buscando/i)).toBeInTheDocument()
    expect(await screen.findByText("Balance de Materia")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Libro" })).toBeInTheDocument()

    vi.mocked(getResources).mockResolvedValueOnce([])
    await userEvent.type(screen.getByRole("textbox"), "nada")

    await waitFor(() => {
      expect(screen.getByText(/no se encontraron recursos/i)).toBeInTheDocument()
    })
  })

  it("muestra empty state cuando la API responde lista vacía", async () => {
    vi.mocked(getResources).mockResolvedValue([])

    renderWithProviders(<Biblioteca />)

    expect(await screen.findByText(/no se encontraron recursos/i)).toBeInTheDocument()
  })
})
