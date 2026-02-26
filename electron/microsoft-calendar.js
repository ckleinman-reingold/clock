const GRAPH_API_URL = 'https://graph.microsoft.com/v1.0'

export function createMicrosoftCalendar(store, auth) {
  async function fetchWithAuth(url, clientId) {
    const accessToken = await auth.getValidAccessToken(clientId)
    if (!accessToken) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication expired')
      }
      throw new Error(`API request failed: ${response.status}`)
    }

    return response.json()
  }

  async function getUserProfile(clientId) {
    const data = await fetchWithAuth(`${GRAPH_API_URL}/me`, clientId)
    return {
      displayName: data.displayName,
      email: data.mail || data.userPrincipalName,
    }
  }

  async function getCalendarEvents(clientId, startDate, endDate) {
    const start = new Date(startDate).toISOString()
    const end = new Date(endDate).toISOString()

    const params = new URLSearchParams({
      startDateTime: start,
      endDateTime: end,
      $select: 'id,subject,start,end,isAllDay,isCancelled,showAs',
      $orderby: 'start/dateTime',
      $top: '100',
    })

    const data = await fetchWithAuth(
      `${GRAPH_API_URL}/me/calendarView?${params}`,
      clientId
    )

    // Filter out cancelled events and all-day events
    return data.value
      .filter(event => !event.isCancelled && !event.isAllDay)
      .map(event => ({
        id: event.id,
        subject: event.subject,
        startTime: event.start.dateTime + 'Z',
        endTime: event.end.dateTime + 'Z',
        showAs: event.showAs, // free, tentative, busy, oof, workingElsewhere
      }))
  }

  async function syncCalendarToEntries(clientId, startDate, endDate, categoryId) {
    const events = await getCalendarEvents(clientId, startDate, endDate)
    const existingEntries = store.getEntries()
    const syncedIds = store.getMicrosoftSyncedIds() || []
    const newSyncedIds = [...syncedIds]
    const created = []

    for (const event of events) {
      // Skip if already synced
      if (syncedIds.includes(event.id)) {
        continue
      }

      // Skip free/tentative time
      if (event.showAs === 'free' || event.showAs === 'tentative') {
        continue
      }

      // Check if an entry already exists for this time range (manual entry)
      const eventStart = new Date(event.startTime).getTime()
      const eventEnd = new Date(event.endTime).getTime()
      const hasOverlap = existingEntries.some(entry => {
        const entryStart = new Date(entry.startTime).getTime()
        const entryEnd = new Date(entry.endTime).getTime()
        // Check for significant overlap (more than 50%)
        const overlapStart = Math.max(eventStart, entryStart)
        const overlapEnd = Math.min(eventEnd, entryEnd)
        const overlapDuration = Math.max(0, overlapEnd - overlapStart)
        const eventDuration = eventEnd - eventStart
        return overlapDuration > eventDuration * 0.5
      })

      if (hasOverlap) {
        // Mark as synced to avoid checking again
        newSyncedIds.push(event.id)
        continue
      }

      // Create new entry
      const newEntry = store.createEntry({
        description: event.subject,
        startTime: event.startTime,
        endTime: event.endTime,
        categoryId: categoryId || null,
      })

      newSyncedIds.push(event.id)
      created.push(newEntry)
    }

    store.setMicrosoftSyncedIds(newSyncedIds)
    return created
  }

  return {
    getUserProfile,
    getCalendarEvents,
    syncCalendarToEntries,
  }
}
