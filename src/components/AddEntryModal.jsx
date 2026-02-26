import { useState, useMemo } from 'react'
import { useTime } from '../context/TimeContext'
import { formatDateForInput, formatTime, formatDuration } from '../utils/time'
import './EditModal.css'

function AddEntryModal({ initialDate, onClose }) {
  const { createEntry, categories, defaultCategoryId } = useTime()

  // Default to 1 hour ago -> now, or use initialDate if provided
  const getDefaultTimes = () => {
    const end = initialDate ? new Date(initialDate) : new Date()
    const start = new Date(end)
    start.setHours(start.getHours() - 1)
    return {
      start: formatDateForInput(start),
      end: formatDateForInput(end),
    }
  }

  const defaults = getDefaultTimes()
  const [description, setDescription] = useState('')
  const [startTime, setStartTime] = useState(defaults.start)
  const [endTime, setEndTime] = useState(defaults.end)
  const [categoryId, setCategoryId] = useState(defaultCategoryId || '')
  const [error, setError] = useState('')

  const timeInfo = useMemo(() => {
    const start = new Date(startTime)
    const end = new Date(endTime)
    return {
      range: `${formatTime(start)} - ${formatTime(end)}`,
      duration: formatDuration(start, end),
    }
  }, [startTime, endTime])

  const handleSave = async () => {
    const start = new Date(startTime)
    const end = new Date(endTime)

    if (end <= start) {
      setError('End time must be after start time')
      return
    }

    await createEntry({
      description,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      categoryId: categoryId || null,
    })
    onClose()
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className="edit-modal-backdrop" onClick={handleBackdropClick}>
      <div className="edit-modal">
        <div className="edit-modal-header">
          <h3>Add Time Entry</h3>
          <button className="edit-modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="edit-modal-content">
          <div className="edit-time-summary">
            <span className="edit-time-range">{timeInfo.range}</span>
            <span className="edit-time-duration">{timeInfo.duration}</span>
          </div>

          <div className="edit-field">
            <label htmlFor="description">Description</label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What were you working on?"
              autoFocus
            />
          </div>

          <div className="edit-field">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              className="edit-category-select"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">No Category</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="edit-field">
            <label htmlFor="startTime">Start Time</label>
            <input
              id="startTime"
              type="datetime-local"
              value={startTime}
              onChange={(e) => {
                setStartTime(e.target.value)
                setError('')
              }}
            />
          </div>

          <div className="edit-field">
            <label htmlFor="endTime">End Time</label>
            <input
              id="endTime"
              type="datetime-local"
              value={endTime}
              onChange={(e) => {
                setEndTime(e.target.value)
                setError('')
              }}
            />
          </div>

          {error && <div className="edit-error">{error}</div>}
        </div>

        <div className="edit-modal-footer">
          <div></div>
          <div className="edit-modal-actions">
            <button className="edit-btn cancel" onClick={onClose}>
              Cancel
            </button>
            <button className="edit-btn save" onClick={handleSave}>
              Add Entry
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddEntryModal
