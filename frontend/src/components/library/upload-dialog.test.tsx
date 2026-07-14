import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { UploadDialog } from "./upload-dialog"
import { renderWithProviders } from "@/test/render"

describe("UploadDialog", () => {
  it("abre el formulario y valida título requerido", async () => {
    renderWithProviders(<UploadDialog />)

    await userEvent.click(screen.getByRole("button", { name: /subir recurso/i }))
    await userEvent.click(screen.getByRole("button", { name: /iniciar subida/i }))

    expect(await screen.findByText(/el título debe tener al menos 5 caracteres/i)).toBeInTheDocument()
  })
})
