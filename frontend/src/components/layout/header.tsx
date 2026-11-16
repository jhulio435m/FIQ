import { Link } from "react-router"
import { useAuthStore } from "@/stores/auth"
import { Button } from "@/components/ui/button"
import { User, LogOut, Bell } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import { canUpload, isAdmin as checkIsAdmin } from "@/lib/auth"
import { useModerationQueue, useMyResources } from "@/hooks/use-moderation"

export function Header() {
  const { user, logout, isAuthenticated } = useAuthStore()
  const isAdmin = checkIsAdmin(user)
  const isAuthor = canUpload(user)
  const loggedIn = isAuthenticated()

  // Campana: al admin le importa lo que falta revisar; al docente, lo que le observaron.
  const { data: pendingResources = [] } = useModerationQueue(loggedIn && isAdmin)
  const { data: mine } = useMyResources(undefined, loggedIn && isAuthor && !isAdmin)
  const bell = isAdmin
    ? { to: "/admin", count: pendingResources.length, label: "recursos por revisar" }
    : isAuthor
      ? { to: "/mis-recursos", count: mine?.conteos.Observado ?? 0, label: "recursos con observaciones" }
      : null

  return (
    <header className="bg-brand-500 text-white shadow-lg sticky top-0 z-50 dark:bg-zinc-950 dark:border-b dark:border-zinc-800/80 dark:shadow-none transition-colors duration-250">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          FIQ — UNCP
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link to="/" className="hover:text-brand-200 dark:hover:text-brand-300 transition">Inicio</Link>
          <Link to="/biblioteca" className="hover:text-brand-200 dark:hover:text-brand-300 transition">Biblioteca</Link>
          <Link to="/laboratorios" className="hover:text-brand-200 dark:hover:text-brand-300 transition">Laboratorios</Link>
          {isAuthor && (
            <Link to="/mis-recursos" className="hover:text-brand-200 dark:hover:text-brand-300 transition">Mis recursos</Link>
          )}
          {isAdmin && (
            <Link to="/admin" className="hover:text-brand-200 dark:hover:text-brand-300 transition">Panel Admin</Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <ModeToggle />
          
          {isAuthenticated() ? (
            <div className="flex items-center gap-3">
              {bell && (
                <Link
                  to={bell.to}
                  className="relative p-2 hover:bg-white/10 rounded-full transition text-white mr-1"
                  aria-label={bell.count > 0 ? `${bell.count} ${bell.label}` : `Sin ${bell.label}`}
                  title={bell.count > 0 ? `${bell.count} ${bell.label}` : `Sin ${bell.label}`}
                >
                  <Bell className="h-4.5 w-4.5" />
                  {bell.count > 0 && (
                    <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-0.5 text-[9px] font-bold text-white ring-2 ring-brand-500 dark:ring-zinc-950">
                      {bell.count > 99 ? "99+" : bell.count}
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

