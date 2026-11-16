import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { AxiosError } from "axios"
import {
  approveResource,
  bulkApprove,
  getModerationQueue,
  getMyResources,
  getResourceHistory,
  observeResource,
  rejectResource,
  type EstadoRecurso,
} from "@/services/moderation"

export const MODERATION_QUEUE_KEY = ["pending-resources"] as const
export const MY_RESOURCES_KEY = ["my-resources"] as const

export function apiErrorMessage(error: unknown, fallback: string) {
  const detail = (error as AxiosError<{ detail?: unknown }>)?.response?.data?.detail
  return typeof detail === "string" ? detail : fallback
}

export function useModerationQueue(enabled = true) {
  return useQuery({ queryKey: MODERATION_QUEUE_KEY, queryFn: getModerationQueue, enabled, refetchInterval: 30_000 })
}

export function useMyResources(estado?: EstadoRecurso, enabled = true) {
  return useQuery({
    queryKey: [...MY_RESOURCES_KEY, estado ?? "todos"],
    queryFn: () => getMyResources(estado),
    enabled,
    refetchInterval: 60_000,
  })
}

export function useResourceHistory(id: number | null) {
  return useQuery({
    queryKey: ["resource-history", id],
    queryFn: () => getResourceHistory(id as number),
    enabled: id !== null,
  })
}

type Decision = { id: number; action: "approve" | "observe" | "reject"; comentario?: string }

const DECISION_LABEL: Record<Decision["action"], string> = {
  approve: "Recurso aprobado y publicado",
  observe: "Observación enviada al autor",
  reject: "Recurso rechazado",
}

export function useModerationActions() {
  const queryClient = useQueryClient()
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: MODERATION_QUEUE_KEY })
    queryClient.invalidateQueries({ queryKey: ["resources"] })
    queryClient.invalidateQueries({ queryKey: ["resource-history"] })
  }

  const decide = useMutation({
    mutationFn: ({ id, action, comentario }: Decision) => {
      if (action === "approve") return approveResource(id, comentario)
      if (action === "observe") return observeResource(id, comentario ?? "")
      return rejectResource(id, comentario ?? "")
    },
    onSuccess: (_, { action }) => {
      toast.success(DECISION_LABEL[action])
      refresh()
    },
    onError: (error) => toast.error(apiErrorMessage(error, "No se pudo completar la acción")),
  })

  const approveMany = useMutation({
    mutationFn: (ids: number[]) => bulkApprove(ids),
    onSuccess: ({ procesados, omitidos }) => {
      toast.success(`${procesados.length} recurso${procesados.length !== 1 ? "s" : ""} aprobado${procesados.length !== 1 ? "s" : ""}`, {
        description: omitidos.length ? `${omitidos.length} ya no estaban pendientes y se omitieron.` : undefined,
      })
      refresh()
    },
    onError: (error) => toast.error(apiErrorMessage(error, "No se pudo aprobar en lote")),
  })

  return { decide, approveMany }
}
