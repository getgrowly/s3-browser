"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  Chip,
  TextField,
  InputAdornment,
  Tooltip,
} from "@mui/material"
import { Close, Download, Visibility, Link as LinkIcon, ContentCopy } from "@mui/icons-material"
import { S3Service } from "@/lib/s3-service"
import { useDownloadManager } from "@/lib/download-manager"
import type { S3Config } from "@/types/s3"
import { getFileType } from "@/lib/file-utils"

interface FilePreviewProps {
  open: boolean
  config: S3Config
  bucketName: string
  objectKey: string
  onClose: () => void
}

export function FilePreview({ open, config, bucketName, objectKey, onClose }: FilePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [publicUrl, setPublicUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showLinks, setShowLinks] = useState(false)
  const [textContent, setTextContent] = useState<string | null>(null)

  const fileType = getFileType(objectKey)
  const fileName = objectKey.split("/").pop() || objectKey
  const { startDownload } = useDownloadManager()

  useEffect(() => {
    if (!open) {
      return
    }

    const loadPreview = async () => {
      setLoading(true)
      setError(null)
      setTextContent(null)
      try {
        const s3Service = new S3Service(config)
        const signedUrl = await s3Service.getSignedUrl(bucketName, objectKey)
        const publicFileUrl = await s3Service.getPublicUrl(bucketName, objectKey)
        setPreviewUrl(signedUrl)
        setPublicUrl(publicFileUrl)

        // Load text content for text files
        if (fileType === "text") {
          const response = await fetch(signedUrl)
          const text = await response.text()
          setTextContent(text)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Önizleme yüklenemedi")
      } finally {
        setLoading(false)
      }
    }

    loadPreview()
  }, [open, config, bucketName, objectKey, fileType])

  const handleDownload = async () => {
    if (previewUrl) {
      try {
        // Extract file size from response headers if available
        const response = await fetch(previewUrl, { method: "HEAD" })
        const contentLength = response.headers.get("content-length")
        const fileSize = contentLength ? parseInt(contentLength, 10) : undefined

        // Use download manager for background download with progress
        await startDownload(fileName, previewUrl, fileSize)
      } catch (err) {
        console.error("Download failed:", err)
        // Fallback to direct download if fetch fails
        const link = document.createElement("a")
        link.href = previewUrl
        link.download = fileName
        link.target = "_blank"
        link.rel = "noopener noreferrer"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // You could add a toast notification here
    } catch (err) {
      console.error("Clipboard copy failed:", err)
    }
  }

  const renderPreview = () => {
    if (loading) {
      return (
        <Box display="flex" flexDirection="column" alignItems="center" py={8}>
          <CircularProgress size={48} />
          <Typography variant="body2" color="text.secondary" mt={2}>
            Önizleme yükleniyor...
          </Typography>
        </Box>
      )
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ my: 2 }}>
          {error}
        </Alert>
      )
    }

    if (!previewUrl) {
      return (
        <Box textAlign="center" py={8}>
          <Typography variant="body1" color="text.secondary">
            Önizleme mevcut değil
          </Typography>
        </Box>
      )
    }

    return (
      <Box>
        {/* File Links Section */}
        {showLinks && (
          <Box mb={3} p={2} sx={{ bgcolor: "grey.50", borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} mb={2}>
              Dosya Linkleri
            </Typography>

            <Box mb={2}>
              <Typography variant="body2" color="text.secondary" mb={1}>
                Public URL:
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={publicUrl || ""}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Kopyala">
                        <IconButton size="small" onClick={() => publicUrl && copyToClipboard(publicUrl)}>
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" mb={1}>
                Signed URL (1 saat geçerli):
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={previewUrl}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Kopyala">
                        <IconButton size="small" onClick={() => copyToClipboard(previewUrl)}>
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
                multiline
                rows={2}
              />
            </Box>
          </Box>
        )}

        {/* Preview Content */}
        {(() => {
          switch (fileType) {
            case "image":
              return (
                <Box display="flex" justifyContent="center" p={2}>
                  <img
                    src={previewUrl}
                    alt={fileName}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "70vh",
                      objectFit: "contain",
                      borderRadius: 8,
                    }}
                  />
                </Box>
              )
            case "video":
              return (
                <Box display="flex" justifyContent="center" p={2}>
                  <video
                    src={previewUrl}
                    controls
                    style={{
                      maxWidth: "100%",
                      maxHeight: "70vh",
                      borderRadius: 8,
                    }}
                  >
                    Tarayıcınız video etiketini desteklemiyor.
                  </video>
                </Box>
              )
            case "audio":
              return (
                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" p={4}>
                  <Typography variant="h6" color="text.secondary" mb={3}>
                    {fileName}
                  </Typography>
                  <audio
                    src={previewUrl}
                    controls
                    style={{
                      width: "100%",
                      maxWidth: "500px",
                    }}
                  >
                    Tarayıcınız ses etiketini desteklemiyor.
                  </audio>
                </Box>
              )
            case "pdf":
              return (
                <Box display="flex" justifyContent="center" p={2} sx={{ height: "70vh" }}>
                  <iframe
                    src={previewUrl}
                    title={fileName}
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "none",
                      borderRadius: 8,
                    }}
                  />
                </Box>
              )
            case "text":
              return (
                <Box p={2}>
                  <TextField
                    fullWidth
                    multiline
                    value={textContent || "Yükleniyor..."}
                    InputProps={{
                      readOnly: true,
                      sx: {
                        fontFamily: "monospace",
                        fontSize: "0.875rem",
                      },
                    }}
                    variant="outlined"
                    maxRows={25}
                    sx={{
                      "& .MuiInputBase-root": {
                        alignItems: "flex-start",
                      },
                    }}
                  />
                </Box>
              )
            default:
              return (
                <Box textAlign="center" py={8}>
                  <Visibility sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" mb={1}>
                    Bu dosya türü için önizleme desteklenmiyor
                  </Typography>
                  <Typography variant="body2" color="text.disabled" mb={3}>
                    Dosyayı indirerek görüntüleyebilirsiniz
                  </Typography>
                  <Button variant="contained" startIcon={<Download />} onClick={handleDownload}>
                    Dosyayı İndir
                  </Button>
                </Box>
              )
          }
        })()}
      </Box>
    )
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h6" component="div" noWrap>
              {fileName}
            </Typography>
            <Box mt={0.5}>
              <Chip label={fileType.toUpperCase()} size="small" color="primary" variant="outlined" />
            </Box>
          </Box>
          <Box display="flex" gap={1}>
            <Tooltip title={showLinks ? "Linkleri gizle" : "Linkleri göster"}>
              <IconButton onClick={() => setShowLinks(!showLinks)} color={showLinks ? "primary" : "default"}>
                <LinkIcon />
              </IconButton>
            </Tooltip>
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ minHeight: 400 }}>{renderPreview()}</DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button
          startIcon={<LinkIcon />}
          onClick={() => setShowLinks(!showLinks)}
          variant="outlined"
          color={showLinks ? "primary" : "inherit"}
        >
          {showLinks ? "Linkleri Gizle" : "Linkleri Göster"}
        </Button>
        {previewUrl && (
          <Button startIcon={<Download />} onClick={handleDownload} variant="outlined">
            İndir
          </Button>
        )}
        <Button onClick={onClose} variant="contained">
          Kapat
        </Button>
      </DialogActions>
    </Dialog>
  )
}
