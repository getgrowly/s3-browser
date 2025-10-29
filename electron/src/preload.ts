import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations - Configs
  getConfigs: () => ipcRenderer.invoke('db:getConfigs'),
  saveConfig: (config: any) => ipcRenderer.invoke('db:saveConfig', config),
  updateConfig: (id: number, updates: any) => ipcRenderer.invoke('db:updateConfig', id, updates),
  deleteConfig: (id: number) => ipcRenderer.invoke('db:deleteConfig', id),
  
  // Database operations - Buckets
  getBuckets: (configId: number) => ipcRenderer.invoke('db:getBuckets', configId),
  saveBucket: (configId: number, bucket: any) => ipcRenderer.invoke('db:saveBucket', configId, bucket),
  saveBucketsBatch: (configId: number, buckets: any[]) => ipcRenderer.invoke('db:saveBucketsBatch', configId, buckets),
  clearBucketsForConfig: (configId: number) => ipcRenderer.invoke('db:clearBucketsForConfig', configId),
  deleteBucket: (configId: number, bucketName: string) => ipcRenderer.invoke('db:deleteBucket', configId, bucketName),
  
  // Database operations - Objects
  getObjects: (configId: number, bucketName: string, prefix?: string) => ipcRenderer.invoke('db:getObjects', configId, bucketName, prefix),
  saveObject: (configId: number, bucketName: string, object: any, prefix?: string) => ipcRenderer.invoke('db:saveObject', configId, bucketName, object, prefix),
  saveObjectsBatch: (configId: number, bucketName: string, objects: any[], prefix?: string) => ipcRenderer.invoke('db:saveObjectsBatch', configId, bucketName, objects, prefix),
  clearObjectsForBucket: (configId: number, bucketName: string, prefix?: string) => ipcRenderer.invoke('db:clearObjectsForBucket', configId, bucketName, prefix),
  deleteObject: (configId: number, bucketName: string, key: string) => ipcRenderer.invoke('db:deleteObject', configId, bucketName, key),
  
  // Database operations - Sync Metadata
  getSyncMetadata: (configId: number, bucketName?: string, prefix?: string) => ipcRenderer.invoke('db:getSyncMetadata', configId, bucketName, prefix),
  updateSyncMetadata: (configId: number, syncStatus: string, bucketName?: string, prefix?: string, errorMessage?: string) => ipcRenderer.invoke('db:updateSyncMetadata', configId, syncStatus, bucketName, prefix, errorMessage),
  getAllSyncMetadata: (configId: number) => ipcRenderer.invoke('db:getAllSyncMetadata', configId),

  // Search operations
  searchObjects: (configId: number, bucketName: string, searchQuery: string) =>
    ipcRenderer.invoke('db:searchObjects', configId, bucketName, searchQuery),
  searchAllObjects: (configId: number, searchQuery: string) =>
    ipcRenderer.invoke('db:searchAllObjects', configId, searchQuery),
  searchBuckets: (configId: number, searchQuery: string) =>
    ipcRenderer.invoke('db:searchBuckets', configId, searchQuery),
  
  // Database operations - App Settings
  getAppSetting: (key: string) => ipcRenderer.invoke('app-settings:get', key),
  setAppSetting: (key: string, value: string | null) => ipcRenderer.invoke('app-settings:set', key, value),
  
  // File dialog operations
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  openFiles: () => ipcRenderer.invoke('dialog:openFiles'),
  saveFile: (data: number[], filename: string) => ipcRenderer.invoke('dialog:saveFile', data, filename),
  
  // System operations
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  
  // Auto-updater
  installUpdate: () => ipcRenderer.invoke('update:install'),
  
  // Event listeners
  onUpdateAvailable: (callback: (info: any) => void) => {
    ipcRenderer.on('update:available', (_event, info) => callback(info))
  },
  onUpdateProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('update:progress', (_event, progress) => callback(progress))
  },
  onUpdateDownloaded: (callback: (info: any) => void) => {
    ipcRenderer.on('update:downloaded', (_event, info) => callback(info))
  },
  
  // Check if running in Electron
  isElectron: true,
})

// Also expose a way to check if we're in Electron from the renderer
contextBridge.exposeInMainWorld('isElectron', true)

