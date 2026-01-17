type CachedEvents = {
  events: any[]
  timestamp: number
  workspaceId: string
}

const CACHE_KEY = "atlas_calendar_events"
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export const calendarCache = {
  get: (workspaceId: string): any[] | null => {
    if (typeof window === "undefined") return null

    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null

    const data: CachedEvents = JSON.parse(cached)
    const now = Date.now()

    // Check if cache is valid
    if (data.workspaceId === workspaceId && now - data.timestamp < CACHE_DURATION) {
      console.log("[v0] Using cached events")
      return data.events
    }

    // Cache expired or different workspace
    return null
  },

  set: (workspaceId: string, events: any[]) => {
    if (typeof window === "undefined") return

    const data: CachedEvents = {
      events,
      timestamp: Date.now(),
      workspaceId,
    }

    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
    console.log("[v0] Cached events for workspace:", workspaceId)
  },

  clear: () => {
    if (typeof window === "undefined") return
    localStorage.removeItem(CACHE_KEY)
  },
}
