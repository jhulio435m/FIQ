import { Atom, Beaker, FlaskConical, Microscope } from "lucide-react"
import type { ComponentType } from "react"
import type { LucideIcon } from "lucide-react"
import { DistillationSimulator } from "./simulators/distillation-simulator"
import { KineticsSimulator } from "./simulators/kinetics-simulator"
import { ReactorsSimulator } from "./simulators/reactors-simulator"
import { ThermodynamicsSimulator } from "./simulators/thermodynamics-simulator"

export const LAB_LEVEL_LABELS: Record<number, string> = {
  1: "Básico",
  2: "Intermedio",
  3: "Avanzado",
}

export const LAB_LEVEL_COLORS: Record<string, string> = {
  Básico: "bg-emerald-100 text-emerald-700",
  Intermedio: "bg-amber-100 text-amber-700",
  Avanzado: "bg-red-100 text-red-700",
}

interface LabSimulatorDefinition {
  icon: LucideIcon
  component: ComponentType
}

export const LAB_SIMULATORS: Record<number, LabSimulatorDefinition> = {
  1: { icon: Beaker, component: DistillationSimulator },
  2: { icon: FlaskConical, component: KineticsSimulator },
  3: { icon: Microscope, component: ThermodynamicsSimulator },
  4: { icon: Atom, component: ReactorsSimulator },
}

export const FALLBACK_LAB_ICON = Beaker

export function getLabLevelLabel(levelId: number) {
  return LAB_LEVEL_LABELS[levelId] ?? LAB_LEVEL_LABELS[1]
}

export function getLabIcon(labId: number) {
  return LAB_SIMULATORS[labId]?.icon ?? FALLBACK_LAB_ICON
}
