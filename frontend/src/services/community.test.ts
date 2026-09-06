import { describe, expect, it } from "vitest"
import { http, HttpResponse } from "msw"
import { server } from "@/test/server"
import {
  getFeaturedResources,
  getRelatedResources,
  getResourceReviews,
  submitResourceReview,
  createResourceReport,
} from "./community"

describe("servicios de comunidad y descubrimiento (Fase 5)", () => {
  it("obtiene carruseles de recursos destacados", async () => {
    server.use(
      http.get("http://localhost/api/resources/featured", () => {
        return HttpResponse.json({
          recientes: [{ id: 1, titulo: "Libro 1" }],
          mas_vistos: [{ id: 2, titulo: "Libro 2" }],
          mas_descargados: [{ id: 3, titulo: "Libro 3" }],
        })
      }),
    )

    const featured = await getFeaturedResources()
    expect(featured.recientes).toHaveLength(1)
    expect(featured.mas_vistos[0].titulo).toBe("Libro 2")
    expect(featured.mas_descargados[0].id).toBe(3)
  })

  it("obtiene recursos relacionados", async () => {
    server.use(
      http.get("http://localhost/api/resources/10/related", () => {
        return HttpResponse.json([
          { id: 11, titulo: "Relacionado 1", curso_id: 1 },
          { id: 12, titulo: "Relacionado 2", curso_id: 1 },
        ])
      }),
    )

    const related = await getRelatedResources(10)
    expect(related).toHaveLength(2)
    expect(related[0].id).toBe(11)
  })

  it("obtiene valoraciones y envía una nueva calificación", async () => {
    server.use(
      http.get("http://localhost/api/resources/10/reviews", () => {
        return HttpResponse.json({
          promedio: 4.5,
          total: 2,
          reviews: [
            {
              id: "rev-1",
              recurso_id: 10,
              usuario_id: "u-1",
              usuario_nombre: "Estudiante",
              puntuacion: 5,
              comentario: "Excelente",
              created_at: "2026-03-01T10:00:00",
              updated_at: "2026-03-01T10:00:00",
            },
          ],
        })
      }),
      http.post("http://localhost/api/resources/10/reviews", async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({
          id: "rev-2",
          recurso_id: 10,
          usuario_id: "u-2",
          usuario_nombre: "Docente",
          puntuacion: body.puntuacion,
          comentario: body.comentario,
          created_at: "2026-03-01T11:00:00",
          updated_at: "2026-03-01T11:00:00",
        })
      }),
    )

    const reviews = await getResourceReviews(10)
    expect(reviews.promedio).toBe(4.5)
    expect(reviews.total).toBe(2)

    const submitted = await submitResourceReview(10, { puntuacion: 4, comentario: "Muy bueno" })
    expect(submitted.puntuacion).toBe(4)
    expect(submitted.comentario).toBe("Muy bueno")
  })

  it("crea reporte de problema", async () => {
    server.use(
      http.post("http://localhost/api/resources/10/reports", async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          {
            id: "rep-1",
            recurso_id: 10,
            usuario_id: "u-1",
            motivo: body.motivo,
            descripcion: body.descripcion,
            estado: "pendiente",
            created_at: "2026-03-01T12:00:00",
            updated_at: "2026-03-01T12:00:00",
          },
          { status: 201 },
        )
      }),
    )

    const report = await createResourceReport(10, {
      motivo: "metadatos_incorrectos",
      descripcion: "El autor no corresponde",
    })
    expect(report.id).toBe("rep-1")
    expect(report.motivo).toBe("metadatos_incorrectos")
    expect(report.estado).toBe("pendiente")
  })
})
