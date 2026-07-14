import { useMemo, useState } from "react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Gauge } from "lucide-react"
import { calculateBinaryDistillation } from "@/lib/labs/calculations"
import { ChartFrame, ControlGrid, Metric, MetricGrid, NumberControl, SimulatorShell } from "../simulator-ui"

export function DistillationSimulator() {
  const [feed, setFeed] = useState(100)
  const [zFeed, setZFeed] = useState(0.45)
  const [xDistillate, setXDistillate] = useState(0.95)
  const [xBottoms, setXBottoms] = useState(0.08)
  const [alpha, setAlpha] = useState(2.4)
  const [refluxRatio, setRefluxRatio] = useState(1.8)

  const result = useMemo(
    () => calculateBinaryDistillation({ feed, zFeed, xDistillate, xBottoms, alpha, refluxRatio }),
    [alpha, feed, refluxRatio, xBottoms, xDistillate, zFeed],
  )

  return (
    <SimulatorShell
      title="Destilación binaria"
      subtitle="Balance F = D + B y estimación de etapas mínimas con Fenske."
      icon={Gauge}
    >
      <ControlGrid>
        <NumberControl label="Alimento" value={feed} min={20} max={250} step={5} unit="kmol/h" onChange={setFeed} />
        <NumberControl label="zF ligero" value={zFeed} min={0.15} max={0.8} step={0.01} onChange={setZFeed} />
        <NumberControl label="xD ligero" value={xDistillate} min={0.75} max={0.99} step={0.01} onChange={setXDistillate} />
        <NumberControl label="xB ligero" value={xBottoms} min={0.01} max={0.2} step={0.01} onChange={setXBottoms} />
        <NumberControl label="Volatilidad relativa" value={alpha} min={1.2} max={5} step={0.1} onChange={setAlpha} />
        <NumberControl label="Reflujo R/Rmin" value={refluxRatio} min={1.1} max={4} step={0.1} onChange={setRefluxRatio} />
      </ControlGrid>
      <MetricGrid>
        <Metric label="Destilado" value={`${result.distillate.toFixed(1)} kmol/h`} hint="Flujo superior calculado por balance." />
        <Metric label="Fondos" value={`${result.bottoms.toFixed(1)} kmol/h`} hint="Flujo inferior de la columna." />
        <Metric label="Etapas" value={`${result.actualStages}`} hint={`Mínimas: ${result.minStages.toFixed(1)}`} />
        <Metric label="Recuperación" value={`${(result.recovery * 100).toFixed(1)}%`} hint="Componente ligero en destilado." />
      </MetricGrid>
      <ChartFrame>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={result.componentBalance}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="ligero" stackId="a" fill="#ac2c2d" name="Componente ligero" />
            <Bar dataKey="pesado" stackId="a" fill="#1f766e" name="Componente pesado" />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    </SimulatorShell>
  )
}
