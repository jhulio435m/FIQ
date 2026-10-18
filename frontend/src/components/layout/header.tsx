import { useState } from "react"
import { Link } from "react-router"
import { useAuthStore } from "@/stores/auth"
import { Button } from "@/components/ui/button"
import { User, LogOut, Bell, Menu, X } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { getPendingResources } from "@/services/resources"
import { ModeToggle } from "@/components/mode-toggle"
import { isAdmin as checkIsAdmin } from "@/lib/auth"
import { toast } from "sonner"

export function Header() {
  const { user, logout, isAuthenticated } = useAuthStore()
  const isAdmin = checkIsAdmin(user)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const { data: pendingResources = [] } = useQuery({
    queryKey: ["pending-resources"],
    queryFn: getPendingResources,
    enabled: isAuthenticated() && isAdmin,
    refetchInterval: 10000, // check for new pending resources every 10s
  })

  return (
    <header className="bg-brand-500 text-white shadow-md sticky top-0 z-50 dark:bg-zinc-950 dark:border-b dark:border-zinc-800/80 dark:shadow-none transition-colors duration-250">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden text-white hover:bg-white/10"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            FIQ — UNCP
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link to="/" className="rounded-sm hover:text-brand-200 dark:hover:text-brand-300 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">Inicio</Link>
          <Link to="/biblioteca" className="rounded-sm hover:text-brand-200 dark:hover:text-brand-300 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">Biblioteca</Link>
          <Link to="/software" className="rounded-sm hover:text-brand-200 dark:hover:text-brand-300 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">Soryntel Chemestry</Link>
          {isAuthenticated() && (
            <Link to="/mi-biblioteca" className="rounded-sm hover:text-brand-200 dark:hover:text-brand-300 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">Mi biblioteca</Link>
          )}
          {isAdmin && (
            <Link to="/admin" className="rounded-sm hover:text-brand-200 dark:hover:text-brand-300 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">Panel Admin</Link>
          )}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <ModeToggle />
          
          {isAuthenticated() ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {isAdmin && (
                <Link to="/admin" className="relative p-2 hover:bg-white/10 rounded-full transition text-white mr-0.5" title="Recursos pendientes de aprobación">
                  <Bell className="h-4.5 w-4.5" />
                  {pendingResources.length > 0 && (
                    <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[8px] font-bold text-white ring-2 ring-brand-500 dark:ring-zinc-950">
                      {pendingResources.length}
                    </span>
                  )}
                </Link>
              )}
              <Link to="/perfil" className="flex items-center gap-2 hover:bg-white/10 px-2.5 py-1.5 rounded-md transition text-sm">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{user?.nombre}</span>
              </Link>
              <Button aria-label="Cerrar sesión" variant="ghost" size="icon-sm" onClick={() => {
                void logout().catch(() => toast.error("No se pudo cerrar la sesión. Intenta nuevamente."))
              }} className="hover:bg-white/10 text-white">
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

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-brand-400 dark:border-zinc-800 bg-brand-600 dark:bg-zinc-900 px-4 py-3 space-y-2 text-sm font-medium shadow-lg animate-drawer-down">
          <Link
            to="/"
            className="block py-2 px-3 rounded-md hover:bg-white/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            onClick={() => setMobileMenuOpen(false)}
          >
            Inicio
          </Link>
          <Link
            to="/biblioteca"
            className="block py-2 px-3 rounded-md hover:bg-white/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            onClick={() => setMobileMenuOpen(false)}
          >
            Biblioteca Virtual
          </Link>
          <Link
            to="/software"
            className="block py-2 px-3 rounded-md hover:bg-white/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            onClick={() => setMobileMenuOpen(false)}
          >
            Soryntel Chemestry
          </Link>
          {isAuthenticated() && (
            <Link
              to="/mi-biblioteca"
              className="block py-2 px-3 rounded-md hover:bg-white/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              onClick={() => setMobileMenuOpen(false)}
            >
              Mi Biblioteca
            </Link>
          )}
          {isAdmin && (
            <Link
              to="/admin"
              className="block py-2 px-3 rounded-md hover:bg-white/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              onClick={() => setMobileMenuOpen(false)}
            >
              Panel Administrativo
            </Link>
          )}
        </div>
      )}
    </header>
  )
}
