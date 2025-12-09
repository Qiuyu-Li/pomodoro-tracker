import type { SessionRecord, TimerSegmentEvent } from './types'

const minutesFromMs = (ms: number) => parseFloat((ms / 60000).toFixed(2))

const createRecordId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

export const createSessionFromSegment = (
  segment: TimerSegmentEvent,
  defaults?: Partial<SessionRecord>,
): SessionRecord => {
  const startIso = new Date(segment.startedAt).toISOString()
  const endIso = new Date(segment.endedAt).toISOString()
  const fullDurationMinutes = minutesFromMs(segment.plannedDurationMs)
  const actualDurationMinutes = minutesFromMs(segment.actualDurationMs)
  const durationMinutes =
    segment.endReason === 'complete' ? fullDurationMinutes : actualDurationMinutes

  return {
    id: createRecordId(),
    phase: segment.phase,
    sourceSegmentId: segment.id,
    startTime: startIso,
    endTime: endIso,
    durationMinutes,
    project: defaults?.project ?? '',
    goal: defaults?.goal ?? '',
    progressPercent: defaults?.progressPercent,
    focusLevel: defaults?.focusLevel,
    note: defaults?.note ?? '',
    distractions: defaults?.distractions ?? '',
    createdAt: new Date().toISOString(),
  }
}

export const deriveProjectSuggestions = (sessions: SessionRecord[]) => {
  const ordered = sessions
    .map((session) => session.project.trim())
    .filter(Boolean)
  return Array.from(new Set(ordered))
}
