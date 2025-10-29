"use client"

import { useState, useEffect } from "react"
import { Box, Button, Alert, AlertTitle, Link, IconButton } from "@mui/material"
import { X, Download, ExternalLink } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"
import { checkForUpdates, formatVersion, getDownloadUrl, type VersionCheckResult } from "@/lib/version-checker"

interface UpdateNotificationProps {
  /**
   * GitHub repository owner
   * @default "getgrowly"
   */
  owner?: string
  /**
   * GitHub repository name
   * @default "s3-browser"
   */
  repo?: string
  /**
   * Whether to check for updates automatically on mount
   * @default true
   */
  autoCheck?: boolean
  /**
   * Interval in milliseconds to check for updates (0 = check only once)
   * @default 0
   */
  checkInterval?: number
}

export function UpdateNotification({
  owner = "getgrowly",
  repo = "s3-browser",
  autoCheck = true,
  checkInterval = 0,
}: UpdateNotificationProps) {
  const { t } = useI18n()
  const [versionCheck, setVersionCheck] = useState<VersionCheckResult | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [checking, setChecking] = useState(false)

  const performVersionCheck = async () => {
    if (checking) {
      return
    }

    setChecking(true)
    try {
      console.log(`Checking for updates from ${owner}/${repo}...`)
      const result = await checkForUpdates(owner, repo)
      console.log("Version check result:", result)
      setVersionCheck(result)

      if (result.isUpdateAvailable) {
        console.log(`Update available: ${result.latestVersion} (current: ${result.currentVersion})`)
      }
    } catch (error) {
      console.error("Version check failed:", error)
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    if (!autoCheck) {
      return
    }

    // Initial check
    performVersionCheck()

    // Set up periodic checks if interval is specified
    if (checkInterval > 0) {
      const intervalId = setInterval(performVersionCheck, checkInterval)
      return () => clearInterval(intervalId)
    }
  }, [autoCheck, checkInterval, owner, repo])

  // Don't render if dismissed, no update available, or still checking
  if (dismissed || !versionCheck?.isUpdateAvailable || checking) {
    return null
  }

  const handleDismiss = () => {
    setDismissed(true)
  }

  const handleDownload = () => {
    if (versionCheck.releaseInfo) {
      const url = getDownloadUrl(versionCheck.releaseInfo)

      // Try to open in external browser (Electron)
      if (typeof window !== "undefined" && window.electronAPI) {
        window.electronAPI.openExternal(url)
      } else {
        // Fallback to regular window.open
        window.open(url, "_blank", "noopener,noreferrer")
      }
    }
  }

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        maxWidth: 420,
        boxShadow: 3,
      }}
    >
      <Alert
        severity="info"
        action={
          <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={<Download className="h-4 w-4" />}
              onClick={handleDownload}
            >
              {t.update.download}
            </Button>
            <IconButton size="small" onClick={handleDismiss} aria-label={t.common.close}>
              <X className="h-4 w-4" />
            </IconButton>
          </Box>
        }
        sx={{
          "& .MuiAlert-action": {
            alignItems: "flex-start",
            pt: 0.5,
          },
        }}
      >
        <AlertTitle sx={{ fontWeight: 600 }}>{t.update.available}</AlertTitle>
        <Box sx={{ mt: 1 }}>
          {t.update.currentVersion}: {formatVersion(versionCheck.currentVersion)}
          <br />
          {t.update.latestVersion}: {formatVersion(versionCheck.latestVersion)}
        </Box>
        {versionCheck.releaseInfo && (
          <Box sx={{ mt: 1.5 }}>
            <Link
              href={versionCheck.releaseInfo.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                fontSize: "0.875rem",
                textDecoration: "none",
                "&:hover": {
                  textDecoration: "underline",
                },
              }}
            >
              {t.update.viewRelease}
              <ExternalLink className="h-3 w-3" />
            </Link>
          </Box>
        )}
      </Alert>
    </Box>
  )
}
