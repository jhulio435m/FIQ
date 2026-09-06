import { useState } from "react"
import { Link, useSearchParams } from "react-router"
import axios from "axios"
import { KeyRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { requestPasswordReset, resetPassword } from "@/services/auth"

export default function RecuperarContrasena() {
  const [params] = useSearchParams()
  const token = params.get("token")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setMessage("")
    if (token && password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }
    setLoading(true)
    try {
      if (token) {
        await resetPassword(token, password)
        setMessage("Contraseña actualizada. Ya puedes iniciar sesión.")
      } else {
        await requestPasswordReset(email)
        setMessage("Si la cuenta existe, recibirás un enlace en tu correo institucional.")
      }
    } catch (err: unknown) {
      const detail = axios.isAxiosError<{ detail?: string }>(err)
        ? err.response?.data?.detail
        : undefined
      setError(detail || "No se pudo completar la solicitud")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500">
            <KeyRound className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl text-brand-700">
            {token ? "Crear nueva contraseña" : "Recuperar contraseña"}
          </CardTitle>
          <CardDescription>
            {token ? "Ingresa una contraseña segura." : "Usa tu correo institucional registrado."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            {message && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>}
            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            {token ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="password">Nueva contraseña</Label>
                  <Input id="password" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar contraseña</Label>
                  <Input id="confirm-password" type="password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="email">Correo institucional</Label>
                <Input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
            )}
            <Button className="w-full bg-brand-500 hover:bg-brand-600" disabled={loading}>
              {loading ? "Procesando..." : token ? "Guardar contraseña" : "Enviar enlace"}
            </Button>
            <Link className="block text-center text-sm text-brand-700 hover:underline" to="/login">
              Volver a iniciar sesión
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
