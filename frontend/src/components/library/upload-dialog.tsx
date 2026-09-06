import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
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
import { UploadCloud, FileText, Loader2, FileUp, CheckCircle2, AlertCircle } from "lucide-react"
import { uploadResource } from "@/services/resources"
import { useResourceTypes, useCourses } from "@/hooks/use-resource-data"
import { toast } from "sonner"

const currentYear = new Date().getFullYear()

const uploadSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(5, "El título debe tener al menos 5 caracteres")
    .max(255, "El título no puede exceder 255 caracteres"),
  resumen: z
    .string()
    .trim()
    .max(2000, "El resumen no puede exceder 2000 caracteres")
    .optional(),
  tipo_recurso_id: z
    .string()
    .min(1, "Seleccione un tipo de recurso"),
  curso_id: z.string().optional(),
  autores: z
    .string()
    .trim()
    .max(255, "Los autores no pueden exceder 255 caracteres")
    .optional(),
  editorial: z
    .string()
    .trim()
    .max(255, "La editorial no puede exceder 255 caracteres")
    .optional(),
  doi: z
    .string()
    .trim()
    .refine(
      (val) => !val || /^10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+$/.test(val),
      { message: "Formato DOI inválido (ej: 10.1016/j.env.2026)" }
    )
    .optional(),
  isbn: z
    .string()
    .trim()
    .refine(
      (val) => {
        if (!val) return true
        const clean = val.replace(/[-\s]/g, "")
        return /^(?:\d{10}|\d{13}|\d{9}[\dX])$/.test(clean)
      },
      { message: "El ISBN debe contener 10 o 13 dígitos válidos (ej. 9786120000000)" }
    )
    .optional(),
  anio: z
    .string()
    .trim()
    .refine(
      (val) => {
        if (!val) return true
        if (!/^\d{4}$/.test(val)) return false
        const year = Number(val)
        return Number.isInteger(year) && year >= 1800 && year <= currentYear + 2
      },
      { message: `El año debe ser un número entero de 4 dígitos entre 1800 y ${currentYear + 2}` }
    )
    .optional(),
  idioma: z
    .string()
    .trim()
    .refine(
      (val) => !val || /^[a-zA-Z-]{2,10}$/.test(val),
      { message: "Código de idioma inválido (ej. 'es', 'en')" }
    )
    .optional(),
  licencia: z
    .string()
    .trim()
    .max(300, "La licencia no puede exceder 300 caracteres")
    .optional(),
  temas: z
    .string()
    .trim()
    .max(1000, "Los temas no pueden exceder 1000 caracteres")
    .optional(),
})

type UploadFormValues = z.infer<typeof uploadSchema>

const uploadResolver: Resolver<UploadFormValues> = async (values) => {
  const parsed = uploadSchema.safeParse(values)
  if (parsed.success) return { values: parsed.data, errors: {} }

  const errors: FieldErrors<UploadFormValues> = {}
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as keyof UploadFormValues
    if (field) {
      errors[field] ??= { type: issue.code, message: issue.message }
    }
  }
  return { values: {}, errors }
}

