import { app, BrowserWindow, ipcMain, dialog, shell, Menu } from "electron"
import * as path from "path"
import * as fs from "fs"
import { spawn, ChildProcess } from "child_process"
import log from "electron-log"
import { autoUpdater } from "electron-updater"
import { ElectronDatabase } from "./database"

// Set app name immediately (for macOS menu bar)
app.name = "Growly S3"

// Configure logging
log.transports.file.level = "info"
autoUpdater.logger = log

// Initialize database
let database: ElectronDatabase

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null
let nextServer: ChildProcess | null = null

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged
const NEXT_SERVER_PORT = 54321

async function startNextServer(): Promise<void> {
  if (isDev) {
    log.info("Development mode - Next.js server should already be running on port 54000")
    return
  }

  return new Promise((resolve, reject) => {
    log.info("Starting Next.js server...")

    // Paths
    const appRoot = app.isPackaged
      ? path.join(process.resourcesPath, "app.asar.unpacked")
      : path.join(__dirname, "..", "..")

    const nextBin = path.join(appRoot, "node_modules", ".bin", "next")
    const nodeNextBin = path.join(appRoot, "node_modules", "next", "dist", "bin", "next")

    log.info("App root:", appRoot)
    log.info("Looking for Next.js binary...")

    // Determine which binary to use
    let nextCommand: string
    if (process.platform === "win32") {
      nextCommand = fs.existsSync(`${nextBin}.cmd`) ? `${nextBin}.cmd` : nodeNextBin
    } else {
      nextCommand = fs.existsSync(nextBin) ? nextBin : nodeNextBin
    }

    log.info("Using Next.js binary:", nextCommand)

    // Start Next.js server using `next start`
    nextServer = spawn(
      process.platform === "win32" ? nextCommand : "node",
      process.platform === "win32"
        ? ["start", "-p", NEXT_SERVER_PORT.toString()]
        : [nextCommand, "start", "-p", NEXT_SERVER_PORT.toString()],
      {
        cwd: appRoot,
        env: {
          ...process.env,
          PORT: NEXT_SERVER_PORT.toString(),
          HOSTNAME: "localhost",
          NODE_ENV: "production",
        },
        stdio: "pipe",
      }
    )

    let serverReady = false

    nextServer.stdout?.on("data", (data) => {
      const output = data.toString()
      log.info(`Next.js: ${output}`)
      if (
        (output.includes("Ready") || output.includes("started server") || output.includes("Local:")) &&
        !serverReady
      ) {
        serverReady = true
        resolve()
      }
    })

    nextServer.stderr?.on("data", (data) => {
      const output = data.toString()
      log.error(`Next.js Error: ${output}`)
      // Some outputs go to stderr but aren't errors
      if (
        (output.includes("Ready") || output.includes("started server") || output.includes("Local:")) &&
        !serverReady
      ) {
        serverReady = true
        resolve()
      }
    })

    nextServer.on("error", (error) => {
      log.error("Failed to start Next.js server:", error)
      if (!serverReady) {
        reject(error)
      }
    })

    nextServer.on("exit", (code) => {
      log.info(`Next.js server exited with code: ${code}`)
      if (code !== 0 && !serverReady) {
        reject(new Error(`Next.js server exited with code ${code}`))
      }
    })

    // Fallback timeout - assume server is ready after 5 seconds
    setTimeout(() => {
      if (!serverReady) {
        log.info(`Timeout reached, assuming Next.js server is ready on port ${NEXT_SERVER_PORT}`)
        serverReady = true
        resolve()
      }
    }, 5000)
  })
}

