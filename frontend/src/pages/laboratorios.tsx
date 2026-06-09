import { useMemo, useState } from "react"
import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  Activity,
  Atom,
  Beaker,
  FlaskConical,
  Gauge,
  Loader2,
  Microscope,
  Play,
  Thermometer,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getLab, getLabs, type LabModule } from "@/services/labs"

const niveles: Record<number, string> = { 1: "Básico", 2: "Intermedio", 3: "Avanzado" }

const nivelColor: Record<string, string> = {
  Básico: "bg-emerald-100 text-emerald-700",
  Intermedio: "bg-amber-100 text-amber-700",
  Avanzado: "bg-red-100 text-red-700",
}

const labIcons = [Beaker, FlaskConical, Atom, Microscope]

interface NumberControlProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (value: number) => void
}

function NumberControl({ label, value, min, max, step, unit, onChange }: NumberControlProps) {
  return (
    <label className="block rounded-md border border-gray-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase text-gray-500">{label}</span>
        <span className="text-sm font-semibold text-gray-900">
          {value.toFixed(step < 1 ? 2 : 0)}{unit ? ` ${unit}` : ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-brand-500"
      />
    </label>
  )
}

interface MetricProps {
  label: string
  value: string
  hint: string
}

function Metric({ label, value, hint }: MetricProps) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-brand-700">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{hint}</p>
    </div>
  )
}

