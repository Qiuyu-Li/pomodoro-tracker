export type TimerPhase = 'focus' | 'short-break' | 'long-break'

export interface TimerDurations {
  focusMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  roundsUntilLong: number
}

export interface TimerPreferences extends TimerDurations {
  autoMode: boolean
  selectedSoundId: string
  notificationsEnabled: boolean
}

export interface TimerSegmentEvent {
  id: string
  phase: TimerPhase
  startedAt: number
  endedAt: number
  plannedDurationMs: number
  actualDurationMs: number
}

export interface SessionRecord {
  id: string
  phase: TimerPhase
  sourceSegmentId?: string
  startTime: string
  endTime: string
  durationMinutes: number
  project: string
  goal: string
  progressPercent?: number
  focusLevel?: number
  note: string
  distractions: string
  createdAt: string
}
