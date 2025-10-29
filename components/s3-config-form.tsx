"use client"

import React, { useState, useEffect } from "react"
import { Cloud } from "lucide-react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
} from "@mui/material"
import type { S3Config } from "@/types/s3"
import { useI18n } from "@/lib/i18n/context"

interface S3ConfigFormProps {
  open: boolean
  onClose: () => void
  onSave: (config: Omit<S3Config, "id" | "createdAt">) => void
  initialConfig?: S3Config
}

export function S3ConfigForm({ open, onClose, onSave, initialConfig }: S3ConfigFormProps) {
  const { t } = useI18n()
  const [formData, setFormData] = useState({
    name: initialConfig?.name || "",
    accessKeyId: initialConfig?.accessKeyId || "",
    secretAccessKey: initialConfig?.secretAccessKey || "",
    region: initialConfig?.region || "us-east-1",
    endpoint: initialConfig?.endpoint || "",
  })

  // Update form data when initialConfig changes
  useEffect(() => {
    if (initialConfig) {
      setFormData({
        name: initialConfig.name,
        accessKeyId: initialConfig.accessKeyId,
        secretAccessKey: initialConfig.secretAccessKey,
        region: initialConfig.region,
        endpoint: initialConfig.endpoint || "",
      })
    } else {
      setFormData({
        name: "",
        accessKeyId: "",
        secretAccessKey: "",
        region: "us-east-1",
        endpoint: "",
      })
    }
  }, [initialConfig])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
    onClose()
  }

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }))
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Cloud className="h-5 w-5" />
          {initialConfig ? t.config.editConfiguration : t.config.newConfiguration}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={3}>
          {t.config.formDescription}
        </Typography>

        <Box component="form" onSubmit={handleSubmit} display="flex" flexDirection="column" gap={2}>
          <TextField
            label={t.config.name}
            value={formData.name}
            onChange={handleChange("name")}
            placeholder={t.config.namePlaceholder}
            required
            fullWidth
          />

          <TextField
            label={t.config.accessKeyId}
            value={formData.accessKeyId}
            onChange={handleChange("accessKeyId")}
            placeholder={t.config.accessKeyIdPlaceholder}
            required
            fullWidth
          />

          <TextField
            label={t.config.secretAccessKey}
            type="password"
            value={formData.secretAccessKey}
            onChange={handleChange("secretAccessKey")}
            placeholder={t.config.secretAccessKeyPlaceholder}
            required
            fullWidth
          />

          <TextField
            label={t.config.region}
            value={formData.region}
            onChange={handleChange("region")}
            placeholder={t.config.regionPlaceholder}
            required
            fullWidth
          />

          <TextField
            label={t.config.endpoint}
            value={formData.endpoint}
            onChange={handleChange("endpoint")}
            placeholder={t.config.endpointPlaceholder}
            fullWidth
            helperText={t.config.endpointHelper}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          {t.common.cancel}
        </Button>
        <Button onClick={handleSubmit} variant="contained">
          {initialConfig ? t.config.update : t.common.save}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
