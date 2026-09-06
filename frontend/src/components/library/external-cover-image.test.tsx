import { fireEvent, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderWithProviders } from "@/test/render"
import { ExternalCoverImage } from "./external-cover-image"


describe("ExternalCoverImage", () => {
  it("muestra una portada accesible cuando hay URL", () => {
    renderWithProviders(<ExternalCoverImage src="https://example.org/cover.jpg" title="Química" />)
    expect(screen.getByRole("img", { name: "Portada de Química" })).toHaveAttribute("referrerpolicy", "no-referrer")
  })

  it("reemplaza una imagen remota que no carga", () => {
    renderWithProviders(<ExternalCoverImage src="https://example.org/broken.jpg" title="Química" />)
    fireEvent.error(screen.getByRole("img", { name: "Portada de Química" }))
    expect(screen.getByLabelText("Sin portada disponible para Química")).toBeInTheDocument()
  })
})
