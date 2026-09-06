import { screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ResourceReportDialog } from "./ResourceReportDialog"
import { renderWithProviders } from "@/test/render"

describe("ResourceReportDialog", () => {
  it("abre el diálogo y envía un reporte de problema", async () => {
    renderWithProviders(<ResourceReportDialog resourceId={1} />)

    const triggerBtn = screen.getByRole("button", { name: /Reportar problema con el documento/i })
    fireEvent.click(triggerBtn)

    expect(screen.getByText("Reportar recurso")).toBeInTheDocument()

    const textarea = screen.getByPlaceholderText(/Describe con precisión qué debe ser corregido/i)
    fireEvent.change(textarea, { target: { value: "El enlace está roto y faltan páginas" } })

    const submitBtn = screen.getByRole("button", { name: /Enviar reporte/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.queryByText("Reportar recurso")).not.toBeInTheDocument()
    })
  })
})
