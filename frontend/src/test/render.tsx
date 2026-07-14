import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, type RenderOptions } from "@testing-library/react"
import type { ReactElement } from "react"
import { MemoryRouter } from "react-router"

export function renderWithProviders(
  ui: ReactElement,
  {
    route = "/",
    options,
  }: {
    route?: string
    options?: Omit<RenderOptions, "wrapper">
  } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
    options,
  )
}
