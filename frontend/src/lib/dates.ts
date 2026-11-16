import { format, formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

/** El backend guarda timestamps UTC sin zona ("2026-11-16T17:00:00"): se interpretan como UTC. */
export function parseApiDate(value: string): Date {
  return new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`)
}

export function timeAgo(value: string | null | undefined): string {
  if (!value) return ""
  return formatDistanceToNow(parseApiDate(value), { addSuffix: true, locale: es })
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return ""
  return format(parseApiDate(value), "d MMM yyyy, HH:mm", { locale: es })
}
