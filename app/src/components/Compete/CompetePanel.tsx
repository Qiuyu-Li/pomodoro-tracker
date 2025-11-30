import { useMemo, useState, type FormEvent } from 'react'
import { useSessionStore } from '../../hooks/useSessionStore'
import { useAuth } from '../../hooks/useAuth'
import { useFriends } from '../../hooks/useFriends'
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
  const { sessions } = useSessionStore()
  const { user } = useAuth()
  const {
    shareCode,
    friends,
    selectedFriendId,
    setSelectedFriendId,
    isLoading: isLoadingFriends,
    error: friendsError,
    addFriend,
  } = useFriends()
  const myStats = useMemo(() => buildUserFocusSnapshot(sessions), [sessions])
  const selectedFriend = friends.find((friend) => friend.id === selectedFriendId) ?? friends[0]
  const friendStats = selectedFriend?.stats ?? emptySnapshot
  const friendName = selectedFriend?.displayName ?? 'Invite a friend'
  const [friendCode, setFriendCode] = useState('')
  const [inviteStatus, setInviteStatus] = useState<string | null>(null)
  const [isSubmittingFriend, setIsSubmittingFriend] = useState(false)

  const competeStatus = !user
    ? 'Sign in to compete'
    : isLoadingFriends
      ? 'Syncing friends...'
      : friends.length
        ? `Competing with ${friends.length === 1 ? selectedFriend?.displayName ?? 'a friend' : `${friends.length} friends`}`
        : ''

  const handleCopyShareCode = async () => {
    if (!shareCode) return
    try {
      await navigator.clipboard.writeText(shareCode)
      setInviteStatus('Share code copied')
    } catch (error) {
      console.error(error)
      setInviteStatus('Could not copy share code')
    }
  }

  const handleAddFriend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!friendCode.trim()) return
    setInviteStatus(null)
    setIsSubmittingFriend(true)
    try {
      const friend = await addFriend(friendCode)
      setInviteStatus(`Linked with ${friend.displayName}`)
      setFriendCode('')
    } catch (error) {
      console.error(error)
      setInviteStatus(error instanceof Error ? error.message : 'Failed to add friend')
    } finally {
      setIsSubmittingFriend(false)
    }
  }

  return (
    <div className="panel compete-panel">
      <div className="compete-header">
        <div>
          <h2>Compete</h2>
          <p className="text-muted">Invite teammates with your share code to compare focus momentum.</p>
        </div>
        <div className="compete-controls">
          {friends.length > 1 && (
            <select
              aria-label="Select friend"
              value={selectedFriendId ?? ''}
              onChange={(event) => setSelectedFriendId(event.target.value || null)}
            >
              {friends.map((friend) => (
                <option key={friend.id} value={friend.id}>
                  {friend.displayName}
                </option>
              ))}
            </select>
          )}
          {user ? (
            <div className="compete-inline-invite">
              <div className="compete-share__row">
                <span className="compete-inline-label">Share your code to invite someone</span>
                <code className="share-code">{shareCode ?? '--------'}</code>
                <button type="button" onClick={handleCopyShareCode} disabled={!shareCode || isLoadingFriends}>
                  Copy
                </button>
              </div>
              <form className="compete-add" onSubmit={handleAddFriend}>
                <div className="compete-add__row">
                  <label className="compete-add__label" htmlFor="compete-add-code">Add friend</label>
                  <input
                    id="compete-add-code"
                    type="text"
                    placeholder="Enter share code"
                    value={friendCode}
                    onChange={(event) => setFriendCode(event.target.value.toUpperCase())}
                    disabled={isLoadingFriends}
                  />
                  <button type="submit" disabled={!friendCode.trim() || isSubmittingFriend}>
                    {isSubmittingFriend ? 'Adding…' : 'Add'}
                  </button>
                </div>
              </form>
              {(inviteStatus || friendsError) && (
                <p className={`compete-invite__status ${friendsError ? 'text-error' : 'text-muted'}`}>
                  {friendsError ?? inviteStatus}
                </p>
              )}
              <span className="compete-inline-note">{competeStatus}</span>
            </div>
          ) : (
            <span className="compete-status">{competeStatus}</span>
          )}
        </div>
      </div>
      <div className="compete-columns">
        <CompeteColumn label="You" name={user?.displayName ?? 'Guest'} snapshot={myStats} />
        <CompeteColumn
          label="Friend"
          name={friendName}
          snapshot={friendStats}
          isPlaceholder={!friends.length}
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
