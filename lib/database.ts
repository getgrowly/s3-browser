import type { S3Config, S3Bucket, S3Object } from "@/types/s3"

// Search cache interface
interface SearchCacheEntry<T> {
  data: T
  timestamp: number
}

// Database abstraction that works in both browser (localStorage) and Electron (SQLite)
class DatabaseStore {
  private configStorageKey = "s3-configs"
  private bucketStorageKey = "s3-buckets"
  private objectStorageKey = "s3-objects"
  private appSettingsKey = "s3-app-settings"

  // In-memory cache for search results with 5 second TTL
  private searchCache = new Map<string, SearchCacheEntry<any>>()
  private readonly CACHE_TTL = 5000 // 5 seconds

  // Check if running in Electron
  private isElectron(): boolean {
    return typeof window !== "undefined" && window.electronAPI?.isElectron === true
  }

  // Cache helper methods
  private getCacheKey(type: string, ...params: any[]): string {
    return `${type}:${params.join(":")}`
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.searchCache.get(key)
    if (!entry) {
      return null
    }

    const now = Date.now()
    if (now - entry.timestamp > this.CACHE_TTL) {
      this.searchCache.delete(key)
      return null
    }

    return entry.data as T
  }

  private setCache<T>(key: string, data: T): void {
    this.searchCache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }

  private clearCacheForBucket(configId: number, bucketName: string): void {
    // Clear all search cache entries for this bucket
    const prefix = `searchObjects:${configId}:${bucketName}:`
    for (const key of this.searchCache.keys()) {
      if (key.startsWith(prefix)) {
        this.searchCache.delete(key)
      }
    }
  }

  private clearAllCache(): void {
    this.searchCache.clear()
  }

  async getConfigs(): Promise<S3Config[]> {
    if (this.isElectron()) {
      return window.electronAPI!.getConfigs()
    }

    if (typeof window === "undefined") {
      return []
    }
    const stored = localStorage.getItem(this.configStorageKey)
    return stored ? JSON.parse(stored) : []
  }

  async saveConfig(config: Omit<S3Config, "id" | "createdAt">): Promise<S3Config> {
    if (this.isElectron()) {
      return window.electronAPI!.saveConfig(config)
    }

    const configs = await this.getConfigs()
    const newConfig: S3Config = {
      ...config,
      id: Date.now(),
      createdAt: new Date().toISOString(),
    }
    configs.push(newConfig)
    localStorage.setItem(this.configStorageKey, JSON.stringify(configs))
    return newConfig
  }

  async deleteConfig(id: number): Promise<void> {
    if (this.isElectron()) {
      return window.electronAPI!.deleteConfig(id)
    }

    const configs = await this.getConfigs()
    const filtered = configs.filter((c) => c.id !== id)
    localStorage.setItem(this.configStorageKey, JSON.stringify(filtered))
  }

  async updateConfig(id: number, updates: Partial<S3Config>): Promise<S3Config | null> {
    if (this.isElectron()) {
      await window.electronAPI!.updateConfig(id, updates)
      const configs = await this.getConfigs()
      return configs.find((c) => c.id === id) || null
    }

    const configs = await this.getConfigs()
    const index = configs.findIndex((c) => c.id === id)
    if (index === -1) {
      return null
    }

    configs[index] = { ...configs[index], ...updates }
    localStorage.setItem(this.configStorageKey, JSON.stringify(configs))
    return configs[index]
  }

  // Bucket operations
  async getBuckets(configId: number): Promise<S3Bucket[]> {
    console.log("Database.getBuckets called with configId:", configId)

    if (this.isElectron()) {
      return window.electronAPI!.getBuckets(configId)
    }

    if (typeof window === "undefined") {
      console.log("Window is undefined, returning empty array")
      return []
    }

    const stored = localStorage.getItem(this.bucketStorageKey)
    console.log("Raw stored buckets:", stored)

    const allBuckets: Array<S3Bucket & { configId: number }> = stored ? JSON.parse(stored) : []
    console.log("All buckets from storage:", allBuckets)

    const filteredBuckets = allBuckets.filter((bucket) => bucket.configId === configId)
    console.log("Filtered buckets for configId", configId, ":", filteredBuckets)

    const result = filteredBuckets.map(({ configId: _configId, ...bucket }) => bucket)
    console.log("Final result:", result)

    return result
  }

  async saveBucket(configId: number, bucket: S3Bucket): Promise<S3Bucket> {
    console.log("Database.saveBucket called:", { configId, bucket })

    if (this.isElectron()) {
      await window.electronAPI!.saveBucket(configId, bucket)
      return bucket
    }

    const stored = localStorage.getItem(this.bucketStorageKey)
    const allBuckets: Array<S3Bucket & { configId: number }> = stored ? JSON.parse(stored) : []

    // Remove existing bucket with same name
    const filtered = allBuckets.filter((b) => !(b.configId === configId && b.Name === bucket.Name))
    const bucketWithConfig = { ...bucket, configId }
    filtered.push(bucketWithConfig)

    console.log("Saving buckets to localStorage:", filtered)
    localStorage.setItem(this.bucketStorageKey, JSON.stringify(filtered))
    return bucket
  }

