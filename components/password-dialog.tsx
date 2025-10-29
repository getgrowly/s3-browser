"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  LinearProgress,
  InputAdornment,
  IconButton,
} from "@mui/material"
import { Eye, EyeOff } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"
import { getPasswordStrength } from "@/lib/password-utils"

interface PasswordDialogProps {
  open: boolean
  onClose: () => void
  onSave: (password: string) => Promise<void>
  mode: "set" | "change"
}

export function PasswordDialog({ open, onClose, onSave, mode }: PasswordDialogProps) {
  const { t } = useI18n()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setNewPassword("")
      setConfirmPassword("")
      setError("")
      setLoading(false)
      setShowNewPassword(false)
      setShowConfirmPassword(false)
    }
  }, [open])

  const passwordStrength = newPassword ? getPasswordStrength(newPassword) : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validation
    if (!newPassword) {
      setError(t.password.passwordPlaceholder)
      return
    }

    if (newPassword.length < 6) {
      setError(t.password.passwordTooShort)
      return
    }

    if (newPassword !== confirmPassword) {
      setError(t.password.passwordMismatch)
      return
    }

    setLoading(true)

    try {
      await onSave(newPassword)
      handleClose()
    } catch (err) {
      console.error("PasswordDialog - Error saving password:", err)
      setError(err instanceof Error ? err.message : "Failed to save password")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
    }
  }

  const getStrengthColor = (label: string) => {
    switch (label) {
      case "weak":
        return "error"
      case "fair":
        return "warning"
      case "good":
        return "info"
      case "strong":
        return "success"
      default:
        return "inherit"
    }
  }

  const getStrengthValue = (score: number) => {
    return (score / 3) * 100
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        component: "form",
        onSubmit: handleSubmit,
      }}
    >
      <DialogTitle>
        {mode === "set" ? t.password.setPasswordTitle : t.password.changePasswordTitle}
      </DialogTitle>

      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} pt={1}>
          {error && (
            <Alert severity="error" onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          <TextField
            type={showNewPassword ? "text" : "password"}
            label={t.password.newPassword}
            placeholder={t.password.newPasswordPlaceholder}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            fullWidth
            autoFocus
            disabled={loading}
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    edge="end"
                    disabled={loading}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {passwordStrength && newPassword.length > 0 && (
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                <Typography variant="caption" color="text.secondary">
                  {t.password.passwordStrength}
                </Typography>
                <Typography
                  variant="caption"
                  fontWeight="medium"
                  color={`${getStrengthColor(passwordStrength.label)}.main`}
                >
                  {t.password[passwordStrength.label as keyof typeof t.password]}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={getStrengthValue(passwordStrength.score)}
                color={getStrengthColor(passwordStrength.label) as any}
                sx={{ height: 6, borderRadius: 1 }}
              />
              {passwordStrength.score < 2 && (
                <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                  {passwordStrength.feedback}
                </Typography>
              )}
            </Box>
          )}

          <TextField
            type={showConfirmPassword ? "text" : "password"}
            label={t.password.confirmPassword}
            placeholder={t.password.confirmPasswordPlaceholder}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            fullWidth
            disabled={loading}
            required
            error={confirmPassword.length > 0 && newPassword !== confirmPassword}
            helperText={
              confirmPassword.length > 0 && newPassword !== confirmPassword
                ? t.password.passwordMismatch
                : ""
            }
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                    disabled={loading}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Typography variant="caption" color="text.secondary">
            {t.password.passwordTooShort}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {t.password.cancel}
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
        >
          {loading ? t.common.loading : t.password.save}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

