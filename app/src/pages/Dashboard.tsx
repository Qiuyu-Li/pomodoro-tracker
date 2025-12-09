import TimerCard from '../components/Timer/TimerCard'
import SessionTable from '../components/SessionTable/SessionTable'
import CompetePanel from '../components/Compete/CompetePanel'
import GoalSummaryPanel from '../components/Stats/GoalSummaryPanel'
import { usePomodoroController } from '../hooks/usePomodoroController'

export const DashboardPage = () => {
  const {
    controller,
    focusGoal,
    setFocusGoal,
    primeAudio,
    alertsEnabled,
    notificationStatus,
    toggleAlerts,
  } = usePomodoroController()

  return (
    <div className="page-grid page-grid-single">
      <div className="panels-stack">
        <div className="panels-row panels-row--split">
          <TimerCard
            controller={controller}
            focusGoal={focusGoal}
            onFocusGoalChange={setFocusGoal}
            onPrimeAudio={primeAudio}
            alertsEnabled={alertsEnabled}
            notificationStatus={notificationStatus}
            onToggleAlerts={toggleAlerts}
          />
          <div className="panels-column">
            <GoalSummaryPanel />
            <CompetePanel />
          </div>
        </div>
        <SessionTable />
      </div>
    </div>
  )
}

export default DashboardPage
