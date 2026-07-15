import { useEffect, useState } from "react"
import { useNavigate, useLocation, useSearchParams } from "react-router"
import axios from "axios"
import { login, getMicrosoftAuthorizeUrl, microsoftLogin } from "@/services/auth"
import { useAuthStore } from "@/stores/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BookOpen, Loader2 } from "lucide-react"

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [msLoading, setMsLoading] = useState(false)

  const from = (location.state as { from?: string })?.from ?? "/"

  useEffect(() => {
    const code = searchParams.get("code")
    if (code) {
      const handleMsCallback = async () => {
        setMsLoading(true)
        setError("")
        try {
          const redirectUri = window.location.origin + "/login"
          const res = await microsoftLogin(code, redirectUri)
          setAuth(res.usuario, res.access_token)
          navigate(from, { replace: true })
        } catch (err: unknown) {
          const detail = axios.isAxiosError<{ detail?: string }>(err)
            ? err.response?.data?.detail
            : undefined
          setError(detail || "Error al iniciar sesión con Microsoft")
        } finally {
          setMsLoading(false)
        }
      }
      handleMsCallback()
    }
  }, [searchParams, setAuth, navigate, from])

  const handleMicrosoftClick = async () => {
    setError("")
    setMsLoading(true)
    try {
      const redirectUri = window.location.origin + "/login"
      const authUrl = await getMicrosoftAuthorizeUrl(redirectUri)
      window.location.href = authUrl
    } catch (err: unknown) {
      const detail = axios.isAxiosError<{ detail?: string }>(err)
        ? err.response?.data?.detail
        : undefined
      setError(detail || "No se pudo conectar con Microsoft")
      setMsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await login({ email, password })
      setAuth(res.usuario, res.access_token)
      navigate(from, { replace: true })
    } catch {
      setError("Credenciales inválidas")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-xl bg-brand-500 flex items-center justify-center">
              <BookOpen className="h-7 w-7 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-brand-700">Iniciar sesión</CardTitle>
          <CardDescription>Plataforma Digital FIQ — UNCP</CardDescription>
        </CardHeader>
        <CardContent>
          {msLoading ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
              <p className="text-sm text-gray-500 dark:text-zinc-400">Autenticando con Microsoft...</p>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-md">{error}</p>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Correo institucional</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@fiq.uncp.edu.pe"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-brand-500 hover:bg-brand-600 cursor-pointer" disabled={loading}>
                  {loading ? "Ingresando..." : "Ingresar"}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200 dark:border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-gray-400 dark:text-zinc-500">O continuar con</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center justify-center gap-2 cursor-pointer border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800"
                onClick={handleMicrosoftClick}
                disabled={msLoading}
              >
                <svg className="h-4 w-4" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 0H10.7419V10.7419H0V0Z" fill="#F25022"/>
                  <path d="M12.2581 0H23V10.7419H12.2581V0Z" fill="#7FBA00"/>
                  <path d="M0 12.2581H10.7419V23H0V12.2581Z" fill="#00A4EF"/>
                  <path d="M12.2581 12.2581H23V23H12.2581V12.2581Z" fill="#FFB900"/>
                </svg>
                Correo Institucional UNCP
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
