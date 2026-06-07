import { createBrowserRouter } from "react-router"
import { RootLayout } from "@/components/layout/root-layout"
import Home from "@/pages/home"
import Login from "@/pages/login"
import Biblioteca from "@/pages/biblioteca"
import Laboratorios from "@/pages/laboratorios"
import Admin from "@/pages/admin"
import Perfil from "@/pages/perfil"
import { ProtectedRoute } from "@/components/auth/protected-route"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "login", element: <Login /> },
      { path: "biblioteca", element: <Biblioteca /> },
      { path: "laboratorios", element: <Laboratorios /> },
      {
        element: <ProtectedRoute />,
        children: [{ path: "perfil", element: <Perfil /> }],
      },
      {
        element: <ProtectedRoute allowedRoles={["Admin"]} />,
        children: [{ path: "admin", element: <Admin /> }],
      },
    ],
  },
])
