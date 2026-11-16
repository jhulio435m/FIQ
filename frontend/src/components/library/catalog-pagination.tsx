import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { pageWindow } from "@/lib/catalog"

interface Props {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

export function CatalogPagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null
  return (
    <nav aria-label="Paginación" className="mt-8 flex items-center justify-center gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Página anterior"
        className="cursor-pointer"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      {pageWindow(page, totalPages).map((item, i) =>
        item === "gap" ? (
          <span key={`gap-${i}`} className="px-2 text-sm text-gray-400" aria-hidden>
            …
          </span>
        ) : (
          <Button
            key={item}
            variant={item === page ? "default" : "ghost"}
            size="sm"
            onClick={() => onChange(item)}
            aria-current={item === page ? "page" : undefined}
            aria-label={`Página ${item}`}
            className={cn("min-w-9 cursor-pointer tabular-nums", item === page && "bg-brand-500 hover:bg-brand-600")}
          >
            {item}
          </Button>
        ),
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Página siguiente"
        className="cursor-pointer"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  )
}
