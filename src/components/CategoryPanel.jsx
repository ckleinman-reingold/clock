import { useState, useMemo } from 'react'
import { useTime } from '../context/TimeContext'
import { formatTotalDuration } from '../utils/time'
import './CategoryPanel.css'

function getWorkWeekBounds(date) {
  const d = new Date(date)
  const day = d.getDay()
  // Calculate Monday (day 1). If Sunday (0), go back 6 days
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)

  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  friday.setHours(23, 59, 59, 999)

  return { monday, friday }
}

function CategoryPanel() {
  const { categories, entries, activeEntry, createCategory, updateCategory, deleteCategory, defaultCategoryId, setDefaultCategoryId } = useTime()

  const categoryTotals = useMemo(() => {
    const totals = {}
    const { monday, friday } = getWorkWeekBounds(new Date())

    const allEntries = [...entries]
    if (activeEntry) {
      allEntries.push(activeEntry)
    }

    for (const entry of allEntries) {
      const entryStart = new Date(entry.startTime)
      if (entryStart < monday || entryStart > friday) continue

      const catId = entry.categoryId || 'uncategorized'
      const start = entryStart
      const end = entry.endTime ? new Date(entry.endTime) : new Date()
      const duration = end - start
      totals[catId] = (totals[catId] || 0) + duration
    }

    return totals
  }, [entries, activeEntry])
  const [isOpen, setIsOpen] = useState(true)
  const [width, setWidth] = useState(260)
  const [isResizing, setIsResizing] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#667eea')

  const handleEdit = (category) => {
    setEditingId(category.id)
    setEditName(category.name)
    setEditColor(category.color)
  }

  const handleSaveEdit = async () => {
    if (editName.trim()) {
      await updateCategory(editingId, { name: editName.trim(), color: editColor })
      setEditingId(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditColor('')
  }

  const handleDelete = async (id) => {
    if (window.confirm('Delete this category? Entries using it will become uncategorized.')) {
      await deleteCategory(id)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (newName.trim()) {
      await createCategory(newName.trim(), newColor)
      setNewName('')
      setNewColor('#667eea')
    }
  }

  const handleResizeStart = (e) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = width
    setIsResizing(true)
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'

    const onMove = (e) => {
      const newWidth = Math.min(Math.max(startWidth + (startX - e.clientX), 160), 600)
      setWidth(newWidth)
    }
    const onUp = () => {
      setIsResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return (
    <div
      className={`category-panel ${isOpen ? 'open' : 'closed'} ${isResizing ? 'resizing' : ''}`}
      style={isOpen ? { width: `${width}px` } : undefined}
    >
      {isOpen && (
        <div className="category-resize-handle" onMouseDown={handleResizeStart} />
      )}
      <button
        className="category-panel-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Collapse categories' : 'Expand categories'}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {isOpen ? (
            <path d="M15 19l-7-7 7-7" />
          ) : (
            <path d="M9 5l7 7-7 7" />
          )}
        </svg>
      </button>

      {isOpen && (
        <div className="category-panel-content">
          <h3 className="category-panel-title">Categories</h3>

          <ul className="category-list">
            {categories.map(category => (
              <li key={category.id} className="category-item">
                {editingId === category.id ? (
                  <div className="category-edit-form">
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="category-color-input"
                    />
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="category-name-input"
                      autoFocus
                    />
                    <div className="category-edit-actions">
                      <button onClick={handleSaveEdit} className="category-btn save" title="Save">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </button>
                      <button onClick={handleCancelEdit} className="category-btn cancel" title="Cancel">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <input
                      type="checkbox"
                      className="category-default-checkbox"
                      checked={defaultCategoryId === category.id}
                      onChange={(e) => setDefaultCategoryId(e.target.checked ? category.id : null)}
                      title="Set as default"
                    />
                    <span
                      className="category-color-dot"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="category-name">{category.name}</span>
                    {categoryTotals[category.id] > 0 && (
                      <span className="category-total">
                        {formatTotalDuration(categoryTotals[category.id])}
                      </span>
                    )}
                    <div className="category-actions">
                      <button
                        onClick={() => handleEdit(category)}
                        className="category-btn edit"
                        title="Edit"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="category-btn delete"
                        title="Delete"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
            {categoryTotals['uncategorized'] > 0 && (
              <li className="category-item uncategorized">
                <span
                  className="category-color-dot"
                  style={{ backgroundColor: '#999' }}
                />
                <span className="category-name">Uncategorized</span>
                <span className="category-total">
                  {formatTotalDuration(categoryTotals['uncategorized'])}
                </span>
              </li>
            )}
          </ul>

          <form className="category-add-form" onSubmit={handleCreate}>
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="category-color-input"
            />
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New category..."
              className="category-name-input"
            />
            <button type="submit" className="category-btn add" disabled={!newName.trim()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default CategoryPanel
