import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { UploadDialog } from "./upload-dialog"
import { renderWithProviders } from "@/test/render"

describe("UploadDialog", () => {
  it("abre el formulario y valida campos requeridos", async () => {
    renderWithProviders(<UploadDialog />)

    await userEvent.click(screen.getByRole("button", { name: /subir recurso/i }))
    await userEvent.click(screen.getByRole("button", { name: /iniciar subida/i }))

    expect(await screen.findByText(/el título debe tener al menos 5 caracteres/i)).toBeInTheDocument()
    expect(await screen.findByText(/debe seleccionar un archivo pdf/i)).toBeInTheDocument()
    expect(await screen.findByText(/seleccione un tipo de recurso/i)).toBeInTheDocument()
  })

  it("valida formato de año de publicación, DOI e ISBN", async () => {
    renderWithProviders(<UploadDialog />)

    await userEvent.click(screen.getByRole("button", { name: /subir recurso/i }))

    // Fill invalid year
    const yearInput = screen.getByLabelText(/año de publicación/i)
    await userEvent.type(yearInput, "1500")

    // Fill invalid DOI
    const doiInput = screen.getByLabelText(/doi/i)
    await userEvent.type(doiInput, "invalid-doi-format")

    // Fill invalid ISBN
    const isbnInput = screen.getByLabelText(/isbn/i)
    await userEvent.type(isbnInput, "123")

    await userEvent.click(screen.getByRole("button", { name: /iniciar subida/i }))

    await waitFor(() => {
      expect(screen.getByText(/el año debe ser un número entero de 4 dígitos entre 1800/i)).toBeInTheDocument()
      expect(screen.getByText(/formato doi inválido/i)).toBeInTheDocument()
      expect(screen.getByText(/el isbn debe contener 10 o 13 dígitos válidos/i)).toBeInTheDocument()
    })
  })

  it("bloquea caracteres no numéricos en el campo de año y provee selector de idioma", async () => {
    renderWithProviders(<UploadDialog />)

    await userEvent.click(screen.getByRole("button", { name: /subir recurso/i }))

    const yearInput = screen.getByLabelText(/año de publicación/i) as HTMLInputElement
    await userEvent.type(yearInput, "abc2025xyz")

    // Solo los dígitos 2025 deben haber sido aceptados
    expect(yearInput.value).toBe("2025")

    // Selector de idioma presente con opciones
    const idiomaCombobox = screen.getByRole("combobox", { name: /idioma/i })
    expect(idiomaCombobox).toBeInTheDocument()

    await userEvent.click(idiomaCombobox)
    expect(await screen.findByRole("option", { name: /español \(es\)/i })).toBeInTheDocument()
    expect(await screen.findByRole("option", { name: /inglés \(en\)/i })).toBeInTheDocument()
  })
})
