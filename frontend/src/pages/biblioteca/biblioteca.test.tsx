import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import Biblioteca from "./index"
import api from "@/services/api"
import { getCatalogFacets, searchCatalog, type CatalogFacets } from "@/services/resources"
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
    searchCatalog: vi.fn(),
    getCatalogFacets: vi.fn(),
  }
})

const facets: CatalogFacets = {
  total: 1,
  tipos: [
    { id: 1, nombre: "Libro", count: 1 },
    { id: 2, nombre: "Tesis", count: 0 },
  ],
  cursos: [{ id: 1, nombre: "Química General", count: 1 }],
  anios: [{ anio: 2026, count: 1 }],
}

function lastSearchParams() {
  const calls = vi.mocked(searchCatalog).mock.calls
  return calls[calls.length - 1][0]
}

describe("Biblioteca", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockResolvedValue({ data: [{ id: 1, nombre: "Libro" }] })
    vi.mocked(searchCatalog).mockResolvedValue({ items: mockResources, total: 1 })
    vi.mocked(getCatalogFacets).mockResolvedValue(facets)
  })

  it("muestra resultados, total y facetas con conteos", async () => {
    renderWithProviders(<Biblioteca />)

    expect(screen.getByText(/buscando/i)).toBeInTheDocument()
    expect(await screen.findByText("Balance de Materia")).toBeInTheDocument()
    expect(screen.getByText(/mostrando 1–1 de 1 recurso/i)).toBeInTheDocument()

    // Las facetas vacías no se muestran (Tesis tiene 0).
    const libro = await screen.findAllByRole("button", { name: /^libro\s*1$/i })
    expect(libro.length).toBeGreaterThan(0)
    expect(screen.queryByRole("button", { name: /^tesis/i })).not.toBeInTheDocument()
    expect(lastSearchParams()).toMatchObject({ sort: "recent", skip: 0, limit: 24 })
  })

  it("aplica los filtros de la URL al cargar", async () => {
    renderWithProviders(<Biblioteca />, { route: "/?q=balance&tipo=1&orden=views&pagina=2" })

    await waitFor(() => expect(searchCatalog).toHaveBeenCalled())
    expect(lastSearchParams()).toMatchObject({
      search: "balance",
      tipo_recurso_id: 1,
      sort: "views",
      skip: 24,
      limit: 24,
    })
    expect(screen.getByRole("searchbox")).toHaveValue("balance")
  })

  it("filtra por curso en el servidor y muestra el filtro activo", async () => {
    renderWithProviders(<Biblioteca />)
    const [curso] = await screen.findAllByRole("button", { name: /química general\s*1/i })

    await userEvent.click(curso)

    await waitFor(() => expect(lastSearchParams()).toMatchObject({ curso_id: 1, skip: 0 }))
    expect(await screen.findByRole("button", { name: /quitar filtro química general/i })).toBeInTheDocument()
  })

  it("busca con debounce y ofrece quitar filtros cuando no hay resultados", async () => {
    renderWithProviders(<Biblioteca />, { route: "/?tipo=1" })
    await screen.findByText("Balance de Materia")

    vi.mocked(searchCatalog).mockResolvedValue({ items: [], total: 0 })
    await userEvent.type(screen.getByRole("searchbox"), "nada")

    await waitFor(() => expect(lastSearchParams()).toMatchObject({ search: "nada", tipo_recurso_id: 1 }))
    expect(await screen.findByText(/no encontramos recursos para «nada»/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: /quitar «libro»/i }))
    await waitFor(() => expect(lastSearchParams().tipo_recurso_id).toBeUndefined())

    await userEvent.click(screen.getByRole("button", { name: /^borrar búsqueda$/i }))
    await waitFor(() => expect(lastSearchParams().search).toBeUndefined())
    expect(screen.getByRole("searchbox")).toHaveValue("")
  })

  it("pagina en el servidor", async () => {
    vi.mocked(searchCatalog).mockResolvedValue({ items: mockResources, total: 60 })
    renderWithProviders(<Biblioteca />)
    await screen.findByText(/mostrando 1–24 de 60 recursos/i)

    await userEvent.click(screen.getByRole("button", { name: "Página siguiente" }))

    await waitFor(() => expect(lastSearchParams()).toMatchObject({ skip: 24 }))
    expect(await screen.findByText(/mostrando 25–48 de 60 recursos/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Página 2" })).toHaveAttribute("aria-current", "page")
  })
})
