import { screen, waitFor, fireEvent } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { CommunityReportsTab } from "./CommunityReportsTab"
import { renderWithProviders } from "@/test/render"

describe("CommunityReportsTab", () => {
  it("muestra la lista de incidencias reportadas y permite resolverlas", async () => {
    renderWithProviders(<CommunityReportsTab />)

    await waitFor(() => {
      expect(screen.getByText("Metadatos incorrectos")).toBeInTheDocument()
    })
    expect(screen.getByText(/El año de publicación en la portada dice 2024/)).toBeInTheDocument()
    expect(screen.getByText("estudiante@fiq.uncp.edu.pe")).toBeInTheDocument()

    // Click on Resolver
    const resolveBtn = screen.getByRole("button", { name: /Resolver/i })
    fireEvent.click(resolveBtn)

    expect(screen.getByText("Resolver Incidencia")).toBeInTheDocument()

    // Fill resolution note
    const input = screen.getByPlaceholderText(/Ej: Metadatos corregidos y archivo resubido/i)
    fireEvent.change(input, { target: { value: "Metadatos corregidos a año 2024" } })

    // Confirm resolution
    const confirmBtn = screen.getByRole("button", { name: /Confirmar resolución/i })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(screen.queryByText("Resolver Incidencia")).not.toBeInTheDocument()
    })
  })
})
