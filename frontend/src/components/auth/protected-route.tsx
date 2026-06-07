import { Navigate, Outlet, useLocation } from "react-router"
import { useAuthStore } from "@/stores/auth"
import type { Usuario } from "@/types/user"

interface ProtectedRouteProps {
  allowedRoles?: Usuario["rol"][]
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (allowedRoles && (!user || !allowedRoles.includes(user.rol))) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
