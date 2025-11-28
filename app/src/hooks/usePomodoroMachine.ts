import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_TIMER_PREFERENCES, TICK_INTERVAL_MS } from '../lib/constants'
import type { TimerPhase, TimerPreferences, TimerSegmentEvent } from '../lib/types'
import { minutesToMs } from '../lib/time'

type SegmentEndReason = 'complete' | 'skipped' | 'manual-end'

const createSegmentId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

interface MachineState {
  phase: TimerPhase
  isRunning: boolean
  remainingMs: number
  segmentDurationMs: number
  completedFocusBlocks: number
  cycleCount: number
  segmentStartedAt: number | null
  segmentId: string
}

const phaseDurationMs = (phase: TimerPhase, prefs: TimerPreferences) => {
  switch (phase) {
    case 'focus':
      return minutesToMs(prefs.focusMinutes)
    case 'short-break':
      return minutesToMs(prefs.shortBreakMinutes)
    case 'long-break':
      return minutesToMs(prefs.longBreakMinutes)
    default:
      return minutesToMs(prefs.focusMinutes)
  }
}

const createInitialState = (prefs: TimerPreferences): MachineState => {
  const duration = phaseDurationMs('focus', prefs)
  return {
    phase: 'focus',
    isRunning: false,
    remainingMs: duration,
    segmentDurationMs: duration,
    completedFocusBlocks: 0,
    cycleCount: 0,
    segmentStartedAt: null,
    segmentId: createSegmentId(),
  }
}

const determineNextPhase = (
  currentPhase: TimerPhase,
  completedFocusBlocks: number,
  prefs: TimerPreferences,
): TimerPhase => {
  if (currentPhase === 'focus') {
    return completedFocusBlocks % prefs.roundsUntilLong === 0
      ? 'long-break'
      : 'short-break'
  }
  return 'focus'
}

export const usePomodoroMachine = (options?: {
  onSegmentFinish?: (segment: TimerSegmentEvent) => void
}) => {
  const [preferences, setPreferences] = useState<TimerPreferences>(
    DEFAULT_TIMER_PREFERENCES,
  )
  const [state, setState] = useState<MachineState>(() =>
    createInitialState(DEFAULT_TIMER_PREFERENCES),
  )

  const prefsRef = useRef(preferences)
  const pendingEventRef = useRef<TimerSegmentEvent | null>(null)
  const optionsRef = useRef(options)

  useEffect(() => {
    prefsRef.current = preferences
  }, [preferences])

  useEffect(() => {
    optionsRef.current = options
  }, [options])

  const assignPendingEvent = (current: MachineState) => {
    const elapsed = current.segmentDurationMs - Math.max(0, current.remainingMs)
    const endedAt = Date.now()
    const startedAt = current.segmentStartedAt ?? endedAt - elapsed

    pendingEventRef.current = {
      id: current.segmentId,
      phase: current.phase,
      startedAt,
      endedAt,
      plannedDurationMs: current.segmentDurationMs,
      actualDurationMs: Math.max(elapsed, 0),
    }
  }

  const applySegmentCompletion = useCallback(
    (current: MachineState, reason: SegmentEndReason): MachineState => {
      assignPendingEvent(current)

      const nextCompletedFocus =
        current.phase === 'focus'
          ? current.completedFocusBlocks + 1
          : current.completedFocusBlocks

      const nextPhase = determineNextPhase(
        current.phase,
        nextCompletedFocus,
        prefsRef.current,
      )
      const nextDuration = phaseDurationMs(nextPhase, prefsRef.current)
      const shouldAutoRun =
        reason === 'complete' ? prefsRef.current.autoMode : false

      return {
        ...current,
        phase: nextPhase,
        isRunning: shouldAutoRun,
        remainingMs: nextDuration,
        segmentDurationMs: nextDuration,
        completedFocusBlocks: nextCompletedFocus,
        cycleCount: nextCompletedFocus,
        segmentStartedAt: shouldAutoRun ? Date.now() : null,
        segmentId: createSegmentId(),
      }
    },
    [],
  )

  const finalizeSegment = useCallback(
    (reason: SegmentEndReason) => {
      setState((current) => applySegmentCompletion(current, reason))
    },
    [applySegmentCompletion],
  )

  useEffect(() => {
    if (!state.isRunning) return

    const interval = window.setInterval(() => {
      setState((current) => {
        if (!current.isRunning) return current
        const nextRemaining = current.remainingMs - TICK_INTERVAL_MS
        if (nextRemaining <= 0) {
          const scheduleFinalization = () => finalizeSegment('complete')
          if (typeof queueMicrotask === 'function') {
            queueMicrotask(scheduleFinalization)
          } else {
            setTimeout(scheduleFinalization, 0)
          }
          return current
        }
        return { ...current, remainingMs: nextRemaining }
      })
    }, TICK_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [state.isRunning, finalizeSegment])

  useEffect(() => {
    if (!pendingEventRef.current) return
    const event = pendingEventRef.current
    pendingEventRef.current = null
    optionsRef.current?.onSegmentFinish?.(event)
  }, [state])

  const start = useCallback(() => {
    setState((current) => {
      if (current.isRunning) return current
      return {
        ...current,
        isRunning: true,
        segmentStartedAt: current.segmentStartedAt ?? Date.now(),
      }
    })
  }, [])

  const pause = useCallback(() => {
    setState((current) => ({ ...current, isRunning: false }))
  }, [])

  const resume = useCallback(() => {
    setState((current) => {
      if (current.isRunning) return current
      return { ...current, isRunning: true, segmentStartedAt: current.segmentStartedAt ?? Date.now() }
    })
  }, [])

  const skipToNext = useCallback(() => {
    finalizeSegment('skipped')
  }, [finalizeSegment])

  const completeAndLog = useCallback(() => {
    finalizeSegment('manual-end')
  }, [finalizeSegment])

  const reset = useCallback(() => {
    setState(createInitialState(prefsRef.current))
  }, [])

  const updatePreferences = useCallback((partial: Partial<TimerPreferences>) => {
    setPreferences((prev) => {
      const merged: TimerPreferences = { ...prev, ...partial }
      setState((current) => {
        if (current.isRunning) return current
        const updatedDuration = phaseDurationMs(current.phase, merged)
        return {
          ...current,
          remainingMs: updatedDuration,
          segmentDurationMs: updatedDuration,
        }
      })
      return merged
    })
  }, [])

  return {
    state,
    preferences,
    start,
    pause,
    resume,
    skipToNext,
    completeAndLog,
    reset,
    updatePreferences,
    setAutoMode: (autoMode: boolean) => updatePreferences({ autoMode }),
  }
}

export type PomodoroController = ReturnType<typeof usePomodoroMachine>
