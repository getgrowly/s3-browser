import type { FilePreview } from "@/types/s3"

export function getFileType(filename: string): FilePreview["type"] {
  const extension = filename.split(".").pop()?.toLowerCase()

  if (!extension) {
    return "unknown"
  }

  const imageTypes = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"]
  const textTypes = ["txt", "md", "json", "xml", "csv", "log", "js", "css", "html"]
  const videoTypes = ["mp4", "avi", "mov", "wmv", "flv", "webm"]
  const audioTypes = ["mp3", "wav", "ogg", "aac", "flac"]

  if (imageTypes.includes(extension)) {
    return "image"
  }
  if (textTypes.includes(extension)) {
    return "text"
  }
  if (videoTypes.includes(extension)) {
    return "video"
  }
  if (audioTypes.includes(extension)) {
    return "audio"
  }
  if (extension === "pdf") {
    return "pdf"
  }

  return "unknown"
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return "0 Bytes"
  }

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export function formatDate(date: Date | string): string {
  // Handle both Date objects and ISO date strings
  const dateObj = typeof date === "string" ? new Date(date) : date
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    console.error("Invalid date:", date)
    return "Invalid Date"
  }
  
  return new Intl.DateTimeFormat("tr-TR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dateObj)
}

export function getFileIcon(fileType: string): string {
  switch (fileType) {
    case "image":
      return "🖼️"
    case "video":
      return "🎥"
    case "audio":
      return "🎵"
    case "pdf":
      return "📄"
    case "text":
      return "📝"
    default:
      return "📁"
  }
}