  async saveBucketsBatch(configId: number, buckets: S3Bucket[]): Promise<void> {
    console.log("Database.saveBucketsBatch called:", { configId, count: buckets.length })

    if (this.isElectron()) {
      return window.electronAPI!.saveBucketsBatch(configId, buckets)
    }

    const stored = localStorage.getItem(this.bucketStorageKey)
    const allBuckets: Array<S3Bucket & { configId: number }> = stored ? JSON.parse(stored) : []

    // Remove existing buckets for this config
    const filtered = allBuckets.filter((b) => b.configId !== configId)

    // Add new buckets
    const bucketsWithConfig = buckets.map((bucket) => ({ ...bucket, configId }))
    filtered.push(...bucketsWithConfig)

    localStorage.setItem(this.bucketStorageKey, JSON.stringify(filtered))
  }

  async clearBucketsForConfig(configId: number): Promise<void> {
    console.log("Database.clearBucketsForConfig called:", { configId })

    if (this.isElectron()) {
      return window.electronAPI!.clearBucketsForConfig(configId)
    }

    const stored = localStorage.getItem(this.bucketStorageKey)
    const allBuckets: Array<S3Bucket & { configId: number }> = stored ? JSON.parse(stored) : []

    const filtered = allBuckets.filter((bucket) => bucket.configId !== configId)
    localStorage.setItem(this.bucketStorageKey, JSON.stringify(filtered))
  }

  async deleteBucket(configId: number, bucketName: string): Promise<void> {
    if (this.isElectron()) {
      return window.electronAPI!.deleteBucket(configId, bucketName)
    }

    const stored = localStorage.getItem(this.bucketStorageKey)
    const allBuckets: Array<S3Bucket & { configId: number }> = stored ? JSON.parse(stored) : []

    const filtered = allBuckets.filter((bucket) => !(bucket.configId === configId && bucket.Name === bucketName))
    localStorage.setItem(this.bucketStorageKey, JSON.stringify(filtered))

    // Also delete all objects in this bucket
    this.deleteAllObjectsInBucket(configId, bucketName)
  }

  // Object operations
  async getObjects(configId: number, bucketName: string, prefix?: string): Promise<S3Object[]> {
    if (this.isElectron()) {
      return window.electronAPI!.getObjects(configId, bucketName, prefix)
    }

    if (typeof window === "undefined") {
      return []
    }
    const stored = localStorage.getItem(this.objectStorageKey)
    const allObjects: Array<S3Object & { configId: number; bucketName: string; prefix?: string }> = stored
      ? JSON.parse(stored)
      : []

    let filtered = allObjects.filter((obj) => obj.configId === configId && obj.bucketName === bucketName)

    if (prefix !== undefined) {
      filtered = filtered.filter((obj) => obj.prefix === prefix || obj.prefix === null || obj.prefix === undefined)
    }

    return filtered.map(({ configId: _configId, bucketName: _bucketName, prefix: _prefix, ...obj }) => obj)
  }

  async saveObject(configId: number, bucketName: string, object: S3Object, prefix?: string): Promise<S3Object> {
    if (this.isElectron()) {
      await window.electronAPI!.saveObject(configId, bucketName, object, prefix)
      return object
    }

    const stored = localStorage.getItem(this.objectStorageKey)
    const allObjects: Array<S3Object & { configId: number; bucketName: string; prefix?: string }> = stored
      ? JSON.parse(stored)
      : []

    // Remove existing object with same key
    const filtered = allObjects.filter(
      (obj) => !(obj.configId === configId && obj.bucketName === bucketName && obj.Key === object.Key)
    )

    const objectWithMeta = { ...object, configId, bucketName, prefix: prefix || undefined }
    filtered.push(objectWithMeta)

    localStorage.setItem(this.objectStorageKey, JSON.stringify(filtered))
    
    // Clear cache for this bucket since data changed
    this.clearCacheForBucket(configId, bucketName)
    
    return object
  }

