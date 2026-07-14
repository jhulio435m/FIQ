import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import type { FieldErrors, Resolver } from "react-hook-form"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UploadCloud, FileText, Loader2, FileUp, CheckCircle2 } from "lucide-react"
import api from "@/services/api"
import { uploadResource } from "@/services/resources"
import { toast } from "sonner"

const uploadSchema = z.object({
  titulo: z.string().min(5, "El título debe tener al menos 5 caracteres"),
  resumen: z.string().optional(),
  tipo_recurso_id: z.string().min(1, "Seleccione un tipo de recurso"),
  curso_id: z.string().optional(),
  autores: z.string().optional(),
  editorial: z.string().optional(),
  doi: z.string().optional(),
  anio: z.string().refine((val) => !val || !isNaN(Number(val)), {
    message: "El año debe ser un número válido",
  }).optional(),
})

type UploadFormValues = z.infer<typeof uploadSchema>

const uploadResolver: Resolver<UploadFormValues> = async (values) => {
  const result = uploadSchema.safeParse(values)
  if (result.success) {
    return { values: result.data, errors: {} }
  }

  const errors: FieldErrors<UploadFormValues> = {}
  for (const issue of result.error.issues) {
    const field = issue.path[0]
    if (typeof field === "string" && field in values) {
      errors[field as keyof UploadFormValues] = {
        type: issue.code,
        message: issue.message,
      }
    }
  }
  return { values: {}, errors }
}

