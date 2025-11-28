import { useMemo } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts'
import { useSessionStore } from '../../hooks/useSessionStore'
import { buildInsightSummary } from '../../lib/analytics'

const PROJECT_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

export const StatsBoard = () => {
  const { sessions } = useSessionStore()
  const summary = useMemo(() => buildInsightSummary(sessions), [sessions])
  const avgMinutes = summary.totalSessions ? summary.totalMinutes / summary.totalSessions : 0

  if (summary.totalSessions === 0) {
    return (
      <div className="panel stats-panel">
        <h2>Insights</h2>
        <p className="text-muted">
          Complete a few focus blocks and your rhythm, project distribution, and time-of-day patterns will
          bloom here.
        </p>
      </div>
    )
  }

  const topProjects = summary.projectShare.slice(0, 4)

  return (
    <div className="stats-grid">
      <div className="panel stats-panel stat-card-group">
        <div className="stat-card">
          <span>Total Focus Minutes</span>
          <strong>{Math.round(summary.totalMinutes)}</strong>
          <small>{summary.totalSessions} logged sessions</small>
        </div>
        <div className="stat-card">
          <span>Average Session</span>
          <strong>{avgMinutes.toFixed(1)}m</strong>
          <small>per focus block</small>
        </div>
      </div>

      <div className="panel stats-panel stats-wide">
        <h2>Weekly Rhythm</h2>
        {summary.weekly.length === 0 ? (
          <p className="text-muted">You’ll see weekly cadence once you log more focus sessions.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={summary.weekly} margin={{ left: 0, right: 0, top: 20, bottom: 0 }}>
              <defs>
                <linearGradient id="weeklyFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" stroke="var(--text-muted)" />
              <YAxis stroke="var(--text-muted)" />
              <Tooltip
                contentStyle={{ background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--accent-soft)' }}
              />
              <Area type="monotone" dataKey="minutes" stroke="var(--chart-1)" fillOpacity={1} fill="url(#weeklyFill)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="panel stats-panel">
        <h2>Project Focus</h2>
        {summary.projectShare.length === 0 ? (
          <p className="text-muted">Tag sessions with a project to unlock this split.</p>
        ) : (
          <div className="project-chart">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={summary.projectShare} dataKey="minutes" nameKey="label" innerRadius={50} outerRadius={80}>
                  {summary.projectShare.map((entry, index) => (
                    <Cell key={entry.project} fill={PROJECT_COLORS[index % PROJECT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-surface)',
                    borderRadius: 12,
                    border: '1px solid var(--accent-soft)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <ul>
              {topProjects.map((project) => (
                <li key={project.project}>
                  <span>{project.label}</span>
                  <span>{project.minutes.toFixed(1)}m</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="panel stats-panel stats-wide">
        <h2>Time of Day</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={summary.hourly} margin={{ left: 0, right: 0, top: 20, bottom: 0 }}>
            <XAxis dataKey="label" stroke="var(--text-muted)" interval={2} />
            <YAxis stroke="var(--text-muted)" />
            <Tooltip
              contentStyle={{ background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--accent-soft)' }}
            />
            <Bar dataKey="minutes" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default StatsBoard
