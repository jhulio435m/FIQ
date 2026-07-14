import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import Admin from "./index"
import { approveResource, getPendingResources, observeResource } from "@/services/resources"
import { getLabsUsage, getMostViewedResources } from "@/services/reports"
import { mockResources } from "@/test/server"
import { renderWithProviders } from "@/test/render"

vi.mock("@/components/admin/user-management", () => ({
  UserManagement: () => <div>Gestión de usuarios mock</div>,
}))

vi.mock("@/services/resources", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/resources")>()
  return {
    ...actual,
    getPendingResources: vi.fn(),
    approveResource: vi.fn(),
    observeResource: vi.fn(),
  }
})

vi.mock("@/services/reports", () => ({
  getMostViewedResources: vi.fn(),
  getLabsUsage: vi.fn(),
}))

describe("Admin", () => {
  beforeEach(() => {
    vi.mocked(getPendingResources).mockResolvedValue(mockResources)
    vi.mocked(getMostViewedResources).mockResolvedValue(mockResources)
    vi.mocked(getLabsUsage).mockResolvedValue({ total_accesos_laboratorios: 3 })
    vi.mocked(approveResource).mockResolvedValue(mockResources[0])
    vi.mocked(observeResource).mockResolvedValue({ ...mockResources[0], estado_id: 3 })
  })

  it("muestra recursos pendientes y métricas administrativas", async () => {
    renderWithProviders(<Admin />)

    expect(await screen.findByText("Balance de Materia")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("tab", { name: /reportes/i }))

    expect(await screen.findByText(/4 descargas/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /csv/i })).toBeEnabled()
  })

  it("muestra estado de error recuperable en reportes", async () => {
    vi.mocked(getMostViewedResources).mockRejectedValueOnce(new Error("server error"))

    renderWithProviders(<Admin />)
    await userEvent.click(screen.getByRole("tab", { name: /reportes/i }))

    expect(await screen.findByText(/no se pudieron cargar los reportes/i)).toBeInTheDocument()
  })
})
