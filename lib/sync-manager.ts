import type { S3Config, SyncStatus } from "@/types/s3"
import { S3Client } from "./s3-client"
import { db } from "./database"

export type SyncProgressCallback = (status: SyncStatus, message: string, progress?: number) => void

export class SyncManager {
  private activeSyncs: Map<string, boolean> = new Map()

  /**
   * Sync all buckets for a configuration
   */
  async syncBucketsForConfig(config: S3Config, onProgress?: SyncProgressCallback): Promise<void> {
    if (!config.id) {
      throw new Error("Config must have an ID")
    }

    const syncKey = `config-${config.id}`

    // Check if sync is already in progress
    if (this.activeSyncs.get(syncKey)) {
      console.log("Sync already in progress for config:", config.id)
      return
    }

    this.activeSyncs.set(syncKey, true)

    try {
      console.log("SyncManager: Starting bucket sync for config:", config.name)

      // Update sync metadata - syncing
      await db.updateSyncMetadata(config.id, "syncing")
      onProgress?.("syncing", `Fetching buckets for ${config.name}...`, 0)

      // Fetch buckets from S3
      const s3Client = new S3Client(config)
      const buckets = await s3Client.listBuckets()

      console.log(`SyncManager: Fetched ${buckets.length} buckets from S3`)

      // Clear old cache and save new buckets
      await db.clearBucketsForConfig(config.id)
      await db.saveBucketsBatch(config.id, buckets)

      console.log("SyncManager: Saved buckets to cache")

      // Update sync metadata - completed
      await db.updateSyncMetadata(config.id, "completed")
      onProgress?.("completed", `Synced ${buckets.length} buckets`, 100)

      console.log("SyncManager: Bucket sync completed for config:", config.name)
    } catch (error) {
      console.error("SyncManager: Bucket sync failed:", error)

      // Update sync metadata - error
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      await db.updateSyncMetadata(config.id, "error", undefined, undefined, errorMessage)
      onProgress?.("error", `Sync failed: ${errorMessage}`)

      throw error
    } finally {
      this.activeSyncs.delete(syncKey)
    }
  }

  /**
   * Sync objects for a specific bucket
   */
  async syncObjectsForBucket(
    config: S3Config,
    bucketName: string,
    prefix?: string,
    onProgress?: SyncProgressCallback
  ): Promise<void> {
    if (!config.id) {
      throw new Error("Config must have an ID")
    }

    const syncKey = `config-${config.id}-bucket-${bucketName}-prefix-${prefix || "root"}`

    // Check if sync is already in progress
    if (this.activeSyncs.get(syncKey)) {
      console.log("Sync already in progress for bucket:", bucketName)
      return
    }

    this.activeSyncs.set(syncKey, true)

    try {
      console.log("SyncManager: Starting object sync for bucket:", bucketName, "prefix:", prefix)

      // Update sync metadata - syncing
      await db.updateSyncMetadata(config.id, "syncing", bucketName, prefix)
      onProgress?.("syncing", `Fetching objects from ${bucketName}...`, 0)

      // Fetch objects from S3
      const s3Client = new S3Client(config)
      const objects = await s3Client.listObjects(bucketName, prefix)

      console.log(`SyncManager: Fetched ${objects.length} objects from S3`)

      // Clear old cache for this bucket/prefix and save new objects
      await db.clearObjectsForBucket(config.id, bucketName, prefix)
      if (objects.length > 0) {
        await db.saveObjectsBatch(config.id, bucketName, objects, prefix)
      }

      console.log("SyncManager: Saved objects to cache")

      // Update sync metadata - completed
      await db.updateSyncMetadata(config.id, "completed", bucketName, prefix)
      onProgress?.("completed", `Synced ${objects.length} objects`, 100)

      console.log("SyncManager: Object sync completed for bucket:", bucketName)
    } catch (error) {
      console.error("SyncManager: Object sync failed:", error)

      // Update sync metadata - error
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      await db.updateSyncMetadata(config.id, "error", bucketName, prefix, errorMessage)
      onProgress?.("error", `Sync failed: ${errorMessage}`)

      throw error
    } finally {
      this.activeSyncs.delete(syncKey)
    }
  }

  /**
   * Check if a sync is in progress
   */
  isSyncInProgress(configId: number, bucketName?: string, prefix?: string): boolean {
    if (bucketName) {
      const syncKey = `config-${configId}-bucket-${bucketName}-prefix-${prefix || "root"}`
      return this.activeSyncs.get(syncKey) || false
    } else {
      const syncKey = `config-${configId}`
      return this.activeSyncs.get(syncKey) || false
    }
  }

  /**
   * Get sync status for a specific scope
   */
  async getSyncStatus(configId: number, bucketName?: string, prefix?: string): Promise<SyncStatus> {
    const metadata = await db.getSyncMetadata(configId, bucketName, prefix)
    return metadata?.syncStatus || "idle"
  }

  /**
   * Get last sync time
   */
  async getLastSyncTime(configId: number, bucketName?: string, prefix?: string): Promise<Date | null> {
    const metadata = await db.getSyncMetadata(configId, bucketName, prefix)
    return metadata?.lastSyncAt ? new Date(metadata.lastSyncAt) : null
  }

  /**
   * Force refresh - clears cache and re-syncs
   */
  async forceRefreshBuckets(config: S3Config, onProgress?: SyncProgressCallback): Promise<void> {
    if (!config.id) {
      throw new Error("Config must have an ID")
    }

    console.log("SyncManager: Force refresh buckets for config:", config.name)
    await db.clearBucketsForConfig(config.id)
    await this.syncBucketsForConfig(config, onProgress)
  }

  /**
   * Force refresh objects
   */
  async forceRefreshObjects(
    config: S3Config,
    bucketName: string,
    prefix?: string,
    onProgress?: SyncProgressCallback
  ): Promise<void> {
    if (!config.id) {
      throw new Error("Config must have an ID")
    }

    console.log("SyncManager: Force refresh objects for bucket:", bucketName)
    await db.clearObjectsForBucket(config.id, bucketName, prefix)
    await this.syncObjectsForBucket(config, bucketName, prefix, onProgress)
  }
}

// Export singleton instance
export const syncManager = new SyncManager()

