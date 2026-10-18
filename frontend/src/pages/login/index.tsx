import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useLocation, useSearchParams } from "react-router"
import axios from "axios"
import { login, getMicrosoftAuthorizeUrl, microsoftLogin } from "@/services/auth"
import { useAuthStore } from "@/stores/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BookOpen, Loader2, Eye, EyeOff, GraduationCap, CheckCircle2, FlaskConical } from "lucide-react"

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [msLoading, setMsLoading] = useState(false)
  const callbackStarted = useRef(false)

  const from = (location.state as { from?: string })?.from ?? "/"

  useEffect(() => {
    const code = searchParams.get("code")
    if (code && !callbackStarted.current) {
      callbackStarted.current = true
      const handleMsCallback = async () => {
        setMsLoading(true)
        setError("")
        try {
          const redirectUri = window.location.origin + "/login"
          const res = await microsoftLogin(code, redirectUri, searchParams.get("state") ?? "")
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
    <div className="min-h-[calc(100vh-14rem)] flex items-center justify-center px-4 py-8 md:py-12">
      <div className="w-full max-w-4xl grid lg:grid-cols-12 gap-8 items-center">
        <div className="hidden lg:flex lg:col-span-6 flex-col justify-center space-y-6 pr-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-900/50 text-brand-700 dark:text-brand-300 text-xs font-semibold w-fit">
            <GraduationCap className="h-4 w-4" />
            <span>UNCP · Facultad de Ingeniería Química</span>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-zinc-50 tracking-tight leading-snug">
              Bienvenido al Portal Digital FIQ
            </h2>
            <p className="mt-3 text-sm text-gray-600 dark:text-zinc-400 leading-relaxed">
              Inicia sesión con tu cuenta institucional de la Universidad Nacional del Centro del Perú para acceder a los recursos protegidos, simuladores de laboratorio y gestionar tus colecciones de estudio.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-zinc-300">
              <div className="h-7 w-7 rounded-md bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                <BookOpen className="h-4 w-4" />
              </div>
              <span>Repositorio exclusivo de tesis, guías y libros de texto</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-zinc-300">
              <div className="h-7 w-7 rounded-md bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                <FlaskConical className="h-4 w-4" />
              </div>
              <span>Simuladores numéricos y entornos interactivos</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-zinc-300">
              <div className="h-7 w-7 rounded-md bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <span>Historial de lecturas y colecciones compartidas</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 flex justify-center">
          <Card className="w-full max-w-md shadow-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-3">
                <div className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center shadow-xs">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl text-brand-700 dark:text-brand-400">Iniciar sesión</CardTitle>
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
                  <p role="alert" className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-md">
                    {error}
                  </p>
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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Contraseña</Label>
                    <Link className="text-xs text-brand-700 dark:text-brand-400 hover:underline" to="/recuperar-contrasena">
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Ocultar clave" : "Mostrar clave"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full bg-brand-500 hover:bg-brand-600 cursor-pointer" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                      Ingresando...
                    </>
                  ) : (
                    "Ingresar"
                  )}
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
      </div>
    </div>
  )
}
