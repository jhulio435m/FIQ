import { useEffect, useState } from "react"
import { useQueryClient, useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Download, Eye, Calendar, FileText, BookOpen, Lock, Loader2, Copy, Check, Edit2, Save, X } from "lucide-react"
import { trackView, trackDownload, getResourceUrl, updateResource } from "@/services/resources"
import { useAuthStore } from "@/stores/auth"
import { toast } from "sonner"
import type { Recurso } from "@/services/resources"
import { formatBytes } from "@/lib/utils"
import { PdfViewer } from "./pdf-viewer"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import api from "@/services/api"

function getErrorStatus(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    return (error as { response?: { status?: number } }).response?.status
  }
  return undefined
}

interface Props {
  resource: Recurso | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ResourceDetail({ resource, open, onOpenChange }: Props) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loadingPdf, setLoadingPdf] = useState(false)
  const [localResource, setLocalResource] = useState<Recurso | null>(null)
  const [citationFormat, setCitationFormat] = useState<"APA" | "IEEE" | "VANCOUVER">("APA")
  const [copied, setCopied] = useState(false)

  // Edit Mode States
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editSummary, setEditSummary] = useState("")
  const [editType, setEditType] = useState("")
  const [editCourse, setEditCourse] = useState("")
  const [editAutores, setEditAutores] = useState("")
  const [editEditorial, setEditEditorial] = useState("")
  const [editDoi, setEditDoi] = useState("")
  const [editAnio, setEditAnio] = useState("")
  const [saving, setSaving] = useState(false)

  const isAdmin = user?.rol === "Admin"

  // Fetch Types and Courses for Edit Dropdowns
  const { data: tipos = [] } = useQuery<{ id: number; nombre: string }[]>({
    queryKey: ["resource-types"],
    queryFn: async () => {
      const { data } = await api.get("/resources/types")
      return data
    },
    enabled: open && isAdmin,
  })

  const { data: cursos = [] } = useQuery<{ id: number; nombre: string }[]>({
    queryKey: ["cursos-list"],
    queryFn: async () => {
      const { data } = await api.get("/resources/courses")
      return data
    },
    enabled: open && isAdmin,
  })

  useEffect(() => {
    if (resource) {
      setLocalResource(resource)
      setIsEditing(false) // reset edit state when resource changes
    }
  }, [resource])

  useEffect(() => {
    if (resource && open) {
      // Track view is now public
      trackView(resource.id)
        .then((updated) => {
          setLocalResource(updated)
          queryClient.invalidateQueries({ queryKey: ["resources"] })
        })
        .catch((err) => {
          console.error("Error tracking view:", err)
        })
    }
  }, [resource?.id, open, queryClient])

  useEffect(() => {
    if (resource && open) {
      const fetchUrl = async () => {
        setLoadingPdf(true)
        try {
          const url = await getResourceUrl(resource.id)
          setPdfUrl(url)
        } catch {
          toast.error("Error al cargar la visualización del PDF")
        } finally {
          setLoadingPdf(false)
        }
      }
      fetchUrl()
    } else {
      setPdfUrl(null)
    }
  }, [resource?.id, open])

  if (!resource || !localResource) return null

  const year = new Date(localResource.created_at).getFullYear()

  const handleStartEdit = () => {
    setEditTitle(localResource.titulo)
    setEditSummary(localResource.resumen ?? "")
    setEditType(String(localResource.tipo_recurso_id))
    setEditCourse(localResource.curso_id ? String(localResource.curso_id) : "none")
    setEditAutores(localResource.autores ?? "")
    setEditEditorial(localResource.editorial ?? "")
    setEditDoi(localResource.doi ?? "")
    setEditAnio(localResource.anio ? String(localResource.anio) : "")
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
  }

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      toast.error("El título no puede estar vacío")
      return
    }
    setSaving(true)
    try {
      const updated = await updateResource(localResource.id, {
        titulo: editTitle,
        resumen: editSummary || null,
        tipo_recurso_id: Number(editType),
        curso_id: editCourse === "none" ? null : Number(editCourse),
        autores: editAutores || null,
        editorial: editEditorial || null,
        doi: editDoi || null,
        anio: editAnio ? Number(editAnio) : null,
      })
      setLocalResource(updated)
      setIsEditing(false)
      toast.success("Metadatos actualizados con éxito")
      queryClient.invalidateQueries({ queryKey: ["resources"] })
    } catch (error) {
      toast.error("Error al guardar los cambios")
      console.error("Error saving edits:", error)
    } finally {
      setSaving(false)
    }
  }

  // Mendeley dynamic citation calculations
  const citationYear = localResource.anio ?? year
  const citationAuthors = localResource.autores ?? "Facultad de Ingeniería Química - UNCP"
  const citationPublisher = localResource.editorial ?? "Biblioteca Virtual FIQ-UNCP"
  const doiText = localResource.doi ? `. DOI: ${localResource.doi}` : ""

  const getCitationText = () => {
    const title = localResource.titulo
    const originUrl = `${window.location.origin}/biblioteca`
    
    switch (citationFormat) {
      case "IEEE":
        return `${citationAuthors}, "${title}," ${citationPublisher}, ${citationYear}.${localResource.doi ? ` DOI: ${localResource.doi}.` : ""} [En línea]. Disponible en: ${originUrl}`
      case "VANCOUVER": {
        const currentDateFormatted = new Date().toLocaleDateString("es-PE", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
        return `${citationAuthors}. ${title} [Internet]. Huancayo: ${citationPublisher}; ${citationYear} [citado el ${currentDateFormatted}]. Disponible en: ${originUrl}${localResource.doi ? `. DOI: ${localResource.doi}` : ""}`
      }
      case "APA":
      default:
        return `${citationAuthors}. (${citationYear}). ${title}. ${citationPublisher}. ${originUrl}${doiText}`
    }
  }

  const getBibtexText = () => {
    const key = `fiq_${localResource.id}_${citationYear}`
    const title = localResource.titulo
    const course = localResource.curso_nombre ?? "Química"
    const originUrl = `${window.location.origin}/biblioteca`
    
    return `@misc{${key},
  author = {${citationAuthors}},
  title = {${title}},
  year = {${citationYear}},
  howpublished = {${citationPublisher}},
  note = {Curso: ${course}${localResource.doi ? `, DOI: ${localResource.doi}` : ""}},
  url = {${originUrl}}
}`
  }

  const handleCopyCitation = () => {
    navigator.clipboard.writeText(getCitationText())
    setCopied(true)
    toast.success("Cita copiada en formato " + citationFormat)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyBibtex = () => {
    navigator.clipboard.writeText(getBibtexText())
    toast.success("Cita copiada en formato BibTeX")
  }

  const handleDownload = async () => {
    if (!isAuthenticated()) {
      toast.error("Debe iniciar sesión para descargar recursos", {
        description: "Será redirigido al login en unos segundos...",
      })
      setTimeout(() => {
        navigate("/login")
      }, 2000)
      return
    }

    try {
      const { download_url, resource: updated } = await trackDownload(resource.id)
      setLocalResource(updated)
      
      const link = document.createElement("a")
      link.href = download_url
      link.setAttribute("target", "_blank")
      link.click()
      
      queryClient.invalidateQueries({ queryKey: ["resources"] })
    } catch (error: unknown) {
      if (getErrorStatus(error) === 401) {
        toast.error("Sesión expirada. Por favor inicie sesión nuevamente.")
        navigate("/login")
      } else {
        toast.error("Error al generar el enlace de descarga")
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-[98vw] h-[95vh] sm:max-w-7xl p-0 overflow-hidden flex flex-col md:flex-row animate-fade-in-scale gap-0 border-zinc-200 dark:border-zinc-800">
        
        {/* Left Area: PDF Viewer (Center of Mendeley layout) */}
        <div className="flex-1 h-full bg-zinc-950 overflow-hidden flex flex-col min-w-0">
          {loadingPdf ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 text-zinc-400 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
              <p className="text-xs">Cargando visor de PDF seguro...</p>
            </div>
          ) : pdfUrl ? (
            <PdfViewer url={pdfUrl} />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-red-950/20 text-red-400 border border-red-900/50 m-6 rounded-xl text-xs gap-2">
              No se pudo generar la vista previa del documento.
            </div>
          )}
        </div>

        {/* Right Area: Metadata & Citations (Right-pane of Mendeley layout) */}
        <div className="w-full md:w-96 border-t md:border-t-0 md:border-l border-gray-200 dark:border-zinc-800 p-6 flex flex-col justify-between bg-white dark:bg-zinc-950 overflow-y-auto shrink-0 md:h-full">
          {isEditing ? (
            /* Editing State view */
            <div className="space-y-5 flex-1 flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">
                    Editar Metadatos
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-zinc-500 hover:text-red-600 h-7 cursor-pointer"
                      onClick={handleCancelEdit}
                      disabled={saving}
                    >
                      <X className="h-3.5 w-3.5 mr-1" /> Cancelar
                    </Button>
                    <Button
                      variant="default"
                      size="xs"
                      className="bg-brand-500 hover:bg-brand-600 text-white h-7 cursor-pointer"
                      onClick={handleSaveEdit}
                      disabled={saving}
                    >
                      {saving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      ) : (
                        <Save className="h-3.5 w-3.5 mr-1" />
                      )}
                      Guardar
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-3xs font-semibold text-gray-400 uppercase">
                      Título del Recurso
                    </label>
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="text-xs font-semibold"
                      disabled={saving}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-3xs font-semibold text-gray-400 uppercase">
                        Tipo
                      </label>
                      <Select value={editType} onValueChange={(val) => setEditType(val ?? "")} disabled={saving}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {tipos.map((t) => (
                            <SelectItem key={t.id} value={String(t.id)} className="text-xs">
                              {t.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-3xs font-semibold text-gray-400 uppercase">
                        Curso
                      </label>
                      <Select value={editCourse} onValueChange={(val) => setEditCourse(val ?? "none")} disabled={saving}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Curso" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="text-xs">Sin curso</SelectItem>
                          {cursos.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                              {c.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-3xs font-semibold text-gray-400 uppercase">
                        Autores
                      </label>
                      <Input
                        value={editAutores}
                        onChange={(e) => setEditAutores(e.target.value)}
                        className="text-xs"
                        placeholder="ej. Pérez J."
                        disabled={saving}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-3xs font-semibold text-gray-400 uppercase">
                        Revista / Editorial
                      </label>
                      <Input
                        value={editEditorial}
                        onChange={(e) => setEditEditorial(e.target.value)}
                        className="text-xs"
                        placeholder="ej. Elsevier"
                        disabled={saving}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-3xs font-semibold text-gray-400 uppercase">
                        Año de Publicación
                      </label>
                      <Input
                        value={editAnio}
                        onChange={(e) => setEditAnio(e.target.value)}
                        className="text-xs"
                        placeholder="ej. 2026"
                        disabled={saving}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-3xs font-semibold text-gray-400 uppercase">
                        DOI / ISBN
                      </label>
                      <Input
                        value={editDoi}
                        onChange={(e) => setEditDoi(e.target.value)}
                        className="text-xs"
                        placeholder="ej. 10.1016/..."
                        disabled={saving}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-3xs font-semibold text-gray-400 uppercase">
                      Resumen / Sinopsis
                    </label>
                    <Textarea
                      value={editSummary}
                      onChange={(e) => setEditSummary(e.target.value)}
                      className="text-xs min-h-[80px] leading-relaxed"
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Read-only details and citation generator view */
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <DialogHeader className="p-0 text-left flex-1">
                  <DialogTitle className="text-xl font-bold text-brand-700 leading-tight">
                    {localResource.titulo}
                  </DialogTitle>
                </DialogHeader>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-gray-400 hover:text-brand-600 shrink-0 cursor-pointer h-8 w-8"
                    onClick={handleStartEdit}
                    title="Editar Metadatos"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Metadata badges row */}
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline" className="text-brand-600 border-brand-300 bg-brand-50/10">
                  <FileText className="h-3.5 w-3.5 mr-1" />
                  {localResource.tipo_recurso_nombre ?? localResource.archivo_mime}
                </Badge>
                {localResource.curso_nombre && (
                  <Badge variant="secondary">
                    <BookOpen className="h-3 w-3 mr-1" />
                    {localResource.curso_nombre}
                  </Badge>
                )}
              </div>

              <div className="text-xs text-gray-500 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>
                  Publicado el{" "}
                  {new Date(localResource.created_at).toLocaleDateString("es-PE", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>

              {/* Abstract/Summary */}
              {localResource.resumen && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Resumen
                  </h4>
                  <p className="text-gray-600 text-sm leading-relaxed border-l-4 border-brand-400 pl-3 py-1 italic bg-gray-50/30 rounded-r-md">
                    {localResource.resumen}
                  </p>
                </div>
              )}

              {/* Mendeley Citation Metadata Panel (Read-only) */}
              <div className="space-y-2.5 border-t pt-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Detalles del Documento
                </h4>
                <div className="text-xs space-y-1.5 text-gray-600">
                  <p><span className="font-semibold text-gray-500">Autores:</span> {localResource.autores ?? "Facultad de Ingeniería Química - UNCP"}</p>
                  {localResource.editorial && <p><span className="font-semibold text-gray-500">Revista / Editorial:</span> {localResource.editorial}</p>}
                  {localResource.anio && <p><span className="font-semibold text-gray-500">Año de Publicación:</span> {localResource.anio}</p>}
                  {localResource.doi && <p><span className="font-semibold text-gray-500">DOI / ISBN:</span> <span className="font-mono text-brand-600 select-all">{localResource.doi}</span></p>}
                </div>
              </div>

              {/* Citation Card (Mendeley style) */}
              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                    Citar Recurso
                  </h4>
                  <div className="flex bg-gray-100 dark:bg-zinc-800 p-0.5 rounded-md animate-none">
                    {(["APA", "IEEE", "VANCOUVER"] as const).map((format) => (
                      <button
                        key={format}
                        onClick={() => setCitationFormat(format)}
                        className={`text-3xs font-bold px-2 py-1 rounded-sm cursor-pointer transition-all ${
                          citationFormat === format
                            ? "bg-white dark:bg-zinc-950 text-brand-700 dark:text-brand-400 shadow-xs"
                            : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                        }`}
                      >
                        {format}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 relative group/citation">
                  <p className="text-2xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-mono select-all pr-6">
                    {getCitationText()}
                  </p>
                  <button
                    onClick={handleCopyCitation}
                    className="absolute right-2 top-2 text-zinc-400 hover:text-brand-600 transition-colors p-1 rounded hover:bg-zinc-200/50 cursor-pointer"
                    title="Copiar cita"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-green-600 animate-in fade-in zoom-in" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-3xs font-semibold text-zinc-500 hover:text-brand-600 cursor-pointer h-7 px-2"
                    onClick={handleCopyBibtex}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copiar BibTeX
                  </Button>
                </div>
              </div>

              {/* Stats Badges Grid */}
              <div className="space-y-2 border-t pt-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Métricas del Recurso
                </h4>
                <div className="grid grid-cols-3 gap-2 bg-gray-50/80 p-3.5 rounded-xl border border-gray-100 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-2xs text-gray-500 font-medium flex items-center gap-1 mb-0.5">
                      <Eye className="h-3.5 w-3.5 text-brand-500" /> Vistas
                    </span>
                    <span className="text-sm font-bold text-gray-800">{localResource.visualizaciones}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center border-x border-gray-200">
                    <span className="text-2xs text-gray-500 font-medium flex items-center gap-1 mb-0.5">
                      <Download className="h-3.5 w-3.5 text-brand-500" /> Descargas
                    </span>
                    <span className="text-sm font-bold text-gray-800">{localResource.descargas}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-2xs text-gray-500 font-medium flex items-center gap-1 mb-0.5">
                      <FileText className="h-3.5 w-3.5 text-brand-500" /> Tamaño
                    </span>
                    <span className="text-sm font-bold text-gray-800 font-mono">
                      {formatBytes(localResource.archivo_size)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Footer (Sticky at the bottom of the right column) */}
          <div className="pt-6 border-t mt-6 md:mt-0 shrink-0">
            <Button
              className="w-full bg-brand-500 hover:bg-brand-600 cursor-pointer text-white px-4 h-11 shadow-md hover:shadow-lg transition-all animate-none text-sm font-semibold"
              onClick={handleDownload}
            >
              {isAuthenticated() ? (
                <><Download className="h-4 w-4 mr-2" /> Descargar PDF</>
              ) : (
                <><Lock className="h-4 w-4 mr-2" /> Iniciar Sesión para Descargar</>
              )}
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  )
}

export function ResourceDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  )
}
