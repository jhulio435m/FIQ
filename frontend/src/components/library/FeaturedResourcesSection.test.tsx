import { screen, waitFor, fireEvent } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { FeaturedResourcesSection } from "./FeaturedResourcesSection"
import { renderWithProviders } from "@/test/render"

describe("FeaturedResourcesSection", () => {
  it("renderiza colecciones destacadas y permite cambiar de tab", async () => {
    const onSelect = vi.fn()
    renderWithProviders(<FeaturedResourcesSection onSelect={onSelect} />)

    await waitFor(() => {
      expect(screen.getByText("Descubrimiento y Colecciones Destacadas")).toBeInTheDocument()
    })

    expect(screen.getByText(/Novedades/)).toBeInTheDocument()
    expect(screen.getByText(/Más consultados/)).toBeInTheDocument()
    expect(screen.getByText(/Más descargados/)).toBeInTheDocument()

    // Switch tab
    fireEvent.click(screen.getByText(/Más consultados/))
    expect(screen.getAllByText("Balance de Materia").length).toBeGreaterThan(0)
  })

  it("permite colapsar y expandir la sección", async () => {
    renderWithProviders(<FeaturedResourcesSection onSelect={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText("Descubrimiento y Colecciones Destacadas")).toBeInTheDocument()
    })

    const toggleBtn = screen.getByRole("button", { name: /Ocultar/i })
    fireEvent.click(toggleBtn)

    expect(screen.queryByText(/Novedades \(/)).not.toBeInTheDocument()
  })
})
