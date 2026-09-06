import { http, HttpResponse } from "msw"
import { setupServer } from "msw/node"

export const mockResources = [
  {
    id: 1,
    titulo: "Balance de Materia",
    resumen: "Guia para procesos quimicos",
    url_archivo: "resources/balance.pdf",
    archivo_size: 2048,
    archivo_mime: "application/pdf",
    tipo_recurso_id: 1,
    estado_id: 2,
    subido_por: "teacher-id",
    visualizaciones: 12,
    descargas: 4,
    created_at: "2026-07-01T10:00:00",
    tipo_recurso_nombre: "Libro",
    curso_nombre: "Química General",
    curso_id: 1,
    autores: "FIQ UNCP",
    editorial: "FIQ",
    doi: null,
    isbn: null,
    anio: 2026,
    idioma: "es",
    cover_url: null,
    licencia: "Uso institucional",
    temas: "Balance de materia",
    fuente_externa: null,
    external_id: null,
  },
]

const externalBooksHandler = () => HttpResponse.json({
  results: [
    {
      source: "open_library",
      external_id: "OL123W",
      resource_type: "book",
      title: "Termodinamica aplicada",
      authors: ["Autor Uno"],
      summary: null,
      publisher: "Editorial FIQ",
      published_year: 2024,
      published_date: null,
      isbn: "9781234567890",
      doi: null,
      cover_url: null,
      external_url: "https://openlibrary.org/works/OL123W",
      open_access_url: null,
      license: null,
      language: "es",
      subjects: ["Termodinámica"],
    },
  ],
  warnings: [],
})

const externalArticlesHandler = () => HttpResponse.json({
  results: [],
  warnings: ["Unpaywall requiere configurar EXTERNAL_API_EMAIL."],
})

