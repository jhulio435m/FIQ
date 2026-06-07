export interface Usuario {
  id: string | number
  nombre: string
  email: string
  rol_id: number
  rol: "Admin" | "Docente" | "Estudiante"
  rol_nombre?: string
  esta_activo: boolean
  is_superuser?: boolean
}

export type RolID = 1 | 2 | 3
export const ROL_ADMIN = 1
export const ROL_DOCENTE = 2
export const ROL_ESTUDIANTE = 3
