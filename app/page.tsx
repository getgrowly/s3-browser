"use client"

import { useEffect, useState } from "react"
import { Box, Container, ThemeProvider as MuiThemeProvider } from "@mui/material"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Dashboard } from "@/components/dashboard"
import { BucketList } from "@/components/bucket-list"
import { FileListVirtualized } from "@/components/file-list-virtualized"
import { S3ConfigForm } from "@/components/s3-config-form"
import { CreateBucketForm } from "@/components/create-bucket-form"
import { FilePreview } from "@/components/file-preview"
import { Settings } from "@/components/settings"
import { LoginScreen } from "@/components/login-screen"
import { useAppStore } from "@/lib/store"
import { useConfigs, useSaveConfig, useDeleteConfig, useBuckets } from "@/lib/hooks/use-s3-queries"
import { useI18n } from "@/lib/i18n/context"
import { lightTheme, darkTheme } from "@/lib/theme"
import { useTheme } from "next-themes"
import { useToast } from "@/lib/toast-context"
import { hasPassword } from "@/lib/password-utils"

export default function S3Browser() {
  const { t } = useI18n()
  const { theme } = useTheme()
  const { showSuccess, showError } = useToast()
  const [isLocked, setIsLocked] = useState(true)
  const [passwordRequired, setPasswordRequired] = useState(false)
  const [checkingPassword, setCheckingPassword] = useState(true)

  // Zustand store
  const {
    view,
    setView,
    configs,
    setConfigs,
    selectedConfig,
    selectedBucket,
    buckets,
    setBuckets,
    showConfigForm,
    setShowConfigForm,
    showCreateBucketForm,
    setShowCreateBucketForm,
    editingConfig,
    setEditingConfig,
    previewFile,
    setPreviewFile,
    navigateToBuckets,
    navigateToFiles,
    navigateBackFromFiles,
    navigateBackFromBuckets,
  } = useAppStore()

  // React Query
  const { data: configsData } = useConfigs()
  const { data: bucketsData } = useBuckets(selectedConfig)
  const saveConfigMutation = useSaveConfig()
  const deleteConfigMutation = useDeleteConfig()

  // Check if password is required on mount
  useEffect(() => {
    async function checkPasswordProtection() {
      console.log("S3Browser - Checking password protection")
      try {
        const passwordSet = await hasPassword()
        console.log("S3Browser - Password required:", passwordSet)
        setPasswordRequired(passwordSet)
        setIsLocked(passwordSet)
      } catch (error) {
        console.error("S3Browser - Error checking password:", error)
        setPasswordRequired(false)
        setIsLocked(false)
      } finally {
        setCheckingPassword(false)
      }
    }
    checkPasswordProtection()
  }, [])

  // Sync configs from React Query to Zustand
  useEffect(() => {
    if (configsData) {
      console.log("Syncing configs to store:", configsData)
      setConfigs(configsData)
    }
  }, [configsData, setConfigs])

  // Sync buckets from React Query to Zustand
  useEffect(() => {
    if (bucketsData) {
      console.log("Syncing buckets to store:", bucketsData)
      setBuckets(bucketsData)
    }
  }, [bucketsData, setBuckets])

  // Handlers
  const handleSaveConfig = async (configData: Omit<import("@/types/s3").S3Config, "id" | "createdAt">) => {
    console.log("handleSaveConfig called", configData, editingConfig)
    try {
      await saveConfigMutation.mutateAsync({
        config: configData,
        editingConfigId: editingConfig?.id,
      })
      setEditingConfig(null)
      setShowConfigForm(false)
      showSuccess(
        editingConfig
          ? `Yapılandırma "${configData.name}" başarıyla güncellendi`
          : `Yapılandırma "${configData.name}" başarıyla oluşturuldu`
      )
    } catch (err: any) {
      console.error("handleSaveConfig - Error:", err)
      showError("Yapılandırma kaydedilirken bir hata oluştu")
    }
  }

  const handleDeleteConfig = async (id: number) => {
    console.log("handleDeleteConfig called", id)
    const configToDelete = configs.find((c) => c.id === id)
    try {
      await deleteConfigMutation.mutateAsync(id)
      showSuccess(`Yapılandırma "${configToDelete?.name}" başarıyla silindi`)
    } catch (err: any) {
      console.error("handleDeleteConfig - Error:", err)
      showError("Yapılandırma silinirken bir hata oluştu")
    }
  }

  const handleConfigSelect = (config: import("@/types/s3").S3Config) => {
    console.log("handleConfigSelect called", config)
    navigateToBuckets(config)
  }

  const handleBucketSelect = (config: import("@/types/s3").S3Config, bucketName: string) => {
    console.log("handleBucketSelect called", config.name, bucketName)
    navigateToFiles(config, bucketName)
  }

  const handleFilePreview = (bucketName: string, key: string) => {
    console.log("handleFilePreview called", bucketName, key)
    setPreviewFile({ bucket: bucketName, key })
  }

  const muiTheme = theme === "dark" ? darkTheme : lightTheme

  // Show login screen if password is required and app is locked
  if (checkingPassword) {
    // You could add a loading spinner here if needed
    return null
  }

  if (passwordRequired && isLocked) {
    return (
      <MuiThemeProvider theme={muiTheme}>
        <LoginScreen onUnlock={() => setIsLocked(false)} />
      </MuiThemeProvider>
    )
  }

  return (
    <MuiThemeProvider theme={muiTheme}>
      <Box display="flex" height="100vh" bgcolor="background.default">
        <Sidebar
          currentView={view}
          currentConfig={selectedConfig}
          currentBucket={selectedBucket}
          configs={configs}
          onViewChange={(newView) => setView(newView as any)}
          onConfigSelect={handleConfigSelect}
          onBucketSelect={handleBucketSelect}
          onAddConfig={() => setShowConfigForm(true)}
          onEditConfig={(config) => {
            setEditingConfig(config)
            setShowConfigForm(true)
          }}
          onDeleteConfig={handleDeleteConfig}
        />

        <Box flex={1} display="flex" flexDirection="column" overflow="hidden">
          <Header
            title={
              view === "dashboard"
                ? t("dashboard.title")
                : view === "buckets"
                  ? t("bucket.title")
                  : view === "files"
                    ? selectedBucket || t("file.title")
                    : t("nav.settings")
            }
            subtitle={
              view === "buckets" && selectedConfig
                ? selectedConfig.name
                : view === "files" && selectedConfig
                  ? `${selectedConfig.name} / ${selectedBucket}`
                  : undefined
            }
          />

          <Box flex={1} overflow="auto" p={3} pb={7}>
            <Container maxWidth="xl">
              {view === "dashboard" && (
                <Dashboard configs={configs} buckets={buckets} selectedConfig={selectedConfig} />
              )}

              {view === "buckets" && selectedConfig && (
                <BucketList
                  config={selectedConfig}
                  onBucketSelect={(bucketName) => handleBucketSelect(selectedConfig, bucketName)}
                  onBack={navigateBackFromBuckets}
                />
              )}

              {view === "files" && selectedConfig && selectedBucket && (
                <FileListVirtualized
                  config={selectedConfig}
                  bucketName={selectedBucket}
                  onBack={navigateBackFromFiles}
                  onFilePreview={handleFilePreview}
                />
              )}

              {view === "settings" && <Settings />}
            </Container>
          </Box>

          {/* Footer with sync status - inside main content area */}
          <Footer />
        </Box>

        {/* Modals */}
        <S3ConfigForm
          open={showConfigForm}
          onClose={() => {
            setShowConfigForm(false)
            setEditingConfig(null)
          }}
          onSave={handleSaveConfig}
          initialConfig={editingConfig || undefined}
        />

        <CreateBucketForm
          open={showCreateBucketForm}
          onClose={() => setShowCreateBucketForm(false)}
          onSave={async (_bucketName) => {
            // Handle in BucketList component via React Query
            setShowCreateBucketForm(false)
          }}
        />

        {previewFile && selectedConfig && (
          <FilePreview
            open={!!previewFile}
            config={selectedConfig}
            bucketName={previewFile.bucket}
            objectKey={previewFile.key}
            onClose={() => setPreviewFile(null)}
          />
        )}
      </Box>
    </MuiThemeProvider>
  )
}
