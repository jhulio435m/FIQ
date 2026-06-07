import api from "./api"

export interface LabModule {
  id: number
  titulo: string
  descripcion: string | null
  url_simulacion: string
  nivel_id: number
  esta_activo: boolean
}

export async function getLabs(nivelId?: number) {
  const { data } = await api.get<LabModule[]>("/labs", {
    params: nivelId ? { nivel_id: nivelId } : undefined,
  })
  return data
}

export async function getLab(id: number) {
  const { data } = await api.get<LabModule>(`/labs/${id}`)
  return data
}
