import { describe, it, expect } from "vitest"
import { formatFileSize, getFileType } from "@/lib/file-utils"

describe("file-utils", () => {
  describe("formatFileSize", () => {
    it("should format bytes correctly", () => {
      expect(formatFileSize(0)).toBe("0 Bytes")
      expect(formatFileSize(1024)).toBe("1 KB")
      expect(formatFileSize(1024 * 1024)).toBe("1 MB")
      expect(formatFileSize(1024 * 1024 * 1024)).toBe("1 GB")
    })

    it("should handle fractional sizes", () => {
      expect(formatFileSize(1536)).toBe("1.5 KB")
      expect(formatFileSize(1024 * 1024 * 1.5)).toBe("1.5 MB")
    })
  })

  describe("getFileType", () => {
    it("should identify image files", () => {
      expect(getFileType("photo.jpg")).toBe("image")
      expect(getFileType("image.PNG")).toBe("image")
      expect(getFileType("graphic.svg")).toBe("image")
    })

    it("should identify video files", () => {
      expect(getFileType("movie.mp4")).toBe("video")
      expect(getFileType("clip.MOV")).toBe("video")
    })

    it("should identify audio files", () => {
      expect(getFileType("song.mp3")).toBe("audio")
      expect(getFileType("track.WAV")).toBe("audio")
    })

    it("should identify document files", () => {
      expect(getFileType("document.pdf")).toBe("pdf")
      expect(getFileType("text.txt")).toBe("text")
    })

    it("should return unknown for unknown types", () => {
      expect(getFileType("file.xyz")).toBe("unknown")
      expect(getFileType("unknown")).toBe("unknown")
    })
  })
})
