import { Link } from "react-router"
import { Button } from "@/components/ui/button"

const features = [
  {
    title: "Biblioteca Virtual",
    desc: "Libros, tesis, guías y manuales académicos con buscador avanzado",
    link: "/biblioteca",
  },
  {
    title: "Laboratorios Interactivos",
    desc: "Simulaciones organizadas por nivel de dificultad",
    link: "/laboratorios",
  },
  {
    title: "Gestión Académica",
    desc: "Sube, revisa y administra recursos educativos",
    link: "/admin",
  },
]

export default function Home() {
  return (
    <div className="animate-fade-in">
      <section className="bg-gradient-to-b from-brand-50 to-white py-24 text-center px-4">
        <h1 className="text-5xl font-bold text-brand-900 mb-4">
          Facultad de Ingeniería Química
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
          Plataforma digital de recursos académicos y laboratorios virtuales
        </p>
        <Link to="/biblioteca">
          <Button size="lg" className="bg-brand-500 hover:bg-brand-600 text-white cursor-pointer">
            Explorar Biblioteca
          </Button>
        </Link>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16 grid md:grid-cols-3 gap-6">
        {features.map((f) => (
          <Link key={f.title} to={f.link}>
            <article className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-brand-200 transition-all h-full">
              <h3 className="text-lg font-semibold text-brand-700 mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm">{f.desc}</p>
            </article>
          </Link>
        ))}
      </section>
    </div>
  )
}