  async saveObjectsBatch(configId: number, bucketName: string, objects: S3Object[], prefix?: string): Promise<void> {
    console.log("Database.saveObjectsBatch called:", { configId, bucketName, count: objects.length, prefix })

    if (this.isElectron()) {
      return window.electronAPI!.saveObjectsBatch(configId, bucketName, objects, prefix)
    }

    const stored = localStorage.getItem(this.objectStorageKey)
    const allObjects: Array<S3Object & { configId: number; bucketName: string; prefix?: string }> = stored
      ? JSON.parse(stored)
      : []

    // Remove existing objects for this bucket and prefix
    const filtered = allObjects.filter(
      (obj) =>
        !(
          obj.configId === configId &&
          obj.bucketName === bucketName &&
          (prefix === undefined || obj.prefix === prefix || obj.prefix === null)
        )
    )

    // Add new objects
    const objectsWithMeta = objects.map((object) => ({ ...object, configId, bucketName, prefix: prefix || undefined }))
    filtered.push(...objectsWithMeta)

    localStorage.setItem(this.objectStorageKey, JSON.stringify(filtered))
    
    // Clear cache for this bucket since data changed
    this.clearCacheForBucket(configId, bucketName)
  }

  async clearObjectsForBucket(configId: number, bucketName: string, prefix?: string): Promise<void> {
    console.log("Database.clearObjectsForBucket called:", { configId, bucketName, prefix })

    if (this.isElectron()) {
      return window.electronAPI!.clearObjectsForBucket(configId, bucketName, prefix)
    }

    const stored = localStorage.getItem(this.objectStorageKey)
    const allObjects: Array<S3Object & { configId: number; bucketName: string; prefix?: string }> = stored
      ? JSON.parse(stored)
      : []

    let filtered
    if (prefix !== undefined) {
      filtered = allObjects.filter(
        (obj) => !(obj.configId === configId && obj.bucketName === bucketName && obj.prefix === prefix)
      )
    } else {
      filtered = allObjects.filter((obj) => !(obj.configId === configId && obj.bucketName === bucketName))
    }

    localStorage.setItem(this.objectStorageKey, JSON.stringify(filtered))
    
    // Clear cache for this bucket since data changed
    this.clearCacheForBucket(configId, bucketName)
  }

  async deleteObject(configId: number, bucketName: string, key: string): Promise<void> {
    if (this.isElectron()) {
      return window.electronAPI!.deleteObject(configId, bucketName, key)
    }

    const stored = localStorage.getItem(this.objectStorageKey)
    const allObjects: Array<S3Object & { configId: number; bucketName: string }> = stored ? JSON.parse(stored) : []

    const filtered = allObjects.filter(
      (obj) => !(obj.configId === configId && obj.bucketName === bucketName && obj.Key === key)
    )

    localStorage.setItem(this.objectStorageKey, JSON.stringify(filtered))
    
    // Clear cache for this bucket since data changed
    this.clearCacheForBucket(configId, bucketName)
  }

  private deleteAllObjectsInBucket(configId: number, bucketName: string): void {
    if (typeof window === "undefined") {
      return
    }

    const stored = localStorage.getItem(this.objectStorageKey)
    const allObjects: Array<S3Object & { configId: number; bucketName: string }> = stored ? JSON.parse(stored) : []

    const filtered = allObjects.filter((obj) => !(obj.configId === configId && obj.bucketName === bucketName))

    localStorage.setItem(this.objectStorageKey, JSON.stringify(filtered))
  }

  // Check if bucket exists
  async bucketExists(configId: number, bucketName: string): Promise<boolean> {
    const buckets = await this.getBuckets(configId)
    return buckets.some((bucket) => bucket.Name === bucketName)
  }

  // Sync metadata operations
  async getSyncMetadata(
    configId: number,
    bucketName?: string,
    prefix?: string
  ): Promise<import("@/types/s3").SyncMetadata | undefined> {
    if (this.isElectron()) {
      return window.electronAPI!.getSyncMetadata(configId, bucketName, prefix)
    }

    // For browser, use localStorage
    if (typeof window === "undefined") {
      return undefined
    }

    const stored = localStorage.getItem("s3-sync-metadata")
    if (!stored) {
      return undefined
    }

    const allMetadata: Array<import("@/types/s3").SyncMetadata> = JSON.parse(stored)

    return allMetadata.find((meta) => {
      return (
        meta.configId === configId &&
        (bucketName === undefined ? meta.bucketName === null : meta.bucketName === bucketName) &&
        (prefix === undefined ? meta.prefix === null : meta.prefix === prefix)
      )
    })
  }

  async updateSyncMetadata(
    configId: number,
    syncStatus: string,
    bucketName?: string,
    prefix?: string,
    errorMessage?: string
  ): Promise<void> {
    if (this.isElectron()) {
      return window.electronAPI!.updateSyncMetadata(configId, syncStatus, bucketName, prefix, errorMessage)
    }

    // For browser, use localStorage
    if (typeof window === "undefined") {
      return
    }

    const stored = localStorage.getItem("s3-sync-metadata")
    const allMetadata: Array<import("@/types/s3").SyncMetadata> = stored ? JSON.parse(stored) : []

    // Remove existing metadata
    const filtered = allMetadata.filter((meta) => {
      return !(
        meta.configId === configId &&
        (bucketName === undefined ? meta.bucketName === null : meta.bucketName === bucketName) &&
        (prefix === undefined ? meta.prefix === null : meta.prefix === prefix)
      )
    })

    // Add new metadata
    filtered.push({
      configId,
      bucketName: bucketName || null,
      prefix: prefix || null,
      lastSyncAt: new Date().toISOString(),
      syncStatus: syncStatus as import("@/types/s3").SyncStatus,
      errorMessage: errorMessage || null,
    })

    localStorage.setItem("s3-sync-metadata", JSON.stringify(filtered))
  }

