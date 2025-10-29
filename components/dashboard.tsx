"use client"

import { Box, Typography, Paper, Card, CardContent, Alert, Grid } from "@mui/material"
import { Cloud, Folder, Database } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"
import type { S3Config, S3Bucket } from "@/types/s3"

interface DashboardProps {
  configs: S3Config[]
  buckets: S3Bucket[]
  selectedConfig: S3Config | null
}

export function Dashboard({ configs, buckets, selectedConfig }: DashboardProps) {
  const { t } = useI18n()

  const stats = [
    {
      label: t("dashboard.configurations"),
      value: configs.length,
      icon: Database,
      color: "#3b82f6", // blue
    },
    {
      label: t("dashboard.buckets"),
      value: buckets.length,
      icon: Folder,
      color: "#10b981", // green
    },
    {
      label: t("dashboard.activeConfig"),
      value: selectedConfig ? "1" : "0",
      icon: Cloud,
      color: "#8b5cf6", // purple
    },
  ]

  return (
    <Box>
      {/* Welcome Section */}
      <Box mb={4}>
        <Typography variant="h3" fontWeight="bold" gutterBottom>
          {t("dashboard.welcome")}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t("dashboard.description")}
        </Typography>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={3} mb={4}>
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
              <Card
                sx={{
                  height: "100%",
                  background: `linear-gradient(135deg, ${stat.color}15 0%, ${stat.color}05 100%)`,
                  border: 1,
                  borderColor: `${stat.color}30`,
                }}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="body2" color="text.secondary" mb={1}>
                        {stat.label}
                      </Typography>
                      <Typography variant="h3" fontWeight="bold">
                        {stat.value}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: `${stat.color}20`,
                      }}
                    >
                      <Icon style={{ color: stat.color, width: 32, height: 32 }} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )
        })}
      </Grid>

      {/* Getting Started */}
      {configs.length === 0 && (
        <Alert severity="info" sx={{ mb: 4 }}>
          <Typography variant="subtitle1" fontWeight="bold" mb={1}>
            {t("dashboard.gettingStarted")}
          </Typography>
          <Typography variant="body2">{t("dashboard.gettingStartedDescription")}</Typography>
        </Alert>
      )}

      {/* Current Configuration Info */}
      {selectedConfig && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Database style={{ color: "#3b82f6" }} />
            <Typography variant="h6" fontWeight="bold">
              {t("dashboard.currentConfiguration")}
            </Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">
                {t("config.name")}
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {selectedConfig.name}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">
                {t("config.region")}
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {selectedConfig.region}
              </Typography>
            </Grid>
            {selectedConfig.endpoint && (
              <Grid size={{ xs: 12 }}>
                <Typography variant="body2" color="text.secondary">
                  {t("config.endpoint")}
                </Typography>
                <Typography variant="body1" fontWeight="medium" sx={{ wordBreak: "break-all" }}>
                  {selectedConfig.endpoint}
                </Typography>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}

      {/* Quick Actions */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>
          {t("dashboard.quickActions")}
        </Typography>
        <Box display="flex" flexDirection="column" gap={1}>
          <Typography variant="body2" color="text.secondary">
            • {t("dashboard.selectConfig")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • {t("dashboard.browseBuckets")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • {t("dashboard.uploadFiles")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • {t("dashboard.manageObjects")}
          </Typography>
        </Box>
      </Paper>
    </Box>
  )
}
