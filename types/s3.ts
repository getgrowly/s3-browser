export interface S3Config {
  id?: number
  name: string
  accessKeyId: string
  secretAccessKey: string
  region: string
  endpoint?: string
  createdAt?: string
}

export interface S3Object {
  Key: string
  LastModified: Date | string
  Size: number
  ETag: string
  StorageClass: string
}

export interface S3Bucket {
  Name: string
  CreationDate: Date | string
}

export interface FilePreview {
  type: "image" | "text" | "video" | "audio" | "pdf" | "unknown"
  url?: string
  content?: string
}

export type SyncStatus = "idle" | "syncing" | "completed" | "error"

export interface SyncMetadata {
  id?: number
  configId: number
  bucketName: string | null
  prefix: string | null
  lastSyncAt: string
  syncStatus: SyncStatus
  errorMessage: string | null
}
