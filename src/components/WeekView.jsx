import { useState, useMemo } from 'react'
import { useTime } from '../context/TimeContext'
import {
  formatDate,
  isSameDay,
  formatTotalDuration,
  getEntryPositions,
} from '../utils/time'
import TimeBlock from './TimeBlock'
import EditModal from './EditModal'
import AddEntryModal from './AddEntryModal'
import './WeekView.css'

function getWorkWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diffToMonday)
  d.setHours(0, 0, 0, 0)
  return d
}

function getWorkWeekEnd(date) {
  const monday = getWorkWeekStart(date)
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  friday.setHours(23, 59, 59, 999)
  return friday
}

function getWorkWeekDays(weekStart) {
  const days = []
  for (let i = 0; i < 5; i++) {
    const day = new Date(weekStart)
    day.setDate(weekStart.getDate() + i)
    days.push(day)
  }
  return days
}

function isWithinWorkWeek(date, weekStart, weekEnd) {
  const d = new Date(date)
  return d >= weekStart && d <= weekEnd
}

function WeekView() {
  const { entries, activeEntry, loading, categories, getCategoryById } = useTime()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [editingEntry, setEditingEntry] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const weekStart = useMemo(() => getWorkWeekStart(currentDate), [currentDate])
  const weekEnd = useMemo(() => getWorkWeekEnd(currentDate), [currentDate])
  const weekDays = useMemo(() => getWorkWeekDays(weekStart), [weekStart])

  const weekEntries = useMemo(() => {
    return entries.filter(entry => {
      const start = new Date(entry.startTime)
      return isWithinWorkWeek(start, weekStart, weekEnd)
    })
  }, [entries, weekStart, weekEnd])

  const hours = Array.from({ length: 12 }, (_, i) => i + 7) // 7am to 6pm (covers until 7pm)

  const goToPreviousWeek = () => {
    const prev = new Date(currentDate)
    prev.setDate(prev.getDate() - 7)
    setCurrentDate(prev)
  }

  const goToNextWeek = () => {
    const next = new Date(currentDate)
    next.setDate(next.getDate() + 7)
    setCurrentDate(next)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const getEntriesForDay = (day) => {
    return weekEntries.filter(entry => isSameDay(entry.startTime, day))
  }

  const getPositionedEntriesForDay = (day) => {
    const dayEntries = getEntriesForDay(day)
    return getEntryPositions(dayEntries, activeEntry, day)
  }

  const getTotalTimeForDay = (day) => {
    const dayEntries = getEntriesForDay(day)
    let total = 0
    for (const entry of dayEntries) {
      const start = new Date(entry.startTime)
      const end = entry.endTime ? new Date(entry.endTime) : new Date()
      total += end - start
    }
    if (activeEntry && isSameDay(activeEntry.startTime, day)) {
      total += new Date() - new Date(activeEntry.startTime)
    }
    return total
  }

  const isToday = (day) => {
    return isSameDay(day, new Date())
  }

  const roundToQuarterHour = (ms) => {
    const hours = ms / (1000 * 60 * 60)
    return Math.round(hours * 4) / 4
  }

  const getGroupedEntriesForDay = (day) => {
    const groups = {}
    const dayEntries = getEntriesForDay(day)

    for (const entry of dayEntries) {
      const name = entry.description || 'No description'
      const catId = entry.categoryId || null
      const key = `${catId || 'none'}::${name}`
      const start = new Date(entry.startTime)
      const end = entry.endTime ? new Date(entry.endTime) : new Date()
      const duration = end - start
      if (!groups[key]) {
        groups[key] = { name, categoryId: catId, duration: 0 }
      }
      groups[key].duration += duration
    }

    if (activeEntry && isSameDay(activeEntry.startTime, day)) {
      const name = activeEntry.description || 'No description'
      const catId = activeEntry.categoryId || null
      const key = `${catId || 'none'}::${name}`
      const duration = new Date() - new Date(activeEntry.startTime)
      if (!groups[key]) {
        groups[key] = { name, categoryId: catId, duration: 0 }
      }
      groups[key].duration += duration
    }

    return Object.values(groups)
      .map(({ name, categoryId, duration }) => ({
        name,
        categoryId,
        category: categoryId ? getCategoryById(categoryId) : null,
        hours: roundToQuarterHour(duration),
      }))
      .filter(g => g.hours > 0)
      .sort((a, b) => {
        // Sort by category name first (uncategorized last), then by hours
        const catA = a.category?.name || 'zzz'
        const catB = b.category?.name || 'zzz'
        if (catA !== catB) return catA.localeCompare(catB)
        return b.hours - a.hours
      })
  }

  const getCategoryTotalsForDay = (day) => {
    const totals = {}
    const dayEntries = getEntriesForDay(day)

    for (const entry of dayEntries) {
      const catId = entry.categoryId || null
      const start = new Date(entry.startTime)
      const end = entry.endTime ? new Date(entry.endTime) : new Date()
      const duration = end - start
      totals[catId] = (totals[catId] || 0) + duration
    }

    if (activeEntry && isSameDay(activeEntry.startTime, day)) {
      const catId = activeEntry.categoryId || null
      const duration = new Date() - new Date(activeEntry.startTime)
      totals[catId] = (totals[catId] || 0) + duration
    }

    return Object.entries(totals)
      .map(([catId, duration]) => ({
        category: catId ? getCategoryById(catId) : null,
        duration,
      }))
      .sort((a, b) => b.duration - a.duration)
  }

  if (loading) {
    return <div className="week-view-loading">Loading...</div>
  }

  return (
    <div className="week-view">
      <div className="week-view-header">
        <button className="week-nav-button" onClick={goToPreviousWeek}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <button className="week-today-button" onClick={goToToday}>
          Today
        </button>
        <h2 className="week-title">
          {formatDate(weekStart)} - {formatDate(weekEnd)}
        </h2>
        <button className="week-nav-button" onClick={goToNextWeek}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
        <button className="week-add-button" onClick={() => setShowAddModal(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Entry
        </button>
      </div>

      <div className="week-grid-container">
        <div className="week-grid">
          <div className="week-time-column">
            <div className="week-day-header"></div>
            {hours.map(hour => (
              <div key={hour} className="week-hour-label">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
            ))}
          </div>

          {weekDays.map(day => (
            <div key={day.toISOString()} className="week-day-column">
              <div className={`week-day-header ${isToday(day) ? 'today' : ''}`}>
                <span className="week-day-name">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span className={`week-day-number ${isToday(day) ? 'today' : ''}`}>
                  {day.getDate()}
                </span>
                <span className="week-day-total">
                  {formatTotalDuration(getTotalTimeForDay(day))}
                </span>
                {getTotalTimeForDay(day) > 0 && (
                  <div className="week-day-tooltip">
                    {getCategoryTotalsForDay(day).map(({ category, duration }) => (
                      <div key={category?.id || 'none'} className="tooltip-row">
                        <span
                          className="tooltip-color"
                          style={{ backgroundColor: category?.color || '#999' }}
                        />
                        <span className="tooltip-name">
                          {category?.name || 'Uncategorized'}
                        </span>
                        <span className="tooltip-duration">
                          {formatTotalDuration(duration)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="week-day-content">
                {hours.map(hour => (
                  <div key={hour} className="week-hour-cell"></div>
                ))}
                {getPositionedEntriesForDay(day).map(entry => (
                  <TimeBlock
                    key={entry.id}
                    entry={entry}
                    isActive={entry.isActive}
                    position={{
                      top: entry.top,
                      height: entry.height,
                      column: entry.column,
                      totalColumns: entry.totalColumns,
                    }}
                    onClick={() => setEditingEntry(entry)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="week-summary-row">
        <div className="week-summary-spacer"></div>
        {weekDays.map(day => {
          const grouped = getGroupedEntriesForDay(day)

          // Group entries by category
          const byCategory = {}
          for (const entry of grouped) {
            const catKey = entry.categoryId || 'uncategorized'
            if (!byCategory[catKey]) {
              byCategory[catKey] = {
                category: entry.category,
                entries: [],
                totalHours: 0
              }
            }
            byCategory[catKey].entries.push(entry)
            byCategory[catKey].totalHours += entry.hours
          }

          return (
            <div key={day.toISOString()} className="week-day-summary">
              {Object.entries(byCategory).map(([catKey, { category, entries, totalHours }]) => {
                const copyText = entries
                  .map(({ name, hours }) => `${hours.toFixed(2)}hr - ${name}`)
                  .join('\n')

                const handleCopy = () => {
                  navigator.clipboard.writeText(copyText)
                }

                return (
                  <div key={catKey} className="summary-category-group">
                    <div className="summary-category-header">
                      <span
                        className="summary-color"
                        style={{ backgroundColor: category?.color || '#999' }}
                      />
                      <span className="summary-category-name">{category?.name || 'Uncategorized'}</span>
                      <span className="summary-category-total">{totalHours.toFixed(2)}hr</span>
                      <button className="summary-copy-btn" onClick={handleCopy} title="Copy to clipboard">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                      </button>
                    </div>
                    {entries.map(({ name, hours, categoryId }) => (
                      <div key={`${categoryId || 'none'}::${name}`} className="summary-row">
                        <span className="summary-hours">{hours.toFixed(2)}hr</span>
                        <span className="summary-name">{name}</span>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {editingEntry && (
        <EditModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
        />
      )}

      {showAddModal && (
        <AddEntryModal
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  )
}

export default WeekView
