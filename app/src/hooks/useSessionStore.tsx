import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'
import localforage from 'localforage'
import type { SessionRecord, TimerSegmentEvent } from '../lib/types'
import { createSessionFromSegment, deriveProjectSuggestions } from '../lib/sessions'
import { useProfileStore } from './useProfileStore'

const STORAGE_NAMESPACE = 'pomodoro-sessions'
const storageKeyForUser = (userId: string) => `${STORAGE_NAMESPACE}:${userId}`

localforage.config({
  name: 'PomodoroTracker',
  storeName: 'sessionStore',
})

interface ImportPayload {
  sessions?: SessionRecord[]
}

interface SessionStoreValue {
  sessions: SessionRecord[]
  projects: string[]
  availableMonths: string[]
  isHydrated: boolean
  addSessionFromSegment: (segment: TimerSegmentEvent, overrides?: Partial<SessionRecord>) => void
  updateSession: (id: string, patch: Partial<SessionRecord>) => void
  deleteSession: (id: string) => void
  exportMonth: (monthKey: string) => number
  importFromFile: (file: File) => Promise<number>
  loadSessionsForUser: (userId: string) => Promise<SessionRecord[]>
}

const SessionStoreContext = createContext<SessionStoreValue | undefined>(undefined)

const mergeSessions = (existing: SessionRecord[], incoming: SessionRecord[]) => {
  if (!incoming || incoming.length === 0) return existing
  const map = new Map(existing.map((record) => [record.id, record]))
  incoming.forEach((record) => {
    if (!record?.id) return
    map.set(record.id, record)
  })
  return Array.from(map.values()).sort((a, b) => a.startTime.localeCompare(b.startTime))
}

const downloadJson = (filename: string, data: unknown) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const SessionProvider = ({ children }: PropsWithChildren) => {
  const { activeProfile } = useProfileStore()
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [isHydrated, setIsHydrated] = useState(false)
  const hydratedRef = useRef(false)
  const userId = activeProfile?.id ?? 'solo'
  const storageKey = storageKeyForUser(userId)

  useEffect(() => {
    let mounted = true
    setIsHydrated(false)
    hydratedRef.current = false
    setSessions([])
    const hydrate = async () => {
      try {
        const stored = await localforage.getItem<SessionRecord[]>(storageKey)
        if (!mounted) return
        setSessions(stored ?? [])
      } finally {
        if (mounted) {
          hydratedRef.current = true
          setIsHydrated(true)
        }
      }
    }
    void hydrate()
    return () => {
      mounted = false
    }
  }, [storageKey])

  const commit = useCallback((updater: (prev: SessionRecord[]) => SessionRecord[]) => {
    setSessions((prev) => {
      const next = updater(prev)
      if (hydratedRef.current) {
        void localforage.setItem(storageKey, next)
      }
      return next
    })
  }, [storageKey])

  const addSessionFromSegment = useCallback(
    (segment: TimerSegmentEvent, overrides?: Partial<SessionRecord>) => {
      commit((prev) => {
        const lastSession = prev.length > 0 ? prev[prev.length - 1] : undefined
        const defaults = lastSession
          ? { project: lastSession.project, goal: lastSession.goal }
          : undefined
        const mergedDefaults = (defaults || overrides)
          ? { ...(defaults ?? {}), ...(overrides ?? {}) }
          : undefined
        const newRecord = createSessionFromSegment(segment, mergedDefaults)
        return [...prev, newRecord]
      })
    },
    [commit],
  )

  const updateSession = useCallback((id: string, patch: Partial<SessionRecord>) => {
    commit((prev) =>
      prev.map((session) =>
        session.id === id
          ? {
              ...session,
              ...patch,
            }
          : session,
      ),
    )
  }, [commit])

  const deleteSession = useCallback((id: string) => {
    commit((prev) => prev.filter((session) => session.id !== id))
  }, [commit])

  const exportMonth = useCallback(
    (monthKey: string) => {
      const scoped = sessions.filter((session) => session.startTime.slice(0, 7) === monthKey)
      if (scoped.length === 0) return 0
      downloadJson(`pomodoro-sessions-${monthKey}.json`, {
        month: monthKey,
        generatedAt: new Date().toISOString(),
        sessions: scoped,
      })
      return scoped.length
    },
    [sessions],
  )

  const importFromFile = useCallback(async (file: File) => {
    const text = await file.text()
    const parsed = JSON.parse(text) as SessionRecord[] | ImportPayload
    const payload = Array.isArray(parsed) ? parsed : parsed.sessions
    if (!Array.isArray(payload)) {
      throw new Error('Import file missing session data')
    }

    let normalized = payload.filter((session) => Boolean(session?.id && session?.startTime))
    normalized = normalized.map((session) => ({
      ...session,
      durationMinutes: Number(session.durationMinutes) || 0,
    }))

    return await new Promise<number>((resolve) => {
      commit((prev) => {
        const merged = mergeSessions(prev, normalized)
        resolve(merged.length - prev.length)
        return merged
      })
    })
  }, [commit])

  const loadSessionsForUser = useCallback(async (targetUserId: string) => {
    const key = storageKeyForUser(targetUserId)
    const stored = await localforage.getItem<SessionRecord[]>(key)
    return stored ?? []
  }, [])

  const projects = useMemo(() => deriveProjectSuggestions(sessions), [sessions])
  const availableMonths = useMemo(() => {
    const months = sessions.map((session) => session.startTime.slice(0, 7))
    return Array.from(new Set(months)).sort((a, b) => (a < b ? 1 : -1))
  }, [sessions])

  const value = useMemo<SessionStoreValue>(
    () => ({
      sessions,
      projects,
      availableMonths,
      isHydrated,
      addSessionFromSegment,
      updateSession,
      deleteSession,
      exportMonth,
      importFromFile,
      loadSessionsForUser,
    }),
    [
      sessions,
      projects,
      availableMonths,
      isHydrated,
      addSessionFromSegment,
      updateSession,
      deleteSession,
      exportMonth,
      importFromFile,
      loadSessionsForUser,
    ],
  )

  return <SessionStoreContext.Provider value={value}>{children}</SessionStoreContext.Provider>
}

export const useSessionStore = () => {
  const context = useContext(SessionStoreContext)
  if (!context) {
    throw new Error('useSessionStore must be used within a SessionProvider')
  }
  return context
}
