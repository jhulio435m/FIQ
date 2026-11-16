import type { ModerationItem } from "@/services/moderation"
import { mockResources } from "./server"

export function moderationItem(overrides: Partial<ModerationItem> = {}): ModerationItem {
  return {
    ...mockResources[0],
    estado_id: 1,
    estado_nombre: "Pendiente",
    subido_por_nombre: "Docente FIQ",
    subido_por_email: "docente@fiq.uncp.edu.pe",
    ultimo_comentario: null,
    ultimo_cambio: null,
    reenvios: 0,
    ...overrides,
  }
}
