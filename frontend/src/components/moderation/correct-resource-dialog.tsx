import { useState } from "react"
import { useDropzone } from "react-dropzone"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { FileUp, Loader2, Pencil, Send } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ResourceEditForm } from "@/components/library/ResourceEditForm"
import { apiErrorMessage, MY_RESOURCES_KEY, MODERATION_QUEUE_KEY } from "@/hooks/use-moderation"
import { replaceResourceFile, resubmitResource, type ModerationItem } from "@/services/moderation"
import { formatBytes } from "@/lib/utils"

const MAX_PDF_BYTES = 20 * 1024 * 1024

interface Props {
  item: ModerationItem
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Corregir un recurso propio. Si está observado, termina reenviándolo a revisión;
 * si está pendiente, solo guarda los cambios (sigue en la cola).
 */
export function CorrectResourceDialog({ item, open, onOpenChange }: Props) {
  const queryClient = useQueryClient()
  const [editingMetadata, setEditingMetadata] = useState(false)
  const [metadataSaved, setMetadataSaved] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [nota, setNota] = useState("")
  const isObserved = item.estado_nombre === "Observado"

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    maxSize: MAX_PDF_BYTES,
    onDropAccepted: ([accepted]) => setFile(accepted),
    onDropRejected: ([rejection]) =>
      toast.error(
        rejection?.errors[0]?.code === "file-too-large" ? "El archivo supera los 20 MB" : "Solo se aceptan archivos PDF",
      ),
  })

  const submit = useMutation({
    mutationFn: async () => {
      if (file) await replaceResourceFile(item.id, file)
      if (isObserved) await resubmitResource(item.id, nota.trim() || undefined)
    },
    onSuccess: () => {
      toast.success(isObserved ? "Reenviado a revisión" : "Cambios guardados", {
        description: isObserved ? "Te avisaremos aquí cuando el administrador lo revise." : undefined,
      })
      queryClient.invalidateQueries({ queryKey: MY_RESOURCES_KEY })
      queryClient.invalidateQueries({ queryKey: MODERATION_QUEUE_KEY })
      queryClient.invalidateQueries({ queryKey: ["resource-history", item.id] })
      onOpenChange(false)
    },
    onError: (error) => toast.error(apiErrorMessage(error, "No se pudieron guardar los cambios")),
  })

  const nothingToSave = !isObserved && !file

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isObserved ? "Corregir y reenviar" : "Editar recurso en revisión"}</DialogTitle>
          <DialogDescription>«{item.titulo}»</DialogDescription>
        </DialogHeader>

        {isObserved && item.ultimo_comentario && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm dark:border-orange-500/30 dark:bg-orange-500/10">
            <p className="font-medium text-orange-900 dark:text-orange-200">Lo que pidió el revisor</p>
            <p className="mt-1 whitespace-pre-line text-orange-900/80 dark:text-orange-200/80">{item.ultimo_comentario}</p>
          </div>
        )}

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-zinc-200">1. Datos del recurso</h3>
            {!editingMetadata && (
              <Button variant="ghost" size="sm" className="cursor-pointer" onClick={() => setEditingMetadata(true)}>
                <Pencil className="mr-1 h-3.5 w-3.5" /> {metadataSaved ? "Editar otra vez" : "Editar"}
              </Button>
            )}
          </div>
          {editingMetadata ? (
            <ResourceEditForm
              resource={item}
              onCancel={() => setEditingMetadata(false)}
              onSave={() => {
                setEditingMetadata(false)
                setMetadataSaved(true)
                queryClient.invalidateQueries({ queryKey: MY_RESOURCES_KEY })
              }}
            />
          ) : (
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              {metadataSaved ? "Datos actualizados." : "Título, resumen, autores, año, curso y tipo."}
            </p>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-zinc-200">2. Archivo PDF (opcional)</h3>
          <div
            {...getRootProps()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-4 text-center text-sm transition-colors ${
              isDragActive || file
                ? "border-brand-400 bg-brand-50/50 dark:bg-brand-950/20"
                : "border-gray-200 hover:border-brand-300 dark:border-zinc-700"
            }`}
          >
            <input {...getInputProps()} aria-label="Reemplazar archivo PDF" />
            <FileUp className="mx-auto mb-1 h-5 w-5 text-gray-400" aria-hidden />
            {file ? (
              <p className="text-gray-800 dark:text-zinc-200">
                {file.name} <span className="text-gray-500">({formatBytes(file.size)})</span>
              </p>
            ) : (
              <p className="text-gray-500 dark:text-zinc-400">
                Arrastra el PDF corregido o haz clic para elegirlo. Actual: {formatBytes(item.archivo_size)}.
              </p>
            )}
          </div>
        </section>

        {isObserved && (
          <section className="space-y-1.5">
            <Label htmlFor="resubmit-note">3. Nota para el revisor (opcional)</Label>
            <Textarea
              id="resubmit-note"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Ej.: agregué la portada y completé los autores."
            />
          </section>
        )}

        <DialogFooter>
          <Button variant="outline" className="cursor-pointer" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="cursor-pointer bg-brand-500 text-white hover:bg-brand-600"
            disabled={submit.isPending || editingMetadata || nothingToSave}
            onClick={() => submit.mutate()}
          >
            {submit.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
            {isObserved ? "Reenviar a revisión" : "Guardar archivo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
