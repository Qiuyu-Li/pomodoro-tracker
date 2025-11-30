import { useRef, useState, useEffect, useMemo } from 'react'
import { useSessionStore } from '../../hooks/useSessionStore'

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
})

const confettiElements = Array.from({ length: 18 })

export const GoalSummaryPanel = () => {
  const { sessions } = useSessionStore()
  const today = new Date()
  const todayKey = today.toISOString().slice(0, 10)
  const todaysFocusSessions = useMemo(
    () => sessions.filter((session) => session.phase === 'focus' && session.startTime.slice(0, 10) === todayKey),
    [sessions, todayKey],
  )
  const completedToday = todaysFocusSessions.filter((session) => session.progressPercent === 100).length
  const totalToday = todaysFocusSessions.length
  const completionRate = totalToday ? Math.min(100, Math.round((completedToday / totalToday) * 100)) : 0

  const [isCelebrating, setIsCelebrating] = useState(false)
  const previousProgressRef = useRef<Map<string, number | undefined>>(new Map())

  useEffect(() => {
    const previous = previousProgressRef.current
    let shouldCelebrate = false

    todaysFocusSessions.forEach((session) => {
      const prev = previous.get(session.id)
      if (session.progressPercent === 100 && prev !== 100) {
        shouldCelebrate = true
      }
      previous.set(session.id, session.progressPercent)
    })

    Array.from(previous.keys()).forEach((key) => {
      if (!todaysFocusSessions.some((session) => session.id === key)) {
        previous.delete(key)
      }
    })

    if (shouldCelebrate && typeof window !== 'undefined') {
      setIsCelebrating(true)
      const timer = window.setTimeout(() => setIsCelebrating(false), 1800)
      return () => window.clearTimeout(timer)
    }

    return undefined
  }, [todaysFocusSessions])

  const todayLabel = dateFormatter.format(today)

  return (
    <div className="panel goal-panel">
      <div className="goal-panel__heading">
        <div>
          <h2>Daily Goal Accomplishment</h2>
          <p className="goal-panel__subtitle">{todayLabel}</p>
        </div>
        <div className="goal-panel__stat">
          <span>Accomplished</span>
          <strong>{completedToday}</strong>
        </div>
      </div>

      <p className="goal-panel__meta">
        {totalToday === 0
          ? 'Log a focus block to start tracking goal accomplishment.'
          : `${completedToday} of ${totalToday} focus goals marked complete today.`}
      </p>
      {isCelebrating && (
        <div className="goal-panel__confetti" aria-hidden="true">
          {confettiElements.map((_, index) => (
            <span key={index} style={{ animationDelay: `${index * 40}ms` }} />
          ))}
        </div>
      )}
    </div>
  )
}

export default GoalSummaryPanel
