"use client"

import React, { useState } from "react"
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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material"
import { CreateNewFolder, Check as CheckIcon, Close as CloseIcon } from "@mui/icons-material"

interface CreateBucketFormProps {
  open: boolean
  onClose: () => void
  onSave: (bucketName: string) => Promise<void>
}

export function CreateBucketForm({ open, onClose, onSave }: CreateBucketFormProps) {
  const [bucketName, setBucketName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateBucketName = (name: string) => {
    const errors: string[] = []

    if (!name) {
      errors.push("Bucket adı gereklidir")
    } else {
      if (name.length < 3 || name.length > 63) {
        errors.push("Bucket adı 3-63 karakter arasında olmalıdır")
      }

      if (!/^[a-z0-9.-]+$/.test(name)) {
        errors.push("Sadece küçük harf, rakam, nokta ve tire kullanılabilir")
      }

      if (name.startsWith(".") || name.endsWith(".")) {
        errors.push("Nokta ile başlayamaz veya bitemez")
      }

      if (name.startsWith("-") || name.endsWith("-")) {
        errors.push("Tire ile başlayamaz veya bitemez")
      }

      if (name.includes("..")) {
        errors.push("Ardışık nokta içeremez")
      }

      if (/[A-Z]/.test(name)) {
        errors.push("Büyük harf içeremez")
      }
    }

    return errors
  }

  const validationErrors = validateBucketName(bucketName)
  const isValid = validationErrors.length === 0 && bucketName.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      await onSave(bucketName)
      setBucketName("")
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bucket oluşturulamadı")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setBucketName("")
    setError(null)
    onClose()
  }

  const rules = [
    {
      text: "3-63 karakter uzunluğunda",
      valid: bucketName.length >= 3 && bucketName.length <= 63,
    },
    {
      text: "Sadece küçük harf, rakam, nokta ve tire",
      valid: /^[a-z0-9.-]*$/.test(bucketName),
    },
    {
      text: "Nokta ile başlamaz veya bitmez",
      valid: !bucketName.startsWith(".") && !bucketName.endsWith("."),
    },
    {
      text: "Ardışık nokta içermez",
      valid: !bucketName.includes(".."),
    },
  ]

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <CreateNewFolder color="primary" />
            <Typography variant="h6">Yeni Bucket Oluştur</Typography>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={3}>
            AWS S3 kurallarına uygun bir bucket adı girin. Bucket adı benzersiz olmalıdır.
          </Typography>

          <TextField
            fullWidth
            label="Bucket Adı"
            value={bucketName}
            onChange={(e) => setBucketName(e.target.value.toLowerCase())}
            placeholder="ornek-bucket-adi"
            disabled={loading}
            error={bucketName.length > 0 && !isValid}
            helperText={bucketName.length > 0 && !isValid ? validationErrors[0] : ""}
            sx={{ mb: 3 }}
          />

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box>
            <Typography variant="subtitle2" fontWeight="bold" mb={1}>
              Bucket Adı Kuralları:
            </Typography>
            <List dense>
              {rules.map((rule, index) => (
                <ListItem key={index}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {rule.valid ? (
                      <CheckIcon fontSize="small" color="success" />
                    ) : (
                      <CloseIcon fontSize="small" color="disabled" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={rule.text}
                    primaryTypographyProps={{
                      variant: "body2",
                      color: rule.valid ? "success.main" : "text.secondary",
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            İptal
          </Button>
          <Button type="submit" variant="contained" color="primary" disabled={!isValid || loading}>
            {loading ? "Oluşturuluyor..." : "Bucket Oluştur"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