function createMenu() {
  const isMac = process.platform === "darwin"

  const template: Electron.MenuItemConstructorOptions[] = [
    // App Menu (macOS only)
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              {
                label: "Check for Updates...",
                click: () => {
                  if (!isDev) {
                    autoUpdater.checkForUpdatesAndNotify()
                  }
                },
              },
              { type: "separator" as const },
              { role: "services" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          },
        ]
      : []),

    // File Menu
    {
      label: "File",
      submenu: [
        {
          label: "New Configuration",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            mainWindow?.webContents.send("menu:new-config")
          },
        },
        { type: "separator" as const },
        {
          label: "Upload File",
          accelerator: "CmdOrCtrl+U",
          click: () => {
            mainWindow?.webContents.send("menu:upload-file")
          },
        },
        {
          label: "Upload Files",
          accelerator: "CmdOrCtrl+Shift+U",
          click: () => {
            mainWindow?.webContents.send("menu:upload-files")
          },
        },
        { type: "separator" as const },
        {
          label: "Refresh",
          accelerator: "CmdOrCtrl+R",
          click: () => {
            mainWindow?.webContents.send("menu:refresh")
          },
        },
        { type: "separator" as const },
        ...(isMac ? [] : [{ role: "quit" as const }]),
      ],
    },

    // Edit Menu
    {
      label: "Edit",
      submenu: [
        { role: "undo" as const },
        { role: "redo" as const },
        { type: "separator" as const },
        { role: "cut" as const },
        { role: "copy" as const },
        { role: "paste" as const },
        ...(isMac
          ? [
              { role: "pasteAndMatchStyle" as const },
              { role: "delete" as const },
              { role: "selectAll" as const },
              { type: "separator" as const },
              {
                label: "Speech",
                submenu: [{ role: "startSpeaking" as const }, { role: "stopSpeaking" as const }],
              },
            ]
          : [{ role: "delete" as const }, { type: "separator" as const }, { role: "selectAll" as const }]),
      ],
    },

    // View Menu
    {
      label: "View",
      submenu: [
        {
          label: "Dashboard",
          accelerator: "CmdOrCtrl+1",
          click: () => {
            mainWindow?.webContents.send("menu:navigate", "dashboard")
          },
        },
        {
          label: "Buckets",
          accelerator: "CmdOrCtrl+2",
          click: () => {
            mainWindow?.webContents.send("menu:navigate", "buckets")
          },
        },
        {
          label: "Settings",
          accelerator: "CmdOrCtrl+,",
          click: () => {
            mainWindow?.webContents.send("menu:navigate", "settings")
          },
        },
        { type: "separator" as const },
        { role: "reload" as const },
        { role: "forceReload" as const },
        { role: "toggleDevTools" as const },
        { type: "separator" as const },
        { role: "resetZoom" as const },
        { role: "zoomIn" as const },
        { role: "zoomOut" as const },
        { type: "separator" as const },
        { role: "togglefullscreen" as const },
      ],
    },

    // Window Menu
    {
      label: "Window",
      submenu: [
        { role: "minimize" as const },
        { role: "zoom" as const },
        ...(isMac
          ? [
              { type: "separator" as const },
              { role: "front" as const },
              { type: "separator" as const },
              { role: "window" as const },
            ]
          : [{ role: "close" as const }]),
      ],
    },

    // Help Menu
    {
      role: "help" as const,
      submenu: [
        {
          label: "Learn More",
          click: async () => {
            await shell.openExternal("https://github.com/getgrowly/s3-browser")
          },
        },
        {
          label: "Documentation",
          click: async () => {
            await shell.openExternal("https://github.com/getgrowly/s3-browser#readme")
          },
        },
        { type: "separator" as const },
        {
          label: "Report Issue",
          click: async () => {
            await shell.openExternal("https://github.com/getgrowly/s3-browser/issues")
          },
        },
        ...(!isMac
          ? [
              { type: "separator" as const },
              {
                label: "Check for Updates...",
                click: () => {
                  if (!isDev) {
                    autoUpdater.checkForUpdatesAndNotify()
                  }
                },
              },
              { type: "separator" as const },
              {
                label: `About ${app.name}`,
                click: () => {
                  dialog.showMessageBox(mainWindow!, {
                    type: "info",
                    title: `About ${app.name}`,
                    message: `${app.name}`,
                    detail: `Version: ${app.getVersion()}\n\nA powerful S3 browser for AWS and S3-compatible storage services.`,
                  })
                },
              },
            ]
          : []),
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function createWindow() {
  log.info("Creating main window")

  // Determine icon path based on platform
  // Note: macOS dock icon is set via Info.plist in production, but we can set window icon with PNG
  let iconPath: string | undefined

  // For all platforms, try to use PNG first (works best in development)
  const pngPath = path.join(__dirname, "../../public/icon.png")
  const logoPngPath = path.join(__dirname, "../../public/s3-logo.png")

  if (fs.existsSync(pngPath)) {
    iconPath = pngPath
    log.info("Using icon.png")
  } else if (fs.existsSync(logoPngPath)) {
    iconPath = logoPngPath
    log.info("Using s3-logo.png as fallback")
  }

  // For Windows, prefer .ico if available
  if (process.platform === "win32") {
    const icoPath = path.join(__dirname, "../../public/icon.ico")
    if (fs.existsSync(icoPath)) {
      iconPath = icoPath
      log.info("Using icon.ico for Windows")
    }
  }

  log.info("Final icon path:", iconPath || "none")
  log.info("__dirname:", __dirname)
  log.info("Icon exists:", iconPath ? fs.existsSync(iconPath) : false)

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      sandbox: false,
    },
    titleBarStyle: "hiddenInset",
    backgroundColor: "#ffffff",
    show: false, // Don't show until ready
    icon: iconPath,
  })

  // Load the app
  if (isDev) {
    mainWindow.loadURL("http://localhost:54000")
    mainWindow.webContents.openDevTools()
  } else {
    // In production, Next.js server will be running on a local port
    mainWindow.loadURL(`http://localhost:${NEXT_SERVER_PORT}`)
  }

  // Show window when ready
  mainWindow.once("ready-to-show", () => {
    log.info("Window ready to show")
    mainWindow?.show()
  })

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

