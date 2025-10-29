"use client"

import { Alert, AlertTitle, Typography, Button, Box, List, ListItem } from "@mui/material"
import { Warning, OpenInNew } from "@mui/icons-material"

interface CorsErrorAlertProps {
  endpoint: string
  onDismiss?: () => void
}

export function CorsErrorAlert({ endpoint, onDismiss }: CorsErrorAlertProps) {
  return (
    <Alert severity="error" icon={<Warning />}>
      <AlertTitle sx={{ fontWeight: "bold" }}>CORS Hatası: Tarayıcıdan Erişim Engellendi</AlertTitle>

      <Typography variant="body2" mb={2}>
        S3 endpoint&apos;i ({endpoint}) tarayıcıdan direkt erişime izin vermiyor. Bu normal bir güvenlik önlemidir.
      </Typography>

      <Box sx={{ bgcolor: "error.light", p: 2, borderRadius: 1, mb: 2, opacity: 0.9 }}>
        <Typography variant="subtitle2" fontWeight="bold" mb={1}>
          Çözüm önerileri:
        </Typography>
        <List dense sx={{ pl: 2 }}>
          <ListItem sx={{ display: "list-item", p: 0 }}>
            <Typography variant="body2">
              <strong>S3 CORS ayarlarını yapılandırın</strong>
              <br />
              <Typography variant="caption">
                Bucket ayarlarından CORS politikası ekleyin ve tarayıcı erişimine izin verin.
              </Typography>
            </Typography>
          </ListItem>
          <ListItem sx={{ display: "list-item", p: 0, mt: 1 }}>
            <Typography variant="body2">
              <strong>Sunucu taraflı proxy kullanın</strong>
              <br />
              <Typography variant="caption">
                Kendi sunucunuzda bir proxy oluşturup S3&apos;e oradan bağlanın (önerilir).
              </Typography>
            </Typography>
          </ListItem>
          <ListItem sx={{ display: "list-item", p: 0, mt: 1 }}>
            <Typography variant="body2">
              <strong>S3 SDK kullanın</strong>
              <br />
              <Typography variant="caption">AWS SDK&apos;yı sunucu tarafında kullanarak bağlanın.</Typography>
            </Typography>
          </ListItem>
        </List>
      </Box>

      <Box display="flex" gap={1}>
        <Button
          variant="outlined"
          size="small"
          color="inherit"
          startIcon={<OpenInNew />}
          onClick={() => window.open("https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html", "_blank")}
        >
          CORS Dokümantasyonu
        </Button>
        {onDismiss && (
          <Button variant="text" size="small" color="inherit" onClick={onDismiss}>
            Kapat
          </Button>
        )}
      </Box>
    </Alert>
  )
}
