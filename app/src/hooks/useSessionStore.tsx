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
import { apiFetch } from '../lib/api'
import { useAuth } from './useAuth'

interface SessionStoreValue {
  sessions: SessionRecord[]
  projects: string[]
  isHydrated: boolean
  addSessionFromSegment: (segment: TimerSegmentEvent, overrides?: Partial<SessionRecord>) => void
  updateSession: (id: string, patch: Partial<SessionRecord>) => void
  deleteSession: (id: string) => void
  loadSessionsForUser: (userId: string) => Promise<SessionRecord[]>
  reload: () => Promise<void>
}

interface ApiSessionPayload {
  id: string
  userId: string
  phase: SessionRecord['phase']
  sourceSegmentId: string | null
  goal: string | null
  project: string | null
  durationMin: number
  startTime: string
  endTime: string
  progress: number | null
  focusScore: number | null
  comment: string | null
  createdAt: string
  updatedAt: string
}

localforage.config({
  name: 'PomodoroTracker',
  storeName: 'sessionStore',
})

const GUEST_STORAGE_KEY = 'pomodoro-sessions:guest'

const SessionStoreContext = createContext<SessionStoreValue | undefined>(undefined)

const COMMENT_DIVIDER = '|||DISTRACTIONS|||'

type StoredSession = Omit<SessionRecord, 'note' | 'distractions'> & {
  note?: string
  distractions?: string
  comment?: string | null
}

const decodeComment = (raw?: string | null) => {
  if (!raw) {
    return { note: '', distractions: '' }
  }
  const [notePart, distractionsPart] = raw.split(COMMENT_DIVIDER)
  return {
    note: (notePart ?? '').trim(),
    distractions: (distractionsPart ?? '').trim(),
  }
}

const encodeComment = (note?: string, distractions?: string) => {
  const safeNote = (note ?? '').trim()
  const safeDistractions = (distractions ?? '').trim()
  if (!safeDistractions) {
    return safeNote
  }
  return `${safeNote}${COMMENT_DIVIDER}${safeDistractions}`
}

const ensureNoteFields = (record: StoredSession): SessionRecord => {
  if (typeof record.note === 'string' || typeof record.distractions === 'string') {
    return {
      ...record,
      note: record.note?.trim() ?? '',
      distractions: record.distractions?.trim() ?? '',
    }
  }
  const decoded = decodeComment(record.comment)
  return {
    ...record,
    note: decoded.note,
    distractions: decoded.distractions,
  }
}

const mapApiSession = (session: ApiSessionPayload): SessionRecord => {
  const decoded = decodeComment(session.comment ?? undefined)
  return {
    id: session.id,
    phase: session.phase,
    sourceSegmentId: session.sourceSegmentId ?? undefined,
    startTime: session.startTime,
    endTime: session.endTime,
    durationMinutes: session.durationMin,
    project: session.project ?? '',
    goal: session.goal ?? '',
    progressPercent: typeof session.progress === 'number' ? session.progress : undefined,
    focusLevel: typeof session.focusScore === 'number' ? session.focusScore : undefined,
    note: decoded.note,
    distractions: decoded.distractions,
    createdAt: session.createdAt,
  }
}

const toApiPayload = (record: SessionRecord) => ({
  phase: record.phase,
  sourceSegmentId: record.sourceSegmentId,
  goal: record.goal ?? '',
  project: record.project ?? '',
  durationMinutes: Math.max(1, Math.round(record.durationMinutes)),
  startTime: record.startTime,
  endTime: record.endTime,
  progressPercent: record.progressPercent,
  focusLevel: record.focusLevel,
  comment: encodeComment(record.note, record.distractions),
})

