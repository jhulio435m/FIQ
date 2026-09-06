import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import Biblioteca from "./index"
import api from "@/services/api"
import { getResourceCatalog } from "@/services/resources"
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
    getResourceCatalog: vi.fn(),
  }
})

describe("Biblioteca", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockResolvedValue({ data: [{ id: 1, nombre: "Libro" }] })
    vi.mocked(getResourceCatalog).mockResolvedValue({
      items: mockResources,
      total: mockResources.length,
      skip: 0,
      limit: 20,
      has_more: false,
    })
  })

  it("carga recursos, permite búsqueda y muestra filtros", async () => {
    renderWithProviders(<Biblioteca />)

    expect(screen.getByText(/buscando/i)).toBeInTheDocument()
    expect(await screen.findByText("Balance de Materia")).toBeInTheDocument()
    expect(screen.getByText("1 resultado")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Libro" }).length).toBeGreaterThan(0)

    expect(getResourceCatalog).toHaveBeenCalledWith(expect.objectContaining({
      sort: "recent",
      skip: 0,
      limit: 20,
    }))

    vi.mocked(getResourceCatalog).mockResolvedValueOnce({
      items: [], total: 0, skip: 0, limit: 20, has_more: false,
    })
    await userEvent.type(screen.getByRole("textbox"), "nada")

    await waitFor(() => {
      expect(screen.getByText(/no se encontraron recursos/i)).toBeInTheDocument()
    })
  })

  it("usa un solo buscador y alterna entre biblioteca local y APIs", async () => {
    renderWithProviders(<Biblioteca />)

    expect(screen.getAllByRole("textbox")).toHaveLength(1)
    expect(await screen.findByText("Balance de Materia")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: /apis académicas/i }))

    expect(screen.getAllByRole("textbox")).toHaveLength(1)
    expect(screen.queryByText("Balance de Materia")).not.toBeInTheDocument()
    expect(screen.getByText("Fuentes externas")).toBeInTheDocument()
  })

  it("muestra empty state cuando la API responde lista vacía", async () => {
    vi.mocked(getResourceCatalog).mockResolvedValue({
      items: [], total: 0, skip: 0, limit: 20, has_more: false,
    })

    renderWithProviders(<Biblioteca />)

    expect(await screen.findByText(/no se encontraron recursos/i)).toBeInTheDocument()
  })
})