export function UploadDialog() {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [uploadStep, setUploadStep] = useState<"idle" | "uploading" | "success">("idle")
  const queryClient = useQueryClient()

  const { data: tipos = [] } = useResourceTypes()
  const { data: cursos = [] } = useCourses()

  const form = useForm<UploadFormValues>({
    resolver: uploadResolver,
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      titulo: "",
      resumen: "",
      tipo_recurso_id: "",
      curso_id: "",
      autores: "",
      editorial: "",
      doi: "",
      isbn: "",
      idioma: "",
      licencia: "",
      temas: "",
      anio: "",
    },
  })

  const selectFile = (selectedFile: File | undefined) => {
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
        setFileError("Solo se permiten archivos en formato PDF (.pdf)")
        toast.error("Solo se permiten archivos PDF")
        return
      }
      if (selectedFile.size > 20 * 1024 * 1024) {
        setFileError("El archivo excede el límite máximo de 20MB")
        toast.error("El archivo excede el límite de 20MB")
        return
      }
      setFile(selectedFile)
      setFileError(null)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    selectFile(e.target.files?.[0])
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    selectFile(event.dataTransfer.files[0])
  }

  const onSubmit = async (values: UploadFormValues) => {
    if (!file) {
      setFileError("Debe seleccionar un archivo PDF para continuar")
      toast.error("Seleccione un archivo PDF")
      return
    }

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
      if (values.isbn) formData.append("isbn", values.isbn)
      if (values.idioma) formData.append("idioma", values.idioma)
      if (values.licencia) formData.append("licencia", values.licencia)
      if (values.temas) formData.append("temas", values.temas)
      if (values.anio) formData.append("anio", values.anio)

      await uploadResource(formData)

      setUploadStep("success")
      toast.success("Recurso subido con éxito")

      setTimeout(() => {
        setOpen(false)
        setUploadStep("idle")
        form.reset()
        setFile(null)
        setFileError(null)
        queryClient.invalidateQueries({ queryKey: ["resources"] })
        queryClient.invalidateQueries({ queryKey: ["resource-catalog"] })
        queryClient.invalidateQueries({ queryKey: ["pending-resources"] })
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
          <Button className="bg-brand-500 hover:bg-brand-600 text-white transition-all shadow-md hover:shadow-lg cursor-pointer">
            <UploadCloud className="w-4 h-4 mr-2" />
            Subir Recurso
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-brand-900 dark:text-brand-100">
            Subir Recurso Académico
          </DialogTitle>
          <DialogDescription>
            El documento será analizado contra virus y quedará pendiente de aprobación editorial.
          </DialogDescription>
        </DialogHeader>

        {uploadStep === "success" ? (
          <div className="py-12 flex flex-col items-center justify-center gap-4 animate-fade-in">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <p className="text-xl font-semibold text-brand-900 dark:text-brand-100">¡Subida Completada!</p>
            <p className="text-sm text-gray-500 dark:text-zinc-400 text-center px-8">
              Tu recurso ha sido almacenado de forma segura y está pendiente de revisión.
            </p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              if (!file) {
                setFileError("Debe seleccionar un archivo PDF para continuar")
              }
              form.handleSubmit(onSubmit)(e)
            }}
            className="space-y-4 pt-2"
          >
            {/* File Drop Area */}
            <div className="space-y-1">
              <Label htmlFor="file-input" className="text-brand-700 dark:text-brand-400 font-semibold text-xs flex items-center justify-between">
                <span>Archivo PDF <span className="text-red-500">*</span></span>
                <span className="text-3xs text-muted-foreground font-normal">Máximo 20 MB</span>
              </Label>
              <div 
                className={`border-2 border-dashed rounded-lg p-5 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer
                  ${fileError ? "border-red-500 bg-red-50/30 dark:bg-red-950/20" : file ? "border-brand-500 bg-brand-50/50 dark:bg-brand-950/20" : "border-gray-200 dark:border-zinc-800 hover:border-brand-400 hover:bg-brand-50/20"}`}
                onClick={() => document.getElementById("file-input")?.click()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
              >
                <input id="file-input" type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleFileChange} />
                {file ? (
                  <>
                    <FileText className="h-8 w-8 text-brand-600" />
                    <div className="text-center">
                      <p className="text-xs font-medium text-brand-700 dark:text-brand-300 truncate max-w-[250px]">{file.name}</p>
                      <p className="text-3xs text-brand-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </>
                ) : (
                  <>
                    <FileUp className="h-8 w-8 text-gray-400" />
                    <p className="text-xs text-gray-500 dark:text-zinc-400">Haz clic para seleccionar o arrastra un PDF aquí</p>
                  </>
                )}
              </div>
              {fileError && (
                <p className="text-xs text-red-500 font-medium flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3 inline" />
                  {fileError}
                </p>
              )}
            </div>

            {/* Title */}
            <div className="space-y-1">
              <Label htmlFor="titulo" className="text-brand-700 dark:text-brand-400 font-semibold text-xs">
                Título del Recurso
              </Label>
              <Input
                id="titulo"
                placeholder="Título descriptivo del recurso (mínimo 5 caracteres)..."
                {...form.register("titulo")}
                className={`h-9 text-xs ${form.formState.errors.titulo ? "border-red-500 focus-visible:ring-red-400" : ""}`}
              />
              {form.formState.errors.titulo && (
                <p className="text-xs text-red-500 font-medium">{form.formState.errors.titulo.message}</p>
              )}
            </div>

            {/* Type & Course */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-brand-700 dark:text-brand-400 font-semibold text-xs">
                  Tipo de Recurso
                </Label>
                <Select onValueChange={(v) => form.setValue("tipo_recurso_id", v as string, { shouldValidate: true })}>
                  <SelectTrigger className={`h-9 text-xs ${form.formState.errors.tipo_recurso_id ? "border-red-500 focus-visible:ring-red-400" : ""}`}>
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
                {form.formState.errors.tipo_recurso_id && (
                  <p className="text-xs text-red-500 font-medium">{form.formState.errors.tipo_recurso_id.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-brand-700 dark:text-brand-400 font-semibold text-xs">Curso</Label>
                <Select onValueChange={(v) => form.setValue("curso_id", v as string, { shouldValidate: true })}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Curso" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">Ninguno (General)</SelectItem>
                    {cursos.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Authors & Publisher */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="autores" className="text-brand-700 dark:text-brand-400 font-semibold text-xs">Autores (Opcional)</Label>
                <Input
                  id="autores"
                  placeholder="ej. Pérez J., Gómez A."
                  {...form.register("autores")}
                  className={`h-9 text-xs ${form.formState.errors.autores ? "border-red-500 focus-visible:ring-red-400" : ""}`}
                />
                {form.formState.errors.autores && (
                  <p className="text-xs text-red-500 font-medium">{form.formState.errors.autores.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="editorial" className="text-brand-700 dark:text-brand-400 font-semibold text-xs">Editorial / Revista (Opcional)</Label>
                <Input
                  id="editorial"
                  placeholder="ej. FIQ-UNCP, Elsevier"
                  {...form.register("editorial")}
                  className={`h-9 text-xs ${form.formState.errors.editorial ? "border-red-500 focus-visible:ring-red-400" : ""}`}
                />
                {form.formState.errors.editorial && (
                  <p className="text-xs text-red-500 font-medium">{form.formState.errors.editorial.message}</p>
                )}
              </div>
            </div>

            {/* Year & DOI */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="anio" className="text-brand-700 dark:text-brand-400 font-semibold text-xs">
                  Año de Publicación (Opcional)
                </Label>
                <Input
                  id="anio"
                  type="number"
                  min={1800}
                  max={currentYear + 2}
                  step={1}
                  inputMode="numeric"
                  placeholder={`ej. ${currentYear}`}
                  {...form.register("anio")}
                  onKeyDown={(e) => {
                    if (["e", "E", "+", "-", "."].includes(e.key)) {
                      e.preventDefault()
                    }
                  }}
                  className={`h-9 text-xs ${form.formState.errors.anio ? "border-red-500 focus-visible:ring-red-400" : ""}`}
                />
                {form.formState.errors.anio && (
                  <p className="text-xs text-red-500 font-medium">{form.formState.errors.anio.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="doi" className="text-brand-700 dark:text-brand-400 font-semibold text-xs">DOI (Opcional)</Label>
                <Input
                  id="doi"
                  placeholder="ej. 10.1016/j.env.2026"
                  {...form.register("doi")}
                  className={`h-9 text-xs ${form.formState.errors.doi ? "border-red-500 focus-visible:ring-red-400" : ""}`}
                />
                {form.formState.errors.doi && (
                  <p className="text-xs text-red-500 font-medium">{form.formState.errors.doi.message}</p>
                )}
              </div>
            </div>

            {/* ISBN & Language */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="isbn" className="text-brand-700 dark:text-brand-400 font-semibold text-xs">ISBN (Opcional)</Label>
                <Input
                  id="isbn"
                  placeholder="ej. 9786120000000"
                  {...form.register("isbn")}
                  className={`h-9 text-xs ${form.formState.errors.isbn ? "border-red-500 focus-visible:ring-red-400" : ""}`}
                />
                {form.formState.errors.isbn && (
                  <p className="text-xs text-red-500 font-medium">{form.formState.errors.isbn.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="idioma" className="text-brand-700 dark:text-brand-400 font-semibold text-xs">Idioma (Opcional)</Label>
                <Input
                  id="idioma"
                  placeholder="ej. es, en"
                  maxLength={10}
                  {...form.register("idioma")}
                  className={`h-9 text-xs ${form.formState.errors.idioma ? "border-red-500 focus-visible:ring-red-400" : ""}`}
                />
                {form.formState.errors.idioma && (
                  <p className="text-xs text-red-500 font-medium">{form.formState.errors.idioma.message}</p>
                )}
              </div>
            </div>

            {/* Topics & License */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="temas" className="text-brand-700 dark:text-brand-400 font-semibold text-xs">Temas (Opcional)</Label>
                <Input
                  id="temas"
                  placeholder="Catálisis, termodinámica"
                  {...form.register("temas")}
                  className={`h-9 text-xs ${form.formState.errors.temas ? "border-red-500 focus-visible:ring-red-400" : ""}`}
                />
                {form.formState.errors.temas && (
                  <p className="text-xs text-red-500 font-medium">{form.formState.errors.temas.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="licencia" className="text-brand-700 dark:text-brand-400 font-semibold text-xs">Licencia (Opcional)</Label>
                <Input
                  id="licencia"
                  placeholder="CC BY 4.0, Uso institucional"
                  {...form.register("licencia")}
                  className={`h-9 text-xs ${form.formState.errors.licencia ? "border-red-500 focus-visible:ring-red-400" : ""}`}
                />
                {form.formState.errors.licencia && (
                  <p className="text-xs text-red-500 font-medium">{form.formState.errors.licencia.message}</p>
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-1">
              <Label htmlFor="resumen" className="text-brand-700 dark:text-brand-400 font-semibold text-xs">Resumen (Opcional)</Label>
              <Textarea
                id="resumen"
                placeholder="Descripción o sinopsis del contenido..."
                {...form.register("resumen")}
                className={`h-16 text-xs leading-relaxed ${form.formState.errors.resumen ? "border-red-500 focus-visible:ring-red-400" : ""}`}
              />
              {form.formState.errors.resumen && (
                <p className="text-xs text-red-500 font-medium">{form.formState.errors.resumen.message}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={uploadStep !== "idle"} className="h-9 text-xs cursor-pointer">
                Cancelar
              </Button>
              <Button type="submit" className="bg-brand-500 hover:bg-brand-600 text-white min-w-[120px] h-9 text-xs cursor-pointer" disabled={uploadStep !== "idle"}>
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
