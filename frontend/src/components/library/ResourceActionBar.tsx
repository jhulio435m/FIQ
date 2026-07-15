import { Download, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  isAuthenticated: boolean
  onDownload: () => void
}

export function ResourceActionBar({ isAuthenticated, onDownload }: Props) {
  return (
    <div className="pt-6 border-t mt-6 md:mt-0 shrink-0">
      <Button
        className="w-full bg-brand-500 hover:bg-brand-600 cursor-pointer text-white px-4 h-11 shadow-md hover:shadow-lg transition-all animate-none text-sm font-semibold"
        onClick={onDownload}
      >
        {isAuthenticated ? (
          <><Download className="h-4 w-4 mr-2" /> Descargar PDF</>
        ) : (
          <><Lock className="h-4 w-4 mr-2" /> Iniciar Sesión para Descargar</>
        )}
      </Button>
    </div>
  )
}
