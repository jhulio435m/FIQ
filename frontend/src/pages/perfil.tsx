import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getMe, updateMe } from "@/services/users"
import { useAuthStore } from "@/stores/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, User, Mail, Lock } from "lucide-react"

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { detail?: string } } }).response
    return response?.data?.detail
  }
  return undefined
}

const profileSchema = z.object({
  nombre: z.string().min(3, "Mínimo 3 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres").optional().or(z.literal("")),
})

type ProfileFormValues = z.infer<typeof profileSchema>

export default function Perfil() {
  const queryClient = useQueryClient()
  const setAuth = useAuthStore((state) => state.setAuth)
  const token = useAuthStore((state) => state.accessToken)

  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
  })

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: {
      nombre: user?.nombre || "",
      email: user?.email || "",
      password: "",
    },
  })

  const mutation = useMutation({
    mutationFn: updateMe,
    onSuccess: (updatedUser) => {
      toast.success("Perfil actualizado")
      if (token) {
        setAuth(updatedUser, token)
      }
      queryClient.invalidateQueries({ queryKey: ["me"] })
      form.reset({ ...form.getValues(), password: "" })
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || "Error al actualizar")
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-brand-900 flex items-center gap-2">
            <User className="h-6 w-6" /> Mi Perfil
          </CardTitle>
          <CardDescription>
            Gestiona tu información personal y credenciales de acceso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit((v) => {
            const data = { ...v }
            if (!data.password) delete data.password
            mutation.mutate(data)
          })} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="nombre" className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" /> Nombre Completo
              </Label>
              <Input id="nombre" {...form.register("nombre")} />
              {form.formState.errors.nombre && (
                <p className="text-xs text-red-500">{form.formState.errors.nombre.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" /> Correo Institucional
              </Label>
              <Input id="email" type="email" {...form.register("email")} />
              {form.formState.errors.email && (
                <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-gray-400" /> Nueva Contraseña (Opcional)
              </Label>
              <Input id="password" type="password" placeholder="Dejar en blanco para no cambiar" {...form.register("password")} />
              {form.formState.errors.password && (
                <p className="text-xs text-red-500">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full bg-brand-500 hover:bg-brand-600"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Guardar Cambios"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
