import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getUsers, updateUserStatus, updateUserRole } from "@/services/users"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, UserMinus, UserCheck } from "lucide-react"
import { toast } from "sonner"

export function UserManagement() {
  const queryClient = useQueryClient()
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: getUsers,
  })

  const statusMutation = useMutation({
    mutationFn: ({ userId, active }: { userId: string | number; active: boolean }) => updateUserStatus(userId, active),
    onSuccess: () => {
      toast.success("Estado de usuario actualizado")
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
    },
  })

  const roleMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string | number; roleId: number }) => updateUserRole(userId, roleId),
    onSuccess: () => {
      toast.success("Rol actualizado")
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left border-collapse">
        <thead className="bg-gray-50 text-gray-600 font-medium border-b">
          <tr>
            <th className="py-3 px-4">Usuario</th>
            <th className="py-3 px-4">Email</th>
            <th className="py-3 px-4">Rol</th>
            <th className="py-3 px-4">Estado</th>
            <th className="py-3 px-4 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="py-3 px-4 font-medium text-brand-900">{user.nombre}</td>
              <td className="py-3 px-4 text-gray-500">{user.email}</td>
              <td className="py-3 px-4">
                <Select 
                  defaultValue={String(user.rol_id)} 
                  onValueChange={(v) => roleMutation.mutate({ userId: user.id, roleId: Number(v) })}
                >
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Admin</SelectItem>
                    <SelectItem value="2">Docente</SelectItem>
                    <SelectItem value="3">Estudiante</SelectItem>
                  </SelectContent>
                </Select>
              </td>
              <td className="py-3 px-4">
                {user.esta_activo ? (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Activo</Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none">Inactivo</Badge>
                )}
              </td>
              <td className="py-3 px-4 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => statusMutation.mutate({ userId: user.id, active: !user.esta_activo })}
                  className={user.esta_activo ? "text-red-500 hover:text-red-700" : "text-green-500 hover:text-green-700"}
                >
                  {user.esta_activo ? (
                    <><UserMinus className="h-4 w-4 mr-1" /> Desactivar</>
                  ) : (
                    <><UserCheck className="h-4 w-4 mr-1" /> Activar</>
                  )}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
