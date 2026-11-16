import { describe, expect, it } from "vitest"
import { foldText, highlightSegments, searchTerms } from "./highlight"

describe("highlight", () => {
  it("pliega mayúsculas y tildes", () => {
    expect(foldText("Termodinámica ÑANDÚ")).toBe("termodinamica nandu")
    expect(searchTerms("  balance   MATERIA ")).toEqual(["balance", "materia"])
  })

  it("marca coincidencias sin importar tildes y conserva el texto original", () => {
    const segments = highlightSegments("Termodinámica aplicada", ["dinamica"])
    expect(segments).toEqual([
      { text: "Termo", match: false },
      { text: "dinámica", match: true },
      { text: " aplicada", match: false },
    ])
  })

  it("marca varios términos y repeticiones", () => {
    const marked = highlightSegments("Balance de materia y balance", ["balance", "materia"])
      .filter((s) => s.match)
      .map((s) => s.text)
    expect(marked).toEqual(["Balance", "materia", "balance"])
  })

  it("sin términos devuelve el texto completo", () => {
    expect(highlightSegments("Hola", [])).toEqual([{ text: "Hola", match: false }])
  })
})
