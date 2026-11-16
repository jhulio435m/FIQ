import { useEffect, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Edit2 } from "lucide-react"
import { trackView, trackDownload, getResourceUrl } from "@/services/resources"
import { useAuthStore } from "@/stores/auth"
import { toast } from "sonner"
import type { Recurso } from "@/services/resources"
import { PdfViewer } from "./pdf-viewer"
import { isAdmin as checkIsAdmin } from "@/lib/auth"

import { ResourceEditForm } from "./ResourceEditForm"
import { ResourceMetadataPanel } from "./ResourceMetadataPanel"
import { ResourceCitationPanel } from "./ResourceCitationPanel"
import { ResourceStatsPanel } from "./ResourceStatsPanel"
import { ResourceActionBar } from "./ResourceActionBar"

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
  // Versión actualizada del recurso (tras registrar la vista o editarlo). Solo se
  // usa si corresponde al recurso abierto; así no hay que sincronizar estado en efectos.
  const [updatedResource, setUpdatedResource] = useState<Recurso | null>(null)
  // Guardar el id en edición (y no un boolean) cierra la edición al cambiar de recurso.
  const [editingId, setEditingId] = useState<Recurso["id"] | null>(null)

  const isAdmin = checkIsAdmin(user)
  const resourceId = resource?.id
  const localResource = updatedResource && updatedResource.id === resourceId ? updatedResource : resource
  const isEditing = resourceId !== undefined && editingId === resourceId

  useEffect(() => {
    if (resourceId === undefined || !open) return
    trackView(resourceId)
      .then((updated) => {
        setUpdatedResource(updated)
        queryClient.invalidateQueries({ queryKey: ["resources"] })
      })
      .catch((err) => {
        console.error("Error tracking view:", err)
      })
  }, [resourceId, open, queryClient])

  const pdfQuery = useQuery({
    queryKey: ["resource-url", resourceId],
    queryFn: () => getResourceUrl(resourceId as Recurso["id"]),
    enabled: open && resourceId !== undefined,
    // Las URL prefirmadas duran 1 h: se reutilizan al reabrir el mismo recurso.
    staleTime: 50 * 60 * 1000,
    retry: 1,
  })
  const pdfUrl = open ? pdfQuery.data ?? null : null
  const loadingPdf = open && pdfQuery.isFetching && !pdfQuery.data

  useEffect(() => {
    if (pdfQuery.isError) toast.error("Error al cargar la visualización del PDF")
  }, [pdfQuery.isError])

  if (!resource || !localResource) return null

  const handleStartEdit = () => setEditingId(resource.id)
  const handleCancelEdit = () => setEditingId(null)

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
      setUpdatedResource(updated)
      
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
            <ResourceEditForm 
              resource={localResource} 
              onCancel={handleCancelEdit} 
              onSave={(updated) => { setUpdatedResource(updated); setEditingId(null) }}
            />
          ) : (
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

              <ResourceMetadataPanel resource={localResource} />
              <ResourceCitationPanel resource={localResource} />
              <ResourceStatsPanel resource={localResource} />
            </div>
          )}

          <ResourceActionBar isAuthenticated={isAuthenticated()} onDownload={handleDownload} />
        </div>

      </DialogContent>
    </Dialog>
  )
}


