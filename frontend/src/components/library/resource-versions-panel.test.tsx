import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderWithProviders } from "@/test/render"
import { ResourceVersionsPanel } from "./resource-versions-panel"


describe("ResourceVersionsPanel", () => {
  it("muestra la edición y marca el archivo actual", async () => {
    renderWithProviders(<ResourceVersionsPanel resourceId={1} />)

    expect(screen.getByText("Cargando ediciones…")).toBeInTheDocument()
    expect(await screen.findByRole("heading", { name: "Ediciones y formatos" })).toBeInTheDocument()
    expect(screen.getByText("1 edición(es) · 1 archivo(s)")).toBeInTheDocument()
    expect(screen.getByText("PDF · actual")).toBeInTheDocument()
  })

  it("presenta un estado neutro si el recurso todavía no tiene obra", async () => {
    renderWithProviders(<ResourceVersionsPanel resourceId={999} />)

    expect(await screen.findByText("Información de ediciones no disponible.")).toBeInTheDocument()
  })
})
