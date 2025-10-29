"use client"

import { useState } from "react"
import { Folder, MoreVertical, Trash2, Download, Share, Calendar, HardDrive } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Button,
  Box,
  Typography,
  Divider,
} from "@mui/material"
import { formatDate } from "@/lib/file-utils"
import type { S3Bucket } from "@/types/s3"

interface BucketCardProps {
  bucket: S3Bucket
  isDemoMode: boolean
  onSelect: () => void
  onDelete: () => void
}

export function BucketCard({ bucket, isDemoMode, onSelect, onDelete }: BucketCardProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation()
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    handleMenuClose()
    onDelete()
  }

  return (
    <Card
      sx={{
        cursor: "pointer",
        transition: "all 0.2s",
        "&:hover": {
          boxShadow: 6,
          transform: "scale(1.02)",
        },
      }}
      onClick={onSelect}
    >
      <CardHeader
        avatar={
          <Box
            sx={{
              p: 1,
              bgcolor: "primary.light",
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Folder className="h-5 w-5" style={{ color: "currentColor" }} />
          </Box>
        }
        action={
          <IconButton onClick={handleMenuOpen} size="small">
            <MoreVertical className="h-4 w-4" />
          </IconButton>
        }
        title={
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="h6" component="span">
              {bucket.Name}
            </Typography>
            {isDemoMode && <Chip label="DEMO" size="small" color="secondary" />}
          </Box>
        }
      />
      <CardContent>
        <Box display="flex" flexDirection="column" gap={1.5}>
          <Box display="flex" alignItems="center" gap={1}>
            <Calendar className="h-4 w-4" />
            <Typography variant="body2" color="text.secondary">
              Oluşturulma: {formatDate(bucket.CreationDate)}
            </Typography>
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            <HardDrive className="h-4 w-4" />
            <Typography variant="body2" color="text.secondary">
              Boyut: Hesaplanıyor...
            </Typography>
          </Box>

          <Button
            variant="outlined"
            fullWidth
            sx={{ mt: 2 }}
            onClick={(e) => {
              e.stopPropagation()
              onSelect()
            }}
          >
            Bucket&apos;ı Aç
          </Button>
        </Box>
      </CardContent>

      <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => {
            handleMenuClose()
            onSelect()
          }}
        >
          <ListItemIcon>
            <Folder className="h-4 w-4" />
          </ListItemIcon>
          <ListItemText>Bucket&apos;ı Aç</ListItemText>
        </MenuItem>
        <MenuItem disabled={isDemoMode}>
          <ListItemIcon>
            <Share className="h-4 w-4" />
          </ListItemIcon>
          <ListItemText>Paylaş</ListItemText>
        </MenuItem>
        <MenuItem disabled={isDemoMode}>
          <ListItemIcon>
            <Download className="h-4 w-4" />
          </ListItemIcon>
          <ListItemText>Export</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem disabled={isDemoMode} onClick={handleDelete} sx={{ color: "error.main" }}>
          <ListItemIcon>
            <Trash2 className="h-4 w-4" style={{ color: "inherit" }} />
          </ListItemIcon>
          <ListItemText>Sil</ListItemText>
        </MenuItem>
      </Menu>
    </Card>
  )
}
