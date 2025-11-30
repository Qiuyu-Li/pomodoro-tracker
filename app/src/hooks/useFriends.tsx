import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { apiFetch } from '../lib/api'
import { useAuth } from './useAuth'
import type { UserFocusSnapshot } from '../lib/analytics'

interface FriendEntry {
  id: string
  displayName: string
  stats: UserFocusSnapshot
}

interface FriendsResponse {
  shareCode: string
  friends: FriendEntry[]
}

interface FriendsContextValue {
  shareCode: string | null
  friends: FriendEntry[]
  selectedFriendId: string | null
  setSelectedFriendId: (friendId: string | null) => void
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  addFriend: (shareCode: string) => Promise<FriendEntry>
  removeFriend: (friendId: string) => Promise<void>
}

const FriendsContext = createContext<FriendsContextValue | undefined>(undefined)

export const FriendsProvider = ({ children }: PropsWithChildren) => {
  const { user, ensureSession, getAccessToken } = useAuth()
  const [shareCode, setShareCode] = useState<string | null>(null)
  const [friends, setFriends] = useState<FriendEntry[]>([])
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selectFriend = useCallback(
    (friendId: string | null) => {
      setSelectedFriendId(friendId)
    },
    [setSelectedFriendId],
  )

  const requireToken = useCallback(async () => {
    await ensureSession()
    const token = getAccessToken()
    if (!token) {
      throw new Error('Please log in to manage friends.')
    }
    return token
  }, [ensureSession, getAccessToken])

  const syncSelectedFriend = useCallback(
    (list: FriendEntry[]) => {
      setSelectedFriendId((current) => {
        if (!list.length) {
          return null
        }

        if (current && list.some((friend) => friend.id === current)) {
          return current
        }

        return list[0].id
      })
    },
    [setSelectedFriendId],
  )

  const fetchFriends = useCallback(async () => {
    if (!user) {
      setFriends([])
      setShareCode(null)
      setSelectedFriendId(null)
      return
    }

    const token = await requireToken()
    const response = await apiFetch<FriendsResponse>('/friends', {
      accessToken: token,
    })

    setShareCode(response.shareCode)
    setFriends(response.friends)
    syncSelectedFriend(response.friends)
  }, [requireToken, syncSelectedFriend, user])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!user) {
        setShareCode(null)
        setFriends([])
        setSelectedFriendId(null)
        setIsLoading(false)
        setError(null)
        return
      }

      setIsLoading(true)
      setError(null)
      try {
        await fetchFriends()
      } catch (loadError) {
        if (cancelled) return
        setError(loadError instanceof Error ? loadError.message : 'Failed to load friends')
        setFriends([])
        setShareCode(null)
        setSelectedFriendId(null)
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [fetchFriends, user])

  const refresh = useCallback(async () => {
    if (!user) {
      setFriends([])
      setShareCode(null)
      setSelectedFriendId(null)
      return
    }
    await fetchFriends()
  }, [fetchFriends, user])

  const addFriend = useCallback(
    async (code: string) => {
      const normalized = code.trim().toUpperCase()
      if (!normalized) {
        throw new Error('Share code is required')
      }

      const token = await requireToken()
      const response = await apiFetch<{ friend: FriendEntry }>('/friends', {
        method: 'POST',
        body: JSON.stringify({ shareCode: normalized }),
        accessToken: token,
      })

      setFriends((prev) => {
        const exists = prev.some((friend) => friend.id === response.friend.id)
        const next = exists ? prev : [...prev, response.friend]
        if (!exists) {
          syncSelectedFriend(next)
        }
        return next
      })

      return response.friend
    },
    [requireToken, syncSelectedFriend],
  )

  const removeFriend = useCallback(
    async (friendId: string) => {
      const token = await requireToken()
      await apiFetch(`/friends/${friendId}`, {
        method: 'DELETE',
        accessToken: token,
      })

      setFriends((prev) => {
        const next = prev.filter((friend) => friend.id !== friendId)
        syncSelectedFriend(next)
        return next
      })
    },
    [requireToken, syncSelectedFriend],
  )

  const value = useMemo<FriendsContextValue>(
    () => ({
      shareCode,
      friends,
      selectedFriendId,
      setSelectedFriendId: selectFriend,
      isLoading,
      error,
      refresh,
      addFriend,
      removeFriend,
    }),
    [shareCode, friends, selectedFriendId, isLoading, error, refresh, addFriend, removeFriend, selectFriend],
  )

  return <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>
}

export const useFriends = () => {
  const context = useContext(FriendsContext)
  if (!context) {
    throw new Error('useFriends must be used within a FriendsProvider')
  }
  return context
}
