import { useState } from "react"
import { BookOpen } from "lucide-react"


interface ExternalCoverImageProps {
  src: string | null
  title: string
}


export function ExternalCoverImage({ src, title }: ExternalCoverImageProps) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div
        className="flex h-20 w-14 shrink-0 items-center justify-center rounded border border-gray-200 bg-gray-50 text-gray-400 dark:border-zinc-700 dark:bg-zinc-900"
        aria-label={`Sin portada disponible para ${title}`}
      >
        <BookOpen className="h-5 w-5" />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={`Portada de ${title}`}
      className="h-20 w-14 shrink-0 rounded border border-gray-200 bg-gray-50 object-cover dark:border-zinc-700"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  )
}
