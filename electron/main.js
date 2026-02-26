import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { createStore } from './store.js'
import { createMicrosoftAuth } from './microsoft-auth.js'
import { createMicrosoftCalendar } from './microsoft-calendar.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const isDev = process.env.NODE_ENV !== 'production' || !app.isPackaged

let mainWindow
let store
let microsoftAuth
let microsoftCalendar

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  store = createStore()

  // IPC handlers for time entries
  ipcMain.handle('get-entries', () => store.getEntries())
  ipcMain.handle('get-active-entry', () => store.getActiveEntry())
  ipcMain.handle('start-entry', (_, description, categoryId) => store.startEntry(description, categoryId))
  ipcMain.handle('stop-entry', () => store.stopEntry())
  ipcMain.handle('update-entry', (_, id, updates) => store.updateEntry(id, updates))
  ipcMain.handle('delete-entry', (_, id) => store.deleteEntry(id))
  ipcMain.handle('create-entry', (_, entry) => store.createEntry(entry))
  ipcMain.handle('update-active-description', (_, description) => store.updateActiveDescription(description))
  ipcMain.handle('update-active-entry', (_, updates) => store.updateActiveEntry(updates))

  // IPC handlers for categories
  ipcMain.handle('get-categories', () => store.getCategories())
  ipcMain.handle('create-category', (_, name, color) => store.createCategory(name, color))
  ipcMain.handle('update-category', (_, id, updates) => store.updateCategory(id, updates))
  ipcMain.handle('delete-category', (_, id) => store.deleteCategory(id))
  ipcMain.handle('get-default-category-id', () => store.getDefaultCategoryId())
  ipcMain.handle('set-default-category-id', (_, id) => store.setDefaultCategoryId(id))

  // Initialize Microsoft integration
  microsoftAuth = createMicrosoftAuth(store)
  microsoftCalendar = createMicrosoftCalendar(store, microsoftAuth)

  // Microsoft IPC handlers
  ipcMain.handle('microsoft-get-settings', () => store.getMicrosoftSettings())
  ipcMain.handle('microsoft-set-client-id', (_, clientId) => {
    store.setMicrosoftClientId(clientId)
    return store.getMicrosoftSettings()
  })
  ipcMain.handle('microsoft-connect', async () => {
    const clientId = store.getMicrosoftClientId()
    if (!clientId) {
      throw new Error('Client ID not configured')
    }
    await microsoftAuth.startAuthFlow(clientId)
    const profile = await microsoftCalendar.getUserProfile(clientId)
    return { success: true, profile }
  })
  ipcMain.handle('microsoft-disconnect', () => {
    microsoftAuth.logout()
    return store.getMicrosoftSettings()
  })
  ipcMain.handle('microsoft-get-profile', async () => {
    const clientId = store.getMicrosoftClientId()
    if (!clientId) return null
    try {
      return await microsoftCalendar.getUserProfile(clientId)
    } catch {
      return null
    }
  })
  ipcMain.handle('microsoft-sync', async (_, startDate, endDate) => {
    const clientId = store.getMicrosoftClientId()
    const syncCategoryId = store.getMicrosoftSyncCategoryId()
    if (!clientId) {
      throw new Error('Client ID not configured')
    }
    const created = await microsoftCalendar.syncCalendarToEntries(
      clientId,
      startDate,
      endDate,
      syncCategoryId
    )
    return { created: created.length, entries: created }
  })
  ipcMain.handle('microsoft-set-sync-category', (_, categoryId) => {
    store.setMicrosoftSyncCategoryId(categoryId)
    return store.getMicrosoftSettings()
  })
  ipcMain.handle('microsoft-set-auto-sync', (_, enabled) => {
    store.setMicrosoftAutoSync(enabled)
    return store.getMicrosoftSettings()
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
