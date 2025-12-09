import type { ChangeEvent } from 'react'
import type { PomodoroController } from '../../hooks/usePomodoroMachine'
import type { NotificationStatus } from '../../hooks/usePomodoroController'
import { msToClock } from '../../lib/time'

interface TimerCardProps {
  controller: PomodoroController
  focusGoal: string
  onFocusGoalChange: (goal: string) => void
  onPrimeAudio?: () => Promise<void>
  alertsEnabled: boolean
  notificationStatus: NotificationStatus
  onToggleAlerts: () => Promise<void>
}

const phaseLabel: Record<string, string> = {
  focus: 'Focus',
  'short-break': 'Short Break',
  'long-break': 'Long Break',
}

const clampMinutes = (value: number, min = 1, max = 90) =>
  Math.min(Math.max(value, min), max)

export const TimerCard = ({
  controller,
  focusGoal,
  onFocusGoalChange,
  onPrimeAudio,
  alertsEnabled,
  notificationStatus,
  onToggleAlerts,
}: TimerCardProps) => {
  const {
    state,
    preferences,
    start,
    pause,
    resume,
    logAndSkipToFocus,
    completeAndLog,
    reset,
    updatePreferences,
    setAutoMode,
  } = controller

  const isRunning = state.isRunning
  const timerLabel = phaseLabel[state.phase] ?? 'Focus'
  const clock = msToClock(state.remainingMs)

  const handleDurationChange = (field: keyof typeof preferences) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = clampMinutes(Number(event.target.value))
      if (Number.isNaN(nextValue)) return
      updatePreferences({ [field]: nextValue } as Partial<typeof preferences>)
    }

  const handleRoundsChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextRounds = Math.max(1, Math.min(12, Number(event.target.value)))
    if (Number.isNaN(nextRounds)) return
    updatePreferences({ roundsUntilLong: nextRounds })
  }

  const handlePrimaryClick = () => {
    if (!isRunning) {
      void onPrimeAudio?.()
    }
    if (isRunning) {
      pause()
    } else if (state.segmentStartedAt) {
      resume()
    } else {
      start()
    }
  }

  const primaryLabel = isRunning ? 'Pause' : state.segmentStartedAt ? 'Resume' : 'Start'

  return (
    <div className="panel">
      <h2>Pomodoro Timer</h2>
      <div className="timer-display">
        <span className="timer-phase">{timerLabel}</span>
        <span className="timer-clock">{clock}</span>
      </div>

      <div className="goal-input">
        <label htmlFor="focus-goal-input">Focus goal</label>
        <input
          id="focus-goal-input"
          type="text"
          placeholder="What will you tackle this block?"
          value={focusGoal}
          onChange={(event) => onFocusGoalChange(event.target.value)}
        />
      </div>

      <div className="timer-actions">
        <button className="primary" onClick={handlePrimaryClick}>
          {primaryLabel}
        </button>
        <button onClick={logAndSkipToFocus}>Log &amp; Skip</button>
        <button onClick={completeAndLog}>Log & End</button>
        <button onClick={reset}>Reset</button>
      </div>

      <div className="auto-toggle">
        <label>
          <input
            type="checkbox"
            checked={preferences.autoMode}
            onChange={(event) => setAutoMode(event.target.checked)}
          />
          Auto cycle
        </label>
      </div>
      <div className="auto-toggle">
        <label>
          <input
            type="checkbox"
            checked={alertsEnabled}
            onChange={(event) => {
              if (event.target.checked) {
                void onPrimeAudio?.()
              }
              void onToggleAlerts()
            }}
            disabled={notificationStatus === 'unsupported' || notificationStatus === 'denied'}
          />
          Sound
        </label>
        {notificationStatus === 'denied' ? (
          <small className="text-muted">Enable browser notifications to hear alerts.</small>
        ) : null}
        {notificationStatus === 'unsupported' ? (
          <small className="text-muted">This browser does not support notifications.</small>
        ) : null}
      </div>

      <div className="timer-config">
        <div>
          <label>Focus (min)</label>
          <input
            type="number"
            min={1}
            max={90}
            value={preferences.focusMinutes}
            onChange={handleDurationChange('focusMinutes')}
          />
        </div>
        <div>
          <label>Short Break</label>
          <input
            type="number"
            min={1}
            max={30}
            value={preferences.shortBreakMinutes}
            onChange={handleDurationChange('shortBreakMinutes')}
          />
        </div>
        <div>
          <label>Long Break</label>
          <input
            type="number"
            min={5}
            max={60}
            value={preferences.longBreakMinutes}
            onChange={handleDurationChange('longBreakMinutes')}
          />
        </div>
        <div>
          <label>Rounds to long break</label>
          <input
            type="number"
            min={1}
            max={12}
            value={preferences.roundsUntilLong}
            onChange={handleRoundsChange}
          />
        </div>
      </div>
    </div>
  )
}
export default TimerCard
