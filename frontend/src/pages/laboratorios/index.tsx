import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Download,
  Laptop,
  Cpu,
  HardDrive,
  Layers,
  Atom,
  FlaskConical,
  Thermometer,
  ExternalLink,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  HelpCircle,
  FolderDown,
} from "lucide-react"

const modules = [
  {
    title: "Destilación Fraccionada",
    area: "Operaciones Unitarias",
    desc: "Cálculo riguroso de etapas teóricas con el método McCabe-Thiele, reflujo mínimo y óptimo, líneas q y balances globales de masa.",
    icon: Layers,
    level: "Operaciones Unitarias I y II",
  },
  {
    title: "Cinética Química y Reactores",
    area: "Ingeniería de las Reacciones",
    desc: "Simulación de reactores CSTR, PFR y discontinuos (Batch). Modelado de velocidad de reacción, conversión y ley de Arrhenius.",
    icon: Atom,
    level: "Reactores Químicos",
  },
  {
    title: "Equilibrio Líquido-Vapor (ELV)",
    area: "Termodinámica Química",
    desc: "Modelamiento de presiones de vapor con ecuaciones de Antoine, coeficientes de actividad, predicción de azeótropos y diagramas T-x-y.",
    icon: Thermometer,
    level: "Termodinámica para Ing. Química",
  },
  {
    title: "Balances de Materia y Energía",
    area: "Fundamentos de Procesos",
    desc: "Resolución de balances de materia estacionarios y transitorios con recirculación, purga y reacciones químicas simultáneas.",
    icon: FlaskConical,
    level: "Balance de Materia y Energía",
  },
]

const requirements = [
  {
    label: "Sistema Operativo",
    value: "Windows 10/11 (64-bit), Linux (Ubuntu 20.04+), macOS 12+",
    icon: Laptop,
  },
  {
    label: "Procesador",
    value: "Intel Core i3 / AMD Ryzen 3 o superior (x86_64 o ARM64)",
    icon: Cpu,
  },
  {
    label: "Memoria RAM",
    value: "4 GB mínimo (8 GB recomendado para simulaciones complejas)",
    icon: Sparkles,
  },
  {
    label: "Almacenamiento",
    value: "500 MB de espacio libre en disco",
    icon: HardDrive,
  },
]

const installSteps = [
  {
    step: "1",
    title: "Descargar el instalador",
    desc: "Haz clic en el botón de descarga para obtener el paquete instalador oficial desde ejemplo.com.",
  },
  {
    step: "2",
    title: "Ejecutar la instalación",
    desc: "Abre el instalador descargado y sigue los pasos del asistente de configuración.",
  },
  {
    step: "3",
    title: "Iniciar simulaciones",
    desc: "Abre Soryntel Chemestry en tu computadora y comienza a modelar tus sistemas químicos de forma offline.",
  },
]

