import { createContext, useContext, useReducer, useEffect } from 'react'

const TimeContext = createContext(null)

const initialState = {
  entries: [],
  activeEntry: null,
  categories: [],
  defaultCategoryId: null,
  loading: true,
}

function timeReducer(state, action) {
  switch (action.type) {
    case 'SET_ENTRIES':
      return { ...state, entries: action.payload, loading: false }
    case 'SET_ACTIVE_ENTRY':
      return { ...state, activeEntry: action.payload }
    case 'ADD_ENTRY':
      return { ...state, entries: [...state.entries, action.payload] }
    case 'UPDATE_ENTRY':
      return {
        ...state,
        entries: state.entries.map(e =>
          e.id === action.payload.id ? { ...e, ...action.payload.updates } : e
        ),
      }
    case 'DELETE_ENTRY':
      return {
        ...state,
        entries: state.entries.filter(e => e.id !== action.payload),
      }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload }
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.payload] }
    case 'UPDATE_CATEGORY':
      return {
        ...state,
        categories: state.categories.map(c =>
          c.id === action.payload.id ? { ...c, ...action.payload.updates } : c
        ),
      }
    case 'DELETE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter(c => c.id !== action.payload),
        defaultCategoryId: state.defaultCategoryId === action.payload ? null : state.defaultCategoryId,
      }
    case 'SET_DEFAULT_CATEGORY_ID':
      return { ...state, defaultCategoryId: action.payload }
    default:
      return state
  }
}

export function TimeProvider({ children }) {
  const [state, dispatch] = useReducer(timeReducer, initialState)

  useEffect(() => {
    async function loadData() {
      if (window.electronAPI) {
        const entries = await window.electronAPI.getEntries()
        const activeEntry = await window.electronAPI.getActiveEntry()
        const categories = await window.electronAPI.getCategories()
        const defaultCategoryId = await window.electronAPI.getDefaultCategoryId()
        dispatch({ type: 'SET_ENTRIES', payload: entries })
        dispatch({ type: 'SET_ACTIVE_ENTRY', payload: activeEntry })
        dispatch({ type: 'SET_CATEGORIES', payload: categories })
        dispatch({ type: 'SET_DEFAULT_CATEGORY_ID', payload: defaultCategoryId })

        // Auto-sync Microsoft Calendar if enabled
        try {
          const msSettings = await window.electronAPI.microsoftGetSettings()
          if (msSettings.isConnected && msSettings.autoSync) {
            const now = new Date()
            const day = now.getDay()
            const diffToMonday = day === 0 ? -6 : 1 - day
            const monday = new Date(now)
            monday.setDate(now.getDate() + diffToMonday)
            monday.setHours(0, 0, 0, 0)
            const friday = new Date(monday)
            friday.setDate(monday.getDate() + 4)
            friday.setHours(23, 59, 59, 999)

            const result = await window.electronAPI.microsoftSync(
              monday.toISOString(),
              friday.toISOString()
            )
            if (result.created > 0) {
              const updatedEntries = await window.electronAPI.getEntries()
              dispatch({ type: 'SET_ENTRIES', payload: updatedEntries })
            }
          }
        } catch (err) {
          console.error('Microsoft auto-sync failed:', err)
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }
    loadData()
  }, [])

  async function startEntry(description, categoryId = null) {
    if (window.electronAPI) {
      const entry = await window.electronAPI.startEntry(description, categoryId)
      dispatch({ type: 'SET_ACTIVE_ENTRY', payload: entry })
      return entry
    }
  }

  async function stopEntry() {
    if (window.electronAPI) {
      const entry = await window.electronAPI.stopEntry()
      if (entry) {
        dispatch({ type: 'ADD_ENTRY', payload: entry })
        dispatch({ type: 'SET_ACTIVE_ENTRY', payload: null })
      }
      return entry
    }
  }

  async function updateEntry(id, updates) {
    if (window.electronAPI) {
      await window.electronAPI.updateEntry(id, updates)
      dispatch({ type: 'UPDATE_ENTRY', payload: { id, updates } })
    }
  }

  async function deleteEntry(id) {
    if (window.electronAPI) {
      await window.electronAPI.deleteEntry(id)
      dispatch({ type: 'DELETE_ENTRY', payload: id })
    }
  }

  async function createEntry(entry) {
    if (window.electronAPI) {
      const newEntry = await window.electronAPI.createEntry(entry)
      dispatch({ type: 'ADD_ENTRY', payload: newEntry })
      return newEntry
    }
  }

  async function reloadEntries() {
    if (window.electronAPI) {
      const entries = await window.electronAPI.getEntries()
      dispatch({ type: 'SET_ENTRIES', payload: entries })
    }
  }

  async function updateActiveDescription(description) {
    if (window.electronAPI && state.activeEntry) {
      await window.electronAPI.updateActiveDescription(description)
      dispatch({
        type: 'SET_ACTIVE_ENTRY',
        payload: { ...state.activeEntry, description },
      })
    }
  }

  async function updateActiveEntry(updates) {
    if (window.electronAPI && state.activeEntry) {
      await window.electronAPI.updateActiveEntry(updates)
      dispatch({
        type: 'SET_ACTIVE_ENTRY',
        payload: { ...state.activeEntry, ...updates },
      })
    }
  }

  async function createCategory(name, color) {
    if (window.electronAPI) {
      const category = await window.electronAPI.createCategory(name, color)
      dispatch({ type: 'ADD_CATEGORY', payload: category })
      return category
    }
  }

  async function updateCategory(id, updates) {
    if (window.electronAPI) {
      await window.electronAPI.updateCategory(id, updates)
      dispatch({ type: 'UPDATE_CATEGORY', payload: { id, updates } })
    }
  }

  async function deleteCategory(id) {
    if (window.electronAPI) {
      await window.electronAPI.deleteCategory(id)
      dispatch({ type: 'DELETE_CATEGORY', payload: id })
    }
  }

  function getCategoryById(id) {
    return state.categories.find(c => c.id === id) || null
  }

  async function setDefaultCategoryId(id) {
    if (window.electronAPI) {
      await window.electronAPI.setDefaultCategoryId(id)
      dispatch({ type: 'SET_DEFAULT_CATEGORY_ID', payload: id })
    }
  }

  const value = {
    ...state,
    startEntry,
    stopEntry,
    updateEntry,
    deleteEntry,
    createEntry,
    reloadEntries,
    updateActiveDescription,
    updateActiveEntry,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryById,
    setDefaultCategoryId,
  }

  return <TimeContext.Provider value={value}>{children}</TimeContext.Provider>
}

export function useTime() {
  const context = useContext(TimeContext)
  if (!context) {
    throw new Error('useTime must be used within a TimeProvider')
  }
  return context
}
