"use client"

import React, { useState, useRef } from "react"
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Tooltip,
} from "@mui/material"
import {
  ArrowBack,
  CloudUpload,
  Refresh,
  InsertDriveFile,
  Visibility,
  Delete,
  Image,
  VideoFile,
  AudioFile,
  PictureAsPdf,
  Description,
  Link as LinkIcon,
  ContentCopy,
  Download,
} from "@mui/icons-material"
import { apiClient } from "@/lib/api-client"
import { useObjects, useUploadFile, useDeleteObject } from "@/lib/hooks/use-s3-queries"
import { useAppStore } from "@/lib/store"
import { useDownloadManager } from "@/lib/download-manager"
import { useEnhancedToast } from "@/lib/enhanced-toast-context"
import { S3Service } from "@/lib/s3-service"
import type { S3Config, S3Object } from "@/types/s3"
import { formatFileSize, formatDate, getFileType } from "@/lib/file-utils"
import { useI18n } from "@/lib/i18n/context"

interface FileListProps {
  config: S3Config
  bucketName: string
  onBack: () => void
  onFilePreview: (bucketName: string, key: string) => void
}

const getFileIcon = (fileType: string) => {
  switch (fileType) {
    case "image":
      return <Image color="primary" />
    case "video":
      return <VideoFile color="secondary" />
    case "audio":
      return <AudioFile color="success" />
    case "pdf":
      return <PictureAsPdf color="error" />
    case "text":
      return <Description color="info" />
    default:
      return <InsertDriveFile color="action" />
  }
}

export function FileList({ config, bucketName, onBack, onFilePreview }: FileListProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [linkDialog, setLinkDialog] = useState<{ open: boolean; file: S3Object | null }>({ open: false, file: null })
  const [fileUrls, setFileUrls] = useState<{ [key: string]: { signed: string; public: string } }>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Translations
  const { t } = useI18n()

  // Get selected config from store (to ensure we have the full config with all fields)
  const selectedConfig = useAppStore((state) => state.selectedConfig)

  // Use the config from store if available, fallback to prop
  const activeConfig = selectedConfig || config

  // Download manager
  const { startDownload } = useDownloadManager()

  // Enhanced toast for upload progress
  const { showDownloadProgress: showUploadProgress, showSuccess, showError } = useEnhancedToast()

  console.log("FileList render - config:", activeConfig, "bucketName:", bucketName)
  console.log("FileList - config details:", {
    id: activeConfig?.id,
    name: activeConfig?.name,
    region: activeConfig?.region,
    endpoint: activeConfig?.endpoint,
  })

  // React Query hooks
  const { data: objects = [], isLoading, error, refetch } = useObjects(activeConfig, bucketName)
  const _uploadFileMutation = useUploadFile()
  const deleteObjectMutation = useDeleteObject()

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !activeConfig) {
      console.error("FileList - Missing file or config", { file, config: activeConfig })
      showError(t.file.uploadConfigError)
      return
    }

    console.log("FileList - Starting upload", { file: file.name, bucketName, config: activeConfig.name })

    const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    setUploading(true)
    setUploadProgress(0)

    // Show initial upload notification
    showUploadProgress(uploadId, file.name, 0, file.size, 0, t.file.uploading)

    try {
      const s3Service = new S3Service(activeConfig)

      await s3Service.uploadFile(bucketName, file.name, file, (progress, loaded, total) => {
        // Update local progress bar
        setUploadProgress(progress)

        // Update notification
        showUploadProgress(uploadId, file.name, progress, total, loaded, t.file.uploading)
      })

      setUploadProgress(100)
      console.log("FileList - Upload successful")

      // Show completion
      showUploadProgress(uploadId, file.name, 100, file.size, file.size)

      // Refresh file list
      await refetch()

      // Show success message after a moment
      setTimeout(() => {
        showSuccess(t.file.uploadSuccess.replace("{name}", file.name))
      }, 500)
    } catch (err) {
      console.error("FileList - Upload failed:", err)
      const errorMessage = err instanceof Error ? err.message : t.error.fileUploadFailed
      showError(t.file.uploadError.replace("{name}", file.name).replace("{error}", errorMessage))
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleDeleteFile = async (key: string) => {
    if (!confirm(t.file.deleteConfirm.replace("{name}", key)) || !activeConfig) {
      return
    }

    console.log("FileList - Deleting file", { key, bucketName, config: activeConfig.name })

    try {
      await deleteObjectMutation.mutateAsync({
        config: activeConfig,
        bucketName,
        objectKey: key,
      })
      console.log("FileList - Delete successful")
    } catch (err) {
      console.error("FileList - Delete failed:", err)
    }
  }

  const handleDownloadFile = async (file: S3Object) => {
    if (!activeConfig) {
      return
    }

    try {
      console.log("FileList - Downloading file", { key: file.Key, bucketName })

      // Generate a signed URL for download
      const signedUrl = await apiClient.getSignedUrl(activeConfig, bucketName, file.Key)

      // Use download manager for background download with progress
      await startDownload(file.Key, signedUrl, file.Size)

      console.log("FileList - Download initiated")
    } catch (err) {
      console.error("FileList - Download failed:", err)
    }
  }

  const handleShowLink = async (file: S3Object) => {
    if (!activeConfig) {
      return
    }

    try {
      const signedUrl = await apiClient.getSignedUrl(activeConfig, bucketName, file.Key)
      const publicUrl = await apiClient.getPublicUrl(activeConfig, bucketName, file.Key)

      setFileUrls((prev) => ({
        ...prev,
        [file.Key]: { signed: signedUrl, public: publicUrl },
      }))

      setLinkDialog({ open: true, file })
    } catch (err) {
      console.error("Failed to generate URLs:", err)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error("Clipboard copy failed:", err)
    }
  }

  return (
    <>
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <IconButton onClick={onBack} color="primary">
                <ArrowBack />
              </IconButton>
              <Box>
                <Typography variant="h6">{bucketName}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t.file.filesCount.replace("{count}", objects.length.toString())}
                </Typography>
              </Box>
            </Box>

            <Box display="flex" gap={1}>
              <IconButton onClick={() => refetch()} disabled={isLoading} color="primary">
                <Refresh />
              </IconButton>

              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                style={{ display: "none" }}
                disabled={uploading}
              />

              <Button
                variant="contained"
                startIcon={<CloudUpload />}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? t.file.uploading : t.file.uploadFile}
              </Button>
            </Box>
          </Box>

          {uploading && (
            <Box mb={2}>
              <LinearProgress variant="determinate" value={uploadProgress} />
              <Typography variant="caption" color="text.secondary">
                {t.file.uploading} %{uploadProgress}
              </Typography>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error instanceof Error ? error.message : t.error.fileListFailed}
            </Alert>
          )}

          {isLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <List>
              {objects.map((object) => {
                const fileType = getFileType(object.Key)
                return (
                  <ListItem key={object.Key} sx={{ borderRadius: 1, mb: 1 }}>
                    <ListItemIcon>{getFileIcon(fileType)}</ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" fontWeight={500}>
                          {object.Key}
                        </Typography>
                      }
                      secondary={
                        <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                          <Chip label={formatFileSize(object.Size)} size="small" variant="outlined" />
                          <Chip label={formatDate(object.LastModified)} size="small" variant="outlined" />
                          <Chip label={fileType.toUpperCase()} size="small" color="primary" variant="outlined" />
                        </Box>
                      }
                      secondaryTypographyProps={{ component: "div" }}
                    />
                    <ListItemSecondaryAction>
                      <Box display="flex" gap={1}>
                        <Tooltip title={t.file.showFileLink}>
                          <IconButton color="info" onClick={() => handleShowLink(object)}>
                            <LinkIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t.file.downloadFile}>
                          <IconButton color="success" onClick={() => handleDownloadFile(object)}>
                            <Download />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t.file.previewFile}>
                          <IconButton color="primary" onClick={() => onFilePreview(bucketName, object.Key)}>
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t.file.deleteFile}>
                          <IconButton color="error" onClick={() => handleDeleteFile(object.Key)}>
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                )
              })}

              {objects.length === 0 && !isLoading && (
                <Box textAlign="center" py={6}>
                  <InsertDriveFile sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" mb={1}>
                    {t.file.noFiles}
                  </Typography>
                  <Typography variant="body2" color="text.disabled" mb={2}>
                    {t.file.uploadFirst}
                  </Typography>
                  <Button variant="outlined" startIcon={<CloudUpload />} onClick={() => fileInputRef.current?.click()}>
                    {t.file.uploadFile}
                  </Button>
                </Box>
              )}
            </List>
          )}
        </CardContent>
      </Card>

      {/* File Link Dialog */}
      <Dialog open={linkDialog.open} onClose={() => setLinkDialog({ open: false, file: null })} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <LinkIcon color="primary" />
            <Box>
              <Typography variant="h6">{t.file.fileLinks}</Typography>
              <Typography variant="body2" color="text.secondary">
                {linkDialog.file?.Key}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent>
          {linkDialog.file && fileUrls[linkDialog.file.Key] && (
            <Box display="flex" flexDirection="column" gap={3}>
              {/* Public URL */}
              <Box>
                <Typography variant="subtitle1" fontWeight={600} mb={1} color="primary">
                  {t.file.publicUrl}
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  {t.file.publicUrlHelper}
                </Typography>
                <TextField
                  fullWidth
                  value={linkDialog.file ? fileUrls[linkDialog.file.Key].public : ""}
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title={t.file.copy}>
                          <IconButton
                            onClick={() => linkDialog.file && copyToClipboard(fileUrls[linkDialog.file.Key].public)}
                          >
                            <ContentCopy />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                  variant="outlined"
                />
              </Box>

              {/* Signed URL */}
              <Box>
                <Typography variant="subtitle1" fontWeight={600} mb={1} color="secondary">
                  {t.file.signedUrl}
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  {t.file.signedUrlHelper}
                </Typography>
                <TextField
                  fullWidth
                  value={linkDialog.file ? fileUrls[linkDialog.file.Key].signed : ""}
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title={t.file.copy}>
                          <IconButton
                            onClick={() => linkDialog.file && copyToClipboard(fileUrls[linkDialog.file.Key].signed)}
                          >
                            <ContentCopy />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                  variant="outlined"
                  multiline
                  rows={3}
                />
              </Box>

              {/* File Info */}
              <Box sx={{ bgcolor: "grey.50", borderRadius: 2, p: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  {t.file.fileInfo}
                </Typography>
                <Box display="flex" gap={2} flexWrap="wrap">
                  <Chip label={`${t.file.size}: ${formatFileSize(linkDialog.file.Size)}`} size="small" variant="outlined" />
                  <Chip
                    label={`${t.file.type}: ${getFileType(linkDialog.file.Key).toUpperCase()}`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`${t.file.modified}: ${formatDate(linkDialog.file.LastModified)}`}
                    size="small"
                    variant="outlined"
                  />
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setLinkDialog({ open: false, file: null })} variant="contained">
            {t.file.close}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