export const SessionProvider = ({ children }: PropsWithChildren) => {
  const { user, ensureSession, getAccessToken } = useAuth()
  const isGuest = !user
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [isHydrated, setIsHydrated] = useState(false)
  const guestHydratedRef = useRef(false)

  const requireToken = useCallback(async () => {
    await ensureSession()
    const token = getAccessToken()
    if (!token) {
      throw new Error('Please log in to sync sessions')
    }
    return token
  }, [ensureSession, getAccessToken])

  const loadGuestSessions = useCallback(async () => {
    const stored = await localforage.getItem<StoredSession[]>(GUEST_STORAGE_KEY)
    return (stored ?? []).map(ensureNoteFields)
  }, [])

  useEffect(() => {
    let cancelled = false
    setIsHydrated(false)
    if (isGuest) {
      guestHydratedRef.current = false
      void loadGuestSessions().then((data) => {
        if (cancelled) return
        setSessions(data)
        guestHydratedRef.current = true
        setIsHydrated(true)
      })
      return () => {
        cancelled = true
      }
    }

    void (async () => {
      try {
        const token = await requireToken()
        const response = await apiFetch<{ sessions: ApiSessionPayload[] }>('/sessions', {
          accessToken: token,
        })
        if (!cancelled) {
          setSessions(response.sessions.map(mapApiSession).sort((a, b) => a.startTime.localeCompare(b.startTime)))
          setIsHydrated(true)
        }
      } catch (error) {
        console.error(error)
        if (!cancelled) {
          setSessions([])
          setIsHydrated(true)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isGuest, loadGuestSessions, requireToken])

  const persistGuestSessions = useCallback((next: SessionRecord[]) => {
    guestHydratedRef.current = true
    void localforage.setItem(GUEST_STORAGE_KEY, next)
  }, [])

  const addSessionFromSegment = useCallback(
    (segment: TimerSegmentEvent, overrides?: Partial<SessionRecord>) => {
      const defaults = sessions.length ? sessions[sessions.length - 1] : undefined
      const mergedDefaults = defaults
        ? { project: defaults.project, goal: defaults.goal, ...(overrides ?? {}) }
        : overrides
      const newRecord = createSessionFromSegment(segment, mergedDefaults)

      if (isGuest) {
        setSessions((prev) => {
          const next = [...prev, newRecord]
          persistGuestSessions(next)
          return next
        })
        return
      }

      void (async () => {
        try {
          const token = await requireToken()
          const response = await apiFetch<{ session: ApiSessionPayload }>('/sessions', {
            method: 'POST',
            body: JSON.stringify(toApiPayload(newRecord)),
            accessToken: token,
          })
          setSessions((prev) =>
            prev.map((session) => (session.id === newRecord.id ? mapApiSession(response.session) : session)),
          )
        } catch (error) {
          console.error('Failed to sync session', error)
        }
      })()

      setSessions((prev) => [...prev, newRecord])
    },
    [sessions, isGuest, persistGuestSessions, requireToken],
  )

  const updateSession = useCallback(
    (id: string, patch: Partial<SessionRecord>) => {
      setSessions((prev) => prev.map((session) => (session.id === id ? { ...session, ...patch } : session)))

      if (isGuest) {
        const snapshot = sessions.map((session) => (session.id === id ? { ...session, ...patch } : session))
        persistGuestSessions(snapshot)
        return
      }

      void (async () => {
        try {
          const token = await requireToken()
          const existing = sessions.find((session) => session.id === id)
          if (!existing) return
          await apiFetch(`/sessions/${id}`, {
            method: 'PUT',
            body: JSON.stringify(toApiPayload({ ...existing, ...patch })),
            accessToken: token,
          })
        } catch (error) {
          console.error('Failed to update session', error)
        }
      })()
    },
    [isGuest, persistGuestSessions, requireToken, sessions],
  )

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => {
        const next = prev.filter((session) => session.id !== id)
        if (isGuest) {
          persistGuestSessions(next)
        }
        return next
      })

      if (isGuest) {
        return
      }

      void (async () => {
        try {
          const token = await requireToken()
          await apiFetch(`/sessions/${id}`, {
            method: 'DELETE',
            accessToken: token,
          })
        } catch (error) {
          console.error('Failed to delete session', error)
        }
      })()
    },
    [isGuest, persistGuestSessions, requireToken],
  )

  const loadSessionsForUser = useCallback(async () => {
    console.warn('Peer comparisons are disabled while the server migration is in progress.')
    return []
  }, [])

  const reload = useCallback(async () => {
    if (isGuest) {
      const data = await loadGuestSessions()
      setSessions(data)
      return
    }
    try {
      const token = await requireToken()
      const response = await apiFetch<{ sessions: ApiSessionPayload[] }>('/sessions', {
        accessToken: token,
      })
      setSessions(response.sessions.map(mapApiSession))
    } catch (error) {
      console.error(error)
    }
  }, [isGuest, loadGuestSessions, requireToken])

  const projects = useMemo(() => deriveProjectSuggestions(sessions), [sessions])

  const value = useMemo<SessionStoreValue>(
    () => ({
      sessions,
      projects,
      isHydrated,
      addSessionFromSegment,
      updateSession,
      deleteSession,
      loadSessionsForUser,
      reload,
    }),
    [
      sessions,
      projects,
      isHydrated,
      addSessionFromSegment,
      updateSession,
      deleteSession,
      loadSessionsForUser,
      reload,
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
