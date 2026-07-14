import { useMemo, useState } from "react"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Atom } from "lucide-react"
import { buildReactorComparisonSeries, cstrFirstOrderConversion, pfrFirstOrderConversion } from "@/lib/labs/calculations"
import { ChartFrame, ControlGrid, Metric, MetricGrid, NumberControl, SimulatorShell } from "../simulator-ui"

export function ReactorsSimulator() {
  const [rate, setRate] = useState(0.7)
  const [residenceTime, setResidenceTime] = useState(2)
  const [flowRate, setFlowRate] = useState(100)
  const [initialConcentration, setInitialConcentration] = useState(1.2)

  const cstrConversion = cstrFirstOrderConversion(rate, residenceTime)
  const pfrConversion = pfrFirstOrderConversion(rate, residenceTime)
  const data = useMemo(() => buildReactorComparisonSeries(rate), [rate])

  return (
    <SimulatorShell title="Reactores ideales" subtitle="Comparación de CSTR y PFR para reacción irreversible de primer orden." icon={Atom}>
      <ControlGrid>
        <NumberControl label="Constante k" value={rate} min={0.05} max={2} step={0.05} unit="1/min" onChange={setRate} />
        <NumberControl label="Tiempo espacial" value={residenceTime} min={0.2} max={6} step={0.1} unit="min" onChange={setResidenceTime} />
        <NumberControl label="Flujo volumétrico" value={flowRate} min={20} max={250} step={5} unit="L/min" onChange={setFlowRate} />
        <NumberControl
          label="CA0"
          value={initialConcentration}
          min={0.2}
          max={3}
          step={0.1}
          unit="mol/L"
          onChange={setInitialConcentration}
        />
      </ControlGrid>
      <MetricGrid>
        <Metric label="Conversión CSTR" value={`${(cstrConversion * 100).toFixed(1)}%`} hint="Mezcla perfecta." />
        <Metric label="Conversión PFR" value={`${(pfrConversion * 100).toFixed(1)}%`} hint="Flujo pistón." />
        <Metric label="Volumen reactor" value={`${(flowRate * residenceTime).toFixed(0)} L`} hint="V = caudal por tiempo espacial." />
        <Metric label="Producción PFR" value={`${(flowRate * initialConcentration * pfrConversion).toFixed(1)} mol/min`} hint="Formación de producto." />
      </MetricGrid>
      <ChartFrame>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="tau" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="cstr" stroke="#ac2c2d" strokeWidth={2} name="CSTR %" dot={false} />
            <Line type="monotone" dataKey="pfr" stroke="#1f766e" strokeWidth={2} name="PFR %" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>
    </SimulatorShell>
  )
}
