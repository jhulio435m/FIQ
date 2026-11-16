import { useQuery } from "@tanstack/react-query"
import { getLabsUsage, getMostViewedResources } from "@/services/reports"

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
