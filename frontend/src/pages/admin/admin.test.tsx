import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import Admin from "./index"
import {
  approveResource,
  bulkApprove,
  getModerationQueue,
  getResourceHistory,
  observeResource,
  rejectResource,
} from "@/services/moderation"
import { getLabsUsage, getMostViewedResources } from "@/services/reports"
import { mockResources } from "@/test/server"
import { moderationItem } from "@/test/moderation-fixtures"
import { renderWithProviders } from "@/test/render"

vi.mock("@/components/admin/user-management", () => ({
  UserManagement: () => <div>Gestión de usuarios mock</div>,
}))

vi.mock("@/services/moderation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/moderation")>()
  return {
    ...actual,
    getModerationQueue: vi.fn(),
    getResourceHistory: vi.fn(),
    approveResource: vi.fn(),
    observeResource: vi.fn(),
    rejectResource: vi.fn(),
    bulkApprove: vi.fn(),
  }
})

const queue = [
  moderationItem({ id: 1, titulo: "Balance de Materia" }),
  moderationItem({
    id: 2,
    titulo: "Cinética química",
    subido_por_nombre: "Ana Gómez",
    reenvios: 1,
    ultimo_comentario: "Agregué la portada.",
  }),
]

vi.mock("@/services/reports", () => ({
  getMostViewedResources: vi.fn(),
  getLabsUsage: vi.fn(),
}))

describe("Admin", () => {
  beforeEach(() => {
    vi.mocked(getModerationQueue).mockResolvedValue(queue)
    vi.mocked(getResourceHistory).mockResolvedValue([])
    vi.mocked(rejectResource).mockResolvedValue(mockResources[0])
    vi.mocked(bulkApprove).mockResolvedValue({ procesados: [1, 2], omitidos: [] })
    vi.mocked(getMostViewedResources).mockResolvedValue(mockResources)
    vi.mocked(getLabsUsage).mockResolvedValue({ total_accesos_laboratorios: 3 })
    vi.mocked(approveResource).mockResolvedValue(mockResources[0])
    vi.mocked(observeResource).mockResolvedValue({ ...mockResources[0], estado_id: 3 })
  })

  it("muestra recursos pendientes y métricas administrativas", async () => {
    renderWithProviders(<Admin />)

    expect((await screen.findAllByText("Balance de Materia")).length).toBeGreaterThan(0)
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

  it("revisa el primero de la cola y lo aprueba", async () => {
    renderWithProviders(<Admin />)
    const panel = await screen.findByRole("region", { name: /revisión de balance de materia/i })
    expect(await within(panel).findByText(/sin cambios de estado todavía/i)).toBeInTheDocument()

    await userEvent.click(within(panel).getByRole("button", { name: /aprobar y publicar/i }))
    await waitFor(() => expect(approveResource).toHaveBeenCalledWith(1, undefined))
  })

  it("exige un comentario para pedir cambios", async () => {
    renderWithProviders(<Admin />)
    await userEvent.click(await screen.findByRole("button", { name: /pedir cambios/i }))

    const dialog = await screen.findByRole("dialog")
    const send = within(dialog).getByRole("button", { name: /enviar observación/i })
    expect(send).toBeDisabled()

    await userEvent.type(within(dialog).getByLabelText(/qué debe corregir/i), "corto")
    expect(send).toBeDisabled()

    await userEvent.click(within(dialog).getByRole("button", { name: /completa los metadatos/i }))
    expect(send).toBeEnabled()
    await userEvent.click(send)

    await waitFor(() => expect(observeResource).toHaveBeenCalledWith(1, expect.stringContaining("Completa los metadatos")))
  })

  it("muestra la nota de reenvío y aprueba en lote", async () => {
    renderWithProviders(<Admin />)
    await userEvent.click(await screen.findByRole("button", { name: /cinética química/i }))
    expect(await screen.findByText("Agregué la portada.")).toBeInTheDocument()
    expect(screen.getByText(/reenviado/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole("checkbox", { name: /seleccionar todos/i }))
    await userEvent.click(screen.getByRole("button", { name: /aprobar 2/i }))
    await waitFor(() => expect(bulkApprove).toHaveBeenCalledWith([1, 2]))
  })
})
