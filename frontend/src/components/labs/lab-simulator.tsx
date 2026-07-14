import { LAB_SIMULATORS } from "./lab-registry"

export function LabSimulator({ labId }: { labId: number }) {
  const Simulator = LAB_SIMULATORS[labId]?.component
  return Simulator ? <Simulator /> : null
}
