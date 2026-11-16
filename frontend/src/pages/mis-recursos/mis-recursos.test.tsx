import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import MisRecursos from "./index"
import { getMyResources, getResourceHistory, replaceResourceFile, resubmitResource } from "@/services/moderation"
import { moderationItem } from "@/test/moderation-fixtures"
import { renderWithProviders } from "@/test/render"
import { mockResources } from "@/test/server"

vi.mock("@/components/library/upload-dialog", () => ({ UploadDialog: () => <button type="button">Subir recurso</button> }))

vi.mock("@/services/moderation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/moderation")>()
  return {
    ...actual,
    getMyResources: vi.fn(),
    getResourceHistory: vi.fn(),
    resubmitResource: vi.fn(),
    replaceResourceFile: vi.fn(),
  }
})

const observado = moderationItem({
  id: 7,
  titulo: "Guía de destilación",
  estado_nombre: "Observado",
  estado_id: 3,
  ultimo_comentario: "Falta la portada y el índice.",
})
const publicado = moderationItem({ id: 8, titulo: "Balance de Materia", estado_nombre: "Aprobado", estado_id: 2 })

describe("Mis recursos", () => {
  beforeEach(() => {
    vi.mocked(getMyResources).mockResolvedValue({
      items: [observado, publicado],
      conteos: { Pendiente: 0, Aprobado: 1, Observado: 1, Rechazado: 0, Archivado: 0 },
    })
    vi.mocked(getResourceHistory).mockResolvedValue([
      {
        id: 1,
        estado_anterior: "Pendiente",
        estado_nuevo: "Observado",
        comentario: "Falta la portada y el índice.",
        cambiado_por_nombre: "Admin FIQ",
        fecha_hora: "2026-11-16T10:00:00",
      },
    ])
    vi.mocked(resubmitResource).mockResolvedValue({ ...observado, estado_nombre: "Pendiente" })
    vi.mocked(replaceResourceFile).mockResolvedValue(mockResources[0])
  })

  it("muestra estados, conteos y el comentario del revisor", async () => {
    renderWithProviders(<MisRecursos />)

    expect(await screen.findByText("Guía de destilación")).toBeInTheDocument()
    expect(screen.getByText("Requiere cambios")).toBeInTheDocument()
    expect(screen.getByText("Publicado")).toBeInTheDocument()
    expect(screen.getByText("Falta la portada y el índice.")).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /requieren cambios\s*1/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /1 recurso necesita cambios/i })).toBeInTheDocument()
  })

  it("filtra por estado en el servidor", async () => {
    renderWithProviders(<MisRecursos />)
    await screen.findByText("Guía de destilación")

    await userEvent.click(screen.getByRole("tab", { name: /publicados/i }))
    await waitFor(() => expect(getMyResources).toHaveBeenLastCalledWith("Aprobado"))
  })

  it("corrige y reenvía con nota y archivo nuevo", async () => {
    renderWithProviders(<MisRecursos />)
    await userEvent.click(await screen.findByRole("button", { name: /corregir y reenviar/i }))

    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText(/lo que pidió el revisor/i)).toBeInTheDocument()

    const pdf = new File(["%PDF-1.4"], "corregido.pdf", { type: "application/pdf" })
    await userEvent.upload(within(dialog).getByLabelText(/reemplazar archivo pdf/i), pdf)
    expect(await within(dialog).findByText(/corregido\.pdf/)).toBeInTheDocument()

    await userEvent.type(within(dialog).getByLabelText(/nota para el revisor/i), "Agregué portada e índice")
    await userEvent.click(within(dialog).getByRole("button", { name: /reenviar a revisión/i }))

    await waitFor(() => expect(resubmitResource).toHaveBeenCalledWith(7, "Agregué portada e índice"))
    expect(replaceResourceFile).toHaveBeenCalledWith(7, expect.any(File))
  })

  it("muestra el historial bajo demanda", async () => {
    renderWithProviders(<MisRecursos />)
    const [historyButton] = await screen.findAllByRole("button", { name: /historial/i })
    await userEvent.click(historyButton)

    expect(await screen.findByText(/en revisión → requiere cambios/i)).toBeInTheDocument()
    expect(screen.getByText(/admin fiq/i)).toBeInTheDocument()
  })
})
