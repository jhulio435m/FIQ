import { ExternalLink, FileText } from "lucide-react"
import { buttonVariants } from "@/components/ui/button-variants"

interface ExternalResourcePreviewProps {
  url: string
}

export function ExternalResourcePreview({ url }: ExternalResourcePreviewProps) {
  return (
    <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-4 bg-zinc-950 px-8 text-center text-zinc-200">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/20 text-brand-300">
        <FileText className="h-8 w-8" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">Recurso disponible en una fuente externa</h3>
        <p className="mt-2 max-w-md text-sm text-zinc-400">
          Este registro enlaza a un catálogo o publicación externa y no contiene un PDF almacenado en la plataforma.
        </p>
      </div>
      <a className={buttonVariants()} href={url} target="_blank" rel="noreferrer">
        <ExternalLink className="h-4 w-4" />
        Abrir fuente original
      </a>
    </div>
  )
}
