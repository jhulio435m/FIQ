import { fireEvent, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { ResourceGrid } from "./resource-grid"
import { mockResources } from "@/test/server"
import { renderWithProviders } from "@/test/render"

describe("ResourceGrid", () => {
  it("muestra skeletons durante carga", () => {
    renderWithProviders(<ResourceGrid resources={[]} isLoading onSelect={vi.fn()} />)

    expect(screen.getAllByRole("generic").length).toBeGreaterThan(0)
  })

  it("muestra empty state sin resultados", () => {
    renderWithProviders(<ResourceGrid resources={[]} isLoading={false} onSelect={vi.fn()} />)

    expect(screen.getByText(/no se encontraron recursos/i)).toBeInTheDocument()
  })

  it("renderiza recursos y permite seleccionar un recurso", () => {
    const onSelect = vi.fn()
    renderWithProviders(<ResourceGrid resources={mockResources} isLoading={false} onSelect={onSelect} />)

    fireEvent.click(screen.getByText("Balance de Materia"))

    expect(screen.getByText("Libro")).toBeInTheDocument()
    expect(onSelect).toHaveBeenCalledWith(mockResources[0])
  })
})
