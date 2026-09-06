import { useEffect, useRef, useState } from "react"
import {
  Loader2,
  ZoomIn,
  ZoomOut,
  AlertCircle,
  Maximize2,
  FileText,
  Bookmark as BookmarkIcon,
  Plus,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { useAuthStore } from "@/stores/auth"
import {
  type Bookmark,
  getBookmarks,
  createBookmark,
  deleteBookmark,
} from "@/services/personal-library"

interface PdfViewport {
  width: number
  height: number
}

interface PdfRenderTask {
  promise: Promise<void>
  cancel: () => void
}

interface PdfJsPage {
  getViewport: (options: { scale: number }) => PdfViewport
  render: (options: { canvasContext: CanvasRenderingContext2D; viewport: PdfViewport }) => PdfRenderTask
}

interface PdfJsDocument {
  numPages: number
  getPage: (pageNumber: number) => Promise<PdfJsPage>
}

interface PdfJsLoadingTask {
  promise: Promise<PdfJsDocument>
}

interface PdfJsLib {
  GlobalWorkerOptions: {
    workerSrc: string
  }
  getDocument: (options: { data: ArrayBuffer }) => PdfJsLoadingTask
}

declare global {
  interface Window {
    pdfjsLib?: PdfJsLib
  }
}

const PDFJS_VERSION = "3.11.174"
const PDFJS_SCRIPT_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`
const PDFJS_WORKER_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`

const COLOR_OPTIONS = [
  { value: "#3b82f6", label: "Azul" },
  { value: "#10b981", label: "Verde" },
  { value: "#f59e0b", label: "Ámbar" },
  { value: "#ef4444", label: "Rojo" },
  { value: "#8b5cf6", label: "Púrpura" },
]

interface Props {
  url: string
  resourceId?: number
}

export function PdfViewer({ url, resourceId }: Props) {
  const [libLoaded, setLibLoaded] = useState(() => Boolean(window.pdfjsLib))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pdfDoc, setPdfDoc] = useState<PdfJsDocument | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [scale, setScale] = useState(1.25)
  const containerRef = useRef<HTMLDivElement>(null)

  const user = useAuthStore((s) => s.user)
  const [showBookmarks, setShowBookmarks] = useState(false)
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loadingBookmarks, setLoadingBookmarks] = useState(false)
  const [isCreatingBookmark, setIsCreatingBookmark] = useState(false)
  const [newPage, setNewPage] = useState(1)
  const [newTitle, setNewTitle] = useState("")
  const [newContent, setNewContent] = useState("")
  const [newColor, setNewColor] = useState("#3b82f6")
  const [submittingBookmark, setSubmittingBookmark] = useState(false)

  useEffect(() => {
    if (!resourceId || !user) {
      return
    }
    let isMounted = true
    const fetchBookmarks = async () => {
      setLoadingBookmarks(true)
      try {
        const data = await getBookmarks(resourceId)
        if (isMounted) setBookmarks(data)
      } catch (err: unknown) {
        console.error("Error loading bookmarks:", err)
      } finally {
        if (isMounted) setLoadingBookmarks(false)
      }
    }
    void fetchBookmarks()
    return () => {
      isMounted = false
    }
  }, [resourceId, user])

  const handleCreateBookmark = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resourceId || !newTitle.trim()) return
    setSubmittingBookmark(true)
    try {
      const created = await createBookmark(resourceId, {
        pagina: Math.max(1, Math.min(newPage, numPages || 9999)),
        titulo: newTitle.trim(),
        contenido: newContent.trim() || null,
        color: newColor,
      })
      setBookmarks((prev) => [...prev, created].sort((a, b) => a.pagina - b.pagina))
      setNewTitle("")
      setNewContent("")
      setIsCreatingBookmark(false)
      toast.success("Marcador guardado")
    } catch {
      toast.error("No se pudo guardar el marcador")
    } finally {
      setSubmittingBookmark(false)
    }
  }

  const handleDeleteBookmark = async (bookmarkId: string) => {
    try {
      await deleteBookmark(bookmarkId)
      setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId))
      toast.success("Marcador eliminado")
    } catch {
      toast.error("No se pudo eliminar el marcador")
    }
  }

  const handleJumpToPage = (targetPage: number) => {
    const el = document.getElementById(`pdf-page-${targetPage}`)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  // 1. Load PDF.js library from CDN
  useEffect(() => {
    if (window.pdfjsLib) {
      return
    }

    const script = document.createElement("script")
    script.src = PDFJS_SCRIPT_URL
    script.async = true
    script.onload = () => {
      if (!window.pdfjsLib) {
        setError("Error al inicializar la librería de visualización (PDF.js).")
        setLoading(false)
        return
      }
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL
      setLibLoaded(true)
    }
    script.onerror = () => {
      setError("Error al cargar la librería de visualización (PDF.js).")
      setLoading(false)
    }
    document.body.appendChild(script)
  }, [])

  // 2. Fetch and load the PDF document
  useEffect(() => {
    if (!libLoaded || !url) return

    let isMounted = true
    const fetchPdf = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(url)
        if (!response.ok) throw new Error("No se pudo descargar el archivo PDF")
        
        const arrayBuffer = await response.arrayBuffer()
        if (!isMounted) return

        if (!window.pdfjsLib) throw new Error("PDF.js no está disponible")

        const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer })
        const pdf = await loadingTask.promise
        
        if (!isMounted) return
        setPdfDoc(pdf)
        setNumPages(pdf.numPages)
      } catch (err: unknown) {
        if (isMounted) {
          console.error("Error loading PDF:", err)
          setError("No se pudo cargar la vista previa del PDF. Asegúrese de que es un archivo PDF válido.")
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchPdf()

    return () => {
      isMounted = false
    }
  }, [url, libLoaded])

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3.0))
  }

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.75))
  }

  const handleFitWidth = () => {
    if (!pdfDoc || !containerRef.current) return
    // Fit width based on the first page width
    pdfDoc.getPage(1).then((page) => {
      if (!containerRef.current) return
      // Subtract left sidebar width (112px) and padding + scrollbar space
      const containerWidth = containerRef.current.clientWidth - 112 - 56
      const viewport = page.getViewport({ scale: 1.0 })
      const newScale = containerWidth / viewport.width
      setScale(parseFloat(newScale.toFixed(2)))
    })
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-red-50 text-red-700 border border-red-200 rounded-xl gap-2 h-full min-h-[400px]">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="text-sm font-medium">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col border border-zinc-700/80 rounded-xl overflow-hidden shadow-2xl bg-zinc-900 w-full h-full" ref={containerRef}>
      {/* Viewer Toolbar */}
      <div className="flex flex-wrap items-center justify-between bg-zinc-800 border-b border-zinc-700 px-5 py-3 gap-2 text-zinc-200 select-none shrink-0 z-10">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold px-2.5 py-1 bg-zinc-950/40 rounded border border-zinc-700/50">
            {numPages} {numPages === 1 ? "Página" : "Páginas"}
          </span>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-zinc-700 cursor-pointer disabled:opacity-30 animate-none"
            onClick={handleZoomOut}
            disabled={scale <= 0.75 || loading}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs font-mono font-medium min-w-[3.5rem] text-center px-1 bg-zinc-950/40 rounded py-1 border border-zinc-700/50">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-zinc-700 cursor-pointer disabled:opacity-30 animate-none"
            onClick={handleZoomIn}
            disabled={scale >= 3.0 || loading}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-zinc-300 hover:text-white hover:bg-zinc-700 cursor-pointer px-2.5"
            onClick={handleFitWidth}
            disabled={loading}
          >
            <Maximize2 className="h-3.5 w-3.5 mr-1" />
            Ajustar
          </Button>
          {resourceId && (
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 text-xs cursor-pointer px-2.5 transition-colors ${
                showBookmarks
                  ? "bg-brand-500/20 text-brand-300 border border-brand-500/40"
                  : "text-zinc-300 hover:text-white hover:bg-zinc-700"
              }`}
              onClick={() => setShowBookmarks((prev) => !prev)}
            >
              <BookmarkIcon className="h-3.5 w-3.5 mr-1.5 text-brand-400" />
              Notas {bookmarks.length > 0 && `(${bookmarks.length})`}
            </Button>
          )}
        </div>

        {/* Info Badge */}
        <div className="hidden sm:block text-2xs text-zinc-400 font-semibold select-none bg-brand-500/10 px-2.5 py-1.5 rounded border border-brand-500/20 text-brand-300">
          Visor Seguro FIQ
        </div>
      </div>

      {/* Main Workspace split into Page Index and Canvas Reader */}
      <div className="flex-1 flex overflow-hidden h-full">
        {/* Left Page Index Navigator */}
        {!loading && pdfDoc && (
          <div className="hidden sm:flex w-28 shrink-0 border-r border-zinc-800 bg-zinc-900/30 flex-col overflow-y-auto p-2 gap-2 select-none h-full scrollbar-none">
            <div className="text-4xs font-bold text-zinc-500 uppercase tracking-widest text-center py-1">
              Índice
            </div>
            {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                onClick={() => {
                  const el = document.getElementById(`pdf-page-${pageNumber}`)
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                }}
                className="flex flex-col items-center justify-center p-2 rounded-lg border border-zinc-800 hover:border-brand-500 hover:bg-brand-500/5 transition-all text-zinc-400 hover:text-white cursor-pointer group"
              >
                <FileText className="h-4 w-4 mb-1 group-hover:text-brand-400 transition-colors" />
                <span className="text-4xs font-medium">Pág. {pageNumber}</span>
              </button>
            ))}
          </div>
        )}

        {/* Main Canvas Scroll Area */}
        <div className="flex-1 overflow-auto p-6 flex flex-col items-center bg-zinc-950/90 relative scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900 gap-4">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 gap-3 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
              <p className="text-xs text-zinc-400">Descargando y preparando PDF seguro...</p>
            </div>
          )}

          {!loading && pdfDoc && (
            <div className="w-full flex flex-col items-center">
              {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNumber) => (
                <PdfPage
                  key={pageNumber}
                  pdfDoc={pdfDoc}
                  pageNumber={pageNumber}
                  scale={scale}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar: Notes & Bookmarks */}
        {showBookmarks && (
          <div className="w-80 shrink-0 border-l border-zinc-800 bg-zinc-900/95 flex flex-col h-full z-20">
            <div className="flex items-center justify-between p-3.5 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <BookmarkIcon className="h-4 w-4 text-brand-400" />
                <span className="text-xs font-semibold text-zinc-100">Marcadores y Notas</span>
              </div>
              <button
                onClick={() => setShowBookmarks(false)}
                className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 cursor-pointer"
                aria-label="Cerrar notas"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {!user ? (
              <div className="p-5 text-center text-xs text-zinc-400 space-y-2">
                <p>Inicia sesión con tu cuenta institucional para guardar notas y marcadores en tus documentos.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 scrollbar-thin scrollbar-thumb-zinc-700">
                {isCreatingBookmark ? (
                  <form onSubmit={handleCreateBookmark} className="space-y-3 p-3 bg-zinc-800/80 rounded-lg border border-zinc-700/60">
                    <div>
                      <label className="text-3xs uppercase tracking-wider text-zinc-400 block mb-1">Título</label>
                      <Input
                        placeholder="Ej. Resumen de balance"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="h-8 text-xs bg-zinc-900 border-zinc-700 text-zinc-100"
                        required
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="w-20">
                        <label className="text-3xs uppercase tracking-wider text-zinc-400 block mb-1">Pág.</label>
                        <Input
                          type="number"
                          min={1}
                          max={numPages || 1000}
                          value={newPage}
                          onChange={(e) => setNewPage(parseInt(e.target.value, 10) || 1)}
                          className="h-8 text-xs bg-zinc-900 border-zinc-700 text-zinc-100"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-3xs uppercase tracking-wider text-zinc-400 block mb-1">Color</label>
                        <div className="flex items-center gap-1.5 pt-1">
                          {COLOR_OPTIONS.map((c) => (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => setNewColor(c.value)}
                              className={`h-4.5 w-4.5 rounded-full border-2 transition-all cursor-pointer ${
                                newColor === c.value ? "border-white scale-115" : "border-transparent opacity-70"
                              }`}
                              style={{ backgroundColor: c.value }}
                              title={c.label}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-3xs uppercase tracking-wider text-zinc-400 block mb-1">Nota (opcional)</label>
                      <Textarea
                        placeholder="Escribe tus apuntes o fórmulas aquí..."
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        className="text-xs bg-zinc-900 border-zinc-700 text-zinc-100 min-h-[60px] resize-none"
                        rows={2}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-zinc-400 hover:text-white cursor-pointer"
                        onClick={() => setIsCreatingBookmark(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={submittingBookmark || !newTitle.trim()}
                        className="h-7 text-xs bg-brand-500 hover:bg-brand-600 text-white cursor-pointer"
                      >
                        {submittingBookmark ? <Loader2 className="h-3 w-3 animate-spin" /> : "Guardar"}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <Button
                    onClick={() => {
                      setIsCreatingBookmark(true)
                    }}
                    size="sm"
                    variant="outline"
                    className="w-full text-xs border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-white justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Nueva nota / marcador
                  </Button>
                )}

                {loadingBookmarks ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
                  </div>
                ) : bookmarks.length === 0 ? (
                  <p className="text-center text-xs text-zinc-500 py-6">
                    No tienes notas ni marcadores guardados en este documento.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {bookmarks.map((bm) => (
                      <div
                        key={bm.id}
                        className="p-2.5 rounded-lg bg-zinc-800/60 border border-zinc-700/50 hover:border-zinc-600 transition-colors group relative"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: bm.color || "#3b82f6" }}
                            />
                            <span className="text-xs font-semibold text-zinc-200 line-clamp-1">
                              {bm.titulo}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteBookmark(bm.id)}
                            className="text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
                            title="Eliminar marcador"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {bm.contenido && (
                          <p className="text-xs text-zinc-400 mt-1 pl-4 line-clamp-3 italic">
                            {bm.contenido}
                          </p>
                        )}
                        <div className="mt-2 pl-4 flex items-center justify-between">
                          <span className="text-3xs text-zinc-500">Pág. {bm.pagina}</span>
                          <button
                            onClick={() => handleJumpToPage(bm.pagina)}
                            className="text-3xs text-brand-400 hover:text-brand-300 font-medium cursor-pointer"
                          >
                            Ir a página →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface PageProps {
  pdfDoc: PdfJsDocument
  pageNumber: number
  scale: number
}

function PdfPage({ pdfDoc, pageNumber, scale }: PageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [aspectRatio, setAspectRatio] = useState<number>(1 / 1.414) // default A4 portrait
  const [originalWidth, setOriginalWidth] = useState<number>(650) // base width of page
  const renderTaskRef = useRef<PdfRenderTask | null>(null)

  // 1. Get aspect ratio of the page before rendering
  useEffect(() => {
    if (!pdfDoc) return
    let isMounted = true
    pdfDoc.getPage(pageNumber).then((page) => {
      if (!isMounted) return
      const viewport = page.getViewport({ scale: 1.0 })
      setAspectRatio(viewport.width / viewport.height)
      setOriginalWidth(viewport.width)
    }).catch(console.error)
    return () => {
      isMounted = false
    }
  }, [pdfDoc, pageNumber])

  // 2. Observe visibility to render lazily
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true)
        }
      },
      { rootMargin: "350px" } // Load page when it's 350px near the viewport
    )
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }
    return () => observer.disconnect()
  }, [])

  // 3. Render page on canvas
  useEffect(() => {
    if (!isVisible || !pdfDoc) return
    let isMounted = true

    const render = async () => {
      if (!canvasRef.current) return
      setLoading(true)
      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel()
        }
        const page = await pdfDoc.getPage(pageNumber)
        if (!isMounted || !canvasRef.current) return

        const viewport = page.getViewport({ scale })
        const canvas = canvasRef.current
        const context = canvas.getContext("2d")
        if (!context) return

        canvas.height = viewport.height
        canvas.width = viewport.width

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        }
        const renderTask = page.render(renderContext)
        renderTaskRef.current = renderTask
        await renderTask.promise
      } catch (err: unknown) {
        if (!(err instanceof Error) || err.name !== "RenderingCancelledException") {
          console.error(`Error rendering page ${pageNumber}:`, err)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    render()

    return () => {
      isMounted = false
    }
  }, [pdfDoc, pageNumber, scale, isVisible])

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
  }

  return (
    <div
      ref={containerRef}
      id={`pdf-page-${pageNumber}`}
      style={{ 
        width: `${originalWidth * scale}px`,
        aspectRatio 
      }}
      className="relative my-3 shadow-2xl border border-zinc-800 bg-white rounded overflow-hidden max-w-none transition-all duration-200"
    >
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/10 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          <span className="text-2xs text-zinc-400 font-medium">Pág. {pageNumber}</span>
        </div>
      )}
      <canvas
        ref={canvasRef}
        onContextMenu={handleContextMenu}
        className="block w-full h-auto select-none"
      />
    </div>
  )
}
