# Clock - Time Tracker App

A desktop time tracking application built with Electron and React.

## Tech Stack

- **Frontend**: React 19 + Vite
- **Desktop**: Electron
- **Storage**: JSON file (persisted to user data directory)

## Project Structure

```
clock/
├── electron/           # Electron main process
│   ├── main.js         # App entry, window creation, IPC handlers
│   ├── preload.js      # Exposes electronAPI to renderer
│   └── store.js        # JSON file storage for entries
├── src/                # React frontend
│   ├── main.jsx        # React entry point
│   ├── App.jsx         # Root component (Timer + WeekView)
│   ├── App.css         # Global styles
│   ├── components/
│   │   ├── Timer.jsx/css       # Start/stop timer, elapsed time display
│   │   ├── WeekView.jsx/css    # Weekly calendar grid view
│   │   ├── TimeBlock.jsx/css   # Individual time entry block
│   │   └── EditModal.jsx/css   # Edit entry modal
│   ├── context/
│   │   └── TimeContext.jsx     # Global state management
│   └── utils/
│       └── time.js             # Date/time utilities
└── package.json
```

## Architecture

### Data Flow

1. **Electron Main Process** (`electron/main.js`)
   - Creates the BrowserWindow
   - Sets up IPC handlers for CRUD operations
   - Uses `store.js` for persistence

2. **Preload Script** (`electron/preload.js`)
   - Bridges main and renderer processes
   - Exposes `window.electronAPI` with methods:
     - `getEntries()`, `getActiveEntry()`
     - `startEntry(description)`, `stopEntry()`
     - `updateEntry(id, updates)`, `deleteEntry(id)`
     - `updateActiveDescription(description)`

3. **TimeContext** (`src/context/TimeContext.jsx`)
   - React context providing global state
   - Wraps `electronAPI` calls with state management
   - Exposes: `entries`, `activeEntry`, `loading`, and action functions

4. **Components** consume context via `useTime()` hook

### Data Model

```javascript
// Time Entry
{
  id: string,           // UUID
  description: string,  // What the user is working on
  startTime: string,    // ISO timestamp
  endTime: string       // ISO timestamp (null if active)
}
```

### Storage

Data persisted to `{userData}/time-tracker-data.json`:
```json
{
  "entries": [...],      // Completed entries
  "activeEntry": null    // Currently running entry or null
}
```

## Key Components

### Timer (`src/components/Timer.jsx`)
- Play/stop button to control tracking
- Text input for description (editable while running)
- Shows elapsed time, updates every second when active

### WeekView (`src/components/WeekView.jsx`)
- 7-day calendar grid (Sunday-Saturday)
- Hours displayed: 7 AM - 7 PM (12 hours)
- Each hour cell = 90px tall
- Navigation: previous/next week, "Today" button
- Shows daily totals in header

### TimeBlock (`src/components/TimeBlock.jsx`)
- Visual representation of a time entry
- Positioned absolutely based on start/end times
- Handles overlapping entries with column layout
- Click to edit (opens EditModal)

### Time Utilities (`src/utils/time.js`)
- `getEntryPositions()`: Calculates block positions, handles overlaps
- `getTimePosition()`: Converts time to percentage position
- Time range: 7 AM (0%) to 7 PM (100%)
- Snaps to 15-minute increments

## Running the App

```bash
npm run dev      # Start Vite + Electron in dev mode
npm run build    # Build for production
npm run electron # Run Electron only (requires built frontend)
```

## Notes

- Short events (< 15 min) render at their actual size without minimum height constraints
- Overlapping events are displayed side-by-side in columns
- Active entry shown with pink/red gradient and glow animation
