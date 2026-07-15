import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Save, X } from "lucide-react"
import { toast } from "sonner"
import type { Recurso } from "@/services/resources"
import { updateResource } from "@/services/resources"
import { useResourceTypes, useCourses } from "@/hooks/use-resource-data"

interface Props {
  resource: Recurso
  onCancel: () => void
  onSave: (updated: Recurso) => void
}

export function ResourceEditForm({ resource, onCancel, onSave }: Props) {
  const queryClient = useQueryClient()
  const { data: tipos = [] } = useResourceTypes()
  const { data: cursos = [] } = useCourses()

  const [editTitle, setEditTitle] = useState(resource.titulo)
  const [editSummary, setEditSummary] = useState(resource.resumen ?? "")
  const [editType, setEditType] = useState(String(resource.tipo_recurso_id))
  const [editCourse, setEditCourse] = useState(resource.curso_id ? String(resource.curso_id) : "none")
  const [editAutores, setEditAutores] = useState(resource.autores ?? "")
  const [editEditorial, setEditEditorial] = useState(resource.editorial ?? "")
  const [editDoi, setEditDoi] = useState(resource.doi ?? "")
  const [editAnio, setEditAnio] = useState(resource.anio ? String(resource.anio) : "")
  const [saving, setSaving] = useState(false)

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      toast.error("El título no puede estar vacío")
      return
    }
    setSaving(true)
    try {
      const updated = await updateResource(resource.id, {
        titulo: editTitle,
        resumen: editSummary || null,
        tipo_recurso_id: Number(editType),
        curso_id: editCourse === "none" ? null : Number(editCourse),
        autores: editAutores || null,
        editorial: editEditorial || null,
        doi: editDoi || null,
        anio: editAnio ? Number(editAnio) : null,
      })
      onSave(updated)
      toast.success("Metadatos actualizados con éxito")
      queryClient.invalidateQueries({ queryKey: ["resources"] })
    } catch (error) {
      toast.error("Error al guardar los cambios")
      console.error("Error saving edits:", error)
    } finally {
      setSaving(false)
    }
  }

  return (
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
              onClick={onCancel}
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
  )
}
