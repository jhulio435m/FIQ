import { screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ResourceRelatedPanel } from "./ResourceRelatedPanel"
import { renderWithProviders } from "@/test/render"

describe("ResourceRelatedPanel", () => {
  it("renderiza recomendaciones de recursos relacionados", async () => {
    renderWithProviders(<ResourceRelatedPanel resourceId={1} />)

    await waitFor(() => {
      expect(screen.getByText("Recursos recomendados")).toBeInTheDocument()
    })

    expect(screen.getByText("Balance de Materia")).toBeInTheDocument()
  })
})
