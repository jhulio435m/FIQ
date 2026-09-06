import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Sparkles, Eye, Download, ChevronDown, ChevronUp, Info, Compass } from "lucide-react"
import { getFeaturedResources } from "@/services/community"
import { ResourceCard } from "./resource-card"
import { Button } from "@/components/ui/button"
import type { Recurso } from "@/services/resources"

interface Props {
  onSelect: (resource: Recurso) => void
}

type TabKey = "recientes" | "mas_vistos" | "mas_descargados"

export function FeaturedResourcesSection({ onSelect }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("recientes")
  const [isExpanded, setIsExpanded] = useState(() => {
    return localStorage.getItem("fiq_featured_collapsed") !== "true"
  })

  const { data, isLoading } = useQuery({
    queryKey: ["featured-resources"],
    queryFn: getFeaturedResources,
    staleTime: 60_000,
  })

  const toggleExpanded = () => {
    setIsExpanded((prev) => {
      const next = !prev
      localStorage.setItem("fiq_featured_collapsed", String(!next))
      return next
    })
  }

  if (isLoading || !data) return null

  const items = data[activeTab] || []
  if (items.length === 0) return null

  return (
    <div className="mb-6 rounded-xl border border-brand-100 bg-gradient-to-r from-brand-50/40 via-white to-gray-50/50 p-4 dark:border-zinc-800 dark:from-brand-950/20 dark:via-zinc-900/60 dark:to-zinc-950">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-brand-100/60 dark:border-zinc-800/80">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-brand-500 text-white flex items-center justify-center shadow-xs">
            <Compass className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
              Descubrimiento y Colecciones Destacadas
            </h2>
            <p className="text-2xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3 inline text-brand-600" />
              Recomendaciones algorítmicas basadas en actividad reciente, descargas y lecturas de la comunidad FIQ.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleExpanded}
            className="text-xs text-muted-foreground hover:text-foreground h-8 cursor-pointer"
            aria-label={isExpanded ? "Ocultar recomendaciones" : "Mostrar recomendaciones"}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5 mr-1" />
                Ocultar
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5 mr-1" />
                Explorar
              </>
            )}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="pt-3 space-y-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1" role="tablist">
            <Button
              type="button"
              size="sm"
              variant={activeTab === "recientes" ? "default" : "outline"}
              className={activeTab === "recientes" ? "h-7 text-xs bg-brand-500 hover:bg-brand-600 cursor-pointer" : "h-7 text-xs cursor-pointer"}
              onClick={() => setActiveTab("recientes")}
              role="tab"
              aria-selected={activeTab === "recientes"}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Novedades ({data.recientes.length})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeTab === "mas_vistos" ? "default" : "outline"}
              className={activeTab === "mas_vistos" ? "h-7 text-xs bg-brand-500 hover:bg-brand-600 cursor-pointer" : "h-7 text-xs cursor-pointer"}
              onClick={() => setActiveTab("mas_vistos")}
              role="tab"
              aria-selected={activeTab === "mas_vistos"}
            >
              <Eye className="h-3 w-3 mr-1" />
              Más consultados ({data.mas_vistos.length})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeTab === "mas_descargados" ? "default" : "outline"}
              className={activeTab === "mas_descargados" ? "h-7 text-xs bg-brand-500 hover:bg-brand-600 cursor-pointer" : "h-7 text-xs cursor-pointer"}
              onClick={() => setActiveTab("mas_descargados")}
              role="tab"
              aria-selected={activeTab === "mas_descargados"}
            >
              <Download className="h-3 w-3 mr-1" />
              Más descargados ({data.mas_descargados.length})
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.slice(0, 3).map((resource) => (
              <ResourceCard
                key={`featured-${resource.id}`}
                resource={resource}
                onClick={() => onSelect(resource)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
