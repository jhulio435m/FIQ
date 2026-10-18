import { Link, useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  BookOpen,
  FlaskConical,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Layers,
  Atom,
  Thermometer,
  FileCheck,
  Search,
  CheckCircle2,
  Laptop,
  Download,
} from "lucide-react"
import heroImg from "@/assets/hero.png"
import { FeaturedResourcesSection } from "@/components/library/FeaturedResourcesSection"
import type { Recurso } from "@/services/resources"

const features = [
  {
    title: "Biblioteca Virtual",
    badge: "Catálogo Académico",
    desc: "Libros de texto, tesis de grado, guías de laboratorio y manuales técnicos con búsqueda facetada y visor PDF integrado.",
    link: "/biblioteca",
    icon: BookOpen,
    color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900/50",
    action: "Explorar catálogo",
  },
  {
    title: "Soryntel Chemestry",
    badge: "Software de Escritorio",
    desc: "Suite de simulación computacional de ingeniería química para tu computadora. Modelado de cinética, equilibrio de fases y destilación.",
    link: "/software",
    icon: Laptop,
    color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900/50",
    action: "Descargar software",
  },
  {
    title: "Mi Colección y Gestión",
    badge: "Espacio Personal",
    desc: "Crea listas personalizadas, guarda favoritos, consulta tu historial de lectura y administra recursos aprobados.",
    link: "/mi-biblioteca",
    icon: FileCheck,
    color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50",
    action: "Ver mi biblioteca",
  },
]

