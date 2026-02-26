import { useMemo } from 'react'
import { useTime } from '../context/TimeContext'
import { formatTime, formatDuration } from '../utils/time'
import './TimeBlock.css'

function TimeBlock({ entry, isActive = false, onClick, position }) {
  const { getCategoryById } = useTime()
  const category = entry.categoryId ? getCategoryById(entry.categoryId) : null

  const style = useMemo(() => {
    const width = position ? (100 / position.totalColumns) : 100
    const left = position ? (position.column * width) : 0

    const baseStyle = {
      top: `${position?.top || 0}%`,
      height: `${position?.height || 5}%`,
      left: `calc(${left}% + 2px)`,
      width: `calc(${width}% - 4px)`,
    }

    if (category && !isActive) {
      baseStyle.background = category.color
    }

    return baseStyle
  }, [position, category, isActive])

  const timeRange = useMemo(() => {
    const start = formatTime(entry.startTime)
    const end = entry.endTime ? formatTime(entry.endTime) : 'now'
    return `${start} - ${end}`
  }, [entry.startTime, entry.endTime])

  const duration = useMemo(() => {
    return formatDuration(entry.startTime, entry.endTime)
  }, [entry.startTime, entry.endTime])

  const handleClick = (e) => {
    e.stopPropagation()
    console.log('TimeBlock clicked', entry.id)
    if (onClick) onClick()
  }

  return (
    <div
      className={`time-block ${isActive ? 'active' : ''}`}
      style={style}
      onClick={handleClick}
      title={`${entry.description || 'No description'}\n${timeRange}\n${duration}`}
    >
      <div className="time-block-content">
        <span className="time-block-description">
          {entry.description || 'No description'}
        </span>
        <span className="time-block-time">{timeRange}</span>
        <span className="time-block-duration">{duration}</span>
      </div>
    </div>
  )
}

export default TimeBlock
