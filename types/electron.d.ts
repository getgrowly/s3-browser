import type { S3Config, S3Bucket, S3Object } from './s3'

export interface FileData {
  path: string
  buffer: number[]
}

export interface UpdateInfo {
  version: string
  releaseDate: string
  releaseNotes?: string
}

export interface UpdateProgress {
  bytesPerSecond: number
  percent: number
  transferred: number
  total: number
}

export interface ElectronAPI {
  // Database operations - Configs
  getConfigs: () => Promise<S3Config[]>
  saveConfig: (config: Omit<S3Config, 'id' | 'createdAt'>) => Promise<S3Config>
  updateConfig: (id: number, updates: Partial<Omit<S3Config, 'id' | 'createdAt'>>) => Promise<void>
  deleteConfig: (id: number) => Promise<void>

  // Database operations - Buckets
  getBuckets: (configId: number) => Promise<S3Bucket[]>
  saveBucket: (configId: number, bucket: S3Bucket) => Promise<void>
  saveBucketsBatch: (configId: number, buckets: S3Bucket[]) => Promise<void>
  clearBucketsForConfig: (configId: number) => Promise<void>
  deleteBucket: (configId: number, bucketName: string) => Promise<void>

  // Database operations - Objects
  getObjects: (configId: number, bucketName: string, prefix?: string) => Promise<S3Object[]>
  saveObject: (configId: number, bucketName: string, object: S3Object, prefix?: string) => Promise<void>
  saveObjectsBatch: (configId: number, bucketName: string, objects: S3Object[], prefix?: string) => Promise<void>
  clearObjectsForBucket: (configId: number, bucketName: string, prefix?: string) => Promise<void>
  deleteObject: (configId: number, bucketName: string, key: string) => Promise<void>
  
  // Database operations - Sync Metadata
  getSyncMetadata: (configId: number, bucketName?: string, prefix?: string) => Promise<import('./s3').SyncMetadata | undefined>
  updateSyncMetadata: (configId: number, syncStatus: string, bucketName?: string, prefix?: string, errorMessage?: string) => Promise<void>
  getAllSyncMetadata: (configId: number) => Promise<import('./s3').SyncMetadata[]>

  // Search operations
  searchObjects: (configId: number, bucketName: string, searchQuery: string) => Promise<import('./s3').S3Object[]>
  searchAllObjects: (configId: number, searchQuery: string) => Promise<Array<import('./s3').S3Object & { bucketName: string }>>
  searchBuckets: (configId: number, searchQuery: string) => Promise<import('./s3').S3Bucket[]>

  // Database operations - App Settings
  getAppSetting: (key: string) => Promise<string | null>
  setAppSetting: (key: string, value: string | null) => Promise<void>

  // File dialog operations
  openFile: () => Promise<FileData | null>
  openFiles: () => Promise<FileData[]>
  saveFile: (data: number[], filename: string) => Promise<boolean>

  // System operations
  getVersion: () => Promise<string>
  getPlatform: () => Promise<NodeJS.Platform>
  openExternal: (url: string) => Promise<boolean>

  // Auto-updater
  installUpdate: () => Promise<void>
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void
  onUpdateProgress: (callback: (progress: UpdateProgress) => void) => void
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => void

  // Check if running in Electron
  isElectron: boolean
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
    isElectron?: boolean
  }
}

export {}