function DistillationLab() {
  const [feed, setFeed] = useState(100)
  const [zFeed, setZFeed] = useState(0.45)
  const [xDistillate, setXDistillate] = useState(0.95)
  const [xBottoms, setXBottoms] = useState(0.08)
  const [alpha, setAlpha] = useState(2.4)
  const [refluxRatio, setRefluxRatio] = useState(1.8)

  const result = useMemo(() => {
    const split = Math.max(0, Math.min(1, (zFeed - xBottoms) / (xDistillate - xBottoms)))
    const distillate = feed * split
    const bottoms = feed - distillate
    const minStages = Math.log((xDistillate / (1 - xDistillate)) * ((1 - xBottoms) / xBottoms)) / Math.log(alpha)
    const actualStages = Math.ceil(minStages * (1 + 1 / Math.max(refluxRatio, 0.2)))
    const recovery = (distillate * xDistillate) / (feed * zFeed)
    return { distillate, bottoms, minStages, actualStages, recovery }
  }, [alpha, feed, refluxRatio, xBottoms, xDistillate, zFeed])

  const chartData = [
    { name: "Alimento", ligero: feed * zFeed, pesado: feed * (1 - zFeed) },
    { name: "Destilado", ligero: result.distillate * xDistillate, pesado: result.distillate * (1 - xDistillate) },
    { name: "Fondos", ligero: result.bottoms * xBottoms, pesado: result.bottoms * (1 - xBottoms) },
  ]

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
          <BarChart data={chartData}>
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

function KineticsLab() {
  const [c0, setC0] = useState(1.5)
  const [rate, setRate] = useState(0.35)
  const [time, setTime] = useState(12)
  const [temperature, setTemperature] = useState(298)

  const adjustedRate = rate * Math.exp(5200 / 8.314 * (1 / 298 - 1 / temperature))
  const data = useMemo(
    () =>
      Array.from({ length: 25 }, (_, index) => {
        const t = (time * index) / 24
        const ca = c0 * Math.exp(-adjustedRate * t)
        return { t: Number(t.toFixed(2)), ca: Number(ca.toFixed(3)), cb: Number((c0 - ca).toFixed(3)) }
      }),
    [adjustedRate, c0, time],
  )
  const final = data[data.length - 1]

  return (
    <SimulatorShell title="Cinética A -> B" subtitle="Reacción irreversible de primer orden con sensibilidad térmica tipo Arrhenius." icon={Activity}>
      <ControlGrid>
        <NumberControl label="Concentración inicial" value={c0} min={0.2} max={3} step={0.1} unit="mol/L" onChange={setC0} />
        <NumberControl label="k a 298 K" value={rate} min={0.05} max={1.2} step={0.05} unit="1/min" onChange={setRate} />
        <NumberControl label="Tiempo" value={time} min={2} max={30} step={1} unit="min" onChange={setTime} />
        <NumberControl label="Temperatura" value={temperature} min={285} max={340} step={1} unit="K" onChange={setTemperature} />
      </ControlGrid>
      <MetricGrid>
        <Metric label="k efectivo" value={`${adjustedRate.toFixed(3)} 1/min`} hint="Ajustado por temperatura." />
        <Metric label="Conversión" value={`${(((c0 - final.ca) / c0) * 100).toFixed(1)}%`} hint="Fracción de A transformada." />
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

function ThermodynamicsLab() {
  const [temperature, setTemperature] = useState(80)
  const [pressure, setPressure] = useState(101.3)

  const vaporPressure = (tempC: number) => {
    const a = 8.07131
    const b = 1730.63
    const c = 233.426
    return 0.133322 * 10 ** (a - b / (c + tempC))
  }

  const pvap = vaporPressure(temperature)
  const boilingPoint = useMemo(() => {
    let best = 0
    let error = Number.POSITIVE_INFINITY
    for (let temp = 1; temp <= 150; temp += 0.5) {
      const delta = Math.abs(vaporPressure(temp) - pressure)
      if (delta < error) {
        error = delta
        best = temp
      }
    }
    return best
  }, [pressure])

  const data = Array.from({ length: 35 }, (_, index) => {
    const temp = 20 + index * 3.5
    return { temp: Number(temp.toFixed(1)), pvap: Number(vaporPressure(temp).toFixed(1)), pressure }
  })

  return (
    <SimulatorShell title="Equilibrio líquido-vapor" subtitle="Presión de vapor de agua con Antoine y comparación con la presión de operación." icon={Thermometer}>
      <ControlGrid>
        <NumberControl label="Temperatura" value={temperature} min={20} max={130} step={1} unit="°C" onChange={setTemperature} />
        <NumberControl label="Presión del sistema" value={pressure} min={25} max={250} step={1} unit="kPa" onChange={setPressure} />
      </ControlGrid>
      <MetricGrid>
        <Metric label="Pvap" value={`${pvap.toFixed(1)} kPa`} hint="Presión de vapor estimada." />
        <Metric label="Punto de ebullición" value={`${boilingPoint.toFixed(1)} °C`} hint="Temperatura donde Pvap = P." />
        <Metric label="Estado" value={pvap >= pressure ? "Vaporiza" : "Líquido"} hint="Comparación directa Pvap/P." />
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

function ReactorsLab() {
  const [rate, setRate] = useState(0.7)
  const [tau, setTau] = useState(2)
  const [feed, setFeed] = useState(100)
  const [ca0, setCa0] = useState(1.2)

  const cstr = (rate * tau) / (1 + rate * tau)
  const pfr = 1 - Math.exp(-rate * tau)
  const data = Array.from({ length: 25 }, (_, index) => {
    const t = 0.1 + index * 0.25
    return {
      tau: Number(t.toFixed(2)),
      cstr: Number((((rate * t) / (1 + rate * t)) * 100).toFixed(1)),
      pfr: Number(((1 - Math.exp(-rate * t)) * 100).toFixed(1)),
    }
  })

  return (
    <SimulatorShell title="Reactores ideales" subtitle="Comparación de CSTR y PFR para reacción irreversible de primer orden." icon={Atom}>
      <ControlGrid>
        <NumberControl label="Constante k" value={rate} min={0.05} max={2} step={0.05} unit="1/min" onChange={setRate} />
        <NumberControl label="Tiempo espacial" value={tau} min={0.2} max={6} step={0.1} unit="min" onChange={setTau} />
        <NumberControl label="Flujo volumétrico" value={feed} min={20} max={250} step={5} unit="L/min" onChange={setFeed} />
        <NumberControl label="CA0" value={ca0} min={0.2} max={3} step={0.1} unit="mol/L" onChange={setCa0} />
      </ControlGrid>
      <MetricGrid>
        <Metric label="Conversión CSTR" value={`${(cstr * 100).toFixed(1)}%`} hint="Mezcla perfecta." />
        <Metric label="Conversión PFR" value={`${(pfr * 100).toFixed(1)}%`} hint="Flujo pistón." />
        <Metric label="Volumen reactor" value={`${(feed * tau).toFixed(0)} L`} hint="V = caudal por tiempo espacial." />
        <Metric label="Producción PFR" value={`${(feed * ca0 * pfr).toFixed(1)} mol/min`} hint="Formación de producto." />
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

interface SimulatorShellProps {
  title: string
  subtitle: string
  icon: LucideIcon
  children: ReactNode
}

function SimulatorShell({ title, subtitle, icon: Icon, children }: SimulatorShellProps) {
  return (
    <section className="rounded-lg border border-gray-200 bg-gray-50 p-4 md:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-brand-500 text-white">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-950">{title}</h2>
          <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  )
}

function ControlGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
}

function MetricGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
}

function ChartFrame({ children }: { children: ReactNode }) {
  return <div className="h-72 rounded-md border border-gray-200 bg-white p-3">{children}</div>
}

function LabRunner({ lab }: { lab: LabModule }) {
  if (lab.id === 1) return <DistillationLab />
  if (lab.id === 2) return <KineticsLab />
  if (lab.id === 3) return <ThermodynamicsLab />
  return <ReactorsLab />
}

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
          <h1 className="text-3xl font-bold text-brand-900">Laboratorios Interactivos</h1>
          <p className="mt-2 text-sm text-gray-500">
            Simuladores de ingeniería química con parámetros modificables y resultados en tiempo real.
          </p>
        </div>
        <Badge className="w-fit bg-brand-50 text-brand-700">
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
            {labs.map((lab, index) => {
              const Icon = labIcons[index % labIcons.length]
              const nivel = niveles[lab.nivel_id] ?? "Básico"
              const isActive = selectedLab.id === lab.id
              return (
                <button
                  key={lab.id}
                  type="button"
                  onClick={() => setActiveLabId(lab.id)}
                  className={`w-full rounded-lg border p-4 text-left transition ${
                    isActive
                      ? "border-brand-500 bg-brand-50 shadow-sm"
                      : "border-gray-200 bg-white hover:border-brand-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${isActive ? "bg-brand-500 text-white" : "bg-gray-100 text-brand-600"}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-950">{lab.titulo}</h3>
                      <Badge className={`mt-2 ${nivelColor[nivel]}`}>{nivel}</Badge>
                      <p className="mt-2 text-xs leading-5 text-gray-500">{lab.descripcion}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </aside>
          <LabRunner lab={selectedLab} />
        </div>
      )}
    </div>
  )
}
