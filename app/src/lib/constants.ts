import type { TimerPreferences } from './types'

export const DEFAULT_TIMER_PREFERENCES: TimerPreferences = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 20,
  roundsUntilLong: 4,
  autoMode: true,
  selectedSoundId: 'chime-soft',
  notificationsEnabled: true,
}

export const TICK_INTERVAL_MS = 1000
