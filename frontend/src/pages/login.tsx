import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import axios from "axios"
import { useAuthStore } from "@/stores/auth"
import { login, getMicrosoftAuthorizeUrl, microsoftLogin } from "@/services/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [searchParams] = useSearchParams()
  const [msLoading, setMsLoading] = useState(false)
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  // Handle Microsoft callback redirection
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
          navigate("/")
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
  }, [searchParams, setAuth, navigate])

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
    try {
      const res = await login({ email, password })
      setAuth(res.usuario, res.access_token)
      navigate("/")
    } catch {
      setError("Credenciales inválidas")
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-brand-700">Iniciar Sesión</CardTitle>
        </CardHeader>
        <CardContent>
          {msLoading && (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
              <p className="text-sm text-gray-500">Autenticando con Microsoft...</p>
            </div>
          )}

          {!msLoading && (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="usuario@uncp.edu.pe"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="text-sm font-medium text-gray-700">Contraseña</label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <Button type="submit" className="w-full bg-brand-500 hover:bg-brand-600 cursor-pointer" disabled={msLoading}>
                  Ingresar
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-400">O continuar con</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center justify-center gap-2 cursor-pointer border-gray-200 hover:bg-gray-50"
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
