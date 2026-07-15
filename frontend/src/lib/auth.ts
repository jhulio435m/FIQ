import type { Usuario } from "@/types/user"

export const isAdmin = (u: Usuario | null | undefined) => u?.rol === "Admin"
export const canUpload = (u: Usuario | null | undefined) => u?.rol === "Admin" || u?.rol === "Docente"