export default function Laboratorios() {
  const downloadUrl = "https://ejemplo.com"

  return (
    <div className="animate-fade-in max-w-6xl mx-auto px-4 py-8 md:py-12 space-y-12">
      {/* Hero Presentation */}
      <div className="relative rounded-2xl border border-brand-100 dark:border-zinc-800 bg-gradient-to-b from-brand-50/60 via-white to-gray-50/50 dark:from-brand-950/20 dark:via-zinc-900/60 dark:to-zinc-950 p-6 md:p-10 shadow-xs">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100/70 dark:bg-brand-950/70 border border-brand-200 dark:border-brand-900/60 text-brand-800 dark:text-brand-300 text-xs font-semibold">
            <GraduationCap className="h-3.5 w-3.5" />
            <span>Software Oficial · Facultad de Ingeniería Química UNCP</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-brand-950 dark:text-zinc-50 tracking-tight">
            Soryntel Chemestry
          </h1>

          <p className="text-base sm:text-lg text-gray-600 dark:text-zinc-400 leading-relaxed">
            Suite integral de simulación computacional, cálculo numérico y modelamiento de procesos químicos desarrollada para la comunidad académica de la FIQ. Ejecuta cálculos termodinámicos y reactores directamente en tu computadora sin necesidad de conexión constante.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <a
              href={downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto"
            >
              <Button
                size="lg"
                className="w-full sm:w-auto bg-brand-500 hover:bg-brand-600 text-white font-semibold cursor-pointer shadow-md shadow-brand-500/20 gap-2 h-12 px-6"
              >
                <Download className="h-5 w-5" />
                Descargar Soryntel Chemestry
              </Button>
            </a>

            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Enlace de descarga oficial: <strong className="font-mono text-gray-700 dark:text-zinc-300">ejemplo.com</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Modules Overview */}
      <section className="space-y-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wider mb-1">
            <FlaskConical className="h-4 w-4" />
            <span>Módulos de Simulación</span>
          </div>
          <h2 className="text-2xl font-bold text-brand-900 dark:text-brand-100">
            Capacidades de Soryntel Chemestry
          </h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Herramientas integradas en el software para apoyar las cátedras formativas y proyectos de investigación.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {modules.map((m) => {
            const Icon = m.icon
            return (
              <Card key={m.title} className="hover:border-brand-200 dark:hover:border-brand-500/50 transition">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-300 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base text-gray-900 dark:text-zinc-100">{m.title}</CardTitle>
                        <CardDescription className="text-2xs text-brand-600 dark:text-brand-400 font-medium">
                          {m.area}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-2xs font-normal shrink-0">
                      {m.level}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
                    {m.desc}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Installation and Requirements Grid */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Installation Steps */}
        <section className="lg:col-span-7 space-y-4">
          <h2 className="text-xl font-bold text-brand-900 dark:text-brand-100 flex items-center gap-2">
            <FolderDown className="h-5 w-5 text-brand-600" />
            Guía de Instalación Rápida
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            Sigue estos pasos para instalar y comenzar a usar Soryntel Chemestry en tu equipo.
          </p>

          <div className="space-y-3 pt-2">
            {installSteps.map((step) => (
              <div
                key={step.step}
                className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 shadow-2xs"
              >
                <div className="h-8 w-8 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {step.step}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{step.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* System Requirements */}
        <section className="lg:col-span-5 space-y-4">
          <h2 className="text-xl font-bold text-brand-900 dark:text-brand-100 flex items-center gap-2">
            <Cpu className="h-5 w-5 text-brand-600" />
            Requisitos del Sistema
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            Especificaciones mínimas requeridas para la ejecución fluida.
          </p>

          <Card className="shadow-2xs">
            <CardContent className="p-4 divide-y divide-gray-100 dark:divide-zinc-800">
              {requirements.map((req) => {
                const Icon = req.icon
                return (
                  <div key={req.label} className="py-3 first:pt-0 last:pb-0 flex items-start gap-3">
                    <Icon className="h-4 w-4 text-brand-600 dark:text-brand-400 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-700 dark:text-zinc-300">{req.label}</p>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{req.value}</p>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
              ¿Necesitas asistencia técnica?
            </p>
            <p className="text-2xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
              Para reportar incidencias o solicitar guías de uso de Soryntel Chemestry, comunícate con la coordinación académica de la FIQ UNCP.
            </p>
          </div>
        </section>
      </div>

      {/* Bottom Download Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-600 via-brand-700 to-brand-900 text-white p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
        <div className="space-y-1 text-center md:text-left">
          <h3 className="text-xl font-bold tracking-tight">¿Listo para comenzar a simular?</h3>
          <p className="text-xs sm:text-sm text-brand-100 max-w-xl">
            Descarga Soryntel Chemestry sin costo para estudiantes y docentes de la Facultad de Ingeniería Química.
          </p>
        </div>
        <a
          href={downloadUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0"
        >
          <Button
            size="lg"
            className="bg-white text-brand-900 hover:bg-brand-50 font-bold cursor-pointer gap-2"
          >
            <Download className="h-4 w-4" />
            Descargar desde ejemplo.com
            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </Button>
        </a>
      </div>
    </div>
  )
}
