import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { apiClient } from "@/lib/api-client"
import { db } from "@/lib/database"
import { syncManager } from "@/lib/sync-manager"
import { useAppStore } from "@/lib/store"
import type { S3Config } from "@/types/s3"

// Query Keys
export const s3Keys = {
  all: ["s3"] as const,
  configs: () => [...s3Keys.all, "configs"] as const,
  buckets: (configId?: number) => [...s3Keys.all, "buckets", configId] as const,
  objects: (configId?: number, bucketName?: string) => [...s3Keys.all, "objects", configId, bucketName] as const,
}

// ==================== Configs ====================

export function useConfigs() {
  return useQuery({
    queryKey: s3Keys.configs(),
    queryFn: async () => {
      console.log("useConfigs: Loading configs from database")
      return await db.getConfigs()
    },
  })
}

export function useSaveConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      config,
      editingConfigId,
    }: {
      config: Omit<S3Config, "id" | "createdAt">
      editingConfigId?: number
    }) => {
      console.log("useSaveConfig: Saving config", config, editingConfigId)
      if (editingConfigId) {
        await db.updateConfig(editingConfigId, config)
        return { ...config, id: editingConfigId }
      } else {
        return await db.saveConfig(config)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: s3Keys.configs() })
    },
  })
}

export function useDeleteConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      console.log("useDeleteConfig: Deleting config", id)
      await db.deleteConfig(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: s3Keys.configs() })
      queryClient.invalidateQueries({ queryKey: s3Keys.buckets() })
    },
  })
}

// ==================== Buckets ====================

export function useBuckets(config: S3Config | null) {
  const queryClient = useQueryClient()
  const { setSyncStatus, cacheEnabled } = useAppStore()

  const query = useQuery({
    queryKey: s3Keys.buckets(config?.id),
    queryFn: async () => {
      if (!config || !config.id) {
        console.log("useBuckets: No config provided")
        return []
      }

      // If cache is disabled, fetch directly from S3
      if (!cacheEnabled) {
        console.log("useBuckets: Cache disabled, fetching from S3")
        return await apiClient.getBuckets(config)
      }

      console.log("useBuckets: Loading buckets from cache for config", config.name)
      // First, load from cache
      const cachedBuckets = await db.getBuckets(config.id)
      console.log("useBuckets: Loaded", cachedBuckets.length, "buckets from cache")

      return cachedBuckets
    },
    enabled: !!config,
    staleTime: 0, // Always consider data stale to trigger background sync
  })

  // Trigger background sync when config changes (only if cache is enabled)
  useEffect(() => {
    if (!config || !config.id || !cacheEnabled) {
      return
    }

    const performSync = async () => {
      try {
        console.log("useBuckets: Starting background sync for config", config.name)

        await syncManager.syncBucketsForConfig(config, (status, message) => {
          setSyncStatus({
            configId: config.id!,
            bucketName: null,
            prefix: null,
            status,
            message,
            lastSyncAt: status === "completed" ? new Date().toISOString() : undefined,
          })
        })

        // Invalidate query to refetch from updated cache
        queryClient.invalidateQueries({ queryKey: s3Keys.buckets(config.id) })
      } catch (error) {
        console.error("useBuckets: Background sync failed", error)
      }
    }

    performSync()
  }, [config?.id, cacheEnabled, queryClient, setSyncStatus])

  return query
}

export function useCreateBucket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ config, bucketName }: { config: S3Config; bucketName: string }) => {
      console.log("useCreateBucket: Creating bucket", bucketName, "for config", config.name)
      await apiClient.createBucket(config, bucketName)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: s3Keys.buckets(variables.config.id) })
    },
  })
}

export function useDeleteBucket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ config, bucketName }: { config: S3Config; bucketName: string }) => {
      console.log("useDeleteBucket: Deleting bucket", bucketName, "for config", config.name)
      await apiClient.deleteBucket(config, bucketName)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: s3Keys.buckets(variables.config.id) })
    },
  })
}

// ==================== Objects ====================

export function useObjects(config: S3Config | null, bucketName: string | null, prefix?: string) {
  const queryClient = useQueryClient()
  const { setSyncStatus, cacheEnabled } = useAppStore()

  const query = useQuery({
    queryKey: s3Keys.objects(config?.id, bucketName || undefined),
    queryFn: async () => {
      if (!config || !config.id || !bucketName) {
        console.log("useObjects: Missing config or bucket name", { config, bucketName })
        return []
      }

      // If cache is disabled, fetch directly from S3
      if (!cacheEnabled) {
        console.log("useObjects: Cache disabled, fetching from S3")
        return await apiClient.getObjects(config, bucketName)
      }

      console.log("useObjects: Loading objects from cache for bucket", bucketName)
      // First, load from cache
      const cachedObjects = await db.getObjects(config.id, bucketName, prefix)
      console.log("useObjects: Loaded", cachedObjects.length, "objects from cache")

      return cachedObjects
    },
    enabled: !!config && !!bucketName,
    staleTime: 0, // Always consider data stale to trigger background sync
  })

  // Trigger background sync when bucket changes (only if cache is enabled)
  useEffect(() => {
    if (!config || !config.id || !bucketName || !cacheEnabled) {
      return
    }

    const performSync = async () => {
      try {
        console.log("useObjects: Starting background sync for bucket", bucketName)

        await syncManager.syncObjectsForBucket(config, bucketName, prefix, (status, message) => {
          setSyncStatus({
            configId: config.id!,
            bucketName,
            prefix: prefix || null,
            status,
            message,
            lastSyncAt: status === "completed" ? new Date().toISOString() : undefined,
          })
        })

        // Invalidate query to refetch from updated cache
        queryClient.invalidateQueries({ queryKey: s3Keys.objects(config.id, bucketName) })
      } catch (error) {
        console.error("useObjects: Background sync failed", error)
      }
    }

    performSync()
  }, [config?.id, bucketName, prefix, cacheEnabled, queryClient, setSyncStatus])

  return query
}

export function useUploadFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ config, bucketName, file }: { config: S3Config; bucketName: string; file: File }) => {
      console.log("useUploadFile: Uploading file", file.name, "to bucket", bucketName)
      await apiClient.uploadFile(config, bucketName, file)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: s3Keys.objects(variables.config.id, variables.bucketName),
      })
    },
  })
}

export function useDeleteObject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      config,
      bucketName,
      objectKey,
    }: {
      config: S3Config
      bucketName: string
      objectKey: string
    }) => {
      console.log("useDeleteObject: Deleting object", objectKey, "from bucket", bucketName)
      await apiClient.deleteObject(config, bucketName, objectKey)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: s3Keys.objects(variables.config.id, variables.bucketName),
      })
    },
  })
}

// ==================== Connection Test ====================

export function useTestConnection(config: S3Config | null) {
  return useQuery({
    queryKey: [...s3Keys.all, "test-connection", config?.id],
    queryFn: async () => {
      if (!config) {
        return false
      }
      console.log("useTestConnection: Testing connection for config", config.name)
      return await apiClient.testConnection(config)
    },
    enabled: !!config,
    staleTime: 1000 * 60, // 1 minute
  })
}
