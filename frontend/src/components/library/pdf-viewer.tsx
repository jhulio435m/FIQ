import { useEffect, useRef, useState } from "react"
import { Loader2, ZoomIn, ZoomOut, AlertCircle, Maximize2, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"

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

interface Props {
  url: string
}

export function PdfViewer({ url }: Props) {
  const [libLoaded, setLibLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pdfDoc, setPdfDoc] = useState<PdfJsDocument | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [scale, setScale] = useState(1.25)
  const containerRef = useRef<HTMLDivElement>(null)

  // 1. Load PDF.js library from CDN
  useEffect(() => {
    if (window.pdfjsLib) {
      setLibLoaded(true)
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
