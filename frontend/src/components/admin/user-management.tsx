import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getUsers, updateUserStatus, updateUserRole } from "@/services/users"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, UserMinus, UserCheck, Search, Users } from "lucide-react"
import { toast } from "sonner"

export function UserManagement() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState("")

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

  const filteredUsers = users.filter((u) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return u.nombre.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o correo..."
            className="pl-9 h-9 text-xs"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span>{filteredUsers.length} usuario{filteredUsers.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-gray-50 dark:bg-zinc-900/60 text-gray-600 dark:text-zinc-400 font-medium border-b border-border">
            <tr>
              <th className="py-3 px-4">Usuario</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Rol</th>
              <th className="py-3 px-4">Estado</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                  No se encontraron usuarios que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => {
                const isStatusPending = statusMutation.isPending && statusMutation.variables?.userId === user.id
                return (
                  <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-900/40 transition-colors">
                    <td className="py-3 px-4 font-medium text-brand-900 dark:text-brand-100">{user.nombre}</td>
                    <td className="py-3 px-4 text-gray-500 dark:text-zinc-400">{user.email}</td>
                    <td className="py-3 px-4">
                      <Select 
                        defaultValue={String(user.rol_id)} 
                        onValueChange={(v) => roleMutation.mutate({ userId: user.id, roleId: Number(v) })}
                        disabled={roleMutation.isPending}
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
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 hover:bg-green-100 border-none">
                          Activo
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 hover:bg-red-100 border-none">
                          Inactivo
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isStatusPending}
                        onClick={() => statusMutation.mutate({ userId: user.id, active: !user.esta_activo })}
                        className={user.esta_activo ? "text-red-500 hover:text-red-700 cursor-pointer" : "text-green-500 hover:text-green-700 cursor-pointer"}
                      >
                        {isStatusPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : user.esta_activo ? (
                          <><UserMinus className="h-4 w-4 mr-1" /> Desactivar</>
                        ) : (
                          <><UserCheck className="h-4 w-4 mr-1" /> Activar</>
                        )}
                      </Button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
