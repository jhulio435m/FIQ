import { useMemo, useState } from "react"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Activity } from "lucide-react"
import { arrheniusAdjustedRate, buildFirstOrderBatchSeries } from "@/lib/labs/calculations"
import { ChartFrame, ControlGrid, Metric, MetricGrid, NumberControl, SimulatorShell } from "../simulator-ui"

export function KineticsSimulator() {
  const [initialConcentration, setInitialConcentration] = useState(1.5)
  const [rateAtReference, setRateAtReference] = useState(0.35)
  const [time, setTime] = useState(12)
  const [temperature, setTemperature] = useState(298)

  const adjustedRate = arrheniusAdjustedRate(rateAtReference, temperature)
  const data = useMemo(
    () => buildFirstOrderBatchSeries({ initialConcentration, rate: adjustedRate, time }),
    [adjustedRate, initialConcentration, time],
  )
  const final = data[data.length - 1]

  return (
    <SimulatorShell title="Cinética A -> B" subtitle="Reacción irreversible de primer orden con sensibilidad térmica tipo Arrhenius." icon={Activity}>
      <ControlGrid>
        <NumberControl
          label="Concentración inicial"
          value={initialConcentration}
          min={0.2}
          max={3}
          step={0.1}
          unit="mol/L"
          onChange={setInitialConcentration}
        />
        <NumberControl label="k a 298 K" value={rateAtReference} min={0.05} max={1.2} step={0.05} unit="1/min" onChange={setRateAtReference} />
        <NumberControl label="Tiempo" value={time} min={2} max={30} step={1} unit="min" onChange={setTime} />
        <NumberControl label="Temperatura" value={temperature} min={285} max={340} step={1} unit="K" onChange={setTemperature} />
      </ControlGrid>
      <MetricGrid>
        <Metric label="k efectivo" value={`${adjustedRate.toFixed(3)} 1/min`} hint="Ajustado por temperatura." />
        <Metric label="Conversión" value={`${(((initialConcentration - final.ca) / initialConcentration) * 100).toFixed(1)}%`} hint="Fracción de A transformada." />
        <Metric label="[A] final" value={`${final.ca.toFixed(3)} mol/L`} hint="Reactivo restante." />
        <Metric label="[B] final" value={`${final.cb.toFixed(3)} mol/L`} hint="Producto formado." />
      </MetricGrid>
      <ChartFrame>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="t" label={{ value: "min", position: "insideBottomRight", offset: -4 }} />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="ca" stroke="#ac2c2d" strokeWidth={2} name="[A]" dot={false} />
            <Line type="monotone" dataKey="cb" stroke="#1f766e" strokeWidth={2} name="[B]" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>
    </SimulatorShell>
  )
}
