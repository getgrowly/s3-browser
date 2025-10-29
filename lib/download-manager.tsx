"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Chip,
  Tooltip,
} from "@mui/material"
import { Close, Download, CheckCircle, Error as ErrorIcon, ExpandMore, ExpandLess, Clear } from "@mui/icons-material"
import { formatFileSize } from "./file-utils"
import { useEnhancedToast } from "./enhanced-toast-context"

export interface DownloadTask {
  id: string
  fileName: string
  fileSize?: number
  status: "pending" | "downloading" | "completed" | "error"
  progress: number
  error?: string
  startTime: Date
  endTime?: Date
}

interface DownloadManagerContextType {
  downloads: DownloadTask[]
  startDownload: (fileName: string, url: string, fileSize?: number) => Promise<void>
  clearDownload: (id: string) => void
  clearCompleted: () => void
}

const DownloadManagerContext = createContext<DownloadManagerContextType | undefined>(undefined)

export function DownloadManagerProvider({ children }: { children: ReactNode }) {
  const [downloads, setDownloads] = useState<DownloadTask[]>([])
  const [isExpanded, setIsExpanded] = useState(true)
  const { showDownloadProgress, showSuccess, showError } = useEnhancedToast()

  const startDownload = useCallback(
    async (fileName: string, url: string, fileSize?: number) => {
      const downloadId = `download-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Add download to queue
      const newDownload: DownloadTask = {
        id: downloadId,
        fileName,
        fileSize,
        status: "pending",
        progress: 0,
        startTime: new Date(),
      }

      setDownloads((prev) => [newDownload, ...prev])

      try {
        // Update status to downloading
        setDownloads((prev) => prev.map((d) => (d.id === downloadId ? { ...d, status: "downloading" as const } : d)))

        // Show initial progress notification
        showDownloadProgress(downloadId, fileName, 0, fileSize, 0, "İndiriliyor...")

        // Fetch the file with progress tracking
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const contentLength = response.headers.get("content-length")
        const total = contentLength ? parseInt(contentLength, 10) : fileSize || 0

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error("No response body")
        }

        const chunks: Uint8Array[] = []
        let receivedLength = 0

        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            break
          }

          chunks.push(value)
          receivedLength += value.length

          // Update progress
          const progress = total > 0 ? Math.round((receivedLength / total) * 100) : 0
          setDownloads((prev) => prev.map((d) => (d.id === downloadId ? { ...d, progress } : d)))

          // Update progress notification
          showDownloadProgress(downloadId, fileName, progress, total, receivedLength, "İndiriliyor...")
        }

        // Combine chunks into blob
        const blob = new Blob(chunks as BlobPart[])
        const blobUrl = window.URL.createObjectURL(blob)

        // Create download link
        const link = document.createElement("a")
        link.href = blobUrl
        link.download = fileName
        link.style.display = "none"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        // Clean up blob URL
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100)

        // Mark as completed
        setDownloads((prev) =>
          prev.map((d) =>
            d.id === downloadId ? { ...d, status: "completed" as const, progress: 100, endTime: new Date() } : d
          )
        )

        // Show completion notification
        showDownloadProgress(downloadId, fileName, 100, total, total, "İndiriliyor...")

        // Show success toast after a moment
        setTimeout(() => {
          showSuccess(`"${fileName}" başarıyla indirildi`)
        }, 500)
      } catch (error) {
        console.error("Download failed:", error)
        const errorMessage = error instanceof Error ? error.message : "İndirme başarısız"

        setDownloads((prev) =>
          prev.map((d) =>
            d.id === downloadId
              ? {
                  ...d,
                  status: "error" as const,
                  error: errorMessage,
                  endTime: new Date(),
                }
              : d
          )
        )

        // Show error notification
        showError(`"${fileName}" indirilemedi: ${errorMessage}`)
      }
    },
    [showDownloadProgress, showSuccess, showError]
  )

  const clearDownload = useCallback((id: string) => {
    setDownloads((prev) => prev.filter((d) => d.id !== id))
  }, [])

  const clearCompleted = useCallback(() => {
    setDownloads((prev) => prev.filter((d) => d.status !== "completed"))
  }, [])

  // Don't show widget if no downloads
  const hasDownloads = downloads.length > 0
  const activeDownloads = downloads.filter((d) => d.status === "pending" || d.status === "downloading")
  const completedDownloads = downloads.filter((d) => d.status === "completed")
  const errorDownloads = downloads.filter((d) => d.status === "error")

  return (
    <DownloadManagerContext.Provider value={{ downloads, startDownload, clearDownload, clearCompleted }}>
      {children}

      {/* Download Manager Widget */}
      {hasDownloads && (
        <Paper
          elevation={8}
          sx={{
            position: "fixed",
            bottom: 16,
            right: 16,
            width: 400,
            maxWidth: "calc(100vw - 32px)",
            zIndex: 1300,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              p: 2,
              bgcolor: "primary.main",
              color: "primary.contrastText",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Download />
              <Typography variant="subtitle1" fontWeight={600}>
                İndirmeler
              </Typography>
              {activeDownloads.length > 0 && (
                <Chip
                  label={activeDownloads.length}
                  size="small"
                  sx={{
                    bgcolor: "primary.dark",
                    color: "primary.contrastText",
                  }}
                />
              )}
            </Box>
            <Box sx={{ display: "flex", gap: 0.5 }}>
              {completedDownloads.length > 0 && (
                <Tooltip title="Tamamlananları temizle">
                  <IconButton size="small" onClick={clearCompleted} sx={{ color: "inherit" }}>
                    <Clear fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              <IconButton size="small" onClick={() => setIsExpanded(!isExpanded)} sx={{ color: "inherit" }}>
                {isExpanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>
          </Box>

          {/* Downloads List */}
          <Collapse in={isExpanded}>
            <List
              sx={{
                maxHeight: 400,
                overflow: "auto",
                p: 0,
              }}
            >
              {downloads.map((download) => (
                <ListItem
                  key={download.id}
                  sx={{
                    flexDirection: "column",
                    alignItems: "stretch",
                    borderBottom: 1,
                    borderColor: "divider",
                    "&:last-child": { borderBottom: 0 },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight={500} noWrap>
                          {download.fileName}
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                          {download.status === "downloading" && (
                            <Typography variant="caption" color="primary">
                              İndiriliyor... {download.progress}%
                            </Typography>
                          )}
                          {download.status === "completed" && (
                            <Typography variant="caption" color="success.main">
                              Tamamlandı
                            </Typography>
                          )}
                          {download.status === "error" && (
                            <Typography variant="caption" color="error.main">
                              Hata: {download.error}
                            </Typography>
                          )}
                          {download.fileSize && (
                            <Typography variant="caption" color="text.secondary">
                              {formatFileSize(download.fileSize)}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {download.status === "completed" && <CheckCircle color="success" fontSize="small" />}
                      {download.status === "error" && <ErrorIcon color="error" fontSize="small" />}
                      {download.status !== "downloading" && (
                        <IconButton size="small" onClick={() => clearDownload(download.id)} sx={{ ml: 1 }}>
                          <Close fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </Box>

                  {(download.status === "downloading" || download.status === "pending") && (
                    <LinearProgress
                      variant={download.status === "pending" ? "indeterminate" : "determinate"}
                      value={download.progress}
                      sx={{ borderRadius: 1 }}
                    />
                  )}
                </ListItem>
              ))}
            </List>
          </Collapse>

          {/* Summary Footer */}
          {!isExpanded && (
            <Box
              sx={{
                p: 1.5,
                bgcolor: "grey.50",
                borderTop: 1,
                borderColor: "divider",
                display: "flex",
                gap: 1,
                justifyContent: "center",
              }}
            >
              {activeDownloads.length > 0 && (
                <Chip
                  icon={<Download />}
                  label={`${activeDownloads.length} aktif`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
              {completedDownloads.length > 0 && (
                <Chip
                  icon={<CheckCircle />}
                  label={`${completedDownloads.length} tamamlandı`}
                  size="small"
                  color="success"
                  variant="outlined"
                />
              )}
              {errorDownloads.length > 0 && (
                <Chip
                  icon={<ErrorIcon />}
                  label={`${errorDownloads.length} hata`}
                  size="small"
                  color="error"
                  variant="outlined"
                />
              )}
            </Box>
          )}
        </Paper>
      )}
    </DownloadManagerContext.Provider>
  )
}

export function useDownloadManager() {
  const context = useContext(DownloadManagerContext)
  if (context === undefined) {
    throw new Error("useDownloadManager must be used within a DownloadManagerProvider")
  }
  return context
}
