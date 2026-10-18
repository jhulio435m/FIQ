import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import Laboratorios from "./laboratorios"
import { renderWithProviders } from "@/test/render"

describe("Soryntel Chemestry Software Page", () => {
  it("renderiza la presentación de Soryntel Chemestry y enlace de descarga", () => {
    renderWithProviders(<Laboratorios />)

    expect(screen.getByRole("heading", { name: /soryntel chemestry/i, level: 1 })).toBeInTheDocument()
    expect(screen.getByText(/suite integral de simulación computacional/i)).toBeInTheDocument()

    const downloadLinks = screen.getAllByRole("link", { name: /descargar/i })
    expect(downloadLinks.length).toBeGreaterThan(0)
    expect(downloadLinks[0]).toHaveAttribute("href", "https://ejemplo.com")
    expect(downloadLinks[0]).toHaveAttribute("target", "_blank")

    expect(screen.getByText("Destilación Fraccionada")).toBeInTheDocument()
    expect(screen.getByText("Cinética Química y Reactores")).toBeInTheDocument()
    expect(screen.getByText("Requisitos del Sistema")).toBeInTheDocument()
    expect(screen.getByText("Guía de Instalación Rápida")).toBeInTheDocument()
  })
})
