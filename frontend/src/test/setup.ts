import "@testing-library/jest-dom/vitest"
import { afterAll, afterEach, beforeAll, vi } from "vitest"
import { cleanup } from "@testing-library/react"
import { server } from "./server"
import api from "@/services/api"
import { useAuthStore } from "@/stores/auth"

api.defaults.adapter = "fetch"
// Node 26's native storage can shadow jsdom. Provide isolated browser-like storage.
const storageValues = new Map<string, string>()
const testStorage: Storage = {
  get length() { return storageValues.size },
  clear: () => storageValues.clear(),
  getItem: (key) => storageValues.get(key) ?? null,
  key: (index) => [...storageValues.keys()][index] ?? null,
  removeItem: (key) => { storageValues.delete(key) },
  setItem: (key, value) => { storageValues.set(key, String(value)) },
}
Object.defineProperty(globalThis, "localStorage", { value: testStorage, configurable: true })
Object.defineProperty(window, "localStorage", { value: testStorage, configurable: true })

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