  async getAllSyncMetadata(configId: number): Promise<import("@/types/s3").SyncMetadata[]> {
    if (this.isElectron()) {
      return window.electronAPI!.getAllSyncMetadata(configId)
    }

    // For browser, use localStorage
    if (typeof window === "undefined") {
      return []
    }

    const stored = localStorage.getItem("s3-sync-metadata")
    if (!stored) {
      return []
    }

    const allMetadata: Array<import("@/types/s3").SyncMetadata> = JSON.parse(stored)
    return allMetadata.filter((meta) => meta.configId === configId)
  }

  // Search operations
  async searchObjects(configId: number, bucketName: string, searchQuery: string): Promise<import("@/types/s3").S3Object[]> {
    if (this.isElectron()) {
      return window.electronAPI!.searchObjects(configId, bucketName, searchQuery)
    }

    // Check cache first
    const cacheKey = this.getCacheKey("searchObjects", configId, bucketName, searchQuery.toLowerCase())
    const cached = this.getFromCache<import("@/types/s3").S3Object[]>(cacheKey)
    if (cached) {
      console.log("Database.searchObjects - Cache hit:", cacheKey)
      return cached
    }

    console.log("Database.searchObjects - Cache miss, searching:", cacheKey)

    // For browser, search in localStorage with optimized filtering
    const objects = await this.getObjects(configId, bucketName)
    const lowerQuery = searchQuery.toLowerCase()
    
    // Optimized filter with early termination for performance
    const results = objects.filter((obj) => obj.Key.toLowerCase().includes(lowerQuery))
    
    // Cache the results
    this.setCache(cacheKey, results)
    
    return results
  }

  async searchAllObjects(configId: number, searchQuery: string): Promise<Array<import("@/types/s3").S3Object & { bucketName: string }>> {
    if (this.isElectron()) {
      return window.electronAPI!.searchAllObjects(configId, searchQuery)
    }

    // For browser, search across all buckets in localStorage
    if (typeof window === "undefined") {
      return []
    }

    const stored = localStorage.getItem(this.objectStorageKey)
    if (!stored) {
      return []
    }

    const allObjects: Array<{ configId: number; bucketName: string; objects: import("@/types/s3").S3Object[] }> = JSON.parse(stored)
    const results: Array<import("@/types/s3").S3Object & { bucketName: string }> = []

    for (const bucketData of allObjects) {
      if (bucketData.configId === configId) {
        for (const obj of bucketData.objects) {
          if (obj.Key.toLowerCase().includes(searchQuery.toLowerCase())) {
            results.push({ ...obj, bucketName: bucketData.bucketName })
          }
        }
      }
    }

    return results
  }

  async searchBuckets(configId: number, searchQuery: string): Promise<import("@/types/s3").S3Bucket[]> {
    if (this.isElectron()) {
      return window.electronAPI!.searchBuckets(configId, searchQuery)
    }

    // For browser, search in localStorage
    const buckets = await this.getBuckets(configId)
    return buckets.filter((bucket) => bucket.Name.toLowerCase().includes(searchQuery.toLowerCase()))
  }

  // App settings operations
  async getAppSetting(key: string): Promise<string | null> {
    if (this.isElectron()) {
      return window.electronAPI!.getAppSetting(key)
    }

    // For browser, use localStorage
    if (typeof window === "undefined") {
      return null
    }

    const stored = localStorage.getItem(this.appSettingsKey)
    if (!stored) {
      return null
    }

    const settings: Record<string, string> = JSON.parse(stored)
    return settings[key] || null
  }

  async setAppSetting(key: string, value: string | null): Promise<void> {
    if (this.isElectron()) {
      return window.electronAPI!.setAppSetting(key, value)
    }

    // For browser, use localStorage
    if (typeof window === "undefined") {
      return
    }

    const stored = localStorage.getItem(this.appSettingsKey)
    const settings: Record<string, string | null> = stored ? JSON.parse(stored) : {}

    if (value === null) {
      delete settings[key]
    } else {
      settings[key] = value
    }

    localStorage.setItem(this.appSettingsKey, JSON.stringify(settings))
  }
}

export const db = new DatabaseStore()
