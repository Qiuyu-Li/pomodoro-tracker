import { useCallback, useRef, useState } from 'react'
import TimerCard from '../components/Timer/TimerCard'
import SessionTable from '../components/SessionTable/SessionTable'
import CompetePanel from '../components/Compete/CompetePanel'
import { usePomodoroMachine } from '../hooks/usePomodoroMachine'
import { useSessionStore } from '../hooks/useSessionStore'
import type { TimerSegmentEvent } from '../lib/types'

export const DashboardPage = () => {
  const { addSessionFromSegment } = useSessionStore()
  const [focusGoal, setFocusGoal] = useState('')
  const activeGoalRef = useRef('')

  const handleSegmentFinish = useCallback((segment: TimerSegmentEvent) => {
    const goal = activeGoalRef.current.trim()
    const overrides = goal ? { goal } : undefined
    addSessionFromSegment(segment, overrides)
  }, [addSessionFromSegment])

  const timerController = usePomodoroMachine({
    onSegmentFinish: handleSegmentFinish,
  })

  const captureGoalForSegment = useCallback((rawGoal: string) => {
    activeGoalRef.current = rawGoal.trim()
  }, [])

  return (
    <div className="page-grid page-grid-single">
      <div className="panels-stack">
        <div className="panels-row panels-row--split">
          <TimerCard
            controller={timerController}
            focusGoal={focusGoal}
            onFocusGoalChange={setFocusGoal}
            onSegmentStart={captureGoalForSegment}
          />
          <CompetePanel />
        </div>
        <SessionTable />
      </div>
    </div>
  )
}

export default DashboardPage
