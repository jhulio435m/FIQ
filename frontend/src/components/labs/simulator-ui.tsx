import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

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
      <div className="space-y-5">{children}</div>
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
