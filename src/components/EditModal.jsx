import { useState, useMemo } from 'react'
import { useTime } from '../context/TimeContext'
import { formatDateForInput, formatTime, formatDuration } from '../utils/time'
import './EditModal.css'

function EditModal({ entry, onClose }) {
  const { updateEntry, deleteEntry, updateActiveEntry, categories } = useTime()
  const isActive = !entry.endTime
  const [description, setDescription] = useState(entry.description || '')
  const [startTime, setStartTime] = useState(formatDateForInput(entry.startTime))
  const [endTime, setEndTime] = useState(isActive ? '' : formatDateForInput(entry.endTime))
  const [categoryId, setCategoryId] = useState(entry.categoryId || '')
  const [error, setError] = useState('')

  const timeInfo = useMemo(() => {
    const start = new Date(startTime)
    const end = isActive ? new Date() : new Date(endTime)
    return {
      range: `${formatTime(start)} - ${isActive ? 'now' : formatTime(end)}`,
      duration: formatDuration(start, end),
    }
  }, [startTime, endTime, isActive])

  const handleSave = async () => {
    const start = new Date(startTime)

    if (isActive) {
      if (start > new Date()) {
        setError('Start time cannot be in the future')
        return
      }
      await updateActiveEntry({
        startTime: start.toISOString(),
        description,
        categoryId: categoryId || null,
      })
    } else {
      const end = new Date(endTime)
      if (end <= start) {
        setError('End time must be after start time')
        return
      }
      await updateEntry(entry.id, {
        description,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        categoryId: categoryId || null,
      })
    }
    onClose()
  }

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      await deleteEntry(entry.id)
      onClose()
    }
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
          <h3>{isActive ? 'Edit Running Entry' : 'Edit Time Entry'}</h3>
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

          {!isActive && (
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
          )}

          {error && <div className="edit-error">{error}</div>}
        </div>

        <div className="edit-modal-footer">
          {!isActive ? (
            <button className="edit-btn delete" onClick={handleDelete}>
              Delete
            </button>
          ) : (
            <div></div>
          )}
          <div className="edit-modal-actions">
            <button className="edit-btn cancel" onClick={onClose}>
              Cancel
            </button>
            <button className="edit-btn save" onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditModal
