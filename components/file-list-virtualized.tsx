"use client"

import React, { useState, useRef, useMemo, useCallback } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  List,
  ListItemText,
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
  ToggleButtonGroup,
  ToggleButton,
  Menu,
  MenuItem,
  Paper,
  Divider,
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
  Search,
  ViewList,
  ViewModule,
  Sort,
} from "@mui/icons-material"
import { apiClient } from "@/lib/api-client"
import { useObjects, useUploadFile, useDeleteObject } from "@/lib/hooks/use-s3-queries"
import { useObjectSearch } from "@/lib/hooks/use-search"
import { syncManager } from "@/lib/sync-manager"
import { useAppStore } from "@/lib/store"
import { useDownloadManager } from "@/lib/download-manager"
import { useEnhancedToast } from "@/lib/enhanced-toast-context"
import { S3Service } from "@/lib/s3-service"
import type { S3Config, S3Object } from "@/types/s3"
import { formatFileSize, formatDate, getFileType } from "@/lib/file-utils"
import { useToast } from "@/lib/toast-context"
import { useI18n } from "@/lib/i18n/context"

interface FileListVirtualizedProps {
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

type ViewMode = "list" | "grid"
type SortBy = "name" | "size" | "date" | "type"
type SortOrder = "asc" | "desc"

export function FileListVirtualized({ config, bucketName, onBack, onFilePreview }: FileListVirtualizedProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [linkDialog, setLinkDialog] = useState<{ open: boolean; file: S3Object | null }>({ open: false, file: null })
  const [fileUrls, setFileUrls] = useState<{ [key: string]: { signed: string; public: string } }>({})
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [sortBy, setSortBy] = useState<SortBy>("name")
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc")
  const [sortMenuAnchor, setSortMenuAnchor] = useState<null | HTMLElement>(null)
  
  // Use optimized search hook with built-in 500ms debounce
  const { searchQuery, setSearchQuery, searchResults, isSearching, hasResults: _hasResults, clearSearch } = useObjectSearch(
    config.id,
    bucketName
  )
  const [expirationHours, setExpirationHours] = useState<number>(1)
  const [generatingLink, setGeneratingLink] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const parentRef = useRef<HTMLDivElement>(null)

  // Translations
  const { t } = useI18n()

  // Get selected config from store
  const selectedConfig = useAppStore((state) => state.selectedConfig)
  const { syncStatus, setSyncStatus } = useAppStore()
  const activeConfig = selectedConfig || config
  const { showSuccess, showError } = useToast()
  const { startDownload } = useDownloadManager()
  const { showDownloadProgress: showUploadProgress } = useEnhancedToast()

  console.log("FileListVirtualized render - config:", activeConfig, "bucketName:", bucketName)

  // React Query hooks
  const { data: objects = [], isLoading, error, refetch } = useObjects(activeConfig, bucketName)
  const _uploadFileMutation = useUploadFile()
  const deleteObjectMutation = useDeleteObject()

  // Check if sync is in progress for this bucket
  const isSyncing =
    syncStatus.configId === activeConfig.id &&
    syncStatus.bucketName === bucketName &&
    syncStatus.status === "syncing"

  const handleForceRefresh = useCallback(async () => {
    if (!activeConfig.id || isSyncing) {
      return
    }

    try {
      await syncManager.forceRefreshObjects(activeConfig, bucketName, undefined, (status, message) => {
        setSyncStatus({
          configId: activeConfig.id!,
          bucketName,
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
  }, [activeConfig, bucketName, isSyncing, refetch, setSyncStatus])

  // Use search results if available, otherwise use all objects
  const displayObjects = useMemo(() => {
    // If searching and has query, use search results from cache
    if (searchQuery && searchQuery.length >= 2) {
      return searchResults
    }
    // Otherwise use all objects
    return objects
  }, [searchQuery, searchResults, objects])

  // Filter and sort objects - optimized with useMemo
  const filteredAndSortedObjects = useMemo(() => {
    return displayObjects.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case "name":
          comparison = a.Key.localeCompare(b.Key)
          break
        case "size":
          comparison = a.Size - b.Size
          break
        case "date":
          comparison = new Date(a.LastModified).getTime() - new Date(b.LastModified).getTime()
          break
        case "type":
          comparison = getFileType(a.Key).localeCompare(getFileType(b.Key))
          break
      }

      return sortOrder === "asc" ? comparison : -comparison
    })
  }, [displayObjects, sortBy, sortOrder])

  // Virtualizer setup - optimized overscan for better performance
  const rowVirtualizer = useVirtualizer({
    count: filteredAndSortedObjects.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (viewMode === "list" ? 80 : 200), // Estimated height of each row
    overscan: 3, // Reduced to 3 items for better performance
  })

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !activeConfig) {
      console.error("FileListVirtualized - Missing file or config", { file, config: activeConfig })
      showError("Dosya yüklenemedi: Yapılandırma bulunamadı")
      return
    }

    console.log("FileListVirtualized - Starting upload", { file: file.name, bucketName, config: activeConfig.name })

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
      console.log("FileListVirtualized - Upload successful")

      // Show completion
      showUploadProgress(uploadId, file.name, 100, file.size, file.size)

      // Refresh file list
      await refetch()

      // Show success message after a moment
      setTimeout(() => {
        showSuccess(`"${file.name}" başarıyla yüklendi`)
      }, 500)
    } catch (err: any) {
      console.error("FileListVirtualized - Upload failed:", err)
      const errorMessage = err?.message || "Dosya yüklenemedi"
      showError(errorMessage.split("<?xml")[0] || "Dosya yüklenirken bir hata oluştu")
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

    console.log("FileListVirtualized - Deleting file", { key, bucketName, config: activeConfig.name })

    try {
      await deleteObjectMutation.mutateAsync({
        config: activeConfig,
        bucketName,
        objectKey: key,
      })
      console.log("FileListVirtualized - Delete successful")
      showSuccess(`Dosya "${key}" başarıyla silindi`)
    } catch (err: any) {
      console.error("FileListVirtualized - Delete failed:", err)
      const errorMessage = err?.message || "Dosya silinemedi"
      showError(errorMessage.split("<?xml")[0] || "Dosya silinirken bir hata oluştu")
    }
  }

  const handleDownloadFile = async (file: S3Object) => {
    if (!activeConfig) {
      return
    }

    try {
      console.log("FileListVirtualized - Downloading file", { key: file.Key, bucketName })
      const signedUrl = await apiClient.getSignedUrl(activeConfig, bucketName, file.Key)

      // Use download manager for background download with progress
      await startDownload(file.Key, signedUrl, file.Size)

      console.log("FileListVirtualized - Download initiated")
    } catch (err) {
      console.error("FileListVirtualized - Download failed:", err)
      showError("Dosya indirilemedi")
    }
  }

  const handleShowLink = async (file: S3Object) => {
    if (!activeConfig) {
      return
    }
    setLinkDialog({ open: true, file })
  }

  const handleGenerateLink = async () => {
    if (!activeConfig || !linkDialog.file) {
      return
    }

    setGeneratingLink(true)
    try {
      const signedUrl = await apiClient.getSignedUrl(activeConfig, bucketName, linkDialog.file.Key)
      const publicUrl = await apiClient.getPublicUrl(activeConfig, bucketName, linkDialog.file.Key)

      setFileUrls((prev) => ({
        ...prev,
        [linkDialog.file!.Key]: { signed: signedUrl, public: publicUrl },
      }))

      showSuccess(`Link oluşturuldu (${expirationHours} saat geçerli)`)
    } catch (err: any) {
      console.error("Failed to generate URLs:", err)
      showError("Link oluşturulamadı")
    } finally {
      setGeneratingLink(false)
    }
  }

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error("Clipboard copy failed:", err)
    }
  }, [])

  return (
    <>
      <Card>
        <CardContent>
          {/* Header */}
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <IconButton onClick={onBack} color="primary">
                <ArrowBack />
              </IconButton>
              <Box>
                <Typography variant="h6">{bucketName}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {filteredAndSortedObjects.length !== objects.length
                    ? `${filteredAndSortedObjects.length} / ${t.file.filesCount.replace("{count}", objects.length.toLocaleString())}`
                    : t.file.filesCount.replace("{count}", objects.length.toLocaleString())}
                  {objects.length > 100 && " • Virtualized"}
                </Typography>
              </Box>
            </Box>

            <Box display="flex" gap={1}>
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

          {/* Toolbar */}
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <TextField
              placeholder={t.file.searchFiles}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              sx={{ flexGrow: 1, maxWidth: 400 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {isSearching ? <CircularProgress size={20} /> : <Search fontSize="small" />}
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton 
                      size="small" 
                      onClick={clearSearch} 
                      edge="end"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, newView) => newView && setViewMode(newView)}
              size="small"
            >
              <ToggleButton value="list">
                <Tooltip title="Liste görünümü">
                  <ViewList fontSize="small" />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="grid">
                <Tooltip title="Kart görünümü">
                  <ViewModule fontSize="small" />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>

            <Button
              variant="outlined"
              startIcon={<Sort />}
              onClick={(e) => setSortMenuAnchor(e.currentTarget)}
              size="small"
            >
              {t.file.sortBy}
            </Button>

            <IconButton onClick={handleForceRefresh} disabled={isSyncing} color="primary" size="small">
              <Refresh className={isSyncing ? "animate-spin" : ""} />
            </IconButton>
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
              {error instanceof Error ? error.message : "Dosya listesi yüklenemedi"}
            </Alert>
          )}

          {isLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : objects.length === 0 ? (
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
          ) : (
            <Box
              ref={parentRef}
              sx={{
                height: "600px",
                overflow: "auto",
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
              }}
            >
              <List
                sx={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const object = filteredAndSortedObjects[virtualRow.index]
                  const fileType = getFileType(object.Key)

                  if (viewMode === "grid") {
                    return (
                      <Box
                        key={virtualRow.key}
                        sx={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                          p: 1,
                        }}
                      >
                        <Paper
                          elevation={1}
                          sx={{
                            p: 2,
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            "&:hover": {
                              elevation: 3,
                              bgcolor: "action.hover",
                            },
                          }}
                        >
                          <Box display="flex" alignItems="center" gap={2} mb={2}>
                            <Box sx={{ fontSize: 40 }}>{getFileIcon(fileType)}</Box>
                            <Box flex={1} minWidth={0}>
                              <Typography variant="subtitle1" fontWeight={600} noWrap>
                                {object.Key.split("/").pop()}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {formatFileSize(object.Size)}
                              </Typography>
                            </Box>
                          </Box>

                          <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                            <Chip label={formatDate(object.LastModified)} size="small" variant="outlined" />
                            <Chip label={fileType.toUpperCase()} size="small" color="primary" variant="outlined" />
                          </Box>

                          <Box display="flex" gap={1} mt="auto">
                            <Tooltip title="İndir">
                              <IconButton
                                color="success"
                                onClick={() => handleDownloadFile(object)}
                                size="small"
                                sx={{
                                  bgcolor: "success.main",
                                  color: "white",
                                  "&:hover": { bgcolor: "success.dark" },
                                }}
                              >
                                <Download fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Link">
                              <IconButton color="info" onClick={() => handleShowLink(object)} size="small">
                                <LinkIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Önizle">
                              <IconButton
                                color="primary"
                                onClick={() => onFilePreview(bucketName, object.Key)}
                                size="small"
                              >
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Sil">
                              <IconButton color="error" onClick={() => handleDeleteFile(object.Key)} size="small">
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Paper>
                      </Box>
                    )
                  }

                  return (
                    <Box
                      key={virtualRow.key}
                      sx={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <Paper
                        elevation={0}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          p: 2,
                          height: "100%",
                          borderRadius: 1,
                          border: "1px solid",
                          borderColor: "divider",
                          "&:hover": {
                            bgcolor: "action.hover",
                            borderColor: "primary.main",
                          },
                        }}
                      >
                        <Box sx={{ fontSize: 32 }}>{getFileIcon(fileType)}</Box>

                        <Box flex={1} minWidth={0}>
                          <Typography variant="subtitle1" fontWeight={500} noWrap>
                            {object.Key}
                          </Typography>
                          <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                            <Chip label={formatFileSize(object.Size)} size="small" variant="outlined" />
                            <Chip label={formatDate(object.LastModified)} size="small" variant="outlined" />
                            <Chip label={fileType.toUpperCase()} size="small" color="primary" variant="outlined" />
                          </Box>
                        </Box>

                        <Box display="flex" gap={0.5} flexShrink={0}>
                          <Tooltip title="İndir">
                            <IconButton
                              color="success"
                              onClick={() => handleDownloadFile(object)}
                              size="medium"
                              sx={{
                                bgcolor: "success.main",
                                color: "white",
                                "&:hover": { bgcolor: "success.dark" },
                              }}
                            >
                              <Download />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Link">
                            <IconButton color="info" onClick={() => handleShowLink(object)} size="medium">
                              <LinkIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Önizle">
                            <IconButton
                              color="primary"
                              onClick={() => onFilePreview(bucketName, object.Key)}
                              size="medium"
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Sil">
                            <IconButton color="error" onClick={() => handleDeleteFile(object.Key)} size="medium">
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Paper>
                    </Box>
                  )
                })}
              </List>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* File Link Dialog */}
      <Dialog open={linkDialog.open} onClose={() => setLinkDialog({ open: false, file: null })} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <LinkIcon color="primary" />
            <Box>
              <Typography variant="h6">Dosya Linkleri Oluştur</Typography>
              <Typography variant="body2" color="text.secondary">
                {linkDialog.file?.Key}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent>
          {/* Link Generation Form */}
          <Box display="flex" flexDirection="column" gap={3} mb={3}>
            <Box>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Link Geçerlilik Süresi
              </Typography>
              <Box display="flex" alignItems="center" gap={2}>
                <TextField
                  type="number"
                  value={expirationHours}
                  onChange={(e) => setExpirationHours(Math.max(1, parseInt(e.target.value) || 1))}
                  inputProps={{ min: 1, max: 168 }}
                  size="small"
                  sx={{ width: 100 }}
                />
                <Typography>saat</Typography>
                <Button
                  variant="contained"
                  onClick={handleGenerateLink}
                  disabled={generatingLink}
                  startIcon={generatingLink ? <CircularProgress size={16} /> : <LinkIcon />}
                >
                  {generatingLink ? "Oluşturuluyor..." : "Link Oluştur"}
                </Button>
              </Box>
              <Typography variant="caption" color="text.secondary" mt={1} display="block">
                Link 1 saat ile 7 gün (168 saat) arasında geçerli olabilir
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Generated Links */}
          {linkDialog.file && fileUrls[linkDialog.file.Key] && (
            <Box display="flex" flexDirection="column" gap={3}>
              <Box>
                <Typography variant="subtitle1" fontWeight={600} mb={1} color="primary">
                  Public URL
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Herkese açık erişim linki (bucket public ise)
                </Typography>
                <TextField
                  fullWidth
                  value={linkDialog.file ? fileUrls[linkDialog.file.Key].public : ""}
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title="Kopyala">
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

              <Box>
                <Typography variant="subtitle1" fontWeight={600} mb={1} color="secondary">
                  Signed URL ({expirationHours} saat geçerli)
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Geçici erişim linki - güvenli paylaşım için kullanın
                </Typography>
                <TextField
                  fullWidth
                  value={linkDialog.file ? fileUrls[linkDialog.file.Key].signed : ""}
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title="Kopyala">
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

              <Box sx={{ bgcolor: "grey.50", borderRadius: 2, p: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  Dosya Bilgileri
                </Typography>
                <Box display="flex" gap={2} flexWrap="wrap">
                  <Chip label={`Boyut: ${formatFileSize(linkDialog.file.Size)}`} size="small" variant="outlined" />
                  <Chip
                    label={`Tür: ${getFileType(linkDialog.file.Key).toUpperCase()}`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`Değiştirilme: ${formatDate(linkDialog.file.LastModified)}`}
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
            Kapat
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sort Menu */}
      <Menu anchorEl={sortMenuAnchor} open={Boolean(sortMenuAnchor)} onClose={() => setSortMenuAnchor(null)}>
        <MenuItem
          selected={sortBy === "name"}
          onClick={() => {
            setSortBy("name")
            setSortOrder(sortBy === "name" && sortOrder === "asc" ? "desc" : "asc")
            setSortMenuAnchor(null)
          }}
        >
          <ListItemText primary="İsim" secondary={sortBy === "name" ? (sortOrder === "asc" ? "A → Z" : "Z → A") : ""} />
        </MenuItem>
        <MenuItem
          selected={sortBy === "size"}
          onClick={() => {
            setSortBy("size")
            setSortOrder(sortBy === "size" && sortOrder === "asc" ? "desc" : "asc")
            setSortMenuAnchor(null)
          }}
        >
          <ListItemText
            primary="Boyut"
            secondary={sortBy === "size" ? (sortOrder === "asc" ? "Küçük → Büyük" : "Büyük → Küçük") : ""}
          />
        </MenuItem>
        <MenuItem
          selected={sortBy === "date"}
          onClick={() => {
            setSortBy("date")
            setSortOrder(sortBy === "date" && sortOrder === "asc" ? "desc" : "asc")
            setSortMenuAnchor(null)
          }}
        >
          <ListItemText
            primary="Tarih"
            secondary={sortBy === "date" ? (sortOrder === "asc" ? "Eski → Yeni" : "Yeni → Eski") : ""}
          />
        </MenuItem>
        <MenuItem
          selected={sortBy === "type"}
          onClick={() => {
            setSortBy("type")
            setSortOrder(sortBy === "type" && sortOrder === "asc" ? "desc" : "asc")
            setSortMenuAnchor(null)
          }}
        >
          <ListItemText primary="Tür" secondary={sortBy === "type" ? (sortOrder === "asc" ? "A → Z" : "Z → A") : ""} />
        </MenuItem>
      </Menu>
    </>
  )
}
