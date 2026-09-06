import { Suspense, type ReactNode } from "react"

interface RouteSuspenseProps {
  children: ReactNode
}

export function RouteSuspense({ children }: RouteSuspenseProps) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-16 text-sm text-gray-500">Cargando módulo...</div>}>
      {children}
    </Suspense>
  )
}
