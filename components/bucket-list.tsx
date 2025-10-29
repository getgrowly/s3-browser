"use client"

import { useState } from "react"
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Alert,
  AlertTitle,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Chip,
  Tooltip,
  Paper,
  Grid,
} from "@mui/material"
import { Refresh, Folder, Add, Delete, ArrowBack, Warning, MedicalServices } from "@mui/icons-material"
import { CorsErrorAlert } from "@/components/cors-error-alert"
import { CreateBucketForm } from "@/components/create-bucket-form"
import { useBuckets, useCreateBucket, useDeleteBucket } from "@/lib/hooks/use-s3-queries"
import { syncManager } from "@/lib/sync-manager"
import { useAppStore } from "@/lib/store"
import type { S3Config, S3Bucket } from "@/types/s3"
import { formatDate } from "@/lib/file-utils"
import { useI18n } from "@/lib/i18n/context"
import { useToast } from "@/lib/toast-context"

interface BucketListProps {
  config: S3Config
  onBucketSelect: (bucketName: string) => void
  onBack?: () => void
}

export function BucketList({ config, onBucketSelect, onBack }: BucketListProps) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; bucket: S3Bucket | null }>({
    open: false,
    bucket: null,
  })
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [runningDiagnostics, setRunningDiagnostics] = useState(false)

  const { t } = useI18n()
  const { showSuccess, showError } = useToast()
  const { syncStatus, setSyncStatus } = useAppStore()

  console.log("BucketList render - config:", config)

  // React Query hooks
  const { data: buckets = [], isLoading, error, refetch } = useBuckets(config)
  const createBucketMutation = useCreateBucket()
  const deleteBucketMutation = useDeleteBucket()

  // Check if sync is in progress for this config
  const isSyncing = syncStatus.configId === config.id && syncStatus.bucketName === null && syncStatus.status === "syncing"

  const handleForceRefresh = async () => {
    if (!config.id || isSyncing) {
      return
    }

    try {
      await syncManager.forceRefreshBuckets(config, (status, message) => {
        setSyncStatus({
          configId: config.id!,
          bucketName: null,
          prefix: null,
          status,
          message,
          lastSyncAt: status === "completed" ? new Date().toISOString() : undefined,
        })
      })

      // Refetch to update UI with latest cache
      refetch()
    } catch (err) {
      console.error("Force refresh failed:", err)
    }
  }

  const handleCreateBucket = async (bucketName: string) => {
    try {
      await createBucketMutation.mutateAsync({ config, bucketName })
      setShowCreateForm(false)
      showSuccess(t.bucket.createSuccess.replace("{name}", bucketName))
    } catch (err: any) {
      console.error("handleCreateBucket - Error:", err)
      // Parse error message from XML if available
      const errorMessage = err?.message || t.error.bucketCreateFailed
      if (errorMessage.includes("BucketAlreadyExists")) {
        showError(t.bucket.bucketAlreadyExists)
      } else if (errorMessage.includes("InvalidBucketName")) {
        showError(t.bucket.invalidBucketName)
      } else {
        showError(errorMessage.split("<?xml")[0] || t.error.bucketCreateFailed)
      }
    }
  }

  const handleDeleteBucket = async () => {
    if (!deleteDialog.bucket) {
      return
    }

    try {
      await deleteBucketMutation.mutateAsync({ config, bucketName: deleteDialog.bucket.Name })
      setDeleteDialog({ open: false, bucket: null })
      showSuccess(`Bucket "${deleteDialog.bucket.Name}" başarıyla silindi`)
    } catch (err: any) {
      console.error("handleDeleteBucket - Error:", err)
      const errorMessage = err?.message || "Bucket silinemedi"
      if (errorMessage.includes("BucketNotEmpty")) {
        showError("Bucket boş olmadığı için silinemedi. Önce içindeki dosyaları silin.")
      } else {
        showError(errorMessage.split("<?xml")[0] || "Bucket silinirken bir hata oluştu")
      }
    }
  }

  const runDiagnostics = async () => {
    setRunningDiagnostics(true)
    setDiagnostics(null)

    try {
      const response = await fetch("/api/s3/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      })

      const data = await response.json()
      setDiagnostics(data)
      setShowDiagnostics(true)
    } catch (err) {
      console.error("Diagnostics failed:", err)
      setDiagnostics({
        success: false,
        error: err instanceof Error ? err.message : "Diagnostics failed",
      })
    } finally {
      setRunningDiagnostics(false)
    }
  }

  const isCorsError = error && (error.message.includes("CORS") || error.message.includes("Failed to fetch"))
  const errorMessage = error instanceof Error ? error.message : null

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          {onBack && (
            <IconButton onClick={onBack} color="primary">
              <ArrowBack />
            </IconButton>
          )}
          <Box>
            <Typography variant="h4" fontWeight="bold">
              {t("bucket.title")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {config.name} • {t.bucket.bucketsCount.replace("{count}", buckets.length.toString())}
            </Typography>
          </Box>
        </Box>
        <Box display="flex" gap={1}>
          <Tooltip title={t("common.refresh")}>
            <IconButton onClick={handleForceRefresh} disabled={isSyncing} color="primary">
              <Refresh className={isSyncing ? "animate-spin" : ""} />
            </IconButton>
          </Tooltip>
          <Tooltip title={t.bucket.runDiagnostics}>
            <IconButton onClick={runDiagnostics} disabled={runningDiagnostics} color="primary">
              <MedicalServices className={runningDiagnostics ? "animate-pulse" : ""} />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            onClick={() => setShowCreateForm(true)}
            disabled={isLoading}
          >
            {t("bucket.createBucket")}
          </Button>
        </Box>
      </Box>

      {/* CORS Error Alert */}
      {isCorsError && (
        <Box mb={3}>
          <CorsErrorAlert endpoint={config.endpoint || ""} onDismiss={() => {}} />
        </Box>
      )}

      {/* Error Alert */}
      {errorMessage && !isCorsError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>{t.bucket.errorTitle}</AlertTitle>
          <Typography variant="body2" mb={2}>
            {errorMessage}
          </Typography>
          <Typography variant="caption" component="div">
            {t.bucket.errorChecklist}
            <ul style={{ marginTop: 8, marginLeft: 20 }}>
              <li>{t.bucket.errorAccessKey}</li>
              <li>{t.bucket.errorSecretKey}</li>
              <li>{t.bucket.errorEndpoint.replace("{endpoint}", config.endpoint || "")}</li>
              <li>{t.bucket.errorRegion.replace("{region}", config.region)}</li>
              <li>{t.bucket.errorAccount}</li>
            </ul>
          </Typography>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading ? (
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={8}>
          <CircularProgress size={48} />
          <Typography variant="body2" color="text.secondary" mt={2}>
            {t("common.loading")}
          </Typography>
        </Box>
      ) : (
        /* Bucket Grid */
        <Grid container spacing={3}>
          {buckets.map((bucket) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={bucket.Name}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  transition: "all 0.3s",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Folder color="primary" />
                      <Typography variant="h6" fontWeight="bold">
                        {bucket.Name}
                      </Typography>
                    </Box>
                    <Tooltip title={t("bucket.deleteBucket")}>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteDialog({ open: true, bucket })
                        }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {t("bucket.creationDate")}: {formatDate(bucket.CreationDate)}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button fullWidth variant="contained" color="primary" onClick={() => onBucketSelect(bucket.Name)}>
                    {t("bucket.openBucket")}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}

          {/* Empty State */}
          {buckets.length === 0 && !isLoading && !error && (
            <Grid size={{ xs: 12 }}>
              <Paper
                sx={{
                  p: 8,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                }}
              >
                <Folder sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
                <Typography variant="h6" fontWeight="bold" mb={1}>
                  {t("bucket.noBuckets")}
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  {t("bucket.createFirst")}
                </Typography>
                <Button variant="outlined" color="primary" startIcon={<Add />} onClick={() => setShowCreateForm(true)}>
                  {t("bucket.createBucket")}
                </Button>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* Create Bucket Form */}
      <CreateBucketForm open={showCreateForm} onClose={() => setShowCreateForm(false)} onSave={handleCreateBucket} />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, bucket: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Warning color="error" />
            {t("bucket.deleteConfirmTitle")}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" mb={2}>
            {t("bucket.deleteConfirmMessage", { name: deleteDialog.bucket?.Name || "" })}
          </Typography>
          <Alert severity="error">
            <AlertTitle>{t.bucket.attention}</AlertTitle>
            {t.bucket.deleteWarning}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialog({ open: false, bucket: null })}
            disabled={deleteBucketMutation.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleDeleteBucket}
            color="error"
            variant="contained"
            disabled={deleteBucketMutation.isPending}
          >
            {deleteBucketMutation.isPending ? t("bucket.deleting") : t("common.delete")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diagnostics Dialog */}
      <Dialog open={showDiagnostics} onClose={() => setShowDiagnostics(false)} maxWidth="md" fullWidth>
        <DialogTitle>{t.bucket.diagnosticsTitle}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Endpoint: {config.endpoint}
          </Typography>

          {diagnostics && (
            <Box>
              <Alert severity={diagnostics.success ? "success" : "error"} sx={{ mb: 2 }}>
                <strong>{diagnostics.summary}</strong>
              </Alert>

              <Box display="flex" flexDirection="column" gap={2}>
                {diagnostics.tests?.map((test: any, index: number) => (
                  <Paper key={index} variant="outlined" sx={{ p: 2 }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {test.name}
                      </Typography>
                      <Chip
                        label={test.status.toUpperCase()}
                        color={test.status === "pass" ? "success" : test.status === "fail" ? "error" : "warning"}
                        size="small"
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {test.message}
                    </Typography>
                    {test.details && (
                      <Box
                        component="pre"
                        sx={{
                          mt: 1,
                          p: 1,
                          bgcolor: "grey.100",
                          borderRadius: 1,
                          fontSize: 12,
                          overflow: "auto",
                        }}
                      >
                        {JSON.stringify(test.details, null, 2)}
                      </Box>
                    )}
                  </Paper>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDiagnostics(false)} variant="contained" color="primary">
            {t.common.close}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
