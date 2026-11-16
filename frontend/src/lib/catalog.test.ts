import { describe, expect, it } from "vitest"
import { activeFilters, pageWindow } from "./catalog"
import type { CatalogParams } from "@/hooks/use-catalog-params"

const base: CatalogParams = { q: "", tipo: null, curso: null, desde: null, hasta: null, orden: "recent", pagina: 1 }

describe("pageWindow", () => {
  it("muestra todas las páginas cuando son pocas", () => {
    expect(pageWindow(2, 3)).toEqual([1, 2, 3])
  })

  it("usa huecos alrededor de la página actual", () => {
    expect(pageWindow(6, 12)).toEqual([1, "gap", 5, 6, 7, "gap", 12])
    expect(pageWindow(1, 12)).toEqual([1, 2, "gap", 12])
  })
})

describe("activeFilters", () => {
  const facets = {
    total: 3,
    tipos: [{ id: 1, nombre: "Libro", count: 3 }],
    cursos: [{ id: 2, nombre: "Termodinámica", count: 2 }],
    anios: [],
  }

  it("nombra los filtros con los datos de las facetas", () => {
    const filters = activeFilters({ ...base, tipo: 1, curso: 2, desde: 2020, hasta: 2024 }, facets)
    expect(filters.map((f) => f.label)).toEqual(["Libro", "Termodinámica", "2020–2024"])
    expect(filters[2].clear).toEqual({ desde: null, hasta: null })
  })

  it("describe rangos abiertos", () => {
    expect(activeFilters({ ...base, desde: 2021 }, facets)[0].label).toBe("Desde 2021")
    expect(activeFilters({ ...base, hasta: 2019 }, facets)[0].label).toBe("Hasta 2019")
  })
})
