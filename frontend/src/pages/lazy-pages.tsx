import { lazy } from "react"

export const HomePage = lazy(() => import("@/pages/home"))
export const LoginPage = lazy(() => import("@/pages/login"))
export const RecuperarContrasenaPage = lazy(() => import("@/pages/recuperar-contrasena"))
export const BibliotecaPage = lazy(() => import("@/pages/biblioteca"))
export const LaboratoriosPage = lazy(() => import("@/pages/laboratorios"))
export const AdminPage = lazy(() => import("@/pages/admin"))
export const PerfilPage = lazy(() => import("@/pages/perfil"))
export const MiBibliotecaPage = lazy(() => import("@/pages/mi-biblioteca"))
