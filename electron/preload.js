const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getEntries: () => ipcRenderer.invoke('get-entries'),
  getActiveEntry: () => ipcRenderer.invoke('get-active-entry'),
  startEntry: (description, categoryId) => ipcRenderer.invoke('start-entry', description, categoryId),
  stopEntry: () => ipcRenderer.invoke('stop-entry'),
  updateEntry: (id, updates) => ipcRenderer.invoke('update-entry', id, updates),
  deleteEntry: (id) => ipcRenderer.invoke('delete-entry', id),
  createEntry: (entry) => ipcRenderer.invoke('create-entry', entry),
  updateActiveDescription: (description) => ipcRenderer.invoke('update-active-description', description),
  updateActiveEntry: (updates) => ipcRenderer.invoke('update-active-entry', updates),
  getCategories: () => ipcRenderer.invoke('get-categories'),
  createCategory: (name, color) => ipcRenderer.invoke('create-category', name, color),
  updateCategory: (id, updates) => ipcRenderer.invoke('update-category', id, updates),
  deleteCategory: (id) => ipcRenderer.invoke('delete-category', id),
  getDefaultCategoryId: () => ipcRenderer.invoke('get-default-category-id'),
  setDefaultCategoryId: (id) => ipcRenderer.invoke('set-default-category-id', id),

  // Microsoft Calendar
  microsoftGetSettings: () => ipcRenderer.invoke('microsoft-get-settings'),
  microsoftSetClientId: (clientId) => ipcRenderer.invoke('microsoft-set-client-id', clientId),
  microsoftConnect: () => ipcRenderer.invoke('microsoft-connect'),
  microsoftDisconnect: () => ipcRenderer.invoke('microsoft-disconnect'),
  microsoftGetProfile: () => ipcRenderer.invoke('microsoft-get-profile'),
  microsoftSync: (startDate, endDate) => ipcRenderer.invoke('microsoft-sync', startDate, endDate),
  microsoftSetSyncCategory: (categoryId) => ipcRenderer.invoke('microsoft-set-sync-category', categoryId),
  microsoftSetAutoSync: (enabled) => ipcRenderer.invoke('microsoft-set-auto-sync', enabled),
})
