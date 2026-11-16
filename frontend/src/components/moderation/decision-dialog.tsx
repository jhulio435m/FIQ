import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MIN_COMMENT_LENGTH } from "@/services/moderation"

const QUICK_REASONS = {
  observe: [
    "Completa los metadatos: autores, año y curso.",
    "El PDF no se ve bien o está incompleto; súbelo de nuevo.",
    "Agrega un resumen que explique el contenido y su uso en el curso.",
    "Indica la fuente o el permiso de publicación del material.",
  ],
  reject: [
    "El material no corresponde a los cursos de la facultad.",
    "El contenido está protegido por derechos de autor y no tiene permiso de publicación.",
    "Es un duplicado de un recurso ya publicado.",
  ],
} as const

interface Props {
  action: "observe" | "reject"
  titulo: string
  open: boolean
  pending: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (comentario: string) => void
}

export function DecisionDialog({ action, titulo, open, pending, onOpenChange, onConfirm }: Props) {
  const [comentario, setComentario] = useState("")
  const trimmed = comentario.trim()
  const valid = trimmed.length >= MIN_COMMENT_LENGTH
  const isReject = action === "reject"

  const addReason = (reason: string) =>
    setComentario((current) => (current.trim() ? `${current.trim()}\n${reason}` : reason))

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setComentario("")
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isReject ? "Rechazar recurso" : "Pedir cambios al autor"}</DialogTitle>
          <DialogDescription>
            «{titulo}».{" "}
            {isReject
              ? "El rechazo es definitivo: el autor verá el motivo pero no podrá reenviarlo."
              : "El autor verá tu comentario en «Mis recursos» y podrá corregir y reenviar."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5" aria-label="Motivos frecuentes">
            {QUICK_REASONS[action].map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => addReason(reason)}
                className="cursor-pointer rounded-full border border-gray-200 px-2.5 py-1 text-left text-xs text-gray-600 hover:border-brand-300 hover:bg-brand-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                {reason}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="decision-comment">{isReject ? "Motivo del rechazo" : "Qué debe corregir"}</Label>
            <Textarea
              id="decision-comment"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={5}
              maxLength={1000}
              placeholder={isReject ? "Explica por qué no se puede publicar…" : "Sé específico: qué falta y cómo corregirlo…"}
            />
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              {valid ? `${trimmed.length}/1000` : `Mínimo ${MIN_COMMENT_LENGTH} caracteres.`}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm(trimmed)}
            disabled={!valid || pending}
            className={isReject ? "cursor-pointer bg-red-600 text-white hover:bg-red-700" : "cursor-pointer bg-brand-500 text-white hover:bg-brand-600"}
          >
            {pending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            {isReject ? "Rechazar" : "Enviar observación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
