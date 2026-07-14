import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { ExternalCatalogPanel } from "./external-catalog-panel"
import { renderWithProviders } from "@/test/render"
import { searchExternalBooks } from "@/services/external-catalog"

describe("ExternalCatalogPanel", () => {
  it("consulta el servicio externo con MSW", async () => {
    await expect(searchExternalBooks({ q: "termodinamica", limit: 6 })).resolves.toMatchObject({
      results: [{ title: "Termodinamica aplicada" }],
    })
  })

  it("busca libros externos y permite importarlos para revisión", async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <ExternalCatalogPanel
        query="termodinamica"
        tipos={[{ id: 1, nombre: "Libro" }]}
        canImport
      />,
    )

    expect(await screen.findByText("Termodinamica aplicada")).toBeInTheDocument()
    expect(screen.getByText("Open Library")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /ver fuente/i })).toHaveAttribute(
      "href",
      "https://openlibrary.org/works/OL123W",
    )

    await user.click(screen.getByRole("button", { name: /importar/i }))

    await waitFor(() => {
      expect(screen.getByText("Termodinamica aplicada")).toBeInTheDocument()
    })
  })
})