export function UploadDialog() {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploadStep, setUploadStep] = useState<"idle" | "uploading" | "success">("idle")
  const queryClient = useQueryClient()

  const { data: tipos = [] } = useQuery<{ id: number; nombre: string }[]>({
    queryKey: ["resource-types"],
    queryFn: async () => {
      const { data } = await api.get("/resources/types")
      return data
    },
  })

  const { data: cursos = [] } = useQuery<{ id: number; nombre: string }[]>({
    queryKey: ["cursos-list"],
    queryFn: async () => {
      const { data } = await api.get("/resources/courses")
      return data
    },
  })

  const form = useForm<UploadFormValues>({
    resolver: uploadResolver,
    defaultValues: {
      titulo: "",
      resumen: "",
      tipo_recurso_id: "",
      curso_id: "",
      autores: "",
      editorial: "",
      doi: "",
      anio: "",
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        toast.error("Solo se permiten archivos PDF")
        return
      }
      if (selectedFile.size > 20 * 1024 * 1024) {
        toast.error("El archivo excede el límite de 20MB")
        return
      }
      setFile(selectedFile)
    }
  }

  const onSubmit = async (values: UploadFormValues) => {
    if (!file) return toast.error("Seleccione un archivo PDF")

    try {
      setUploadStep("uploading")
      const formData = new FormData()
      formData.append("file", file)
      formData.append("titulo", values.titulo)
      if (values.resumen) formData.append("resumen", values.resumen)
      formData.append("tipo_recurso_id", values.tipo_recurso_id)
      if (values.curso_id && values.curso_id !== "none") formData.append("curso_id", values.curso_id)
      if (values.autores) formData.append("autores", values.autores)
      if (values.editorial) formData.append("editorial", values.editorial)
      if (values.doi) formData.append("doi", values.doi)
      if (values.anio) formData.append("anio", values.anio)

      await uploadResource(formData)

      setUploadStep("success")
      toast.success("Recurso subido con éxito")
      
      setTimeout(() => {
        setOpen(false)
        setUploadStep("idle")
        form.reset()
        setFile(null)
        queryClient.invalidateQueries({ queryKey: ["resources"] })
      }, 2000)

    } catch (error: unknown) {
      setUploadStep("idle")
      const response = typeof error === "object" && error !== null && "response" in error
        ? (error as { response?: { data?: { detail?: string } } }).response
        : undefined
      const message = response?.data?.detail || "Error al subir el recurso"
      toast.error(message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="bg-brand-500 hover:bg-brand-600 text-white transition-all shadow-md hover:shadow-lg">
            <UploadCloud className="w-4 h-4 mr-2" />
            Subir Recurso
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-brand-900">Subir Recurso Académico</DialogTitle>
          <DialogDescription>
            El recurso quedará pendiente hasta que un administrador lo apruebe.
          </DialogDescription>
        </DialogHeader>

        {uploadStep === "success" ? (
          <div className="py-12 flex flex-col items-center justify-center gap-4 animate-fade-in">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <p className="text-xl font-semibold text-brand-900">¡Subida Completada!</p>
            <p className="text-sm text-gray-500 text-center px-8">
              Tu recurso ha sido almacenado de forma segura y está pendiente de revisión.
            </p>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label htmlFor="file" className="text-brand-700 font-semibold text-xs">Archivo PDF</Label>
              <div 
                className={`border-2 border-dashed rounded-lg p-5 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer
                  ${file ? "border-brand-500 bg-brand-50/50" : "border-gray-200 hover:border-brand-400 hover:bg-brand-50/20"}`}
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <input id="file-input" type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                {file ? (
                  <>
                    <FileText className="h-8 w-8 text-brand-600" />
                    <div className="text-center">
                      <p className="text-xs font-medium text-brand-700 truncate max-w-[250px]">{file.name}</p>
                      <p className="text-3xs text-brand-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </>
                ) : (
                  <>
                    <FileUp className="h-8 w-8 text-gray-400" />
                    <p className="text-xs text-gray-500">Haz clic para seleccionar o arrastra un PDF aquí</p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="titulo" className="text-brand-700 font-semibold text-xs">Título del Recurso</Label>
              <Input id="titulo" placeholder="Título descriptivo..." {...form.register("titulo")} className="h-9 text-xs" />
              {form.formState.errors.titulo && <p className="text-xs text-red-500">{form.formState.errors.titulo.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-brand-700 font-semibold text-xs">Tipo de Recurso</Label>
                <Select onValueChange={(v) => form.setValue("tipo_recurso_id", v as string)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    {tipos.map((t) => <SelectItem key={t.id} value={String(t.id)} className="text-xs">{t.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-brand-700 font-semibold text-xs">Curso</Label>
                <Select onValueChange={(v) => form.setValue("curso_id", v as string)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Curso" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">Ninguno</SelectItem>
                    {cursos.map((c) => <SelectItem key={c.id} value={String(c.id)} className="text-xs">{c.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Mendeley Citation Metadata Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="autores" className="text-brand-700 font-semibold text-xs">Autores (Opcional)</Label>
                <Input id="autores" placeholder="ej. Pérez J., Gómez A." {...form.register("autores")} className="h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="editorial" className="text-brand-700 font-semibold text-xs">Revista / Editorial (Opcional)</Label>
                <Input id="editorial" placeholder="ej. FIQ-UNCP, Elsevier" {...form.register("editorial")} className="h-9 text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="anio" className="text-brand-700 font-semibold text-xs">Año de Publicación (Opcional)</Label>
                <Input id="anio" placeholder="ej. 2026" {...form.register("anio")} className="h-9 text-xs" />
                {form.formState.errors.anio && <p className="text-xs text-red-500">{form.formState.errors.anio.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="doi" className="text-brand-700 font-semibold text-xs">DOI / ISBN (Opcional)</Label>
                <Input id="doi" placeholder="ej. 10.1016/j.env.2026" {...form.register("doi")} className="h-9 text-xs" />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="resumen" className="text-brand-700 font-semibold text-xs">Resumen (Opcional)</Label>
              <Textarea id="resumen" {...form.register("resumen")} className="h-16 text-xs leading-relaxed" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={uploadStep !== "idle"} className="h-9 text-xs">
                Cancelar
              </Button>
              <Button type="submit" className="bg-brand-500 hover:bg-brand-600 text-white min-w-[120px] h-9 text-xs" disabled={uploadStep !== "idle"}>
                {uploadStep === "idle" ? "Iniciar Subida" : (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    Subiendo...
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
