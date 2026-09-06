import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { renderWithProviders } from "@/test/render"
import MiBibliotecaPage from "."


describe("MiBibliotecaPage", () => {
  it("muestra lecturas personales, listas e historial privado", async () => {
    const user = userEvent.setup()
    renderWithProviders(<MiBibliotecaPage />, { route: "/mi-biblioteca" })

    expect(await screen.findByText("Balance de Materia")).toBeInTheDocument()
    expect(screen.getByText("Página 18")).toBeInTheDocument()

    await user.click(screen.getByRole("tab", { name: "Listas" }))
    expect(await screen.findByText("Termodinámica")).toBeInTheDocument()
    expect(screen.getByText("Privada")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Compartir" })).toBeEnabled()
    expect(screen.getByRole("button", { name: "Quitar de la lista" })).toBeEnabled()

    await user.click(screen.getByRole("tab", { name: "Historial" }))
    expect(await screen.findByText("Solo tú puedes ver esta actividad.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Borrar historial" })).toBeEnabled()
  })
})
