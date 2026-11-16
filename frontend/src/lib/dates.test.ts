import { describe, expect, it } from "vitest"
import { parseApiDate } from "./dates"

describe("parseApiDate", () => {
  it("interpreta timestamps sin zona como UTC", () => {
    expect(parseApiDate("2026-11-16T17:00:00").toISOString()).toBe("2026-11-16T17:00:00.000Z")
  })

  it("respeta la zona cuando viene incluida", () => {
    expect(parseApiDate("2026-11-16T17:00:00-05:00").toISOString()).toBe("2026-11-16T22:00:00.000Z")
    expect(parseApiDate("2026-11-16T17:00:00Z").toISOString()).toBe("2026-11-16T17:00:00.000Z")
  })
})
