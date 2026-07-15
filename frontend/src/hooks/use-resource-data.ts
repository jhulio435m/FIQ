import { useQuery } from "@tanstack/react-query"
import { getResourceTypes, getCourses } from "@/services/resources"

export function useResourceTypes() {
  return useQuery({
    queryKey: ["resource-types"],
    queryFn: getResourceTypes,
    staleTime: 1000 * 60 * 10,
  })
}

export function useCourses() {
  return useQuery({
    queryKey: ["courses-list"],
    queryFn: getCourses,
    staleTime: 1000 * 60 * 10,
  })
}
