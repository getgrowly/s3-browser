"use client"

import { Box, Typography, Chip, Tooltip, IconButton } from "@mui/material"
import { CheckCircle, AlertCircle, Cloud, CloudOff, RefreshCw, Database } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { useI18n } from "@/lib/i18n/context"
import { useEffect, useState } from "react"
import { syncManager } from "@/lib/sync-manager"

export function Footer() {
  const { t } = useI18n()
  const { syncStatus, cacheEnabled, selectedConfig, selectedBucket, setSyncStatus } = useAppStore()
  const [timeAgo, setTimeAgo] = useState<string>("")
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Update "time ago" display every minute
  useEffect(() => {
    const updateTimeAgo = () => {
      if (!syncStatus.lastSyncAt) {
        setTimeAgo(t.sync.neverSynced)
        return
      }

      const now = new Date()
      const lastSync = new Date(syncStatus.lastSyncAt)
      const diffMs = now.getTime() - lastSync.getTime()
      const diffMinutes = Math.floor(diffMs / 60000)

      if (diffMinutes < 1) {
        setTimeAgo(t.sync.justNow)
      } else if (diffMinutes < 60) {
        setTimeAgo(t.sync.minutesAgo.replace("{minutes}", diffMinutes.toString()))
      } else if (diffMinutes < 1440) {
        const hours = Math.floor(diffMinutes / 60)
        setTimeAgo(t.sync.hoursAgo.replace("{hours}", hours.toString()))
      } else {
        const days = Math.floor(diffMinutes / 1440)
        setTimeAgo(t.sync.daysAgo.replace("{days}", days.toString()))
      }
    }

    updateTimeAgo()
    const interval = setInterval(updateTimeAgo, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [syncStatus.lastSyncAt, t])

  // Always show footer to display cache status
  // if (syncStatus.status === "idle" && !syncStatus.lastSyncAt) {
  //   return null
  // }

  const getStatusConfig = () => {
    switch (syncStatus.status) {
      case "syncing":
        return {
          icon: <RefreshCw size={14} className="animate-spin" />,
          color: "#2196f3",
          bgColor: "rgba(33, 150, 243, 0.08)",
          label: syncStatus.message || (syncStatus.bucketName ? t.sync.syncingObjects : t.sync.syncingBuckets),
        }
      case "completed":
        return {
          icon: <CheckCircle size={14} />,
          color: "#4caf50",
          bgColor: "rgba(76, 175, 80, 0.08)",
          label: syncStatus.message || t.sync.completed,
        }
      case "error":
        return {
          icon: <AlertCircle size={14} />,
          color: "#f44336",
          bgColor: "rgba(244, 67, 54, 0.08)",
          label: syncStatus.message || t.sync.failed,
        }
      case "idle":
        return {
          icon: <Cloud size={14} />,
          color: "#9e9e9e",
          bgColor: "rgba(158, 158, 158, 0.08)",
          label: syncStatus.message || t.sync.idle,
        }
      default:
        return {
          icon: <CloudOff size={14} />,
          color: "#9e9e9e",
          bgColor: "rgba(158, 158, 158, 0.08)",
          label: "",
        }
    }
  }

  const statusConfig = getStatusConfig()

  const handleForceSync = async () => {
    if (!selectedConfig || !cacheEnabled || isRefreshing) {
      return
    }

    setIsRefreshing(true)
    
    // Check if online
    if (typeof window !== "undefined" && !navigator.onLine) {
      setSyncStatus({
        configId: selectedConfig.id!,
        bucketName: selectedBucket || null,
        status: "error",
        message: t.sync.offline || "You are offline. Please check your internet connection.",
        lastSyncAt: null,
      })
      setIsRefreshing(false)
      return
    }

    try {
      if (selectedBucket) {
        // Sync current bucket
        console.log("Force syncing bucket:", selectedBucket)
        await syncManager.forceRefreshObjects(selectedConfig, selectedBucket, undefined, (status, message) => {
          setSyncStatus({
            configId: selectedConfig.id!,
            bucketName: selectedBucket,
            status,
            message,
            lastSyncAt: status === "completed" ? new Date().toISOString() : undefined,
          })
        })
      } else {
        // Sync all buckets
        console.log("Force syncing all buckets")
        await syncManager.forceRefreshBuckets(selectedConfig, (status, message) => {
          setSyncStatus({
            configId: selectedConfig.id!,
            bucketName: null,
            status,
            message,
            lastSyncAt: status === "completed" ? new Date().toISOString() : undefined,
          })
        })
      }
    } catch (error) {
      console.error("Force sync failed:", error)
      
      // Set error status with appropriate message
      const errorMessage = error instanceof Error 
        ? error.message.includes("fetch") || error.message.includes("network")
          ? t.sync.networkError || "Network error. Please check your connection."
          : error.message
        : t.sync.failed || "Sync failed"

      setSyncStatus({
        configId: selectedConfig.id!,
        bucketName: selectedBucket || null,
        status: "error",
        message: errorMessage,
        lastSyncAt: null,
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const canSync = selectedConfig && cacheEnabled && !isRefreshing && syncStatus.status !== "syncing"

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        minHeight: 40,
        maxHeight: 56,
        borderTop: 1,
        borderColor: "divider",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 3,
        py: 1,
        zIndex: 1000,
        backdropFilter: "blur(10px)",
        backgroundColor: (theme) => 
          theme.palette.mode === "dark" 
            ? "rgba(30, 30, 30, 0.95)" 
            : "rgba(255, 255, 255, 0.95)",
        boxShadow: (theme) =>
          theme.palette.mode === "dark"
            ? "0 -2px 10px rgba(0, 0, 0, 0.3)"
            : "0 -2px 10px rgba(0, 0, 0, 0.05)",
      }}
    >
      {/* Left Side - Sync Status */}
      <Box display="flex" alignItems="center" gap={1.5}>
        <Tooltip title={statusConfig.label} arrow>
          <Chip
            icon={
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  color: statusConfig.color,
                  "& svg": {
                    animation: syncStatus.status === "syncing" ? "spin 1s linear infinite" : "none",
                  },
                  "@keyframes spin": {
                    from: { transform: "rotate(0deg)" },
                    to: { transform: "rotate(360deg)" },
                  },
                }}
              >
                {statusConfig.icon}
              </Box>
            }
            label={
              <Typography variant="caption" sx={{ fontWeight: 500, fontSize: "0.75rem" }}>
                {statusConfig.label}
              </Typography>
            }
            size="small"
            sx={{
              height: 28,
              bgcolor: statusConfig.bgColor,
              color: statusConfig.color,
              border: `1px solid ${statusConfig.color}20`,
              "& .MuiChip-icon": {
                color: statusConfig.color,
                marginLeft: "8px",
              },
              "& .MuiChip-label": {
                px: 1,
              },
            }}
          />
        </Tooltip>

      </Box>

      {/* Right Side - Cache Status, Sync Button & Last Sync Time */}
      <Box display="flex" alignItems="center" gap={2}>
        {/* Cache Status */}
        <Tooltip
          title={cacheEnabled ? t.settings.cacheEnabled : `${t.settings.cache  } ${  t.common.close.toLowerCase()}`}
          arrow
        >
          <Chip
            icon={<Database size={12} />}
            label={
              <Typography variant="caption" sx={{ fontSize: "0.7rem", fontWeight: 500 }}>
                {cacheEnabled ? "Cache ON" : "Cache OFF"}
              </Typography>
            }
            size="small"
            sx={{
              height: 24,
              bgcolor: cacheEnabled ? "rgba(76, 175, 80, 0.08)" : "rgba(158, 158, 158, 0.08)",
              color: cacheEnabled ? "#4caf50" : "#9e9e9e",
              border: cacheEnabled ? "1px solid rgba(76, 175, 80, 0.2)" : "1px solid rgba(158, 158, 158, 0.2)",
              "& .MuiChip-icon": {
                color: cacheEnabled ? "#4caf50" : "#9e9e9e",
                marginLeft: "6px",
              },
              "& .MuiChip-label": {
                px: 0.75,
              },
            }}
          />
        </Tooltip>

        {/* Force Sync Button */}
        {cacheEnabled && (
          <Tooltip 
            title={
              !selectedConfig 
                ? "Select a configuration to sync" 
                : !canSync 
                ? "Sync in progress..." 
                : selectedBucket 
                ? `Sync ${selectedBucket}` 
                : "Sync all buckets"
            } 
            arrow
          >
            <span>
              <IconButton
                size="small"
                onClick={handleForceSync}
                disabled={!canSync}
                sx={{
                  width: 28,
                  height: 28,
                  color: canSync ? "primary.main" : "text.disabled",
                  bgcolor: canSync ? "rgba(33, 150, 243, 0.08)" : "transparent",
                  border: canSync ? "1px solid rgba(33, 150, 243, 0.2)" : "1px solid rgba(158, 158, 158, 0.1)",
                  "&:hover": {
                    bgcolor: canSync ? "rgba(33, 150, 243, 0.15)" : "transparent",
                  },
                  "& svg": {
                    animation: isRefreshing || syncStatus.status === "syncing" ? "spin 1s linear infinite" : "none",
                  },
                  "@keyframes spin": {
                    from: { transform: "rotate(0deg)" },
                    to: { transform: "rotate(360deg)" },
                  },
                }}
              >
                <RefreshCw size={14} />
              </IconButton>
            </span>
          </Tooltip>
        )}

        {/* Separator */}
        {syncStatus.lastSyncAt && (
          <Box sx={{ width: 1, height: 20, bgcolor: "divider", opacity: 0.5 }} />
        )}

        {/* Last Sync Time */}
        {syncStatus.lastSyncAt && (
          <Tooltip title={new Date(syncStatus.lastSyncAt).toLocaleString()} arrow>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Cloud size={12} style={{ color: "#9e9e9e" }} />
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem", fontWeight: 500, whiteSpace: "nowrap" }}>
                {t.sync.lastSynced}: <Box component="span" sx={{ color: "text.primary", fontWeight: 600 }}>{timeAgo}</Box>
              </Typography>
            </Box>
          </Tooltip>
        )}
      </Box>
    </Box>
  )
}

