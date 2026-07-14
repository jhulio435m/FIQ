import { useState, type ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { CheckCircle2, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"

interface NumberControlProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (value: number) => void
}

export function NumberControl({ label, value, min, max, step, unit, onChange }: NumberControlProps) {
  return (
    <label className="block rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase text-gray-500 dark:text-zinc-400">{label}</span>
        <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
          {value.toFixed(step < 1 ? 2 : 0)}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-brand-500 cursor-pointer"
      />
    </label>
  )
}

interface MetricProps {
  label: string
  value: string
  hint: string
}

export function Metric({ label, value, hint }: MetricProps) {
  return (
    <div className="rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-4">
      <p className="text-xs font-semibold uppercase text-gray-500 dark:text-zinc-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-brand-700 dark:text-brand-400">{value}</p>
      <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">{hint}</p>
    </div>
  )
}

interface SimulatorShellProps {
  title: string
  subtitle: string
  icon: LucideIcon
  children: ReactNode
}

export function SimulatorShell({ title, subtitle, icon: Icon, children }: SimulatorShellProps) {
  const [completed, setCompleted] = useState(false)

  return (
    <section className="rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/10 p-4 md:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-brand-500 text-white">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-950 dark:text-zinc-50">{title}</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">{subtitle}</p>
        </div>
      </div>
      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-md border border-gray-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <p className="text-xs font-semibold uppercase text-brand-700 dark:text-brand-300">Objetivo</p>
          <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
            Modificar parámetros, observar el cambio del resultado y explicar la relación entre variables.
          </p>
        </div>
        <div className="rounded-md border border-gray-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <p className="text-xs font-semibold uppercase text-brand-700 dark:text-brand-300">Conceptos clave</p>
          <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
            Balance, sensibilidad, restricciones operativas y lectura crítica de indicadores.
          </p>
        </div>
        <div className="rounded-md border border-gray-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <p className="text-xs font-semibold uppercase text-brand-700 dark:text-brand-300">Estado</p>
          <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
            {completed ? "Completado. La actividad queda lista para revisión." : "Pendiente. Completa el checklist al finalizar."}
          </p>
        </div>
      </div>
      <div className="space-y-5">{children}</div>
      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-md border border-gray-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <p className="text-xs font-semibold uppercase text-brand-700 dark:text-brand-300">Reflexión</p>
          <ul className="mt-2 space-y-2 text-sm text-gray-600 dark:text-zinc-400">
            <li>1. Identifica qué parámetro tuvo mayor impacto en el resultado.</li>
            <li>2. Explica una decisión operativa que tomarías con los valores obtenidos.</li>
            <li>3. Describe una limitación del modelo antes de aplicarlo en planta.</li>
          </ul>
        </div>
        <div className="rounded-md border border-gray-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <p className="text-xs font-semibold uppercase text-brand-700 dark:text-brand-300">Checklist</p>
          <div className="mt-3 space-y-2 text-sm text-gray-600 dark:text-zinc-400">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="accent-brand-500" />
              Varié al menos dos parámetros.
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="accent-brand-500" />
              Interpreté los indicadores.
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="accent-brand-500" />
              Respondí la reflexión.
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => setCompleted(true)} className="bg-brand-500 hover:bg-brand-600">
              <CheckCircle2 className="mr-1 h-4 w-4" />
              Completar
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setCompleted(false)}>
              <RotateCcw className="mr-1 h-4 w-4" />
              Reiniciar
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

export function ControlGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
}

export function MetricGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
}

export function ChartFrame({ children }: { children: ReactNode }) {
  return <div className="h-72 rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-3">{children}</div>
}
