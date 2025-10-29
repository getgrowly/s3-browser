import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"
import type { S3Config, S3Bucket } from "@/types/s3"

type View = "dashboard" | "configs" | "buckets" | "files" | "settings"

interface AppState {
  // View state
  view: View
  setView: (view: View) => void

  // Configuration state
  configs: S3Config[]
  selectedConfig: S3Config | null
  setConfigs: (configs: S3Config[]) => void
  setSelectedConfig: (config: S3Config | null) => void
  addConfig: (config: S3Config) => void
  updateConfig: (id: number, config: Partial<S3Config>) => void
  deleteConfig: (id: number) => void

  // Bucket state
  buckets: S3Bucket[]
  selectedBucket: string | null
  setBuckets: (buckets: S3Bucket[]) => void
  setSelectedBucket: (bucket: string | null) => void

  // UI state
  showConfigForm: boolean
  showCreateBucketForm: boolean
  editingConfig: S3Config | null
  previewFile: { bucket: string; key: string } | null
  setShowConfigForm: (show: boolean) => void
  setShowCreateBucketForm: (show: boolean) => void
  setEditingConfig: (config: S3Config | null) => void
  setPreviewFile: (file: { bucket: string; key: string } | null) => void

  // Connection state
  connectionStatus: "connecting" | "connected" | "demo" | "error"
  setConnectionStatus: (status: "connecting" | "connected" | "demo" | "error") => void

  // Sync state
  syncStatus: {
    configId: number | null
    bucketName: string | null
    prefix: string | null
    status: "idle" | "syncing" | "completed" | "error"
    message: string
    lastSyncAt: string | null
  }
  setSyncStatus: (status: {
    configId?: number | null
    bucketName?: string | null
    prefix?: string | null
    status?: "idle" | "syncing" | "completed" | "error"
    message?: string
    lastSyncAt?: string | null
  }) => void
  resetSyncStatus: () => void

  // Cache settings
  cacheEnabled: boolean
  setCacheEnabled: (enabled: boolean) => void

  // Navigation helpers
  navigateToBuckets: (config: S3Config) => void
  navigateToFiles: (config: S3Config, bucket: string) => void
  navigateBackFromFiles: () => void
  navigateBackFromBuckets: () => void

  // Reset state
  reset: () => void
}

const initialState = {
  view: "dashboard" as View,
  configs: [],
  selectedConfig: null,
  buckets: [],
  selectedBucket: null,
  showConfigForm: false,
  showCreateBucketForm: false,
  editingConfig: null,
  previewFile: null,
  connectionStatus: "connecting" as const,
  syncStatus: {
    configId: null,
    bucketName: null,
    prefix: null,
    status: "idle" as const,
    message: "",
    lastSyncAt: null,
  },
  cacheEnabled: true, // Cache enabled by default
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        // View actions
        setView: (view) => set({ view }),

        // Configuration actions
        setConfigs: (configs) => set({ configs }),
        setSelectedConfig: (config) => {
          console.log("Store: setSelectedConfig called with:", config)
          set({ selectedConfig: config })
        },
        addConfig: (config) =>
          set((state) => ({
            configs: [...state.configs, config],
          })),
        updateConfig: (id, updates) =>
          set((state) => ({
            configs: state.configs.map((c) => (c.id === id ? { ...c, ...updates } : c)),
          })),
        deleteConfig: (id) =>
          set((state) => ({
            configs: state.configs.filter((c) => c.id !== id),
            selectedConfig: state.selectedConfig?.id === id ? null : state.selectedConfig,
          })),

        // Bucket actions
        setBuckets: (buckets) => set({ buckets }),
        setSelectedBucket: (bucket) => {
          console.log("Store: setSelectedBucket called with:", bucket)
          set({ selectedBucket: bucket })
        },

        // UI actions
        setShowConfigForm: (show) => set({ showConfigForm: show }),
        setShowCreateBucketForm: (show) => set({ showCreateBucketForm: show }),
        setEditingConfig: (config) => set({ editingConfig: config }),
        setPreviewFile: (file) => set({ previewFile: file }),

        // Connection actions
        setConnectionStatus: (status) => set({ connectionStatus: status }),

        // Sync actions
        setSyncStatus: (status) =>
          set((state) => ({
            syncStatus: {
              ...state.syncStatus,
              ...status,
            },
          })),
        resetSyncStatus: () =>
          set({
            syncStatus: initialState.syncStatus,
          }),

        // Cache settings
        setCacheEnabled: (enabled) => set({ cacheEnabled: enabled }),

        // Navigation helpers
        navigateToBuckets: (config) => {
          console.log("Store: navigateToBuckets called with:", config)
          set({
            selectedConfig: config,
            selectedBucket: null,
            view: "buckets",
          })
        },

        navigateToFiles: (config, bucket) => {
          console.log("Store: navigateToFiles called with:", config.name, bucket)
          set({
            selectedConfig: config,
            selectedBucket: bucket,
            view: "files",
          })
        },

        navigateBackFromFiles: () => {
          console.log("Store: navigateBackFromFiles called")
          set({
            selectedBucket: null,
            view: "buckets",
          })
        },

        navigateBackFromBuckets: () => {
          console.log("Store: navigateBackFromBuckets called")
          set({
            view: "dashboard",
          })
        },

        // Reset state
        reset: () => set(initialState),
      }),
      {
        name: "s3-browser-storage",
        partialize: (state) => ({
          // Only persist these fields
          selectedConfig: state.selectedConfig,
          selectedBucket: state.selectedBucket,
          cacheEnabled: state.cacheEnabled,
        }),
      }
    )
  )
)
