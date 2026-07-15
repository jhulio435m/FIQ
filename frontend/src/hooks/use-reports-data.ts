import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getPendingResources, approveResource, observeResource } from "@/services/resources"
import { getLabsUsage, getMostViewedResources } from "@/services/reports"
import { toast } from "sonner"

export function usePendingResources() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ["pending-resources"],
    queryFn: getPendingResources,
  })

  const approveMutation = useMutation({
    mutationFn: (id: number) => approveResource(id),
    onSuccess: () => {
      toast.success("Recurso aprobado")
      queryClient.invalidateQueries({ queryKey: ["pending-resources"] })
      queryClient.invalidateQueries({ queryKey: ["resources"] })
    },
  })

  const observeMutation = useMutation({
    mutationFn: (id: number) => observeResource(id, "Revisar metadatos o archivo antes de publicar."),
    onSuccess: () => {
      toast.success("Recurso observado")
      queryClient.invalidateQueries({ queryKey: ["pending-resources"] })
    },
  })

  return { query, approveMutation, observeMutation }
}

export function useReportsData() {
  const mostViewedQuery = useQuery({
    queryKey: ["reports", "most-viewed"],
    queryFn: getMostViewedResources,
  })

  const labsUsageQuery = useQuery({
    queryKey: ["reports", "labs-usage"],
    queryFn: getLabsUsage,
  })

  return { mostViewedQuery, labsUsageQuery }
}
