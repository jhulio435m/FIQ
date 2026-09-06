import { useState } from "react"
import { AlertTriangle, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { createResourceReport, type ReportCreate } from "@/services/community"

interface Props {
  resourceId: number
  trigger?: React.ReactNode
}

export function ResourceReportDialog({ resourceId, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [motivo, setMotivo] = useState<ReportCreate["motivo"]>("metadatos_incorrectos")
  const [descripcion, setDescripcion] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (descripcion.trim().length < 5) {
      toast.error("Por favor describe el problema con al menos 5 caracteres")
      return
    }

    setSubmitting(true)
    try {
      await createResourceReport(resourceId, {
        motivo,
        descripcion: descripcion.trim(),
      })
      toast.success("Reporte enviado correctamente", {
        description: "El equipo editorial de la facultad revisará la observación.",
      })
      setDescripcion("")
      setOpen(false)
    } catch {
      toast.error("Error al enviar el reporte. Por favor intenta de nuevo.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          (trigger as React.ReactElement) ?? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
            >
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
              Reportar problema con el documento
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-brand-700 dark:text-brand-300">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Reportar recurso
          </DialogTitle>
          <DialogDescription>
            Notifica al equipo editorial sobre inconsistencias en este documento.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700 dark:text-zinc-300">
              Tipo de problema
            </label>
            <Select
              value={motivo}
              onValueChange={(val) => setMotivo(val as ReportCreate["motivo"])}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona un motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="metadatos_incorrectos">
                  Metadatos incorrectos (autor, título, año, etc.)
                </SelectItem>
                <SelectItem value="archivo_corrupto">
                  Archivo ilegible, incompleto o dañado
                </SelectItem>
                <SelectItem value="duplicado">
                  Documento duplicado
                </SelectItem>
                <SelectItem value="otro">
                  Otro problema
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700 dark:text-zinc-300">
              Detalles de la observación (mínimo 5 caracteres)
            </label>
            <Textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe con precisión qué debe ser corregido..."
              rows={4}
              maxLength={1000}
              className="resize-none text-xs"
              required
            />
            <div className="flex justify-end">
              <span className="text-3xs text-muted-foreground">
                {descripcion.length}/1000 caracteres
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || descripcion.trim().length < 5}
              className="bg-brand-500 hover:bg-brand-600 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar reporte"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
