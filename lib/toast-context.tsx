"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { Snackbar, Alert, type AlertColor } from "@mui/material"

interface Toast {
  message: string
  severity: AlertColor
  duration?: number
}

interface ToastContextType {
  showToast: (message: string, severity?: AlertColor, duration?: number) => void
  showSuccess: (message: string) => void
  showError: (message: string) => void
  showWarning: (message: string) => void
  showInfo: (message: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)

  const showToast = (message: string, severity: AlertColor = "info", duration = 6000) => {
    setToast({ message, severity, duration })
  }

  const showSuccess = (message: string) => showToast(message, "success", 4000)
  const showError = (message: string) => showToast(message, "error", 8000)
  const showWarning = (message: string) => showToast(message, "warning", 6000)
  const showInfo = (message: string) => showToast(message, "info", 4000)

  const handleClose = () => {
    setToast(null)
  }

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo }}>
      {children}
      <Snackbar
        open={!!toast}
        autoHideDuration={toast?.duration}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={handleClose} severity={toast?.severity} variant="filled" sx={{ width: "100%" }}>
          {toast?.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

