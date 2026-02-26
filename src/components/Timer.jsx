import { useState, useEffect, useMemo } from 'react'
import { useTime } from '../context/TimeContext'
import { formatDuration, formatTotalDuration } from '../utils/time'
import Autocomplete from './Autocomplete'
import './Timer.css'

function getWorkWeekBounds(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  friday.setHours(23, 59, 59, 999)
  return { monday, friday }
}

function Timer() {
  const { activeEntry, entries, startEntry, stopEntry, updateActiveDescription, updateActiveEntry, categories, defaultCategoryId } = useTime()

  const categoryTotals = useMemo(() => {
    const totals = {}
    const { monday, friday } = getWorkWeekBounds(new Date())
    const allEntries = [...entries]
    if (activeEntry) allEntries.push(activeEntry)
    for (const entry of allEntries) {
      const entryStart = new Date(entry.startTime)
      if (entryStart < monday || entryStart > friday) continue
      const catId = entry.categoryId || 'uncategorized'
      const end = entry.endTime ? new Date(entry.endTime) : new Date()
      totals[catId] = (totals[catId] || 0) + (end - entryStart)
    }
    return totals
  }, [entries, activeEntry])
  const [description, setDescription] = useState('')
  const [elapsed, setElapsed] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')

  useEffect(() => {
    if (activeEntry) {
      setDescription(activeEntry.description || '')
      setSelectedCategoryId(activeEntry.categoryId || '')
    } else {
      setSelectedCategoryId(defaultCategoryId || '')
    }
  }, [activeEntry, defaultCategoryId])

  useEffect(() => {
    if (activeEntry) {
      const updateElapsed = () => {
        setElapsed(formatDuration(activeEntry.startTime))
      }
      updateElapsed()
      const interval = setInterval(updateElapsed, 1000)
      return () => clearInterval(interval)
    } else {
      setElapsed('')
    }
  }, [activeEntry])

  const handleToggle = async () => {
    if (activeEntry) {
      await stopEntry()
      setDescription('')
      setSelectedCategoryId(defaultCategoryId || '')
    } else {
      await startEntry(description, selectedCategoryId || null)
    }
  }

  const handleDescriptionChange = (e) => {
    const value = e.target.value
    setDescription(value)
    if (activeEntry) {
      updateActiveDescription(value)
    }
  }

  const handleCategoryChange = async (e) => {
    const categoryId = e.target.value || null
    setSelectedCategoryId(categoryId || '')
    if (activeEntry) {
      await updateActiveEntry({ categoryId })
    }
  }

  const isRunning = !!activeEntry

  return (
    <div className="timer">
      <div className="timer-controls">
        <button
          className={`timer-button ${isRunning ? 'running' : ''}`}
          onClick={handleToggle}
          aria-label={isRunning ? 'Stop timer' : 'Start timer'}
        >
          {isRunning ? (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <Autocomplete
          className="timer-input"
          placeholder="What are you working on?"
          value={description}
          onChange={handleDescriptionChange}
          entries={entries}
        />
        <select
          className="timer-category-select"
          value={selectedCategoryId}
          onChange={handleCategoryChange}
        >
          <option value="">
            Uncategorized{categoryTotals['uncategorized'] ? ` (${formatTotalDuration(categoryTotals['uncategorized'])})` : ''}
          </option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.name}{categoryTotals[category.id] ? ` (${formatTotalDuration(categoryTotals[category.id])})` : ''}
            </option>
          ))}
        </select>
      </div>
      {isRunning && (
        <div className="timer-elapsed">
          <span className="timer-dot"></span>
          {elapsed}
        </div>
      )}
    </div>
  )
}

export default Timer
