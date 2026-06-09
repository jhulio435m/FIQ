import { useMemo, useState } from "react"
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Thermometer } from "lucide-react"
import { antoineWaterPressure, buildVaporPressureSeries, findWaterBoilingPoint } from "@/lib/labs/calculations"
import { ChartFrame, ControlGrid, Metric, MetricGrid, NumberControl, SimulatorShell } from "../simulator-ui"

export function ThermodynamicsSimulator() {
  const [temperature, setTemperature] = useState(80)
  const [pressure, setPressure] = useState(101.3)

  const vaporPressure = antoineWaterPressure(temperature)
  const boilingPoint = useMemo(() => findWaterBoilingPoint(pressure), [pressure])
  const data = useMemo(() => buildVaporPressureSeries(pressure), [pressure])

  return (
    <SimulatorShell title="Equilibrio líquido-vapor" subtitle="Presión de vapor de agua con Antoine y comparación con la presión de operación." icon={Thermometer}>
      <ControlGrid>
        <NumberControl label="Temperatura" value={temperature} min={20} max={130} step={1} unit="°C" onChange={setTemperature} />
        <NumberControl label="Presión del sistema" value={pressure} min={25} max={250} step={1} unit="kPa" onChange={setPressure} />
      </ControlGrid>
      <MetricGrid>
        <Metric label="Pvap" value={`${vaporPressure.toFixed(1)} kPa`} hint="Presión de vapor estimada." />
        <Metric label="Punto de ebullición" value={`${boilingPoint.toFixed(1)} °C`} hint="Temperatura donde Pvap = P." />
        <Metric label="Estado" value={vaporPressure >= pressure ? "Vaporiza" : "Líquido"} hint="Comparación directa Pvap/P." />
      </MetricGrid>
      <ChartFrame>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="temp" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="pvap" stroke="#ac2c2d" fill="#ac2c2d33" name="Pvap kPa" />
            <Line type="monotone" dataKey="pressure" stroke="#1f766e" strokeWidth={2} dot={false} name="P sistema" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartFrame>
    </SimulatorShell>
  )
}
