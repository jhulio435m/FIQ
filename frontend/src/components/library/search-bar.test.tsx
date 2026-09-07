import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { SearchBar } from "./search-bar"

describe("SearchBar", () => {
  it("muestra el input y permite escribir", async () => {
    const onChange = vi.fn()
    render(<SearchBar value="" onChange={onChange} placeholder="Buscar..." />)

    const input = screen.getByPlaceholderText("Buscar...")
    await userEvent.type(input, "termodinamica")

    expect(onChange).toHaveBeenCalled()
    expect(screen.queryByRole("button", { name: /limpiar búsqueda/i })).not.toBeInTheDocument()
  })

  it("muestra el botón de limpiar cuando hay texto y lo limpia al hacer clic", async () => {
    const onChange = vi.fn()
    render(<SearchBar value="química" onChange={onChange} />)

    const clearButton = screen.getByRole("button", { name: /limpiar búsqueda/i })
    expect(clearButton).toBeInTheDocument()

    await userEvent.click(clearButton)
    expect(onChange).toHaveBeenCalledWith("")
  })

  it("limpia el buscador al presionar Escape", async () => {
    const onChange = vi.fn()
    render(<SearchBar value="cinética" onChange={onChange} />)

    const input = screen.getByRole("textbox")
    await userEvent.type(input, "{Escape}")

    expect(onChange).toHaveBeenCalledWith("")
  })
})
