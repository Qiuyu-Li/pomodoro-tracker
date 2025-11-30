import {
  Fragment,
  useMemo,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ChangeEvent,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { toPng } from 'html-to-image'
import { useSessionStore } from '../../hooks/useSessionStore'
import type { SessionRecord } from '../../lib/types'

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })

const formatRange = (start: string, end: string) => {
  const startTime = new Date(start)
  const endTime = new Date(end)
  return `${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

const formatDuration = (minutes: number) => `${minutes}m`

type ColumnKey = 'time' | 'duration' | 'project' | 'goal' | 'progress' | 'focus' | 'note' | 'distractions'

const COLUMN_STORAGE_KEY = 'session-table-column-widths'

const RESIZABLE_COLUMNS: ColumnKey[] = ['time', 'duration', 'project', 'goal', 'progress', 'focus', 'note', 'distractions']

const DEFAULT_COLUMN_WIDTHS: Record<ColumnKey, number> = {
  time: 180,
  duration: 120,
  project: 220,
  goal: 320,
  progress: 200,
  focus: 180,
  note: 260,
  distractions: 240,
}

const MIN_COLUMN_WIDTHS: Record<ColumnKey, number> = {
  time: 140,
  duration: 80,
  project: 160,
  goal: 220,
  progress: 160,
  focus: 140,
  note: 180,
  distractions: 180,
}

const MAX_COLUMN_WIDTHS: Record<ColumnKey, number> = {
  time: 320,
  duration: 220,
  project: 360,
  goal: 520,
  progress: 320,
  focus: 260,
  note: 420,
  distractions: 420,
}

const clampColumnWidth = (key: ColumnKey, width: number) =>
  Math.min(MAX_COLUMN_WIDTHS[key], Math.max(MIN_COLUMN_WIDTHS[key], width))

const getRoundedDurationMinutes = (session: SessionRecord) => {
  const samples: number[] = []
  if (Number.isFinite(session.durationMinutes)) {
    samples.push(session.durationMinutes)
  }
  const startMs = new Date(session.startTime).getTime()
  const endMs = new Date(session.endTime).getTime()
  const derivedMinutes = (endMs - startMs) / 60000
  if (Number.isFinite(derivedMinutes) && derivedMinutes > 0) {
    samples.push(derivedMinutes)
  }
  if (!samples.length) return 0
  const average = samples.reduce((sum, value) => sum + value, 0) / samples.length
  return Math.round(average)
}

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

const createExportDateSuffix = () => new Date().toISOString().slice(0, 10)

interface MeterBarProps {
  label: string
  value?: number
  min: number
  max: number
  step?: number
  onChange: (value?: number) => void
}

const MeterBar = ({ label, value, min, max, step = 1, onChange }: MeterBarProps) => {
  const safeValue = value ?? min
  const suffix = label === 'Progress' ? '%' : ''
  const formattedValue = value != null ? value : min
  const displayValue = `${formattedValue}${suffix}/${max}${suffix}`

  return (
    <div className={`meter-bar meter-bar--compact${value === 100 ? ' meter-bar--complete' : ''}`}>
      <input
        className="meter-bar__input"
        type="range"
        min={min}
        max={max}
        step={step}
        value={safeValue}
        aria-label={label}
        title={label}
        onChange={(event) => onChange(Number(event.target.value))}
        onDoubleClick={() => onChange(undefined)}
      />
      <span className="meter-bar__value">{displayValue}</span>
    </div>
  )
}

type ColumnStyles = Record<ColumnKey, CSSProperties>

const SessionRow = ({ session, columnStyles }: { session: SessionRecord; columnStyles: ColumnStyles }) => {
  const { updateSession, deleteSession, projects } = useSessionStore()
  const goalRef = useRef<HTMLTextAreaElement | null>(null)
  const projectRef = useRef<HTMLTextAreaElement | null>(null)
  const noteRef = useRef<HTMLTextAreaElement | null>(null)
  const distractionsRef = useRef<HTMLTextAreaElement | null>(null)
  const projectColors = getProjectColors(session.project)
  const projectSuggestions = useMemo(() => {
    if (!projects?.length) return []
    return projects
      .filter((name) => name.trim().length > 0 && name !== session.project)
      .slice(0, 4)
  }, [projects, session.project])

  const handleTextAreaChange = (field: 'goal' | 'project' | 'note' | 'distractions') =>
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
    resizeTextarea(noteRef.current)
  }, [session.note])

  useEffect(() => {
    resizeTextarea(distractionsRef.current)
  }, [session.distractions])

  useEffect(() => {
    resizeTextarea(projectRef.current)
  }, [session.project])

  const handleProjectSuggestion = (value: string) => {
    updateSession(session.id, { project: value })
  }

  return (
    <tr>
      <td className="session-cell session-cell--time" style={columnStyles.time}>
        <div className="session-time">
          <span className="session-time__range">{formatRange(session.startTime, session.endTime)}</span>
        </div>
      </td>
      <td className="session-cell session-cell--duration" style={columnStyles.duration}>
        <div className="session-duration">{formatDuration(getRoundedDurationMinutes(session))}</div>
      </td>
      <td className="session-cell session-cell--project" style={columnStyles.project}>
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
      <td className="session-cell session-cell--goal" style={columnStyles.goal}>
        <textarea
          ref={goalRef}
          rows={1}
          value={session.goal}
          onChange={handleTextAreaChange('goal')}
          placeholder="What were you aiming for?"
        />
      </td>
      <td className="session-cell session-cell--progress" style={columnStyles.progress}>
        <MeterBar
          label="Progress"
          value={session.progressPercent}
          min={0}
          max={100}
          step={5}
          onChange={handleProgressChange}
        />
      </td>
      <td className="session-cell session-cell--focus" style={columnStyles.focus}>
        <MeterBar
          label="Focus"
          value={session.focusLevel}
          min={1}
          max={10}
          onChange={handleFocusChange}
        />
      </td>
      <td className="session-cell session-cell--note" style={columnStyles.note}>
        <textarea
          ref={noteRef}
          rows={1}
          value={session.note}
          onChange={handleTextAreaChange('note')}
          placeholder="What stood out?"
        />
      </td>
      <td className="session-cell session-cell--distractions" style={columnStyles.distractions}>
        <textarea
          ref={distractionsRef}
          rows={1}
          value={session.distractions}
          onChange={handleTextAreaChange('distractions')}
          placeholder="Any distractions?"
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
  const { sessions, isHydrated } = useSessionStore()
  const tableRef = useRef<HTMLDivElement | null>(null)
  const [exporting, setExporting] = useState(false)
  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(() => ({
    ...DEFAULT_COLUMN_WIDTHS,
  }))

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(COLUMN_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Partial<Record<ColumnKey, number>>
      setColumnWidths((prev) => {
        const next = { ...prev }
        RESIZABLE_COLUMNS.forEach((key) => {
          const stored = parsed?.[key]
          if (typeof stored === 'number' && Number.isFinite(stored)) {
            next[key] = clampColumnWidth(key, stored)
          }
        })
        return next
      })
    } catch {
      // ignore malformed persisted widths
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(columnWidths))
    } catch {
      // ignore persistence errors
    }
  }, [columnWidths])

  const columnStyles = useMemo<ColumnStyles>(() => {
    const styles = {} as ColumnStyles
    RESIZABLE_COLUMNS.forEach((key) => {
      styles[key] = { width: `${columnWidths[key]}px` }
    })
    return styles
  }, [columnWidths])

  const startColumnResize = useCallback((columnKey: ColumnKey, event: ReactPointerEvent<HTMLElement>) => {
    event.preventDefault()
    const headerCell = event.currentTarget.closest('th')
    if (!headerCell) return
    const startX = event.clientX
    const startWidth = headerCell.getBoundingClientRect().width

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX
      const nextWidth = clampColumnWidth(columnKey, startWidth + delta)
      setColumnWidths((prev) => {
        if (Math.abs(prev[columnKey] - nextWidth) < 0.5) {
          return prev
        }
        return { ...prev, [columnKey]: nextWidth }
      })
    }

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }, [])

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


  const flattenForExport = useCallback(() =>
    orderedSessions.map((session) => ({
      date: formatDate(session.startTime),
      timeRange: formatRange(session.startTime, session.endTime),
      duration: getRoundedDurationMinutes(session),
      project: session.project || '',
      goal: session.goal || '',
      progress: session.progressPercent != null ? `${session.progressPercent}%` : '',
      focus: session.focusLevel != null ? String(session.focusLevel) : '',
      note: session.note || '',
      distractions: session.distractions || '',
    })),
  [orderedSessions])

  const handleDownload = useCallback((content: string, fileName: string, mime: string) => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
  }, [])

  const handleExportCsv = useCallback(() => {
    if (!orderedSessions.length) return
    const rows = flattenForExport()
    const headers = ['Date', 'Time', 'Duration (m)', 'Project', 'Goal', 'Progress', 'Focus', 'Note', 'Distractions']
    const csv = [headers, ...rows.map((row) => Object.values(row))]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    handleDownload(csv, `sessions-${createExportDateSuffix()}.csv`, 'text/csv;charset=utf-8;')
  }, [flattenForExport, handleDownload, orderedSessions.length])

  const handleExportMarkdown = useCallback(() => {
    if (!orderedSessions.length) return
    const rows = flattenForExport()
    const headers = ['Date', 'Time', 'Duration', 'Project', 'Goal', 'Progress', 'Focus', 'Note', 'Distractions']
    const headerLine = `| ${headers.join(' | ')} |`
    const divider = `| ${headers.map(() => '---').join(' | ')} |`
    const body = rows
      .map((row) => `| ${Object.values(row)
        .map((value) => String(value || ' ').replace(/\n/g, ' '))
        .join(' | ')} |`)
      .join('\n')
    handleDownload(`${headerLine}\n${divider}\n${body}`, `sessions-${createExportDateSuffix()}.md`, 'text/markdown;charset=utf-8;')
  }, [flattenForExport, handleDownload, orderedSessions.length])

  const handleExportPng = useCallback(async () => {
    if (!tableRef.current || exporting || !orderedSessions.length) return
    setExporting(true)
    try {
      const backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-base') || '#0f0f0f'
      const dataUrl = await toPng(tableRef.current, {
        backgroundColor,
        pixelRatio: window.devicePixelRatio > 1 ? window.devicePixelRatio : 2,
      })
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `sessions-${createExportDateSuffix()}.png`
      link.click()
    } catch (error) {
      console.error('Failed to export PNG', error)
    } finally {
      setExporting(false)
    }
  }, [exporting, orderedSessions.length])

  return (
    <div className="panel">
      <div className="panel__heading">
        <h2>Sessions</h2>
        {orderedSessions.length > 0 && (
          <div className="session-export">
            <button type="button" onClick={handleExportCsv}>
              Export CSV
            </button>
            <button type="button" onClick={handleExportMarkdown}>
              Export Markdown
            </button>
            <button type="button" onClick={handleExportPng} disabled={exporting}>
              {exporting ? 'Rendering…' : 'Export PNG'}
            </button>
          </div>
        )}
      </div>
      {!isHydrated && orderedSessions.length === 0 ? (
        <p className="text-muted">Loading your local session history…</p>
      ) : orderedSessions.length === 0 ? (
        <p className="text-muted">
          Sessions you complete will auto-log here with timestamps so you can annotate intent and focus.
        </p>
      ) : (
        <div className="session-table" ref={tableRef}>
          <table className="session-matrix">
            <thead>
              <tr>
                <th
                  className="session-col session-col--time session-col--resizable"
                  style={columnStyles.time}
                >
                  <div className="session-col__label">When</div>
                  <span
                    className="session-col__resizer"
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Resize When column"
                    onPointerDown={(event) => startColumnResize('time', event)}
                  />
                </th>
                <th
                  className="session-col session-col--duration session-col--resizable"
                  style={columnStyles.duration}
                >
                  <div className="session-col__label">Duration</div>
                  <span
                    className="session-col__resizer"
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Resize Duration column"
                    onPointerDown={(event) => startColumnResize('duration', event)}
                  />
                </th>
                <th
                  className="session-col session-col--project session-col--resizable"
                  style={columnStyles.project}
                >
                  <div className="session-col__label">Project</div>
                  <span
                    className="session-col__resizer"
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Resize Project column"
                    onPointerDown={(event) => startColumnResize('project', event)}
                  />
                </th>
                <th
                  className="session-col session-col--goal session-col--resizable"
                  style={columnStyles.goal}
                >
                  <div className="session-col__label">Goal</div>
                  <span
                    className="session-col__resizer"
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Resize Goal column"
                    onPointerDown={(event) => startColumnResize('goal', event)}
                  />
                </th>
                <th
                  className="session-col session-col--progress session-col--resizable"
                  style={columnStyles.progress}
                >
                  <div className="session-col__label">Progress</div>
                  <span
                    className="session-col__resizer"
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Resize Progress column"
                    onPointerDown={(event) => startColumnResize('progress', event)}
                  />
                </th>
                <th
                  className="session-col session-col--focus session-col--resizable"
                  style={columnStyles.focus}
                >
                  <div className="session-col__label">Focus</div>
                  <span
                    className="session-col__resizer"
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Resize Focus column"
                    onPointerDown={(event) => startColumnResize('focus', event)}
                  />
                </th>
                <th
                  className="session-col session-col--note session-col--resizable"
                  style={columnStyles.note}
                >
                  <div className="session-col__label">Note</div>
                  <span
                    className="session-col__resizer"
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Resize Note column"
                    onPointerDown={(event) => startColumnResize('note', event)}
                  />
                </th>
                <th
                  className="session-col session-col--distractions session-col--resizable"
                  style={columnStyles.distractions}
                >
                  <div className="session-col__label">Distractions</div>
                  <span
                    className="session-col__resizer"
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Resize Distractions column"
                    onPointerDown={(event) => startColumnResize('distractions', event)}
                  />
                </th>
                <th className="session-col session-col--actions"></th>
              </tr>
            </thead>
            <tbody>
              {groupedSessions.map((group) => (
                <Fragment key={group.dayKey}>
                  <tr className="session-day-row">
                    <td colSpan={9}>
                      <div className="session-day-heading">
                        <span>{group.label}</span>
                        <small>{group.sessions.length} session{group.sessions.length > 1 ? 's' : ''}</small>
                      </div>
                    </td>
                  </tr>
                  {group.sessions.map((session) => (
                    <SessionRow session={session} key={session.id} columnStyles={columnStyles} />
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default SessionTable
