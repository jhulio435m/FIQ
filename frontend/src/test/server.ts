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
    anio: 2026,
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
]

export const server = setupServer(...handlers)
