import { createBrowserRouter } from "react-router"
import { RootLayout } from "@/components/layout/root-layout"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { RouteSuspense } from "@/components/layout/route-suspense"
import {
  AdminPage,
  BibliotecaPage,
  HomePage,
  LaboratoriosPage,
  LoginPage,
  MiBibliotecaPage,
  PerfilPage,
  RecuperarContrasenaPage,
} from "@/pages/lazy-pages"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <RouteSuspense><HomePage /></RouteSuspense> },
      { path: "login", element: <RouteSuspense><LoginPage /></RouteSuspense> },
      { path: "recuperar-contrasena", element: <RouteSuspense><RecuperarContrasenaPage /></RouteSuspense> },
      { path: "biblioteca", element: <RouteSuspense><BibliotecaPage /></RouteSuspense> },
      { path: "biblioteca/recurso/:resourceId", element: <RouteSuspense><BibliotecaPage /></RouteSuspense> },
      { path: "laboratorios", element: <RouteSuspense><LaboratoriosPage /></RouteSuspense> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "perfil", element: <RouteSuspense><PerfilPage /></RouteSuspense> },
          { path: "mi-biblioteca", element: <RouteSuspense><MiBibliotecaPage /></RouteSuspense> },
        ],
      },
      {
        element: <ProtectedRoute allowedRoles={["Admin"]} />,
        children: [{ path: "admin", element: <RouteSuspense><AdminPage /></RouteSuspense> }],
      },
    ],
  },
])
