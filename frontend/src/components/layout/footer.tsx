import { Link } from "react-router"
import { BookOpen, Laptop, GraduationCap, MapPin, Mail } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-brand-900 text-brand-100 text-sm mt-auto border-t border-brand-800">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-base tracking-tight">
              <div className="h-8 w-8 rounded-lg bg-brand-500 flex items-center justify-center text-white">
                <GraduationCap className="h-5 w-5" />
              </div>
              <span>Facultad de Ingeniería Química — UNCP</span>
            </div>
            <p className="text-xs text-brand-200/80 max-w-md leading-relaxed">
              Plataforma digital académica de la Facultad de Ingeniería Química de la Universidad Nacional del Centro del Perú. Recursos educativos abiertos, simuladores computacionales e investigación aplicada.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-white text-xs uppercase tracking-wider">Enlaces Rápidos</h4>
            <ul className="space-y-2 text-xs text-brand-200/80">
              <li>
                <Link to="/biblioteca" className="hover:text-white transition flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  Biblioteca Virtual
                </Link>
              </li>
              <li>
                <Link to="/software" className="hover:text-white transition flex items-center gap-1.5">
                  <Laptop className="h-3.5 w-3.5" />
                  Software Soryntel Chemestry
                </Link>
              </li>
              <li>
                <Link to="/mi-biblioteca" className="hover:text-white transition">
                  Mi Colección Personal
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-white text-xs uppercase tracking-wider">Campus & Contacto</h4>
            <ul className="space-y-2 text-xs text-brand-200/80">
              <li className="flex items-start gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>Ciudad Universitaria, Av. Mariscal Castilla 3909, Huancayo</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span>fiq@uncp.edu.pe</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-brand-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-brand-300/70 gap-2">
          <p>© {new Date().getFullYear()} Facultad de Ingeniería Química — UNCP. Todos los derechos reservados.</p>
          <p className="text-2xs">Huancayo, Junín — Perú</p>
        </div>
      </div>
    </footer>
  )
}