// App event handlers
app.whenReady().then(async () => {
  log.info("App is ready")

  // Set dock icon for macOS
  if (process.platform === "darwin" && app.dock) {
    const iconPath = path.join(__dirname, "../../public/icon.png")
    const logoPath = path.join(__dirname, "../../public/s3-logo.png")

    if (fs.existsSync(iconPath)) {
      app.dock.setIcon(iconPath)
      log.info("Set dock icon to:", iconPath)
    } else if (fs.existsSync(logoPath)) {
      app.dock.setIcon(logoPath)
      log.info("Set dock icon to:", logoPath)
    }
  }

  // Initialize database
  const userDataPath = app.getPath("userData")
  database = new ElectronDatabase(userDataPath)
  log.info("Database initialized at:", userDataPath)

  // Start Next.js server in production
  if (!isDev) {
    try {
      await startNextServer()
    } catch (error) {
      log.error("Failed to start Next.js server:", error)
      dialog.showErrorBox("Server Error", "Failed to start the application server. Please try again.")
      app.quit()
      return
    }
  }

  // Create custom menu
  createMenu()

  createWindow()

  // Check for updates in production
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify()
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("before-quit", () => {
  // Kill Next.js server if running
  if (nextServer) {
    log.info("Stopping Next.js server...")
    nextServer.kill()
    nextServer = null
  }
})

// IPC Handlers

// Database operations
ipcMain.handle("db:getConfigs", async () => {
  try {
    log.info("IPC: db:getConfigs")
    return database.getConfigs()
  } catch (error) {
    log.error("Error in db:getConfigs:", error)
    throw error
  }
})

ipcMain.handle("db:saveConfig", async (_event, config) => {
  try {
    log.info("IPC: db:saveConfig", { name: config.name })
    return database.saveConfig(config)
  } catch (error) {
    log.error("Error in db:saveConfig:", error)
    throw error
  }
})

ipcMain.handle("db:updateConfig", async (_event, id, updates) => {
  try {
    log.info("IPC: db:updateConfig", { id })
    return database.updateConfig(id, updates)
  } catch (error) {
    log.error("Error in db:updateConfig:", error)
    throw error
  }
})

ipcMain.handle("db:deleteConfig", async (_event, id) => {
  try {
    log.info("IPC: db:deleteConfig", { id })
    return database.deleteConfig(id)
  } catch (error) {
    log.error("Error in db:deleteConfig:", error)
    throw error
  }
})

ipcMain.handle("db:getBuckets", async (_event, configId) => {
  try {
    log.info("IPC: db:getBuckets", { configId })
    return database.getBuckets(configId)
  } catch (error) {
    log.error("Error in db:getBuckets:", error)
    throw error
  }
})

ipcMain.handle("db:saveBucket", async (_event, configId, bucket) => {
  try {
    log.info("IPC: db:saveBucket", { configId, bucketName: bucket.Name })
    return database.saveBucket(configId, bucket)
  } catch (error) {
    log.error("Error in db:saveBucket:", error)
    throw error
  }
})

ipcMain.handle("db:saveBucketsBatch", async (_event, configId, buckets) => {
  try {
    log.info("IPC: db:saveBucketsBatch", { configId, count: buckets.length })
    return database.saveBucketsBatch(configId, buckets)
  } catch (error) {
    log.error("Error in db:saveBucketsBatch:", error)
    throw error
  }
})

ipcMain.handle("db:clearBucketsForConfig", async (_event, configId) => {
  try {
    log.info("IPC: db:clearBucketsForConfig", { configId })
    return database.clearBucketsForConfig(configId)
  } catch (error) {
    log.error("Error in db:clearBucketsForConfig:", error)
    throw error
  }
})

ipcMain.handle("db:deleteBucket", async (_event, configId, bucketName) => {
  try {
    log.info("IPC: db:deleteBucket", { configId, bucketName })
    return database.deleteBucket(configId, bucketName)
  } catch (error) {
    log.error("Error in db:deleteBucket:", error)
    throw error
  }
})

ipcMain.handle("db:getObjects", async (_event, configId, bucketName, prefix) => {
  try {
    log.info("IPC: db:getObjects", { configId, bucketName, prefix })
    return database.getObjects(configId, bucketName, prefix)
  } catch (error) {
    log.error("Error in db:getObjects:", error)
    throw error
  }
})

ipcMain.handle("db:saveObject", async (_event, configId, bucketName, object, prefix) => {
  try {
    log.info("IPC: db:saveObject", { configId, bucketName, key: object.Key, prefix })
    return database.saveObject(configId, bucketName, object, prefix)
  } catch (error) {
    log.error("Error in db:saveObject:", error)
    throw error
  }
})

ipcMain.handle("db:saveObjectsBatch", async (_event, configId, bucketName, objects, prefix) => {
  try {
    log.info("IPC: db:saveObjectsBatch", { configId, bucketName, count: objects.length, prefix })
    return database.saveObjectsBatch(configId, bucketName, objects, prefix)
  } catch (error) {
    log.error("Error in db:saveObjectsBatch:", error)
    throw error
  }
})

ipcMain.handle("db:clearObjectsForBucket", async (_event, configId, bucketName, prefix) => {
  try {
    log.info("IPC: db:clearObjectsForBucket", { configId, bucketName, prefix })
    return database.clearObjectsForBucket(configId, bucketName, prefix)
  } catch (error) {
    log.error("Error in db:clearObjectsForBucket:", error)
    throw error
  }
})

ipcMain.handle("db:deleteObject", async (_event, configId, bucketName, key) => {
  try {
    log.info("IPC: db:deleteObject", { configId, bucketName, key })
    return database.deleteObject(configId, bucketName, key)
  } catch (error) {
    log.error("Error in db:deleteObject:", error)
    throw error
  }
})

// Sync metadata operations
ipcMain.handle("db:getSyncMetadata", async (_event, configId, bucketName, prefix) => {
  try {
    log.info("IPC: db:getSyncMetadata", { configId, bucketName, prefix })
    return database.getSyncMetadata(configId, bucketName, prefix)
  } catch (error) {
    log.error("Error in db:getSyncMetadata:", error)
    throw error
  }
})

ipcMain.handle("db:updateSyncMetadata", async (_event, configId, syncStatus, bucketName, prefix, errorMessage) => {
  try {
    log.info("IPC: db:updateSyncMetadata", { configId, syncStatus, bucketName, prefix })
    return database.updateSyncMetadata(configId, syncStatus, bucketName, prefix, errorMessage)
  } catch (error) {
    log.error("Error in db:updateSyncMetadata:", error)
    throw error
  }
})

ipcMain.handle("db:getAllSyncMetadata", async (_event, configId) => {
  try {
    log.info("IPC: db:getAllSyncMetadata", { configId })
    return database.getAllSyncMetadata(configId)
  } catch (error) {
    log.error("Error in db:getAllSyncMetadata:", error)
    throw error
  }
})

// Search operations
ipcMain.handle("db:searchObjects", async (_event, configId, bucketName, searchQuery) => {
  try {
    log.info("IPC: db:searchObjects", { configId, bucketName, query: searchQuery })
    return database.searchObjects(configId, bucketName, searchQuery)
  } catch (error) {
    log.error("Error in db:searchObjects:", error)
    throw error
  }
})

ipcMain.handle("db:searchAllObjects", async (_event, configId, searchQuery) => {
  try {
    log.info("IPC: db:searchAllObjects", { configId, query: searchQuery })
    return database.searchAllObjects(configId, searchQuery)
  } catch (error) {
    log.error("Error in db:searchAllObjects:", error)
    throw error
  }
})

ipcMain.handle("db:searchBuckets", async (_event, configId, searchQuery) => {
  try {
    log.info("IPC: db:searchBuckets", { configId, query: searchQuery })
    return database.searchBuckets(configId, searchQuery)
  } catch (error) {
    log.error("Error in db:searchBuckets:", error)
    throw error
  }
})

// App settings operations
ipcMain.handle("app-settings:get", async (_event, key: string) => {
  try {
    log.info("IPC: app-settings:get", { key })
    return database.getAppSetting(key)
  } catch (error) {
    log.error("Error in app-settings:get:", error)
    throw error
  }
})

ipcMain.handle("app-settings:set", async (_event, key: string, value: string | null) => {
  try {
    log.info("IPC: app-settings:set", { key, hasValue: !!value })
    database.setAppSetting(key, value)
  } catch (error) {
    log.error("Error in app-settings:set:", error)
    throw error
  }
})

// File dialog operations
ipcMain.handle("dialog:openFile", async () => {
  try {
    log.info("IPC: dialog:openFile")
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ["openFile"],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const filePath = result.filePaths[0]
    const buffer = fs.readFileSync(filePath)
    const fileName = path.basename(filePath)

    return {
      path: fileName,
      buffer: Array.from(buffer), // Convert to array for IPC serialization
    }
  } catch (error) {
    log.error("Error in dialog:openFile:", error)
    throw error
  }
})

ipcMain.handle("dialog:openFiles", async () => {
  try {
    log.info("IPC: dialog:openFiles")
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ["openFile", "multiSelections"],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return []
    }

    return result.filePaths.map((filePath) => {
      const buffer = fs.readFileSync(filePath)
      const fileName = path.basename(filePath)

      return {
        path: fileName,
        buffer: Array.from(buffer),
      }
    })
  } catch (error) {
    log.error("Error in dialog:openFiles:", error)
    throw error
  }
})

ipcMain.handle("dialog:saveFile", async (_event, data: number[], filename: string) => {
  try {
    log.info("IPC: dialog:saveFile", { filename })
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: filename,
    })

    if (result.canceled || !result.filePath) {
      return false
    }

    const buffer = Buffer.from(data)
    fs.writeFileSync(result.filePath, buffer)
    return true
  } catch (error) {
    log.error("Error in dialog:saveFile:", error)
    throw error
  }
})

