import { screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ResourceReviewsPanel } from "./ResourceReviewsPanel"
import { renderWithProviders } from "@/test/render"

describe("ResourceReviewsPanel", () => {
  it("muestra el resumen de valoraciones y reseñas existentes", async () => {
    renderWithProviders(<ResourceReviewsPanel resourceId={1} />)

    await waitFor(() => {
      expect(screen.getByText("4.5")).toBeInTheDocument()
    })
    expect(screen.getByText("(2)")).toBeInTheDocument()
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument()
    expect(screen.getByText(/Excelente material para el curso/)).toBeInTheDocument()
  })
})
