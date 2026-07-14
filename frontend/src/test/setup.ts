import "@testing-library/jest-dom/vitest"
import { afterAll, afterEach, beforeAll, vi } from "vitest"
import { cleanup } from "@testing-library/react"
import { server } from "./server"
import api from "@/services/api"
import { useAuthStore } from "@/stores/auth"

api.defaults.adapter = "fetch"

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))

afterEach(() => {
  cleanup()
  server.resetHandlers()
  globalThis.localStorage?.clear()
  useAuthStore.setState({ user: null, accessToken: null })
})

afterAll(() => server.close())

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

Object.defineProperty(URL, "createObjectURL", {
  writable: true,
  value: vi.fn(() => "blob:fiq-test"),
})

Object.defineProperty(URL, "revokeObjectURL", {
  writable: true,
  value: vi.fn(),
})

Element.prototype.scrollIntoView = vi.fn()
