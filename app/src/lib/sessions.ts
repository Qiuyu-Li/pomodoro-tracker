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

  return {
    id: createRecordId(),
    phase: segment.phase,
    sourceSegmentId: segment.id,
    startTime: startIso,
    endTime: endIso,
    durationMinutes: minutesFromMs(segment.actualDurationMs),
    project: defaults?.project ?? '',
    goal: defaults?.goal ?? '',
    progressPercent: defaults?.progressPercent,
    focusLevel: defaults?.focusLevel,
    comment: defaults?.comment ?? '',
    createdAt: new Date().toISOString(),
  }
}

export const deriveProjectSuggestions = (sessions: SessionRecord[]) => {
  const ordered = sessions
    .map((session) => session.project.trim())
    .filter(Boolean)
  return Array.from(new Set(ordered))
}
