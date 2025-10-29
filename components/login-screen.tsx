"use client"

import { useState } from "react"
import { Box, Typography, TextField, Button, Alert, Paper, InputAdornment, IconButton } from "@mui/material"
import { Lock, Eye, EyeOff } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"
import { verifyAppPassword } from "@/lib/password-utils"

interface LoginScreenProps {
  onUnlock: () => void
}

export function LoginScreen({ onUnlock }: LoginScreenProps) {
  const { t } = useI18n()
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!password) {
      setError(t.login.enterPasswordPrompt)
      return
    }

    setLoading(true)
    setError("")

    try {
      const isValid = await verifyAppPassword(password)
      
      if (isValid) {
        console.log("LoginScreen - Password verified successfully")
        onUnlock()
      } else {
        console.log("LoginScreen - Invalid password")
        setError(t.login.incorrectPassword)
        setPassword("")
      }
    } catch (err) {
      console.error("LoginScreen - Error verifying password:", err)
      setError(t.login.incorrectPassword)
      setPassword("")
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        p: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          width: "100%",
          maxWidth: 400,
          p: 4,
          borderRadius: 2,
        }}
      >
        <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              bgcolor: "primary.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 2,
            }}
          >
            <Lock className="h-8 w-8 text-white" />
          </Box>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            {t.login.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            {t.login.subtitle}
          </Typography>
        </Box>

        <form onSubmit={handleSubmit}>
          <Box display="flex" flexDirection="column" gap={2}>
            {error && (
              <Alert severity="error" sx={{ mb: 1 }}>
                {error}
              </Alert>
            )}

            <TextField
              type={showPassword ? "text" : "password"}
              label={t.password.enterPassword}
              placeholder={t.login.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              autoFocus
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={handleTogglePasswordVisibility}
                      edge="end"
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={loading || !password}
              sx={{ mt: 1 }}
            >
              {loading ? t.common.loading : t.login.unlock}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  )
}

