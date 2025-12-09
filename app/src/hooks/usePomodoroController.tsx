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
import type { TimerSegmentEvent } from '../lib/types'
import { useSessionStore } from './useSessionStore'
import { usePomodoroMachine, type PomodoroController } from './usePomodoroMachine'

type NotificationStatus = NotificationPermission | 'unsupported'
interface ToneStep {
  frequencies: number[]
  duration: number
  gain?: number
  type?: OscillatorType
}

interface PomodoroContextValue {
  controller: PomodoroController
  focusGoal: string
  setFocusGoal: (goal: string) => void
  primeAudio: () => Promise<void>
  alertsEnabled: boolean
  notificationStatus: NotificationStatus
  toggleAlerts: () => Promise<void>
}

const PomodoroContext = createContext<PomodoroContextValue | undefined>(undefined)

export const PomodoroProvider = ({ children }: PropsWithChildren) => {
  const { addSessionFromSegment } = useSessionStore()
  const [focusGoal, setFocusGoalState] = useState('')
  const latestGoalRef = useRef('')
  const audioContextRef = useRef<AudioContext | null>(null)
  const prevRunStateRef = useRef({ segmentId: '', isRunning: false })
  const notificationsSupported = typeof window !== 'undefined' && 'Notification' in window
  const [notificationStatus, setNotificationStatus] = useState<NotificationStatus>(() =>
    notificationsSupported ? Notification.permission : 'unsupported',
  )
  const [alertsEnabled, setAlertsEnabled] = useState(() => notificationStatus === 'granted')

  useEffect(() => {
    if (notificationStatus !== 'granted') {
      setAlertsEnabled(false)
    }
  }, [notificationStatus])

  const setFocusGoal = useCallback((nextGoal: string) => {
    latestGoalRef.current = nextGoal
    setFocusGoalState(nextGoal)
  }, [])

  const ensureAudioContext = useCallback(async () => {
    if (typeof window === 'undefined') return null
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextCtor) return null
    const ctx = audioContextRef.current ?? new AudioContextCtor()
    audioContextRef.current = ctx
    await ctx.resume()
    return ctx
  }, [])

  const primeAudio = useCallback(async () => {
    await ensureAudioContext()
  }, [ensureAudioContext])

  const playToneSequence = useCallback(
    async (sequence: ToneStep[]) => {
      const ctx = await ensureAudioContext()
      if (!ctx) return
      const masterGain = ctx.createGain()
      masterGain.gain.setValueAtTime(0.15, ctx.currentTime)
      masterGain.connect(ctx.destination)
      let cursor = ctx.currentTime
      sequence.forEach((step) => {
        const stepGain = ctx.createGain()
        stepGain.gain.setValueAtTime(step.gain ?? 0.18, cursor)
        stepGain.gain.exponentialRampToValueAtTime(0.0001, cursor + step.duration)
        stepGain.connect(masterGain)
        step.frequencies.forEach((frequency) => {
          const osc = ctx.createOscillator()
          osc.type = step.type ?? 'sine'
          osc.frequency.setValueAtTime(frequency, cursor)
          osc.connect(stepGain)
          osc.start(cursor)
          osc.stop(cursor + step.duration)
        })
        cursor += step.duration
      })
      masterGain.gain.exponentialRampToValueAtTime(0.0001, cursor + 0.1)
    },
    [ensureAudioContext],
  )

  const playStartChime = useCallback(() => {
    const sequence: ToneStep[] = [
      { frequencies: [392, 523], duration: 0.2, gain: 0.16, type: 'sine' },
      { frequencies: [523, 659], duration: 0.22, gain: 0.18, type: 'triangle' },
      { frequencies: [659, 784], duration: 0.26, gain: 0.16, type: 'sine' },
    ]
    void playToneSequence(sequence)
  }, [playToneSequence])

  const playEndChime = useCallback(() => {
    const sequence: ToneStep[] = [
      { frequencies: [659, 494], duration: 0.28, gain: 0.18, type: 'triangle' },
      { frequencies: [494, 392], duration: 0.32, gain: 0.16, type: 'sine' },
      { frequencies: [392], duration: 0.4, gain: 0.14, type: 'sine' },
    ]
    void playToneSequence(sequence)
  }, [playToneSequence])

  const showNotification = useCallback(
    (segment: TimerSegmentEvent) => {
      if (!notificationsSupported) return
      if (notificationStatus !== 'granted') return
      try {
        const title = segment.phase === 'focus' ? 'Focus block complete' : 'Break finished'
        const body = segment.phase === 'focus' ? 'Stand up, stretch, hydrate.' : 'Sit down and start focusing.'
        const options: NotificationOptions & { renotify?: boolean } = {
          body,
          tag: `pomodoro-${segment.id}`,
          renotify: true,
          silent: true,
        }
        new Notification(title, options)
      } catch (error) {
        console.warn('Unable to show notification.', error)
      }
    },
    [notificationStatus, notificationsSupported],
  )

  const handleSegmentFinish = useCallback(
    (segment: TimerSegmentEvent) => {
      if (segment.phase === 'focus') {
        const goal = latestGoalRef.current.trim()
        const overrides = goal ? { goal } : undefined
        addSessionFromSegment(segment, overrides)
      }
      if (!alertsEnabled) return
      playEndChime()
      showNotification(segment)
    },
    [addSessionFromSegment, alertsEnabled, playEndChime, showNotification],
  )

  const controller = usePomodoroMachine({
    onSegmentFinish: handleSegmentFinish,
  })
  const {
    state: { segmentId, isRunning, phase },
  } = controller

  useEffect(() => {
    if (!prevRunStateRef.current.segmentId) {
      prevRunStateRef.current = { segmentId, isRunning }
    }
  }, [segmentId, isRunning])

  useEffect(() => {
    const prev = prevRunStateRef.current
    const segmentChanged = prev.segmentId !== segmentId
    const startedRunning = !prev.isRunning && isRunning
    const segmentChangedWhileRunning = segmentChanged && isRunning
    if (alertsEnabled && phase === 'focus' && (segmentChangedWhileRunning || startedRunning)) {
      playStartChime()
    }
    prevRunStateRef.current = { segmentId, isRunning }
  }, [alertsEnabled, segmentId, isRunning, phase, playStartChime])

  const ensureNotificationPermission = useCallback(async (): Promise<NotificationStatus> => {
    if (!notificationsSupported) return 'unsupported'
    if (notificationStatus === 'default') {
      const permission = await Notification.requestPermission()
      setNotificationStatus(permission)
      return permission
    }
    return notificationStatus
  }, [notificationStatus, notificationsSupported])

  const toggleAlerts = useCallback(async () => {
    if (!notificationsSupported) return
    if (!alertsEnabled) {
      const permission = await ensureNotificationPermission()
      if (permission !== 'granted') {
        setAlertsEnabled(false)
        return
      }
    }
    setAlertsEnabled((prev) => !prev)
  }, [alertsEnabled, ensureNotificationPermission, notificationsSupported])

  const value = useMemo(
    () => ({
      controller,
      focusGoal,
      setFocusGoal,
      primeAudio,
      alertsEnabled,
      notificationStatus,
      toggleAlerts,
    }),
    [
      controller,
      focusGoal,
      primeAudio,
      alertsEnabled,
      notificationStatus,
      toggleAlerts,
    ],
  )

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>
}

export const usePomodoroController = () => {
  const context = useContext(PomodoroContext)
  if (!context) {
    throw new Error('usePomodoroController must be used within a PomodoroProvider')
  }
  return context
}

export type { NotificationStatus }