export const handlers = [
  http.post("/api/auth/login", async ({ request }) => {
    const body = await request.json() as { email?: string; password?: string }
    if (body.email === "admin@fiq.uncp.edu.pe" && body.password === "password123") {
      return HttpResponse.json({
        access_token: "test-token",
        usuario: {
          id: "admin-id",
          email: body.email,
          nombre: "Admin FIQ",
          rol: "Admin",
        },
      })
    }
    return HttpResponse.json({ detail: "Credenciales inválidas" }, { status: 401 })
  }),
  http.get("/api/resources/types", () => HttpResponse.json([{ id: 1, nombre: "Libro" }])),
  http.get("/api/resources/courses", () => HttpResponse.json([{ id: 1, nombre: "Química General" }])),
  http.get("/api/resources", ({ request }) => {
    const search = new URL(request.url).searchParams.get("search")?.toLowerCase()
    const resources = search
      ? mockResources.filter((resource) => resource.titulo.toLowerCase().includes(search))
      : mockResources
    return HttpResponse.json(resources)
  }),
  http.get("/api/resources/catalog", ({ request }) => {
    const url = new URL(request.url)
    const search = url.searchParams.get("search")?.toLowerCase()
    const resources = search
      ? mockResources.filter((resource) => resource.titulo.toLowerCase().includes(search))
      : mockResources
    return HttpResponse.json({
      items: resources,
      total: resources.length,
      skip: Number(url.searchParams.get("skip") ?? 0),
      limit: Number(url.searchParams.get("limit") ?? 20),
      has_more: false,
    })
  }),
  http.post("/api/resources", () => HttpResponse.json(mockResources[0], { status: 201 })),
  http.post("/api/resources/import-external", () => HttpResponse.json({
    ...mockResources[0],
    id: 2,
    titulo: "Termodinamica aplicada",
    estado_id: 1,
    archivo_mime: "text/html",
    url_archivo: "https://openlibrary.org/works/OL123W",
  }, { status: 201 })),
  http.get("/api/external/search/books", externalBooksHandler),
  http.get("/external/search/books", externalBooksHandler),
  http.get("http://localhost/api/external/search/books", externalBooksHandler),
  http.get("http://localhost/external/search/books", externalBooksHandler),
  http.get("/api/external/search/articles", externalArticlesHandler),
  http.get("/external/search/articles", externalArticlesHandler),
  http.get("http://localhost/api/external/search/articles", externalArticlesHandler),
  http.get("http://localhost/external/search/articles", externalArticlesHandler),
  http.get("/api/resources/pending", () => HttpResponse.json(mockResources)),
  http.get("/api/resources/featured", () => HttpResponse.json({
    recientes: mockResources,
    mas_vistos: mockResources,
    mas_descargados: mockResources,
  })),
  http.get("/api/resources/:id", ({ params }) => {
    const resource = mockResources.find((item) => item.id === Number(params.id))
    return resource
      ? HttpResponse.json(resource)
      : HttpResponse.json({ detail: "Recurso no encontrado" }, { status: 404 })
  }),
  http.get("/api/works/by-resource/:id", ({ params }) => {
    const resourceId = Number(params.id)
    const resource = mockResources.find((item) => item.id === resourceId)
    if (!resource) {
      return HttpResponse.json({ detail: "Obra no encontrada" }, { status: 404 })
    }
    return HttpResponse.json({
      id: "11111111-1111-4111-8111-111111111111",
      titulo_canonico: resource.titulo,
      resumen: resource.resumen,
      autores: resource.autores,
      temas: resource.temas,
      idioma: resource.idioma,
      created_at: resource.created_at,
      updated_at: resource.created_at,
      ediciones: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          titulo: resource.titulo,
          editorial: resource.editorial,
          anio: resource.anio,
          idioma: resource.idioma,
          doi: resource.doi,
          isbns: [],
          archivos: [
            {
              id: "33333333-3333-4333-8333-333333333333",
              recurso_id: resource.id,
              formato: "PDF",
              mime_type: resource.archivo_mime,
              tamano: resource.archivo_size,
            },
          ],
        },
      ],
    })
  }),
  http.get("/api/library/me/resources", () => HttpResponse.json([
    {
      recurso: mockResources[0],
      favorito: true,
      estado_lectura: "leyendo",
      progreso_pagina: 18,
      ultima_lectura: "2026-09-02T10:00:00",
      updated_at: "2026-09-02T10:00:00",
    },
  ])),
  http.get("/api/library/me/resources/:id", () => HttpResponse.json(null)),
  http.put("/api/library/me/resources/:id", async ({ request }) => {
    const body = await request.json() as { favorito: boolean; estado_lectura: string | null; progreso_pagina: number }
    return HttpResponse.json({ recurso: mockResources[0], ...body, ultima_lectura: null, updated_at: "2026-09-02T10:00:00" })
  }),
  http.get("/api/library/me/lists", () => HttpResponse.json([
    { id: "list-1", nombre: "Termodinámica", descripcion: null, es_publica: false, created_at: "2026-09-02T10:00:00", updated_at: "2026-09-02T10:00:00", recursos: mockResources },
  ])),
  http.post("/api/library/me/lists", async ({ request }) => {
    const body = await request.json() as { nombre: string; es_publica: boolean }
    return HttpResponse.json({ id: "list-2", descripcion: null, created_at: "2026-09-02T10:00:00", updated_at: "2026-09-02T10:00:00", ...body }, { status: 201 })
  }),
  http.delete("/api/library/me/lists/:id", () => new HttpResponse(null, { status: 204 })),
  http.patch("/api/library/me/lists/:id", async ({ request }) => HttpResponse.json({ id: "list-1", nombre: "Termodinámica", descripcion: null, created_at: "2026-09-02T10:00:00", updated_at: "2026-09-02T10:00:00", ...(await request.json() as { es_publica: boolean }) })),
  http.post("/api/library/me/lists/:id/resources/:resourceId", () => HttpResponse.json({ id: "list-1", nombre: "Termodinámica", descripcion: null, es_publica: false, created_at: "2026-09-02T10:00:00", updated_at: "2026-09-02T10:00:00", recursos: mockResources })),
  http.delete("/api/library/me/lists/:id/resources/:resourceId", () => HttpResponse.json({ id: "list-1", nombre: "Termodinámica", descripcion: null, es_publica: false, created_at: "2026-09-02T10:00:00", updated_at: "2026-09-02T10:00:00", recursos: [] })),
  http.get("/api/library/me/history", () => HttpResponse.json([
    { id: 1, accion: "view", recurso_id: 1, titulo: "Balance de Materia", fecha_hora: "2026-09-02T10:00:00" },
  ])),
  http.delete("/api/library/me/history", () => new HttpResponse(null, { status: 204 })),
  http.patch("/api/resources/:id/approve", () => HttpResponse.json(mockResources[0])),
  http.patch("/api/resources/:id/observe", () => HttpResponse.json({ ...mockResources[0], estado_id: 3 })),
  http.get("/api/reports/most-viewed", () => HttpResponse.json(mockResources)),
  http.get("/api/reports/labs-usage", () => HttpResponse.json({ total_accesos_laboratorios: 3 })),
  http.get("/api/labs", () => HttpResponse.json([
    {
      id: 1,
      titulo: "Destilación fraccionada",
      descripcion: "Simula separación por volatilidad relativa.",
      url_simulacion: "/labs/destilacion",
      nivel_id: 1,
    },
  ])),
  http.get("/api/labs/:id", () => HttpResponse.json({
    id: 1,
    titulo: "Destilación fraccionada",
    descripcion: "Simula separación por volatilidad relativa.",
    url_simulacion: "/labs/destilacion",
    nivel_id: 1,
  })),
  http.get("/api/resources/:id/related", () => HttpResponse.json(mockResources)),
  http.get("/api/resources/:id/reviews", () => HttpResponse.json({
    promedio: 4.5,
    total: 2,
    reviews: [
      {
        id: "rev-1",
        recurso_id: 1,
        usuario_id: "u-1",
        usuario_nombre: "Juan Pérez",
        puntuacion: 5,
        comentario: "Excelente material para el curso.",
        created_at: "2026-09-01T12:00:00",
        updated_at: "2026-09-01T12:00:00",
      },
      {
        id: "rev-2",
        recurso_id: 1,
        usuario_id: "u-2",
        usuario_nombre: "María Lopez",
        puntuacion: 4,
        comentario: "Muy detallado.",
        created_at: "2026-09-02T12:00:00",
        updated_at: "2026-09-02T12:00:00",
      },
    ],
  })),
  http.post("/api/resources/:id/reviews", async ({ request, params }) => {
    const body = await request.json() as { puntuacion: number; comentario?: string }
    return HttpResponse.json({
      id: "rev-new",
      recurso_id: Number(params.id),
      usuario_id: "admin-id",
      usuario_nombre: "Admin FIQ",
      puntuacion: body.puntuacion,
      comentario: body.comentario ?? null,
      created_at: "2026-09-06T12:00:00",
      updated_at: "2026-09-06T12:00:00",
    })
  }),
  http.delete("/api/resources/:id/reviews/me", () => new HttpResponse(null, { status: 204 })),
  http.post("/api/resources/:id/reports", async ({ request, params }) => {
    const body = await request.json() as { motivo: string; descripcion: string }
    return HttpResponse.json({
      id: "rep-1",
      recurso_id: Number(params.id),
      recurso_titulo: "Balance de Materia",
      usuario_id: "admin-id",
      usuario_email: "admin@fiq.uncp.edu.pe",
      motivo: body.motivo,
      descripcion: body.descripcion,
      estado: "pendiente",
      resolucion: null,
      created_at: "2026-09-06T12:00:00",
      updated_at: "2026-09-06T12:00:00",
    }, { status: 201 })
  }),
]

export const server = setupServer(...handlers)
