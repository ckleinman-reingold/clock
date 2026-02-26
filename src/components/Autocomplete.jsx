import { useState, useRef, useEffect, useMemo } from 'react'
import './Autocomplete.css'

function scoreSuggestions(entries) {
  const now = Date.now()
  const counts = {}
  const lastUsed = {}

  for (const entry of entries) {
    const desc = (entry.description || '').trim()
    if (!desc) continue
    counts[desc] = (counts[desc] || 0) + 1
    const time = new Date(entry.startTime).getTime()
    if (!lastUsed[desc] || time > lastUsed[desc]) {
      lastUsed[desc] = time
    }
  }

  return Object.keys(counts)
    .map(desc => {
      const daysSinceLast = (now - lastUsed[desc]) / (1000 * 60 * 60 * 24)
      const recencyScore = Math.max(0, 1 - daysSinceLast / 90)
      const freqScore = Math.min(counts[desc] / 10, 1)
      return { description: desc, score: recencyScore * 0.6 + freqScore * 0.4 }
    })
    .sort((a, b) => b.score - a.score)
}

function Autocomplete({ value, onChange, entries, placeholder, className }) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapperRef = useRef(null)
  const listRef = useRef(null)

  const suggestions = useMemo(() => scoreSuggestions(entries), [entries])

  const filtered = useMemo(() => {
    if (!value.trim()) return suggestions.slice(0, 8)
    const lower = value.toLowerCase()
    return suggestions
      .filter(s => s.description.toLowerCase().includes(lower))
      .slice(0, 8)
  }, [value, suggestions])

  useEffect(() => {
    setActiveIndex(-1)
  }, [value])

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex]
      if (item) item.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  const handleKeyDown = (e) => {
    if (!open || filtered.length === 0) {
      if (e.key === 'ArrowDown' && filtered.length > 0) {
        setOpen(true)
        setActiveIndex(0)
        e.preventDefault()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex(i => (i + 1) % filtered.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex(i => (i <= 0 ? filtered.length - 1 : i - 1))
        break
      case 'Enter':
        if (activeIndex >= 0 && filtered[activeIndex]) {
          e.preventDefault()
          selectSuggestion(filtered[activeIndex].description)
        }
        break
      case 'Escape':
        setOpen(false)
        setActiveIndex(-1)
        break
    }
  }

  const selectSuggestion = (desc) => {
    onChange({ target: { value: desc } })
    setOpen(false)
    setActiveIndex(-1)
  }

  return (
    <div className="autocomplete-wrapper" ref={wrapperRef}>
      <input
        type="text"
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {open && filtered.length > 0 && (
        <ul className="autocomplete-dropdown" ref={listRef} role="listbox">
          {filtered.map((item, i) => (
            <li
              key={item.description}
              className={`autocomplete-item ${i === activeIndex ? 'active' : ''}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={() => selectSuggestion(item.description)}
              onMouseEnter={() => setActiveIndex(i)}
            >
              {item.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Autocomplete
