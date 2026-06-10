import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Loader2, Play } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  getLabIcon,
  getLabLevelLabel,
  LAB_LEVEL_COLORS,
} from "@/components/labs/lab-registry"
import { LabSimulator } from "@/components/labs/lab-simulator"
import { getLab, getLabs } from "@/services/labs"

export default function Laboratorios() {
  const [activeLabId, setActiveLabId] = useState<number | null>(null)
  const { data: labs = [], isLoading } = useQuery({
    queryKey: ["labs"],
    queryFn: () => getLabs(),
  })

  const selectedLabId = activeLabId ?? labs[0]?.id ?? null
  const selectedLab = labs.find((lab) => lab.id === selectedLabId) ?? null

  useQuery({
    queryKey: ["lab-access", selectedLabId],
    queryFn: () => getLab(selectedLabId as number),
    enabled: selectedLabId !== null,
    refetchOnWindowFocus: false,
    staleTime: 0,
  })

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-brand-900 dark:text-brand-100">Laboratorios Interactivos</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400">
            Simuladores de ingeniería química con parámetros modificables y resultados en tiempo real.
          </p>
        </div>
        <Badge className="w-fit bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
          <Play className="mr-1 h-3.5 w-3.5" />
          Simulación activa
        </Badge>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      )}

      {!isLoading && selectedLab && (
        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-3">
            {labs.map((lab) => {
              const Icon = getLabIcon(lab.id)
              const level = getLabLevelLabel(lab.nivel_id)
              const isActive = selectedLab.id === lab.id

              return (
                <button
                  key={lab.id}
                  type="button"
                  onClick={() => setActiveLabId(lab.id)}
                  className={`w-full rounded-lg border p-4 text-left transition cursor-pointer ${
                    isActive
                      ? "border-brand-500 bg-brand-50 dark:bg-brand-950/20 shadow-sm"
                      : "border-gray-200 bg-white hover:border-brand-200 hover:bg-gray-50 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-brand-500/50 dark:hover:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
                        isActive ? "bg-brand-500 text-white" : "bg-gray-100 text-brand-600 dark:bg-zinc-800 dark:text-brand-400"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-950 dark:text-zinc-50">{lab.titulo}</h3>
                      <Badge className={`mt-2 ${LAB_LEVEL_COLORS[level]}`}>{level}</Badge>
                      <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-zinc-400">{lab.descripcion}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </aside>
          <LabSimulator labId={selectedLab.id} />
        </div>
      )}
    </div>
  )
}
