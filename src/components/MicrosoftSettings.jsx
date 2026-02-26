import { useState, useEffect } from 'react'
import { useTime } from '../context/TimeContext'
import './MicrosoftSettings.css'

function MicrosoftSettings({ onClose }) {
  const { categories, entries, reloadEntries } = useTime()
  const [settings, setSettings] = useState(null)
  const [profile, setProfile] = useState(null)
  const [clientId, setClientId] = useState('')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [syncResult, setSyncResult] = useState(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    if (window.electronAPI) {
      const s = await window.electronAPI.microsoftGetSettings()
      setSettings(s)
      setClientId(s.clientId || '')
      if (s.isConnected) {
        const p = await window.electronAPI.microsoftGetProfile()
        setProfile(p)
      }
      setLoading(false)
    }
  }

  const handleSaveClientId = async () => {
    if (window.electronAPI) {
      setError('')
      const s = await window.electronAPI.microsoftSetClientId(clientId.trim())
      setSettings(s)
    }
  }

  const handleConnect = async () => {
    if (window.electronAPI) {
      setError('')
      setLoading(true)
      try {
        const result = await window.electronAPI.microsoftConnect()
        setProfile(result.profile)
        await loadSettings()
      } catch (err) {
        setError(err.message || 'Connection failed')
      }
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (window.electronAPI) {
      await window.electronAPI.microsoftDisconnect()
      setProfile(null)
      await loadSettings()
    }
  }

  const handleSyncNow = async () => {
    if (window.electronAPI) {
      setSyncing(true)
      setSyncResult(null)
      setError('')
      try {
        // Sync current week (Monday to Friday)
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
        setSyncResult(result)
        if (reloadEntries) {
          await reloadEntries()
        }
      } catch (err) {
        setError(err.message || 'Sync failed')
      }
      setSyncing(false)
    }
  }

  const handleSyncCategoryChange = async (e) => {
    if (window.electronAPI) {
      const s = await window.electronAPI.microsoftSetSyncCategory(e.target.value || null)
      setSettings(s)
    }
  }

  const handleAutoSyncChange = async (e) => {
    if (window.electronAPI) {
      const s = await window.electronAPI.microsoftSetAutoSync(e.target.checked)
      setSettings(s)
    }
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (loading) {
    return (
      <div className="ms-settings-backdrop" onClick={handleBackdropClick}>
        <div className="ms-settings">
          <div className="ms-settings-loading">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="ms-settings-backdrop" onClick={handleBackdropClick}>
      <div className="ms-settings">
        <div className="ms-settings-header">
          <h3>Microsoft Calendar</h3>
          <button className="ms-settings-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="ms-settings-content">
          {/* Client ID Configuration */}
          <div className="ms-section">
            <label className="ms-label">Client ID (from Azure AD)</label>
            <div className="ms-input-row">
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Enter your Azure AD Client ID"
                className="ms-input"
              />
              <button
                onClick={handleSaveClientId}
                className="ms-btn secondary"
                disabled={!clientId.trim() || clientId === settings?.clientId}
              >
                Save
              </button>
            </div>
          </div>

          {/* Connection Status */}
          {settings?.clientId && (
            <div className="ms-section">
              <label className="ms-label">Connection</label>
              {settings.isConnected && profile ? (
                <div className="ms-connected">
                  <div className="ms-profile">
                    <span className="ms-profile-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </span>
                    <div className="ms-profile-info">
                      <span className="ms-profile-name">{profile.displayName}</span>
                      <span className="ms-profile-email">{profile.email}</span>
                    </div>
                  </div>
                  <button onClick={handleDisconnect} className="ms-btn danger">
                    Disconnect
                  </button>
                </div>
              ) : (
                <button onClick={handleConnect} className="ms-btn primary">
                  Connect Microsoft Account
                </button>
              )}
            </div>
          )}

          {/* Sync Settings */}
          {settings?.isConnected && (
            <>
              <div className="ms-section">
                <label className="ms-label">Sync Category</label>
                <select
                  value={settings.syncCategoryId || ''}
                  onChange={handleSyncCategoryChange}
                  className="ms-select"
                >
                  <option value="">Meeting (default)</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <p className="ms-hint">Category assigned to synced calendar events</p>
              </div>

              <div className="ms-section">
                <label className="ms-checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.autoSync}
                    onChange={handleAutoSyncChange}
                  />
                  <span>Auto-sync on app start</span>
                </label>
              </div>

              <div className="ms-section">
                <button
                  onClick={handleSyncNow}
                  className="ms-btn primary"
                  disabled={syncing}
                >
                  {syncing ? 'Syncing...' : 'Sync Now (This Week)'}
                </button>
                {syncResult && (
                  <p className="ms-success">
                    Synced {syncResult.created} new event{syncResult.created !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </>
          )}

          {error && <p className="ms-error">{error}</p>}
        </div>
      </div>
    </div>
  )
}

export default MicrosoftSettings
