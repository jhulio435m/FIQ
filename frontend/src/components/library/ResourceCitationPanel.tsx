import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import type { Recurso } from "@/services/resources"

interface Props {
  resource: Recurso
}

export function ResourceCitationPanel({ resource }: Props) {
  const [citationFormat, setCitationFormat] = useState<"APA" | "IEEE" | "VANCOUVER">("APA")
  const [copied, setCopied] = useState(false)

  const citationYear = resource.anio ?? new Date(resource.created_at).getFullYear()
  const citationAuthors = resource.autores ?? "Facultad de Ingeniería Química - UNCP"
  const citationPublisher = resource.editorial ?? "Biblioteca Virtual FIQ-UNCP"
  const doiText = resource.doi ? `. DOI: ${resource.doi}` : ""

  const getCitationText = () => {
    const title = resource.titulo
    const originUrl = `${window.location.origin}/biblioteca`
    
    switch (citationFormat) {
      case "IEEE":
        return `${citationAuthors}, "${title}," ${citationPublisher}, ${citationYear}.${resource.doi ? ` DOI: ${resource.doi}.` : ""} [En línea]. Disponible en: ${originUrl}`
      case "VANCOUVER": {
        const currentDateFormatted = new Date().toLocaleDateString("es-PE", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
        return `${citationAuthors}. ${title} [Internet]. Huancayo: ${citationPublisher}; ${citationYear} [citado el ${currentDateFormatted}]. Disponible en: ${originUrl}${resource.doi ? `. DOI: ${resource.doi}` : ""}`
      }
      case "APA":
      default:
        return `${citationAuthors}. (${citationYear}). ${title}. ${citationPublisher}. ${originUrl}${doiText}`
    }
  }

  const getBibtexText = () => {
    const key = `fiq_${resource.id}_${citationYear}`
    const title = resource.titulo
    const course = resource.curso_nombre ?? "Química"
    const originUrl = `${window.location.origin}/biblioteca`
    
    return `@misc{${key},
  author = {${citationAuthors}},
  title = {${title}},
  year = {${citationYear}},
  howpublished = {${citationPublisher}},
  note = {Curso: ${course}${resource.doi ? `, DOI: ${resource.doi}` : ""}},
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

  return (
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
  )
}
