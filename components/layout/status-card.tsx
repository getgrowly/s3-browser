"use client"

import { CheckCircle, AlertTriangle, Info, WifiOff } from "lucide-react"
import { Card, CardContent, Box, Typography, Chip, Grid } from "@mui/material"

interface StatusCardProps {
  status: "connected" | "demo" | "error" | "connecting"
  config: {
    name: string
    endpoint: string
    region: string
    accessKeyId: string
  }
}

export function StatusCard({ status, config }: StatusCardProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "connected":
        return {
          icon: CheckCircle,
          color: "success.main",
          bgColor: "success.light",
          chipColor: "success" as const,
          badge: "Bağlı",
          message: "S3 API'sine başarıyla bağlandı",
        }
      case "demo":
        return {
          icon: Info,
          color: "info.main",
          bgColor: "info.light",
          chipColor: "info" as const,
          badge: "Demo",
          message: "Demo modunda çalışıyor",
        }
      case "error":
        return {
          icon: WifiOff,
          color: "error.main",
          bgColor: "error.light",
          chipColor: "error" as const,
          badge: "Hata",
          message: "Bağlantı başarısız",
        }
      default:
        return {
          icon: AlertTriangle,
          color: "warning.main",
          bgColor: "warning.light",
          chipColor: "warning" as const,
          badge: "Bağlanıyor",
          message: "S3 API'sine bağlanıyor...",
        }
    }
  }

  const statusConfig = getStatusConfig()
  const Icon = statusConfig.icon

  return (
    <Card
      sx={{
        borderLeft: 4,
        borderColor: statusConfig.color,
        bgcolor: statusConfig.bgColor,
        backgroundOpacity: 0.1,
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="start" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Icon className="h-5 w-5" style={{ color: statusConfig.color }} />
            <Typography variant="h6" fontWeight="bold">
              {config.name}
            </Typography>
          </Box>
          <Chip label={statusConfig.badge} color={statusConfig.chipColor} size="small" />
        </Box>

        <Typography variant="body2" color="text.secondary" mb={2}>
          {statusConfig.message}
        </Typography>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="caption" color="text.secondary">
              Endpoint:
            </Typography>
            <Typography variant="body2" fontFamily="monospace" noWrap>
              {config.endpoint}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="caption" color="text.secondary">
              Region:
            </Typography>
            <Typography variant="body2" fontFamily="monospace">
              {config.region}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="caption" color="text.secondary">
              Access Key:
            </Typography>
            <Typography variant="body2" fontFamily="monospace">
              {config.accessKeyId?.substring(0, 8)}...
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}
