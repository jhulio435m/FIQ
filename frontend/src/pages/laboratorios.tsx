import { useQuery } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FlaskConical, Atom, Beaker, Microscope, Loader2 } from "lucide-react"
import { getLabs } from "@/services/labs"

const icons = [Beaker, FlaskConical, Atom, Microscope]
const niveles: Record<number, string> = { 1: "Básico", 2: "Intermedio", 3: "Avanzado" }

const nivelColor: Record<string, string> = {
  Básico: "bg-green-100 text-green-700",
  Intermedio: "bg-amber-100 text-amber-700",
  Avanzado: "bg-red-100 text-red-700",
}

export default function Laboratorios() {
  const { data: labs = [], isLoading } = useQuery({
    queryKey: ["labs"],
    queryFn: () => getLabs(),
  })

  return (
    <div className="animate-fade-in max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-brand-900 mb-2">Laboratorios Interactivos</h1>
      <p className="text-gray-500 mb-8">Simulaciones organizadas por nivel de dificultad</p>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {labs.map((lab, index) => {
          const Icon = icons[index % icons.length]
          const nivel = niveles[lab.nivel_id] ?? "Básico"
          return (
            <Card key={lab.id} className="p-6 hover:shadow-md hover:border-brand-200 transition-all group cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-14 h-14 rounded-xl bg-brand-50 flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                  <Icon className="h-7 w-7 text-brand-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 group-hover:text-brand-600 transition-colors">
                    {lab.titulo}
                  </h3>
                  <Badge className={`mt-1 ${nivelColor[nivel]}`}>{nivel}</Badge>
                  <p className="text-sm text-gray-500 mt-2">{lab.descripcion}</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
