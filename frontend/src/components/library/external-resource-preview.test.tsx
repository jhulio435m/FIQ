import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ExternalResourcePreview } from "./external-resource-preview"
import { renderWithProviders } from "@/test/render"

describe("ExternalResourcePreview", () => {
  it("presenta la fuente externa sin intentar renderizarla como PDF", () => {
    renderWithProviders(<ExternalResourcePreview url="https://doi.org/10.1234/demo" />)

    expect(screen.getByText(/recurso disponible en una fuente externa/i)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /abrir fuente original/i })).toHaveAttribute(
      "href",
      "https://doi.org/10.1234/demo",
    )
  })
})
