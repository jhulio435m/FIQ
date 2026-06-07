import { Link } from "react-router"
import { useAuthStore } from "@/stores/auth"
import { Button } from "@/components/ui/button"
import { User, LogOut, Bell } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { getPendingResources } from "@/services/resources"

export function Header() {
  const { user, logout, isAuthenticated } = useAuthStore()
  const isAdmin = user?.rol === "Admin"

  const { data: pendingResources = [] } = useQuery({
    queryKey: ["pending-resources"],
    queryFn: getPendingResources,
    enabled: isAuthenticated() && isAdmin,
    refetchInterval: 10000, // check for new pending resources every 10s
  })

  return (
    <header className="bg-brand-500 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          FIQ — UNCP
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link to="/" className="hover:text-brand-200 transition">Inicio</Link>
          <Link to="/biblioteca" className="hover:text-brand-200 transition">Biblioteca</Link>
          <Link to="/laboratorios" className="hover:text-brand-200 transition">Laboratorios</Link>
          {isAdmin && (
            <Link to="/admin" className="hover:text-brand-200 transition">Panel Admin</Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated() ? (
            <div className="flex items-center gap-3">
              {isAdmin && (
                <Link to="/admin" className="relative p-2 hover:bg-white/10 rounded-full transition text-white mr-1" title="Recursos pendientes de aprobación">
                  <Bell className="h-4.5 w-4.5" />
                  {pendingResources.length > 0 && (
                    <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[8px] font-bold text-white ring-2 ring-brand-500 animate-pulse">
                      {pendingResources.length}
                    </span>
                  )}
                </Link>
              )}
              <Link to="/perfil" className="flex items-center gap-2 hover:bg-white/10 px-3 py-1.5 rounded-md transition text-sm">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{user?.nombre}</span>
              </Link>
              <Button variant="ghost" size="icon-sm" onClick={logout} className="hover:bg-white/10 text-white">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Link to="/login">
              <Button variant="secondary" size="sm">Ingresar</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

