import { describe, it, expect } from "vitest"
import { cn } from "@/lib/utils"

describe("utils", () => {
  describe("cn", () => {
    it("should merge class names correctly", () => {
      const result = cn("text-red-500", "bg-blue-500")
      expect(result).toContain("text-red-500")
      expect(result).toContain("bg-blue-500")
    })

    it("should handle conditional class names", () => {
      const isActive = true
      const result = cn("base-class", isActive && "active-class")
      expect(result).toContain("base-class")
      expect(result).toContain("active-class")
    })

    it("should filter out falsy values", () => {
      const result = cn("text-red-500", false, null, undefined, "bg-blue-500")
      expect(result).toContain("text-red-500")
      expect(result).toContain("bg-blue-500")
      expect(result).not.toContain("false")
      expect(result).not.toContain("null")
    })
  })
})
