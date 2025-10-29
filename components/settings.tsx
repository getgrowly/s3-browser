"use client"

import { Box, Typography, Paper, Divider, Switch, FormControlLabel, Alert, Snackbar, Button } from "@mui/material"
import { Languages, Moon, Sun, Check, Database, Trash2, Lock, Shield } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { useAppStore } from "@/lib/store"
import { PasswordDialog } from "@/components/password-dialog"
import { hasPassword, setPassword, removePassword } from "@/lib/password-utils"

export function Settings() {
  const { t, locale, setLocale } = useI18n()
  const { theme, setTheme } = useTheme()
  const { cacheEnabled, setCacheEnabled } = useAppStore()
  const [mounted, setMounted] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState("")
  const [passwordEnabled, setPasswordEnabled] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [passwordMode, setPasswordMode] = useState<"set" | "change">("set")

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Check if password is enabled
  useEffect(() => {
    async function checkPassword() {
      const enabled = await hasPassword()
      setPasswordEnabled(enabled)
    }
    checkPassword()
  }, [])

  const handleLanguageChange = (newLocale: "tr" | "en") => {
    if (locale === newLocale) {
      return
    } // Don't change if already selected

    console.log("Settings - Changing language to:", newLocale)
    setLocale(newLocale)

    // Show notification (will update after locale changes)
    setTimeout(() => {
      setNotificationMessage(newLocale === "en" ? "Language changed to English" : "Dil Türkçe olarak değiştirildi")
      setShowNotification(true)
    }, 100)
  }

  const handleThemeChange = (checked: boolean) => {
    const newTheme = checked ? "dark" : "light"
    console.log("Settings - Changing theme to:", newTheme)
    setTheme(newTheme)

    // Show notification
    setNotificationMessage(
      newTheme === "dark"
        ? `${t("settings.darkMode")} ${t("common.success").toLowerCase()}`
        : `${t("settings.lightMode")} ${t("common.success").toLowerCase()}`
    )
    setShowNotification(true)
  }

  const handleCloseNotification = () => {
    setShowNotification(false)
  }

  const handleCacheChange = (checked: boolean) => {
    console.log("Settings - Changing cache to:", checked)
    setCacheEnabled(checked)

    // Show notification
    setNotificationMessage(
      checked
        ? `${t.settings.cacheEnabled  } ${  t.common.success.toLowerCase()}`
        : `${t.settings.cache  } ${  t.common.close.toLowerCase()}`
    )
    setShowNotification(true)
  }

  const handleClearCache = async () => {
    if (!confirm(t.settings.clearCacheConfirm)) {
      return
    }

    try {
      // Clear localStorage cache
      if (typeof window !== "undefined") {
        localStorage.removeItem("s3-buckets")
        localStorage.removeItem("s3-objects")
        localStorage.removeItem("s3-sync-metadata")
      }

      // If in Electron, also clear database cache
      if (window.electronAPI?.isElectron) {
        // We would need to add a clearCache method to the database
        console.log("Clearing Electron database cache...")
      }

      setNotificationMessage(t.settings.cacheCleared)
      setShowNotification(true)
    } catch (error) {
      console.error("Error clearing cache:", error)
      setNotificationMessage("Error clearing cache")
      setShowNotification(true)
    }
  }

  const handleSetPassword = () => {
    setPasswordMode(passwordEnabled ? "change" : "set")
    setShowPasswordDialog(true)
  }

  const handleSavePassword = async (password: string) => {
    try {
      await setPassword(password)
      setPasswordEnabled(true)
      setNotificationMessage(
        passwordMode === "set" ? t.settings.passwordSet : t.settings.passwordChanged
      )
      setShowNotification(true)
    } catch (error) {
      console.error("Error setting password:", error)
      throw error
    }
  }

  const handleRemovePassword = async () => {
    if (!confirm(t.settings.removePasswordConfirm)) {
      return
    }

    try {
      await removePassword()
      setPasswordEnabled(false)
      setNotificationMessage(t.settings.passwordRemoved)
      setShowNotification(true)
    } catch (error) {
      console.error("Error removing password:", error)
      setNotificationMessage("Error removing password")
      setShowNotification(true)
    }
  }

  // Don't render theme-dependent content until mounted
  if (!mounted) {
    return (
      <Box>
        <Box mb={4}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            {t("nav.settings")}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t("settings.description")}
          </Typography>
        </Box>
      </Box>
    )
  }

  return (
    <Box>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          {t("nav.settings")}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t("settings.description")}
        </Typography>
      </Box>

      {/* Appearance Settings */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Sun className="h-5 w-5" />
          <Typography variant="h6" fontWeight="bold">
            {t("settings.appearance")}
          </Typography>
        </Box>
        <Divider sx={{ mb: 3 }} />

        <Box>
          <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
            {t("settings.theme")}
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {t("settings.themeDescription")}
          </Typography>
          <FormControlLabel
            control={<Switch checked={theme === "dark"} onChange={(e) => handleThemeChange(e.target.checked)} />}
            label={
              <Box display="flex" alignItems="center" gap={1}>
                {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                <span>{theme === "dark" ? t("settings.darkMode") : t("settings.lightMode")}</span>
              </Box>
            }
          />
        </Box>
      </Paper>

      {/* Security Settings */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Shield className="h-5 w-5" />
          <Typography variant="h6" fontWeight="bold">
            {t.settings.security}
          </Typography>
        </Box>
        <Divider sx={{ mb: 3 }} />

        <Box>
          <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
            {t.settings.passwordProtection}
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {t.settings.passwordProtectionDescription}
          </Typography>

          {passwordEnabled ? (
            <Box display="flex" flexDirection="column" gap={2}>
              <Alert severity="success" icon={<Lock className="h-4 w-4" />}>
                {t.settings.passwordEnabled}
              </Alert>
              <Box display="flex" gap={2}>
                <Button
                  variant="outlined"
                  startIcon={<Lock className="h-4 w-4" />}
                  onClick={handleSetPassword}
                >
                  {t.settings.changePassword}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Trash2 className="h-4 w-4" />}
                  onClick={handleRemovePassword}
                >
                  {t.settings.removePassword}
                </Button>
              </Box>
            </Box>
          ) : (
            <Box display="flex" flexDirection="column" gap={2}>
              <Alert severity="info">{t.settings.passwordDisabled}</Alert>
              <Box>
                <Button
                  variant="contained"
                  startIcon={<Lock className="h-4 w-4" />}
                  onClick={handleSetPassword}
                >
                  {t.settings.setPassword}
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Performance Settings */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Database className="h-5 w-5" />
          <Typography variant="h6" fontWeight="bold">
            {t.settings.performance}
          </Typography>
        </Box>
        <Divider sx={{ mb: 3 }} />

        <Box mb={3}>
          <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
            {t.settings.cache}
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {t.settings.cacheDescription}
          </Typography>
          <FormControlLabel
            control={<Switch checked={cacheEnabled} onChange={(e) => handleCacheChange(e.target.checked)} />}
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <Database className="h-4 w-4" />
                <span>{cacheEnabled ? t.settings.cacheEnabled : t.settings.cache}</span>
              </Box>
            }
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box>
          <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
            {t.settings.clearCache}
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {t.settings.clearCacheDescription}
          </Typography>
          <Button variant="outlined" color="error" startIcon={<Trash2 className="h-4 w-4" />} onClick={handleClearCache}>
            {t.settings.clearCache}
          </Button>
        </Box>
      </Paper>

      {/* Language Settings */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Languages className="h-5 w-5" />
          <Typography variant="h6" fontWeight="bold">
            {t("settings.language")}
          </Typography>
        </Box>
        <Divider sx={{ mb: 3 }} />

        <Box>
          <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
            {t("settings.selectLanguage")}
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {t("settings.languageDescription")}
          </Typography>

          <Box display="flex" flexDirection="column" gap={2}>
            <Paper
              component="button"
              sx={{
                p: 2,
                cursor: "pointer",
                border: 2,
                borderColor: locale === "en" ? "primary.main" : "divider",
                bgcolor: locale === "en" ? "action.selected" : "background.paper",
                transition: "all 0.2s",
                width: "100%",
                textAlign: "left",
                "&:hover": {
                  borderColor: "primary.main",
                  bgcolor: "action.hover",
                },
                "&:focus": {
                  outline: "2px solid",
                  outlineColor: "primary.main",
                  outlineOffset: "2px",
                },
              }}
              onClick={() => handleLanguageChange("en")}
              aria-label="Select English language"
              role="radio"
              aria-checked={locale === "en"}
            >
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center" gap={2}>
                  <Typography variant="h4">🇺🇸</Typography>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="medium">
                      English
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      English (United States)
                    </Typography>
                  </Box>
                </Box>
                {locale === "en" && (
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                    }}
                  >
                    <Check className="h-4 w-4" />
                  </Box>
                )}
              </Box>
            </Paper>

            <Paper
              component="button"
              sx={{
                p: 2,
                cursor: "pointer",
                border: 2,
                borderColor: locale === "tr" ? "primary.main" : "divider",
                bgcolor: locale === "tr" ? "action.selected" : "background.paper",
                transition: "all 0.2s",
                width: "100%",
                textAlign: "left",
                "&:hover": {
                  borderColor: "primary.main",
                  bgcolor: "action.hover",
                },
                "&:focus": {
                  outline: "2px solid",
                  outlineColor: "primary.main",
                  outlineOffset: "2px",
                },
              }}
              onClick={() => handleLanguageChange("tr")}
              aria-label="Türkçe dili seç"
              role="radio"
              aria-checked={locale === "tr"}
            >
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center" gap={2}>
                  <Typography variant="h4">🇹🇷</Typography>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="medium">
                      Türkçe
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Turkish (Türkiye)
                    </Typography>
                  </Box>
                </Box>
                {locale === "tr" && (
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                    }}
                  >
                    <Check className="h-4 w-4" />
                  </Box>
                )}
              </Box>
            </Paper>
          </Box>
        </Box>
      </Paper>

      {/* Application Info */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>
          {t("settings.about")}
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Box display="flex" flexDirection="column" gap={1}>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              {t("settings.version")}
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              1.0.0
            </Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              {t("settings.buildDate")}
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {new Date().toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US")}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Success Notification */}
      <Snackbar
        open={showNotification}
        autoHideDuration={3000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={handleCloseNotification} severity="success" sx={{ width: "100%" }} variant="filled">
          {notificationMessage}
        </Alert>
      </Snackbar>

      {/* Password Dialog */}
      <PasswordDialog
        open={showPasswordDialog}
        onClose={() => setShowPasswordDialog(false)}
        onSave={handleSavePassword}
        mode={passwordMode}
      />
    </Box>
  )
}
