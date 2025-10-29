"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { Snackbar, Alert, AlertTitle, Box, LinearProgress, IconButton, type AlertColor } from "@mui/material"
import { Close } from "@mui/icons-material"
import { formatFileSize } from "./file-utils"

interface ToastBase {
  id: string
  message: string
  severity: AlertColor
  duration?: number
}

interface SimpleToast extends ToastBase {
  type: "simple"
}

interface ProgressToast extends ToastBase {
  type: "progress"
  title: string
  progress: number
  fileSize?: number
  bytesLoaded?: number
  customMessage?: string
}

type Toast = SimpleToast | ProgressToast

interface EnhancedToastContextType {
  showToast: (message: string, severity?: AlertColor, duration?: number) => void
  showSuccess: (message: string) => void
  showError: (message: string) => void
  showWarning: (message: string) => void
  showInfo: (message: string) => void
  showDownloadProgress: (
    id: string,
    title: string,
    progress: number,
    fileSize?: number,
    bytesLoaded?: number,
    customMessage?: string
  ) => void
  hideToast: (id: string) => void
}

const EnhancedToastContext = createContext<EnhancedToastContextType | undefined>(undefined)

export function EnhancedToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, severity: AlertColor = "info", duration = 6000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newToast: SimpleToast = { id, type: "simple", message, severity, duration }

    setToasts((prev) => [...prev, newToast])

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, duration)
    }
  }, [])

  const showSuccess = useCallback((message: string) => showToast(message, "success", 4000), [showToast])
  const showError = useCallback((message: string) => showToast(message, "error", 8000), [showToast])
  const showWarning = useCallback((message: string) => showToast(message, "warning", 6000), [showToast])
  const showInfo = useCallback((message: string) => showToast(message, "info", 4000), [showToast])

  const showDownloadProgress = useCallback(
    (id: string, title: string, progress: number, fileSize?: number, bytesLoaded?: number, customMessage?: string) => {
      setToasts((prev) => {
        const existing = prev.find((t) => t.id === id)

        if (existing) {
          // Update existing progress toast
          return prev.map((t) =>
            t.id === id
              ? {
                  ...t,
                  type: "progress" as const,
                  title,
                  progress,
                  fileSize,
                  bytesLoaded,
                  customMessage,
                  severity: progress >= 100 ? ("success" as const) : ("info" as const),
                }
              : t
          )
        } else {
          // Create new progress toast
          const newToast: ProgressToast = {
            id,
            type: "progress",
            title,
            message: customMessage || "İşleniyor...",
            progress,
            fileSize,
            bytesLoaded,
            customMessage,
            severity: "info",
            duration: 0, // Don't auto-hide progress toasts
          }
          return [...prev, newToast]
        }
      })

      // Auto-remove completed downloads after 3 seconds
      if (progress >= 100) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id))
        }, 3000)
      }
    },
    []
  )

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const handleClose = (id: string) => {
    hideToast(id)
  }

  return (
    <EnhancedToastContext.Provider
      value={{
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        showDownloadProgress,
        hideToast,
      }}
    >
      {children}

      {/* Render all toasts */}
      <Box
        sx={{
          position: "fixed",
          bottom: 16,
          left: 16,
          zIndex: 1400,
          display: "flex",
          flexDirection: "column-reverse",
          gap: 1,
          maxWidth: 400,
          width: "calc(100vw - 32px)",
        }}
      >
        {toasts.map((toast) => (
          <Snackbar
            key={toast.id}
            open={true}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            sx={{
              position: "relative",
              bottom: 0,
              left: 0,
              transform: "none !important",
            }}
          >
            <Alert
              severity={toast.severity}
              variant="filled"
              sx={{ width: "100%" }}
              action={
                <IconButton size="small" aria-label="close" color="inherit" onClick={() => handleClose(toast.id)}>
                  <Close fontSize="small" />
                </IconButton>
              }
            >
              {toast.type === "progress" ? (
                <Box>
                  <AlertTitle sx={{ mb: 1 }}>{toast.title}</AlertTitle>

                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                    <Box sx={{ fontSize: "0.875rem" }}>
                      {toast.progress >= 100 ? "Tamamlandı!" : toast.customMessage || toast.message || "İşleniyor..."}
                    </Box>
                    <Box sx={{ fontSize: "0.875rem", fontWeight: 600 }}>{toast.progress.toFixed(0)}%</Box>
                  </Box>

                  <LinearProgress
                    variant="determinate"
                    value={toast.progress}
                    sx={{
                      height: 6,
                      borderRadius: 1,
                      bgcolor: "rgba(255, 255, 255, 0.2)",
                      "& .MuiLinearProgress-bar": {
                        bgcolor: "rgba(255, 255, 255, 0.9)",
                      },
                    }}
                  />

                  {toast.fileSize && (
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      mt={0.5}
                      sx={{ fontSize: "0.75rem", opacity: 0.9 }}
                    >
                      <span>
                        {toast.bytesLoaded
                          ? formatFileSize(toast.bytesLoaded)
                          : formatFileSize((toast.fileSize * toast.progress) / 100)}
                      </span>
                      <span>{formatFileSize(toast.fileSize)}</span>
                    </Box>
                  )}
                </Box>
              ) : (
                toast.message
              )}
            </Alert>
          </Snackbar>
        ))}
      </Box>
    </EnhancedToastContext.Provider>
  )
}

export function useEnhancedToast() {
  const context = useContext(EnhancedToastContext)
  if (context === undefined) {
    throw new Error("useEnhancedToast must be used within an EnhancedToastProvider")
  }
  return context
}
