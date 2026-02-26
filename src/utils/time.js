export function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day
  d.setHours(0, 0, 0, 0)
  d.setDate(diff)
  return d
}

export function getWeekEnd(date) {
  const start = getWeekStart(date)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

export function getWeekDays(weekStart) {
  const days = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart)
    day.setDate(weekStart.getDate() + i)
    days.push(day)
  }
  return days
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatDuration(startTime, endTime) {
  const start = new Date(startTime)
  const end = endTime ? new Date(endTime) : new Date()
  const diff = end - start
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

export function roundToQuarter(minutes) {
  return Math.round(minutes / 15) * 15
}

export function getTimePosition(date, startHour = 7, endHour = 19, snapToQuarter = false) {
  const d = new Date(date)
  const hours = d.getHours()
  const minutes = d.getMinutes()
  let totalMinutes = hours * 60 + minutes
  if (snapToQuarter) {
    totalMinutes = roundToQuarter(totalMinutes)
  }
  const startMinutes = startHour * 60
  const endMinutes = endHour * 60
  const rangeMinutes = endMinutes - startMinutes
  return Math.max(0, Math.min(100, ((totalMinutes - startMinutes) / rangeMinutes) * 100))
}

export function getEntryPositions(entries, activeEntry, day) {
  const START_HOUR = 7
  const END_HOUR = 19

  const allEntries = [...entries]
  if (activeEntry && isSameDay(activeEntry.startTime, day)) {
    allEntries.push({ ...activeEntry, isActive: true })
  }

  if (allEntries.length === 0) return []

  const positioned = allEntries.map(entry => {
    const startPos = getTimePosition(entry.startTime, START_HOUR, END_HOUR, true)
    const endPos = entry.endTime
      ? getTimePosition(entry.endTime, START_HOUR, END_HOUR, true)
      : getTimePosition(new Date(), START_HOUR, END_HOUR, true)
    return {
      ...entry,
      top: startPos,
      bottom: Math.max(endPos, startPos + 0.5),
    }
  })

  // Sort by start position, then by end position
  positioned.sort((a, b) => a.top - b.top || a.bottom - b.bottom)

  // Check if two entries overlap (exclusive boundaries - touching is not overlapping)
  const overlaps = (a, b) => {
    return a.top < b.bottom && a.bottom > b.top
  }

  // Assign columns using a greedy algorithm
  for (const entry of positioned) {
    entry.column = 0
    entry.totalColumns = 1
  }

  // For each entry, find all entries it overlaps with and assign columns
  for (let i = 0; i < positioned.length; i++) {
    const entry = positioned[i]

    // Find all overlapping entries (including ones we haven't processed yet)
    const overlappingGroup = positioned.filter(e => overlaps(entry, e))

    if (overlappingGroup.length > 1) {
      // Sort group by start time to assign columns consistently
      overlappingGroup.sort((a, b) => a.top - b.top || a.bottom - b.bottom)

      // Assign columns to the group
      const usedColumns = new Set()
      for (const e of overlappingGroup) {
        let col = 0
        while (usedColumns.has(col)) {
          col++
        }
        e.column = col
        usedColumns.add(col)
      }

      // Set totalColumns for all in group
      const totalCols = overlappingGroup.length
      for (const e of overlappingGroup) {
        e.totalColumns = totalCols
      }
    }
  }

  // Convert bottom to height
  return positioned.map(entry => ({
    ...entry,
    height: entry.bottom - entry.top,
  }))
}

export function isSameDay(date1, date2) {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

export function isWithinWeek(date, weekStart, weekEnd) {
  const d = new Date(date)
  return d >= weekStart && d <= weekEnd
}

export function formatDateForInput(date) {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export function formatTotalDuration(ms) {
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m`
  }
  return '0m'
}