// System operations
ipcMain.handle("app:getVersion", async () => {
  return app.getVersion()
})

ipcMain.handle("app:getPlatform", async () => {
  return process.platform
})

ipcMain.handle("shell:openExternal", async (_event, url: string) => {
  try {
    log.info("IPC: shell:openExternal", { url })
    await shell.openExternal(url)
    return true
  } catch (error) {
    log.error("Error in shell:openExternal:", error)
    return false
  }
})

// Auto-updater events
autoUpdater.on("checking-for-update", () => {
  log.info("Checking for updates...")
})

autoUpdater.on("update-available", (info) => {
  log.info("Update available:", info)
  mainWindow?.webContents.send("update:available", info)
})

autoUpdater.on("update-not-available", (info) => {
  log.info("Update not available:", info)
})

autoUpdater.on("error", (err) => {
  log.error("Error in auto-updater:", err)
})

autoUpdater.on("download-progress", (progressObj) => {
  log.info("Download progress:", progressObj.percent)
  mainWindow?.webContents.send("update:progress", progressObj)
})

autoUpdater.on("update-downloaded", (info) => {
  log.info("Update downloaded:", info)
  mainWindow?.webContents.send("update:downloaded", info)
})

// Handle update install
ipcMain.handle("update:install", async () => {
  autoUpdater.quitAndInstall()
})
