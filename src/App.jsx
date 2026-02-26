import { useState } from 'react'
import Timer from './components/Timer'
import WeekView from './components/WeekView'
import CategoryPanel from './components/CategoryPanel'
import MicrosoftSettings from './components/MicrosoftSettings'

function App() {
  const [showMicrosoftSettings, setShowMicrosoftSettings] = useState(false)

  return (
    <div className="app">
      <header className="app-header">
        <h1>Time Tracker</h1>
        <button
          className="app-settings-btn"
          onClick={() => setShowMicrosoftSettings(true)}
          title="Microsoft Calendar Settings"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M0 0h11.5v11.5H0V0zm12.5 0H24v11.5H12.5V0zM0 12.5h11.5V24H0V12.5zm12.5 0H24V24H12.5V12.5z"/>
          </svg>
        </button>
      </header>
      <div className="app-body">
        <main className="app-main">
          <Timer />
          <WeekView />
        </main>
        <CategoryPanel />
      </div>

      {showMicrosoftSettings && (
        <MicrosoftSettings onClose={() => setShowMicrosoftSettings(false)} />
      )}
    </div>
  )
}

export default App