const labsPreview = [
  {
    title: "Destilación Fraccionada",
    area: "Operaciones Unitarias",
    desc: "Cálculo de etapas teóricas con método McCabe-Thiele, reflujo y balances de masa en columna.",
    icon: Layers,
    level: "Intermedio",
    levelColor: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  },
  {
    title: "Cinética Química",
    area: "Reactores Químicos",
    desc: "Análisis de órdenes de reacción, cálculo de energía de activación según Arrhenius y perfiles cinéticos.",
    icon: Atom,
    level: "Básico",
    levelColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
  {
    title: "Reactores CSTR y PFR",
    area: "Ingeniería de las Reacciones",
    desc: "Comparación de conversión, perfiles térmicos y rendimiento volumétrico entre flujo continuo y pistón.",
    icon: FlaskConical,
    level: "Avanzado",
    levelColor: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  {
    title: "Equilibrio Líquido-Vapor",
    area: "Termodinámica",
    desc: "Modelamiento de presiones de vapor mediante ecuaciones de Antoine y predicción de azeótropos.",
    icon: Thermometer,
    level: "Intermedio",
    levelColor: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  },
]

const areas = [
  "Termodinámica Química",
  "Operaciones Unitarias",
  "Reactores Químicos",
  "Fenómenos de Transporte",
  "Ingeniería Ambiental",
  "Control de Procesos",
  "Biotecnología & Alimentos",
  "Metalurgia Química",
]

export default function Home() {
  const navigate = useNavigate()

  const handleSelectResource = (resource: Recurso) => {
    void navigate(`/biblioteca/recurso/${resource.id}`)
  }

  return (
    <div className="animate-fade-in flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-brand-50 via-white to-gray-50/50 dark:from-brand-950/20 dark:via-zinc-950 dark:to-background py-12 md:py-16 px-4 border-b border-gray-100 dark:border-zinc-900 transition-colors duration-250">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100/70 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-900/60 text-brand-800 dark:text-brand-300 text-xs font-medium mb-4">
              <Sparkles className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
              <span>Universidad Nacional del Centro del Perú · UNCP</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-brand-950 dark:text-zinc-50 tracking-tight leading-tight mb-4">
              Facultad de <br className="hidden sm:inline" />
              <span className="text-brand-600 dark:text-brand-400">Ingeniería Química</span>
            </h1>

            <p className="text-base sm:text-lg text-gray-600 dark:text-zinc-400 max-w-xl mx-auto lg:mx-0 mb-6 leading-relaxed">
              Plataforma digital académica: accede a miles de recursos de investigación, tesis universitarias y simuladores interactivos para el diseño de procesos químicos.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-8">
              <Link to="/biblioteca">
                <Button size="lg" className="w-full sm:w-auto bg-brand-500 hover:bg-brand-600 text-white cursor-pointer shadow-md shadow-brand-500/20">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Explorar Biblioteca
                </Button>
              </Link>
              <a href="https://ejemplo.com" target="_blank" rel="noreferrer" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-gray-300 dark:border-zinc-700 cursor-pointer gap-2">
                  <Download className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                  Descargar Soryntel Chemestry
                </Button>
              </a>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto lg:mx-0 pt-4 border-t border-gray-200/70 dark:border-zinc-800">
              <div className="text-center lg:text-left">
                <p className="text-xl sm:text-2xl font-bold text-brand-700 dark:text-brand-400">100%</p>
                <p className="text-xs text-gray-500 dark:text-zinc-400">Acceso Abierto</p>
              </div>
              <div className="text-center lg:text-left">
                <p className="text-xl sm:text-2xl font-bold text-brand-700 dark:text-brand-400">Soryntel</p>
                <p className="text-xs text-gray-500 dark:text-zinc-400">Software Chemestry</p>
              </div>
              <div className="text-center lg:text-left">
                <p className="text-xl sm:text-2xl font-bold text-brand-700 dark:text-brand-400">FIQ</p>
                <p className="text-xs text-gray-500 dark:text-zinc-400">Comunidad UNCP</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-sm">
              <div className="relative rounded-2xl border border-gray-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-6 shadow-xl shadow-zinc-900/5 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-zinc-800">
                  <img
                    src={heroImg}
                    alt="Facultad de Ingeniería Química"
                    className="h-12 w-12 rounded-xl object-contain bg-brand-50 p-1 dark:bg-zinc-800"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100">Portal FIQ — UNCP</h3>
                    <p className="text-2xs text-brand-600 dark:text-brand-400 font-medium">Campus Universitario · Huancayo</p>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs text-gray-600 dark:text-zinc-300">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-zinc-800/60">
                    <CheckCircle2 className="h-4 w-4 text-brand-500 shrink-0" />
                    <span>Catálogo de tesis y proyectos de grado validados</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-zinc-800/60">
                    <CheckCircle2 className="h-4 w-4 text-brand-500 shrink-0" />
                    <span>Simulación computacional con modelos cinéticos</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-zinc-800/60">
                    <CheckCircle2 className="h-4 w-4 text-brand-500 shrink-0" />
                    <span>Conexión con fuentes académicas Open Library y Crossref</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link to="/biblioteca" className="w-full block">
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-brand-50 dark:bg-brand-950/40 border border-brand-100 dark:border-brand-900/50 hover:bg-brand-100/50 transition cursor-pointer text-xs text-brand-700 dark:text-brand-300 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Search className="h-3.5 w-3.5" />
                        Ir al buscador general
                      </span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Features Grid */}
      <section className="max-w-6xl mx-auto px-4 py-10 w-full">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-2xl font-bold text-brand-900 dark:text-brand-100">
            Pilares de la Plataforma
          </h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Herramientas diseñadas para potenciar el aprendizaje y la investigación en ingeniería química.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f) => {
            const Icon = f.icon
            return (
              <Link key={f.title} to={f.link} className="group block">
                <article className="bg-white dark:bg-zinc-900/40 rounded-xl p-6 shadow-xs border border-gray-200 dark:border-zinc-800 hover:shadow-md hover:border-brand-300 dark:hover:border-brand-500/50 transition-all active:scale-[0.99] h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <div className={`p-2.5 rounded-lg border ${f.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge variant="outline" className="text-2xs font-normal">
                        {f.badge}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors mb-2">
                      {f.title}
                    </h3>
                    <p className="text-gray-500 dark:text-zinc-400 text-sm leading-relaxed">
                      {f.desc}
                    </p>
                  </div>
                  <div className="mt-5 pt-4 border-t border-gray-100 dark:border-zinc-800/80 flex items-center text-xs font-semibold text-brand-600 dark:text-brand-400 group-hover:translate-x-0.5 transition-transform">
                    <span>{f.action}</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </div>
                </article>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Descubrimiento y Colecciones Destacadas */}
      <section className="max-w-6xl mx-auto px-4 w-full pb-4">
        <FeaturedResourcesSection onSelect={handleSelectResource} />
      </section>

      {/* Soryntel Chemestry Section */}
      <section className="bg-gray-50/70 dark:bg-zinc-900/20 py-10 px-4 border-y border-gray-200/80 dark:border-zinc-800/80">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-brand-900 dark:text-brand-100">
                Soryntel Chemestry
              </h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                Software oficial de simulación: suite descargable de cálculo y modelamiento químico para tu computadora. Descarga oficial en ejemplo.com.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/software">
                <Button variant="outline" size="sm" className="cursor-pointer">
                  Ver detalles
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </Link>
              <a href="https://ejemplo.com" target="_blank" rel="noreferrer">
                <Button size="sm" className="bg-brand-500 hover:bg-brand-600 text-white cursor-pointer gap-1.5 shadow-xs">
                  <Download className="h-3.5 w-3.5" />
                  Descargar (ejemplo.com)
                </Button>
              </a>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {labsPreview.map((lab) => {
              const Icon = lab.icon
              return (
                <Link key={lab.title} to="/software" className="group block">
                  <div className="h-full bg-white dark:bg-zinc-900/50 rounded-xl p-4 border border-gray-200 dark:border-zinc-800 hover:border-brand-300 dark:hover:border-brand-500/50 hover:shadow-xs transition active:scale-[0.99]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="h-9 w-9 rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-300 flex items-center justify-center">
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <span className={`text-2xs font-medium px-2 py-0.5 rounded-full ${lab.levelColor}`}>
                        {lab.level}
                      </span>
                    </div>
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-zinc-100 group-hover:text-brand-600 transition-colors">
                      {lab.title}
                    </h3>
                    <p className="text-2xs text-brand-600 dark:text-brand-400 font-medium mt-0.5">
                      {lab.area}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-2 line-clamp-2">
                      {lab.desc}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* Areas of Study & CTA */}
      <section className="max-w-6xl mx-auto px-4 py-10 w-full space-y-8">
        <div>
          <h3 className="text-sm font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider text-center mb-4">
            Líneas de Estudio y Áreas Académicas FIQ
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {areas.map((area) => (
              <Link key={area} to={`/biblioteca`}>
                <Badge
                  variant="secondary"
                  className="px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 hover:border-brand-300 dark:hover:border-brand-500 cursor-pointer transition"
                >
                  <GraduationCap className="h-3.5 w-3.5 mr-1.5 text-brand-600" />
                  {area}
                </Badge>
              </Link>
            ))}
          </div>
        </div>

        {/* CTA Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-brand-600 via-brand-700 to-brand-900 text-white p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="text-xl font-bold tracking-tight">¿Perteneces a la comunidad FIQ UNCP?</h3>
            <p className="text-xs sm:text-sm text-brand-100 max-w-xl">
              Inicia sesión con tu correo institucional para crear listas de estudio, guardar documentos favoritos y solicitar la carga de nuevos recursos.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link to="/login">
              <Button size="sm" className="bg-white text-brand-900 hover:bg-brand-50 font-semibold cursor-pointer">
                Iniciar Sesión
              </Button>
            </Link>
            <Link to="/biblioteca">
              <Button size="sm" variant="outline" className="border-white/40 text-white hover:bg-white/10 cursor-pointer">
                Explorar Catálogo
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
