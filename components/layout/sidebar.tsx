"use client"

import { useState, useEffect } from "react"
import {
  Folder,
  Plus,
  Home,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Database,
  SlidersHorizontal,
  MoreVertical,
  Edit,
  Trash2,
} from "lucide-react"
import {
  Drawer,
  Box,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Button,
  Collapse,
  CircularProgress,
  Divider,
  Menu,
  MenuItem,
} from "@mui/material"
import { apiClient } from "@/lib/api-client"
import type { S3Config, S3Bucket } from "@/types/s3"
import { useI18n } from "@/lib/i18n/context"

interface SidebarProps {
  currentView: string
  currentConfig?: S3Config | null
  currentBucket?: string | null
  configs: S3Config[]
  onViewChange: (view: string) => void
  onConfigSelect: (config: S3Config) => void
  onBucketSelect: (config: S3Config, bucket: string) => void
  onAddConfig: () => void
  onEditConfig?: (config: S3Config) => void
  onDeleteConfig?: (configId: number) => void
}

const DRAWER_WIDTH = 256
const COLLAPSED_WIDTH = 64

export function Sidebar({
  currentView,
  currentConfig,
  currentBucket,
  configs,
  onViewChange,
  onConfigSelect: _onConfigSelect,
  onBucketSelect,
  onAddConfig,
  onEditConfig,
  onDeleteConfig,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [expandedConfigs, setExpandedConfigs] = useState<{ [key: number]: boolean }>({})
  const [configBuckets, setConfigBuckets] = useState<{ [key: number]: S3Bucket[] }>({})
  const [loadingBuckets, setLoadingBuckets] = useState<{ [key: number]: boolean }>({})
  const [configMenuAnchor, setConfigMenuAnchor] = useState<{ element: HTMLElement; config: S3Config } | null>(null)

  const { t } = useI18n()

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "settings", label: "Ayarlar", icon: SlidersHorizontal },
  ]

  // Expand/collapse a config
  const toggleConfig = async (configId: number) => {
    if (expandedConfigs[configId]) {
      setExpandedConfigs((prev) => ({ ...prev, [configId]: false }))
    } else {
      setExpandedConfigs((prev) => ({ ...prev, [configId]: true }))

      if (!configBuckets[configId]) {
        const config = configs.find((c) => c.id === configId)
        if (config) {
          await loadBuckets(config)
        }
      }
    }
  }

  // Load buckets for a config
  const loadBuckets = async (config: S3Config) => {
    if (!config || !config.id) {
      console.warn("Sidebar.loadBuckets - Invalid config:", config)
      return
    }

    setLoadingBuckets((prev) => ({ ...prev, [config.id!]: true }))

    try {
      const buckets = await apiClient.getBuckets(config)
      setConfigBuckets((prev) => ({ ...prev, [config.id!]: buckets }))
    } catch (error) {
      console.error("Sidebar.loadBuckets - Failed to load buckets:", error)
      setConfigBuckets((prev) => ({ ...prev, [config.id!]: [] }))
    } finally {
      setLoadingBuckets((prev) => ({ ...prev, [config.id!]: false }))
    }
  }

  // Auto-expand current config
  useEffect(() => {
    if (currentConfig?.id && !expandedConfigs[currentConfig.id]) {
      toggleConfig(currentConfig.id)
    }
  }, [currentConfig])

  // Config menu handlers
  const handleConfigMenuOpen = (event: React.MouseEvent<HTMLElement>, config: S3Config) => {
    event.stopPropagation()
    setConfigMenuAnchor({ element: event.currentTarget, config })
  }

  const handleConfigMenuClose = () => {
    setConfigMenuAnchor(null)
  }

  const handleEditConfig = () => {
    if (configMenuAnchor && onEditConfig) {
      onEditConfig(configMenuAnchor.config)
    }
    handleConfigMenuClose()
  }

  const handleDeleteConfig = () => {
    if (configMenuAnchor?.config.id && onDeleteConfig) {
      if (confirm(`"${configMenuAnchor.config.name}" yapılandırmasını silmek istediğinize emin misiniz?`)) {
        onDeleteConfig(configMenuAnchor.config.id)
      }
    }
    handleConfigMenuClose()
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH,
          boxSizing: "border-box",
          bgcolor: "grey.900",
          color: "white",
          transition: "width 0.3s",
          overflowX: "hidden",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          pt: 6,
          px: 2,
          pb: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: 1,
          borderColor: "grey.700",
        }}
      >
        {!collapsed && (
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box
              component="img"
              src="/s3-logo.png"
              alt="Growly S3"
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1,
              }}
            />
            <Typography variant="h6" fontWeight="bold">
              Growly S3
            </Typography>
          </Box>
        )}
        {collapsed && (
          <Box
            component="img"
            src="/s3-logo.png"
            alt="Growly S3"
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              margin: "auto",
            }}
          />
        )}
        <IconButton onClick={() => setCollapsed(!collapsed)} sx={{ color: "grey.400" }}>
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </IconButton>
      </Box>

      {/* Navigation */}
      <Box sx={{ flexGrow: 1, overflowY: "auto", py: 1 }}>
        {/* Main menu items */}
        {!collapsed && (
          <Box px={2} mb={1}>
            <Typography variant="caption" sx={{ color: "grey.500", textTransform: "uppercase", fontWeight: 600 }}>
              {t("nav.mainMenu")}
            </Typography>
          </Box>
        )}

        <List>
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = currentView === item.id

            return (
              <ListItem key={item.id} disablePadding>
                <ListItemButton
                  selected={isActive}
                  onClick={() => onViewChange(item.id)}
                  sx={{
                    mx: 1,
                    borderRadius: 1,
                    color: isActive ? "white" : "grey.300",
                    bgcolor: isActive ? "primary.main" : "transparent",
                    "&:hover": {
                      bgcolor: isActive ? "primary.dark" : "grey.800",
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>
                    <Icon className="h-4 w-4" />
                  </ListItemIcon>
                  {!collapsed && <ListItemText primary={t(`nav.${item.id}`)} />}
                </ListItemButton>
              </ListItem>
            )
          })}
        </List>

        <Divider sx={{ my: 2, bgcolor: "grey.700" }} />

        {/* S3 Configurations */}
        {!collapsed && (
          <Box px={2} mb={1} display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="caption" sx={{ color: "grey.500", textTransform: "uppercase", fontWeight: 600 }}>
              {t("nav.configurations")}
            </Typography>
            <IconButton size="small" onClick={onAddConfig} sx={{ color: "grey.400" }}>
              <Plus className="h-4 w-4" />
            </IconButton>
          </Box>
        )}

        <List>
          {configs.map((config) => (
            <Box key={config.id}>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => config.id && toggleConfig(config.id)}
                  sx={{
                    mx: 1,
                    borderRadius: 1,
                    color: currentConfig?.id === config.id ? "primary.light" : "grey.300",
                  }}
                >
                  <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>
                    <Database className="h-4 w-4" />
                  </ListItemIcon>
                  {!collapsed && (
                    <>
                      <ListItemText primary={config.name} />
                      <IconButton
                        size="small"
                        onClick={(e) => handleConfigMenuOpen(e, config)}
                        sx={{ color: "inherit", mr: 0.5 }}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </IconButton>
                      {config.id && expandedConfigs[config.id] ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </>
                  )}
                </ListItemButton>
              </ListItem>

              {!collapsed && config.id && (
                <Collapse in={expandedConfigs[config.id]} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {loadingBuckets[config.id] && (
                      <Box display="flex" justifyContent="center" py={2}>
                        <CircularProgress size={20} sx={{ color: "grey.400" }} />
                      </Box>
                    )}

                    {!loadingBuckets[config.id] &&
                      configBuckets[config.id]?.map((bucket) => (
                        <ListItem key={bucket.Name} disablePadding>
                          <ListItemButton
                            sx={{
                              pl: 6,
                              mx: 1,
                              borderRadius: 1,
                              color: currentBucket === bucket.Name ? "white" : "grey.400",
                              bgcolor: currentBucket === bucket.Name ? "grey.800" : "transparent",
                            }}
                            onClick={() => onBucketSelect(config, bucket.Name)}
                          >
                            <ListItemIcon sx={{ color: "inherit", minWidth: 32 }}>
                              <Folder className="h-3 w-3" />
                            </ListItemIcon>
                            <ListItemText
                              primary={bucket.Name}
                              primaryTypographyProps={{ variant: "body2", noWrap: true }}
                            />
                          </ListItemButton>
                        </ListItem>
                      ))}

                    {!loadingBuckets[config.id] && configBuckets[config.id]?.length === 0 && (
                      <Box px={6} py={1}>
                        <Typography variant="caption" color="grey.500">
                          Bucket bulunamadı
                        </Typography>
                      </Box>
                    )}
                  </List>
                </Collapse>
              )}
            </Box>
          ))}
        </List>

        {!collapsed && configs.length === 0 && (
          <Box px={3} py={2}>
            <Typography variant="body2" color="grey.500" textAlign="center">
              Henüz yapılandırma yok
            </Typography>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<Plus className="h-4 w-4" />}
              onClick={onAddConfig}
              sx={{ mt: 2, color: "grey.300", borderColor: "grey.600" }}
            >
              Yapılandırma Ekle
            </Button>
          </Box>
        )}
      </Box>

      {/* Context Menu for Config Actions */}
      <Menu
        anchorEl={configMenuAnchor?.element}
        open={Boolean(configMenuAnchor)}
        onClose={handleConfigMenuClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <MenuItem onClick={handleEditConfig}>
          <ListItemIcon>
            <Edit className="h-4 w-4" />
          </ListItemIcon>
          <ListItemText>Düzenle</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDeleteConfig} sx={{ color: "error.main" }}>
          <ListItemIcon>
            <Trash2 className="h-4 w-4" color="currentColor" />
          </ListItemIcon>
          <ListItemText>Sil</ListItemText>
        </MenuItem>
      </Menu>
    </Drawer>
  )
}
