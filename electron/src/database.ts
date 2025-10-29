import Database from "better-sqlite3"
import * as path from "path"
import * as fs from "fs"

interface S3Config {
  id?: number
  name: string
  accessKeyId: string
  secretAccessKey: string
  region: string
  endpoint?: string
  createdAt?: string
}

interface S3Bucket {
  Name: string
  CreationDate?: Date | string
}

interface S3Object {
  Key: string
  Size?: number
  LastModified?: Date | string
  ETag?: string
  StorageClass?: string
}

export class ElectronDatabase {
  private db: Database.Database

  constructor(userDataPath: string) {
    // Ensure the directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true })
    }

    const dbPath = path.join(userDataPath, "s3-browser.db")
    console.log("Initializing SQLite database at:", dbPath)

    this.db = new Database(dbPath)

    // Enable foreign keys
    this.db.pragma("foreign_keys = ON")

    // Initialize tables
    this.initializeTables()
  }

  private initializeTables() {
    // Configs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        accessKeyId TEXT NOT NULL,
        secretAccessKey TEXT NOT NULL,
        region TEXT NOT NULL,
        endpoint TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Buckets table (for caching) - matches S3Bucket interface
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS buckets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        configId INTEGER NOT NULL,
        Name TEXT NOT NULL,
        CreationDate DATETIME,
        FOREIGN KEY (configId) REFERENCES configs(id) ON DELETE CASCADE,
        UNIQUE(configId, Name)
      )
    `)

    // Objects table (for caching) - matches S3Object interface
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS objects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        configId INTEGER NOT NULL,
        bucketName TEXT NOT NULL,
        Key TEXT NOT NULL,
        LastModified DATETIME,
        Size INTEGER,
        ETag TEXT,
        StorageClass TEXT,
        prefix TEXT,
        FOREIGN KEY (configId) REFERENCES configs(id) ON DELETE CASCADE,
        UNIQUE(configId, bucketName, Key)
      )
    `)

    // Sync metadata table for tracking sync status
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sync_metadata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        configId INTEGER NOT NULL,
        bucketName TEXT,
        prefix TEXT,
        lastSyncAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        syncStatus TEXT DEFAULT 'completed',
        errorMessage TEXT,
        FOREIGN KEY (configId) REFERENCES configs(id) ON DELETE CASCADE,
        UNIQUE(configId, bucketName, prefix)
      )
    `)

    // App settings table for storing application-level settings (e.g., password hash)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        value TEXT,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    console.log("Database tables initialized")
    
    // Migrate existing data if needed
    this.migrateSchema()
  }

  private migrateSchema() {
    try {
      // Check if old schema exists (lowercase columns)
      const checkBuckets = this.db.prepare("SELECT name FROM pragma_table_info('buckets') WHERE name = 'name'")
      const oldBucketsSchema = checkBuckets.get()
      
      if (oldBucketsSchema) {
        console.log("Migrating buckets table schema...")
        this.db.exec(`
          CREATE TABLE buckets_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            configId INTEGER NOT NULL,
            Name TEXT NOT NULL,
            CreationDate DATETIME,
            FOREIGN KEY (configId) REFERENCES configs(id) ON DELETE CASCADE,
            UNIQUE(configId, Name)
          );
          INSERT INTO buckets_new (id, configId, Name, CreationDate)
          SELECT id, configId, name, creationDate FROM buckets;
          DROP TABLE buckets;
          ALTER TABLE buckets_new RENAME TO buckets;
        `)
        console.log("Buckets table migrated successfully")
      }

      // Check if old objects schema exists
      const checkObjects = this.db.prepare("SELECT name FROM pragma_table_info('objects') WHERE name = 'key'")
      const oldObjectsSchema = checkObjects.get()
      
      if (oldObjectsSchema) {
        console.log("Migrating objects table schema...")
        this.db.exec(`
          CREATE TABLE objects_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            configId INTEGER NOT NULL,
            bucketName TEXT NOT NULL,
            Key TEXT NOT NULL,
            LastModified DATETIME,
            Size INTEGER,
            ETag TEXT,
            StorageClass TEXT,
            prefix TEXT,
            FOREIGN KEY (configId) REFERENCES configs(id) ON DELETE CASCADE,
            UNIQUE(configId, bucketName, Key)
          );
          INSERT INTO objects_new (id, configId, bucketName, Key, LastModified, Size, ETag, StorageClass)
          SELECT id, configId, bucketName, key, lastModified, size, eTag, storageClass FROM objects;
          DROP TABLE objects;
          ALTER TABLE objects_new RENAME TO objects;
        `)
        console.log("Objects table migrated successfully")
      }
    } catch (error) {
      console.log("Schema migration not needed or already completed:", error)
    }
  }

  // Config operations
  getConfigs(): S3Config[] {
    const stmt = this.db.prepare("SELECT * FROM configs ORDER BY createdAt DESC")
    return stmt.all() as S3Config[]
  }

  saveConfig(config: Omit<S3Config, "id" | "createdAt">): S3Config {
    const stmt = this.db.prepare(`
      INSERT INTO configs (name, accessKeyId, secretAccessKey, region, endpoint)
      VALUES (?, ?, ?, ?, ?)
    `)

    const result = stmt.run(
      config.name,
      config.accessKeyId,
      config.secretAccessKey,
      config.region,
      config.endpoint || null
    )

    return {
      id: Number(result.lastInsertRowid),
      ...config,
      createdAt: new Date().toISOString(),
    }
  }

  updateConfig(id: number, updates: Partial<Omit<S3Config, "id" | "createdAt">>): void {
    const fields: string[] = []
    const values: any[] = []

    if (updates.name !== undefined) {
      fields.push("name = ?")
      values.push(updates.name)
    }
    if (updates.accessKeyId !== undefined) {
      fields.push("accessKeyId = ?")
      values.push(updates.accessKeyId)
    }
    if (updates.secretAccessKey !== undefined) {
      fields.push("secretAccessKey = ?")
      values.push(updates.secretAccessKey)
    }
    if (updates.region !== undefined) {
      fields.push("region = ?")
      values.push(updates.region)
    }
    if (updates.endpoint !== undefined) {
      fields.push("endpoint = ?")
      values.push(updates.endpoint || null)
    }

    if (fields.length === 0) {
      return
    }

    values.push(id)
    const stmt = this.db.prepare(`UPDATE configs SET ${fields.join(", ")} WHERE id = ?`)
    stmt.run(...values)
  }

  deleteConfig(id: number): void {
    // Foreign key constraints will automatically delete related buckets and objects
    const stmt = this.db.prepare("DELETE FROM configs WHERE id = ?")
    stmt.run(id)
  }

  // Bucket operations
  getBuckets(configId: number): S3Bucket[] {
    const stmt = this.db.prepare("SELECT Name, CreationDate FROM buckets WHERE configId = ? ORDER BY Name")
    return stmt.all(configId) as S3Bucket[]
  }

  saveBucket(configId: number, bucket: S3Bucket): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO buckets (configId, Name, CreationDate)
      VALUES (?, ?, ?)
    `)

    const creationDate = bucket.CreationDate 
      ? (bucket.CreationDate instanceof Date ? bucket.CreationDate.toISOString() : bucket.CreationDate)
      : null

    stmt.run(configId, bucket.Name, creationDate)
  }

  saveBucketsBatch(configId: number, buckets: S3Bucket[]): void {
    const transaction = this.db.transaction((items: S3Bucket[]) => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO buckets (configId, Name, CreationDate)
        VALUES (?, ?, ?)
      `)
      
      for (const bucket of items) {
        const creationDate = bucket.CreationDate 
          ? (bucket.CreationDate instanceof Date ? bucket.CreationDate.toISOString() : bucket.CreationDate)
          : null
        
        stmt.run(configId, bucket.Name, creationDate)
      }
    })

    transaction(buckets)
  }

  clearBucketsForConfig(configId: number): void {
    const stmt = this.db.prepare("DELETE FROM buckets WHERE configId = ?")
    stmt.run(configId)
  }

  deleteBucket(configId: number, bucketName: string): void {
    // Also delete all objects in this bucket
    const deleteObjectsStmt = this.db.prepare("DELETE FROM objects WHERE configId = ? AND bucketName = ?")
    deleteObjectsStmt.run(configId, bucketName)

    const deleteBucketStmt = this.db.prepare("DELETE FROM buckets WHERE configId = ? AND Name = ?")
    deleteBucketStmt.run(configId, bucketName)
  }

  bucketExists(configId: number, bucketName: string): boolean {
    const stmt = this.db.prepare("SELECT COUNT(*) as count FROM buckets WHERE configId = ? AND Name = ?")
    const result = stmt.get(configId, bucketName) as { count: number }
    return result.count > 0
  }

  // Object operations
  getObjects(configId: number, bucketName: string, prefix?: string): S3Object[] {
    let query = `
      SELECT Key, Size, LastModified, ETag, StorageClass 
      FROM objects 
      WHERE configId = ? AND bucketName = ?
    `
    const params: any[] = [configId, bucketName]
    
    if (prefix !== undefined) {
      query += ` AND (prefix = ? OR prefix IS NULL)`
      params.push(prefix)
    }
    
    query += ` ORDER BY Key`
    
    const stmt = this.db.prepare(query)
    return stmt.all(...params) as S3Object[]
  }

  saveObject(configId: number, bucketName: string, object: S3Object, prefix?: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO objects (configId, bucketName, Key, Size, LastModified, ETag, StorageClass, prefix)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    // Convert Date to ISO string if needed
    const lastModified = object.LastModified
      ? (object.LastModified instanceof Date ? object.LastModified.toISOString() : object.LastModified)
      : null

    // Ensure Size is a number or null
    const size = typeof object.Size === 'number' ? object.Size : null

    // Ensure ETag is a string or null
    const eTag = typeof object.ETag === 'string' ? object.ETag : null

    // Ensure StorageClass is a string or null
    const storageClass = typeof object.StorageClass === 'string' ? object.StorageClass : null

    stmt.run(
      configId,
      bucketName,
      object.Key,
      size,
      lastModified,
      eTag,
      storageClass,
      prefix || null
    )
  }

  saveObjectsBatch(configId: number, bucketName: string, objects: S3Object[], prefix?: string): void {
    console.log(`ElectronDatabase.saveObjectsBatch: Saving ${objects.length} objects for bucket ${bucketName}`)
    
    const transaction = this.db.transaction((items: S3Object[]) => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO objects (configId, bucketName, Key, Size, LastModified, ETag, StorageClass, prefix)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      
      for (let i = 0; i < items.length; i++) {
        const object = items[i]
        
        try {
          // Convert Date to ISO string if needed
          const lastModified = object.LastModified
            ? (object.LastModified instanceof Date ? object.LastModified.toISOString() : object.LastModified)
            : null

          // Ensure Size is a number or null
          const size = typeof object.Size === 'number' ? object.Size : null

          // Ensure ETag is a string or null
          const eTag = typeof object.ETag === 'string' ? object.ETag : null

          // Ensure StorageClass is a string or null
          const storageClass = typeof object.StorageClass === 'string' ? object.StorageClass : null

          stmt.run(
            configId,
            bucketName,
            object.Key,
            size,
            lastModified,
            eTag,
            storageClass,
            prefix || null
          )
        } catch (error) {
          console.error(`Error saving object ${i} (${object.Key}):`, error)
          console.error('Object data:', JSON.stringify(object, null, 2))
          throw error
        }
      }
    })

    transaction(objects)
  }

  clearObjectsForBucket(configId: number, bucketName: string, prefix?: string): void {
    if (prefix !== undefined) {
      const stmt = this.db.prepare("DELETE FROM objects WHERE configId = ? AND bucketName = ? AND prefix = ?")
      stmt.run(configId, bucketName, prefix)
    } else {
      const stmt = this.db.prepare("DELETE FROM objects WHERE configId = ? AND bucketName = ?")
      stmt.run(configId, bucketName)
    }
  }

  deleteObject(configId: number, bucketName: string, key: string): void {
    const stmt = this.db.prepare("DELETE FROM objects WHERE configId = ? AND bucketName = ? AND Key = ?")
    stmt.run(configId, bucketName, key)
  }

  objectExists(configId: number, bucketName: string, key: string): boolean {
    const stmt = this.db.prepare(
      "SELECT COUNT(*) as count FROM objects WHERE configId = ? AND bucketName = ? AND Key = ?"
    )
    const result = stmt.get(configId, bucketName, key) as { count: number }
    return result.count > 0
  }

  // Sync metadata operations
  getSyncMetadata(configId: number, bucketName?: string, prefix?: string): any {
    let query = "SELECT * FROM sync_metadata WHERE configId = ?"
    const params: any[] = [configId]
    
    if (bucketName !== undefined) {
      query += " AND bucketName = ?"
      params.push(bucketName)
    } else {
      query += " AND bucketName IS NULL"
    }
    
    if (prefix !== undefined) {
      query += " AND prefix = ?"
      params.push(prefix)
    } else {
      query += " AND prefix IS NULL"
    }
    
    const stmt = this.db.prepare(query)
    return stmt.get(...params)
  }

  updateSyncMetadata(
    configId: number,
    syncStatus: string,
    bucketName?: string,
    prefix?: string,
    errorMessage?: string
  ): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO sync_metadata 
        (configId, bucketName, prefix, lastSyncAt, syncStatus, errorMessage)
      VALUES (?, ?, ?, datetime('now'), ?, ?)
    `)

    stmt.run(
      configId,
      bucketName || null,
      prefix || null,
      syncStatus,
      errorMessage || null
    )
  }

  getAllSyncMetadata(configId: number): any[] {
    const stmt = this.db.prepare("SELECT * FROM sync_metadata WHERE configId = ? ORDER BY lastSyncAt DESC")
    return stmt.all(configId)
  }

  // Utility methods
  close(): void {
    this.db.close()
  }

  // Clear all cached data (useful for testing)
  clearCache(): void {
    this.db.exec("DELETE FROM objects")
    this.db.exec("DELETE FROM buckets")
    this.db.exec("DELETE FROM sync_metadata")
  }

  // Get database statistics
  getStats() {
    const configsStmt = this.db.prepare("SELECT COUNT(*) as count FROM configs")
    const bucketsStmt = this.db.prepare("SELECT COUNT(*) as count FROM buckets")
    const objectsStmt = this.db.prepare("SELECT COUNT(*) as count FROM objects")
    const syncStmt = this.db.prepare("SELECT COUNT(*) as count FROM sync_metadata")

    return {
      configs: (configsStmt.get() as { count: number }).count,
      buckets: (bucketsStmt.get() as { count: number }).count,
      objects: (objectsStmt.get() as { count: number }).count,
      syncMetadata: (syncStmt.get() as { count: number }).count,
    }
  }

  // Search operations
  searchObjects(configId: number, bucketName: string, searchQuery: string): S3Object[] {
    console.log(`ElectronDatabase.searchObjects: Searching for "${searchQuery}" in bucket ${bucketName}`)
    
    const stmt = this.db.prepare(`
      SELECT Key, Size, LastModified, ETag, StorageClass
      FROM objects
      WHERE configId = ? 
        AND bucketName = ?
        AND Key LIKE ?
      ORDER BY Key
      LIMIT 1000
    `)

    const searchPattern = `%${searchQuery}%`
    return stmt.all(configId, bucketName, searchPattern) as S3Object[]
  }

  searchAllObjects(configId: number, searchQuery: string): Array<S3Object & { bucketName: string }> {
    console.log(`ElectronDatabase.searchAllObjects: Searching for "${searchQuery}" across all buckets`)
    
    const stmt = this.db.prepare(`
      SELECT bucketName, Key, Size, LastModified, ETag, StorageClass
      FROM objects
      WHERE configId = ? 
        AND Key LIKE ?
      ORDER BY bucketName, Key
      LIMIT 1000
    `)

    const searchPattern = `%${searchQuery}%`
    return stmt.all(configId, searchPattern) as Array<S3Object & { bucketName: string }>
  }

  searchBuckets(configId: number, searchQuery: string): S3Bucket[] {
    console.log(`ElectronDatabase.searchBuckets: Searching for "${searchQuery}"`)
    
    const stmt = this.db.prepare(`
      SELECT Name, CreationDate
      FROM buckets
      WHERE configId = ? 
        AND Name LIKE ?
      ORDER BY Name
      LIMIT 100
    `)

    const searchPattern = `%${searchQuery}%`
    return stmt.all(configId, searchPattern) as S3Bucket[]
  }

  // App settings operations
  getAppSetting(key: string): string | null {
    console.log(`ElectronDatabase.getAppSetting: Getting setting for key "${key}"`)
    
    const stmt = this.db.prepare(`
      SELECT value FROM app_settings WHERE key = ?
    `)
    
    const result = stmt.get(key) as { value: string | null } | undefined
    return result?.value || null
  }

  setAppSetting(key: string, value: string | null): void {
    console.log(`ElectronDatabase.setAppSetting: Setting "${key}" to:`, value ? '[HIDDEN]' : 'null')
    
    const stmt = this.db.prepare(`
      INSERT INTO app_settings (key, value, updatedAt)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET 
        value = excluded.value,
        updatedAt = datetime('now')
    `)
    
    stmt.run(key, value)
  }
}
