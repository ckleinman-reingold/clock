import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const DEFAULT_CATEGORIES = [
  { id: 'dev', name: 'Development', color: '#667eea' },
  { id: 'meeting', name: 'Meeting', color: '#f5576c' },
  { id: 'research', name: 'Research', color: '#43a047' },
  { id: 'admin', name: 'Admin', color: '#ff9800' },
  { id: 'break', name: 'Break', color: '#78909c' },
]

export function createStore() {
  const userDataPath = app.getPath('userData')
  const dataFilePath = path.join(userDataPath, 'time-tracker-data.json')

  function generateId() {
    return crypto.randomUUID()
  }

  function readData() {
    try {
      if (fs.existsSync(dataFilePath)) {
        const data = fs.readFileSync(dataFilePath, 'utf-8')
        return JSON.parse(data)
      }
    } catch (error) {
      console.error('Error reading data file:', error)
    }
    return {
      entries: [],
      activeEntry: null,
      categories: undefined,
      defaultCategoryId: null,
      microsoft: {
        clientId: null,
        tokens: null,
        codeVerifier: null,
        syncedIds: [],
        syncCategoryId: null,
        autoSync: false,
      },
    }
  }

  function getMicrosoftConfig() {
    const data = readData()
    return data.microsoft || {}
  }

  function updateMicrosoftConfig(updates) {
    const data = readData()
    data.microsoft = { ...data.microsoft, ...updates }
    writeData(data)
    return data.microsoft
  }

  function writeData(data) {
    try {
      fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf-8')
    } catch (error) {
      console.error('Error writing data file:', error)
    }
  }

  return {
    getEntries() {
      return readData().entries
    },

    getActiveEntry() {
      return readData().activeEntry
    },

    getCategories() {
      const data = readData()
      if (data.categories === undefined) {
        data.categories = DEFAULT_CATEGORIES
        writeData(data)
      }
      return data.categories
    },

    createCategory(name, color) {
      const data = readData()
      if (!data.categories) {
        data.categories = DEFAULT_CATEGORIES
      }
      const newCategory = {
        id: generateId(),
        name,
        color,
      }
      data.categories.push(newCategory)
      writeData(data)
      return newCategory
    },

    updateCategory(id, updates) {
      const data = readData()
      if (!data.categories) return null
      const index = data.categories.findIndex(c => c.id === id)
      if (index !== -1) {
        data.categories[index] = { ...data.categories[index], ...updates }
        writeData(data)
        return data.categories[index]
      }
      return null
    },

    deleteCategory(id) {
      const data = readData()
      if (!data.categories) return true
      data.categories = data.categories.filter(c => c.id !== id)
      if (data.defaultCategoryId === id) {
        data.defaultCategoryId = null
      }
      writeData(data)
      return true
    },

    getDefaultCategoryId() {
      return readData().defaultCategoryId || null
    },

    setDefaultCategoryId(id) {
      const data = readData()
      data.defaultCategoryId = id
      writeData(data)
      return id
    },

    startEntry(description, categoryId = null) {
      const data = readData()
      const newEntry = {
        id: generateId(),
        description: description || '',
        startTime: new Date().toISOString(),
        categoryId,
      }
      data.activeEntry = newEntry
      writeData(data)
      return newEntry
    },

    stopEntry() {
      const data = readData()
      if (data.activeEntry) {
        const completedEntry = {
          ...data.activeEntry,
          endTime: new Date().toISOString(),
        }
        data.entries.push(completedEntry)
        data.activeEntry = null
        writeData(data)
        return completedEntry
      }
      return null
    },

    updateEntry(id, updates) {
      const data = readData()
      const index = data.entries.findIndex(e => e.id === id)
      if (index !== -1) {
        data.entries[index] = { ...data.entries[index], ...updates }
        writeData(data)
        return data.entries[index]
      }
      return null
    },

    createEntry(entry) {
      const data = readData()
      const newEntry = {
        id: generateId(),
        description: entry.description || '',
        startTime: entry.startTime,
        endTime: entry.endTime,
        categoryId: entry.categoryId || null,
      }
      data.entries.push(newEntry)
      writeData(data)
      return newEntry
    },

    deleteEntry(id) {
      const data = readData()
      data.entries = data.entries.filter(e => e.id !== id)
      writeData(data)
      return true
    },

    updateActiveDescription(description) {
      const data = readData()
      if (data.activeEntry) {
        data.activeEntry.description = description
        writeData(data)
        return data.activeEntry
      }
      return null
    },

    updateActiveEntry(updates) {
      const data = readData()
      if (data.activeEntry) {
        data.activeEntry = { ...data.activeEntry, ...updates }
        writeData(data)
        return data.activeEntry
      }
      return null
    },

    // Microsoft Calendar methods
    getMicrosoftClientId() {
      return getMicrosoftConfig().clientId
    },

    setMicrosoftClientId(clientId) {
      return updateMicrosoftConfig({ clientId })
    },

    getMicrosoftTokens() {
      return getMicrosoftConfig().tokens
    },

    setMicrosoftTokens(tokens) {
      return updateMicrosoftConfig({ tokens })
    },

    getMicrosoftCodeVerifier() {
      return getMicrosoftConfig().codeVerifier
    },

    setMicrosoftCodeVerifier(verifier) {
      return updateMicrosoftConfig({ codeVerifier: verifier })
    },

    getMicrosoftSyncedIds() {
      return getMicrosoftConfig().syncedIds || []
    },

    setMicrosoftSyncedIds(ids) {
      return updateMicrosoftConfig({ syncedIds: ids })
    },

    getMicrosoftSyncCategoryId() {
      return getMicrosoftConfig().syncCategoryId
    },

    setMicrosoftSyncCategoryId(categoryId) {
      return updateMicrosoftConfig({ syncCategoryId: categoryId })
    },

    getMicrosoftAutoSync() {
      return getMicrosoftConfig().autoSync || false
    },

    setMicrosoftAutoSync(enabled) {
      return updateMicrosoftConfig({ autoSync: enabled })
    },

    getMicrosoftSettings() {
      const config = getMicrosoftConfig()
      return {
        clientId: config.clientId,
        isConnected: !!config.tokens,
        autoSync: config.autoSync || false,
        syncCategoryId: config.syncCategoryId,
      }
    },
  }
}
