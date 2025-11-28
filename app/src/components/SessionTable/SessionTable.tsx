import { Fragment, useMemo, useState, useEffect, useRef, type ChangeEvent } from 'react'
import { useSessionStore } from '../../hooks/useSessionStore'
import type { SessionRecord } from '../../lib/types'
import CircleMeter from './CircleMeter'

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })

const formatRange = (start: string, end: string) => {
  const startTime = new Date(start)
  const endTime = new Date(end)
  return `${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

const formatDuration = (minutes: number) => `${minutes.toFixed(2)}m`

const getProjectColors = (project: string) => {
  const cleaned = project.trim().toLowerCase()
  if (!cleaned) return null
  let hash = 0
  for (let i = 0; i < cleaned.length; i += 1) {
    hash = (hash << 5) - hash + cleaned.charCodeAt(i)
    hash |= 0
  }
  const hue = Math.abs(hash) % 360
  const solid = `hsl(${hue}, 65%, 45%)`
  const soft = `hsla(${hue}, 65%, 45%, 0.18)`
  return { solid, soft }
}

const resizeTextarea = (element: HTMLTextAreaElement | null) => {
  if (!element) return
  element.style.height = 'auto'
  element.style.height = `${element.scrollHeight}px`
}

const SessionRow = ({ session }: { session: SessionRecord }) => {
  const { updateSession, deleteSession, projects } = useSessionStore()
  const goalRef = useRef<HTMLTextAreaElement | null>(null)
  const commentRef = useRef<HTMLTextAreaElement | null>(null)
  const projectRef = useRef<HTMLTextAreaElement | null>(null)
  const projectColors = getProjectColors(session.project)
  const projectSuggestions = useMemo(() => {
    if (!projects?.length) return []
    return projects
      .filter((name) => name.trim().length > 0 && name !== session.project)
      .slice(0, 4)
  }, [projects, session.project])

  const handleTextAreaChange = (field: 'goal' | 'comment' | 'project') =>
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      resizeTextarea(event.currentTarget)
      updateSession(session.id, { [field]: event.target.value })
    }

  const handleProgressChange = (value?: number) => {
    updateSession(session.id, { progressPercent: value })
  }

  const handleFocusChange = (value?: number) => {
    updateSession(session.id, { focusLevel: value })
  }

  useEffect(() => {
    resizeTextarea(goalRef.current)
  }, [session.goal])

  useEffect(() => {
    resizeTextarea(commentRef.current)
  }, [session.comment])

  useEffect(() => {
    resizeTextarea(projectRef.current)
  }, [session.project])

  const handleProjectSuggestion = (value: string) => {
    updateSession(session.id, { project: value })
  }

  return (
    <tr>
      <td className="session-cell session-cell--time">
        <div className="session-time">
          <span>{formatDate(session.startTime)}</span>
          <span>{formatRange(session.startTime, session.endTime)}</span>
        </div>
      </td>
      <td className="session-cell session-cell--phase">
        <span className={`phase-chip phase-${session.phase}`}>
          {session.phase === 'focus' ? 'Focus' : session.phase === 'long-break' ? 'Long Break' : 'Short Break'}
        </span>
        <div className="session-duration">{formatDuration(session.durationMinutes)}</div>
      </td>
      <td className="session-cell session-cell--project">
        <div
          className="project-pill"
          style={projectColors ? { borderColor: projectColors.solid, backgroundColor: projectColors.soft } : undefined}
        >
          <textarea
            ref={projectRef}
            rows={1}
            value={session.project}
            onChange={handleTextAreaChange('project')}
            placeholder="Project"
          />
          {projectSuggestions.length > 0 && (
            <div className="project-suggestions">
              {projectSuggestions.map((suggestion) => (
                <button
                  type="button"
                  key={suggestion}
                  onClick={() => handleProjectSuggestion(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      </td>
      <td className="session-cell session-cell--goal">
        <textarea
          ref={goalRef}
          rows={1}
          value={session.goal}
          onChange={handleTextAreaChange('goal')}
          placeholder="What were you aiming for?"
        />
      </td>
      <td className="session-cell session-cell--progress">
        <CircleMeter
          label="Progress"
          value={session.progressPercent}
          min={0}
          max={100}
          suffix="%"
          onChange={handleProgressChange}
        />
      </td>
      <td className="session-cell session-cell--focus">
        <CircleMeter
          label="Focus"
          value={session.focusLevel}
          min={1}
          max={10}
          onChange={handleFocusChange}
        />
      </td>
      <td className="session-cell session-cell--notes">
        <textarea
          ref={commentRef}
          rows={1}
          value={session.comment ?? ''}
          onChange={handleTextAreaChange('comment')}
          placeholder="Notes, distractions, mood…"
        />
      </td>
      <td className="session-cell session-cell--actions">
        <button
          className="icon-button"
          onClick={() => deleteSession(session.id)}
          aria-label="Remove session"
        >
          ×
        </button>
      </td>
    </tr>
  )
}

export const SessionTable = () => {
  const {
    sessions,
    availableMonths,
    exportMonth,
    importFromFile,
    isHydrated,
  } = useSessionStore()

  const orderedSessions = useMemo(
    () => [...sessions].sort((a, b) => (a.startTime < b.startTime ? 1 : -1)),
    [sessions],
  )

  const groupedSessions = useMemo(() => {
    const map = new Map<string, SessionRecord[]>()
    orderedSessions.forEach((session) => {
      const dayKey = session.startTime.slice(0, 10)
      const bucket = map.get(dayKey)
      if (bucket) {
        bucket.push(session)
      } else {
        map.set(dayKey, [session])
      }
    })
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([dayKey, records]) => ({
        dayKey,
        label: new Date(records[0].startTime).toLocaleDateString([], {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        }),
        sessions: records,
      }))
  }, [orderedSessions])

  const nowMonth = useMemo(() => new Date().toISOString().slice(0, 7), [])
  const [selectedMonth, setSelectedMonth] = useState(nowMonth)
  const [ioMessage, setIoMessage] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (availableMonths.length === 0) return
    if (!availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[0])
    }
  }, [availableMonths, selectedMonth])

  const monthCount = useMemo(
    () => sessions.filter((session) => session.startTime.slice(0, 7) === selectedMonth).length,
    [sessions, selectedMonth],
  )

  const handleExport = () => {
    const exported = exportMonth(selectedMonth)
    setIoMessage(
      exported > 0
        ? `Exported ${exported} sessions for ${selectedMonth}`
        : `No sessions found for ${selectedMonth}.`,
    )
  }

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setIsImporting(true)
    try {
      const imported = await importFromFile(file)
      setIoMessage(`Imported ${imported} sessions from ${file.name}`)
    } catch (error) {
      console.error(error)
      setIoMessage('Import failed. Please check the JSON format.')
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="panel">
      <h2>Sessions</h2>
      {!isHydrated && orderedSessions.length === 0 ? (
        <p className="text-muted">Loading your local session history…</p>
      ) : orderedSessions.length === 0 ? (
        <p className="text-muted">
          Sessions you complete will auto-log here with timestamps so you can annotate intent and focus.
        </p>
      ) : (
        <div className="session-table">
          <table className="session-matrix">
            <thead>
              <tr>
                <th className="session-col session-col--time">When</th>
                <th className="session-col session-col--phase">Phase</th>
                <th className="session-col session-col--project">Project</th>
                <th className="session-col session-col--goal">Goal</th>
                <th className="session-col session-col--progress">Progress</th>
                <th className="session-col session-col--focus">Focus</th>
                <th className="session-col session-col--notes">Comment</th>
                <th className="session-col session-col--actions"></th>
              </tr>
            </thead>
            <tbody>
              {groupedSessions.map((group) => (
                <Fragment key={group.dayKey}>
                  <tr className="session-day-row">
                    <td colSpan={8}>
                      <div className="session-day-heading">
                        <span>{group.label}</span>
                        <small>{group.sessions.length} session{group.sessions.length > 1 ? 's' : ''}</small>
                      </div>
                    </td>
                  </tr>
                  {group.sessions.map((session) => (
                    <SessionRow session={session} key={session.id} />
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="session-io">
        <div className="session-io__group">
          <label htmlFor="session-month">Month</label>
          <input
            id="session-month"
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
          />
          <small>{monthCount} sessions</small>
        </div>
        <button onClick={handleExport} disabled={monthCount === 0}>
          Export JSON
        </button>
        <label className="file-trigger">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImport}
            disabled={isImporting}
          />
          Import JSON
        </label>
        {ioMessage && <span className="io-message text-muted">{ioMessage}</span>}
      </div>
    </div>
  )
}

export default SessionTable
