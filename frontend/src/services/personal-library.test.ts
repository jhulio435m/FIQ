import { describe, expect, it } from "vitest"
import { http, HttpResponse } from "msw"
import { server } from "@/test/server"
import {
  getBookmarks,
  createBookmark,
  updateBookmark,
  deleteBookmark,
} from "./personal-library"

describe("servicios de marcadores de lectura (Fase 4)", () => {
  it("obtiene marcadores de un recurso", async () => {
    server.use(
      http.get("http://localhost/api/library/me/resources/42/bookmarks", () => {
        return HttpResponse.json([
          {
            id: "bm-1",
            usuario_id: "user-1",
            recurso_id: 42,
            pagina: 3,
            titulo: "Balance general",
            contenido: "Revisar ecuación 4.2",
            color: "#3b82f6",
            created_at: "2026-03-01T10:00:00",
            updated_at: "2026-03-01T10:00:00",
          },
        ])
      }),
    )

    const bookmarks = await getBookmarks(42)
    expect(bookmarks).toHaveLength(1)
    expect(bookmarks[0].titulo).toBe("Balance general")
    expect(bookmarks[0].pagina).toBe(3)
  })

  it("crea un nuevo marcador para la página actual", async () => {
    server.use(
      http.post("http://localhost/api/library/me/resources/42/bookmarks", async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          {
            id: "bm-new",
            usuario_id: "user-1",
            recurso_id: 42,
            pagina: body.pagina,
            titulo: body.titulo,
            contenido: body.contenido,
            color: body.color,
            created_at: "2026-03-01T10:00:00",
            updated_at: "2026-03-01T10:00:00",
          },
          { status: 201 },
        )
      }),
    )

    const created = await createBookmark(42, {
      pagina: 7,
      titulo: "Termodinámica",
      contenido: "Ciclo de Carnot",
      color: "#ef4444",
    })
    expect(created.id).toBe("bm-new")
    expect(created.pagina).toBe(7)
    expect(created.titulo).toBe("Termodinámica")
  })

  it("actualiza y elimina un marcador", async () => {
    server.use(
      http.patch("http://localhost/api/library/me/bookmarks/bm-1", async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({
          id: "bm-1",
          usuario_id: "user-1",
          recurso_id: 42,
          pagina: 3,
          titulo: body.titulo ?? "Original",
          contenido: "Nota",
          color: "#10b981",
          created_at: "2026-03-01T10:00:00",
          updated_at: "2026-03-01T11:00:00",
        })
      }),
      http.delete("http://localhost/api/library/me/bookmarks/bm-1", () => {
        return new HttpResponse(null, { status: 204 })
      }),
    )

    const updated = await updateBookmark("bm-1", { titulo: "Nuevo título" })
    expect(updated.titulo).toBe("Nuevo título")

    await expect(deleteBookmark("bm-1")).resolves.toBeUndefined()
  })
})
