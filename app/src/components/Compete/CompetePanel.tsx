import { useEffect, useMemo, useState } from 'react'
import { useProfileStore } from '../../hooks/useProfileStore'
import { useSessionStore } from '../../hooks/useSessionStore'
import type { SessionRecord } from '../../lib/types'
import { buildUserFocusSnapshot, type UserFocusSnapshot } from '../../lib/analytics'

type MetricDefinition = {
  key: keyof UserFocusSnapshot
  label: string
  formatter: (value: number | null) => string
}

const metricDefinitions: MetricDefinition[] = [
  {
    key: 'todayMinutes',
    label: 'Focus Today',
    formatter: (value) => `${Math.round(value ?? 0)}m`,
  },
  {
    key: 'weekMinutes',
    label: 'Focus This Week',
    formatter: (value) => `${Math.round(value ?? 0)}m`,
  },
  {
    key: 'averageProgress',
    label: 'Avg. Progress',
    formatter: (value) => (value == null ? '—' : `${Math.round(value)}%`),
  },
  {
    key: 'averageFocus',
    label: 'Avg. Focus',
    formatter: (value) => (value == null ? '—' : value.toFixed(1)),
  },
]

const emptySnapshot: UserFocusSnapshot = {
  todayMinutes: 0,
  weekMinutes: 0,
  averageProgress: null,
  averageFocus: null,
}

export const CompetePanel = () => {
  const { sessions, loadSessionsForUser } = useSessionStore()
  const { activeProfile, peerProfile } = useProfileStore()
  const [peerSessions, setPeerSessions] = useState<SessionRecord[] | null>(null)
  const [isLoadingPeer, setIsLoadingPeer] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!peerProfile) {
      setPeerSessions(null)
      setIsLoadingPeer(false)
      return () => {
        cancelled = true
      }
    }

    setIsLoadingPeer(true)
    loadSessionsForUser(peerProfile.id)
      .then((records) => {
        if (cancelled) return
        setPeerSessions(records)
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingPeer(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [peerProfile, loadSessionsForUser])

  const myStats = useMemo(() => buildUserFocusSnapshot(sessions), [sessions])
  const friendStats = useMemo(
    () => (peerSessions ? buildUserFocusSnapshot(peerSessions) : emptySnapshot),
    [peerSessions],
  )

  return (
    <div className="panel compete-panel">
      <div className="compete-header">
        <div>
          <h2>Compete</h2>
          <p className="text-muted">
            {peerProfile ? `Tracking you versus ${peerProfile.name}` : 'Add a teammate to compare stats.'}
          </p>
        </div>
        {peerProfile && (
          <span className="compete-status">{isLoadingPeer ? 'Syncing…' : 'Live'}</span>
        )}
      </div>
      <div className="compete-columns">
        <CompeteColumn label="You" name={activeProfile.name} snapshot={myStats} />
        <CompeteColumn
          label={peerProfile ? 'Friend' : 'Teammate'}
          name={peerProfile?.name ?? 'Not selected'}
          snapshot={peerProfile ? friendStats : emptySnapshot}
          isPlaceholder={!peerProfile}
        />
      </div>
    </div>
  )
}

interface CompeteColumnProps {
  label: string
  name: string
  snapshot: UserFocusSnapshot
  isPlaceholder?: boolean
}

const CompeteColumn = ({ label, name, snapshot, isPlaceholder }: CompeteColumnProps) => (
  <div className={`compete-column${isPlaceholder ? ' compete-column--placeholder' : ''}`}>
    <div className="compete-column__header">
      <span>{label}</span>
      <strong>{name}</strong>
    </div>
    <div className="compete-metrics">
      {metricDefinitions.map((metric) => (
        <div className="compete-metric" key={metric.key}>
          <span>{metric.label}</span>
          <strong>{metric.formatter(snapshot[metric.key])}</strong>
        </div>
      ))}
    </div>
  </div>
)

export default CompetePanel
