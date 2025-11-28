import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'

const generateId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

interface UserProfile {
  id: string
  name: string
  createdAt: string
}

interface ProfileStoreValue {
  profiles: UserProfile[]
  activeProfile: UserProfile
  peerProfile: UserProfile | null
  selectProfile: (id: string) => void
  selectPeerProfile: (id: string) => void
  createProfile: (name: string) => void
}

const PROFILE_LIST_KEY = 'pomodoro-profiles'
const ACTIVE_PROFILE_KEY = 'pomodoro-active-profile'
const PEER_PROFILE_KEY = 'pomodoro-peer-profile'

const defaultProfile = (label = 'Me'): UserProfile => ({
  id: generateId(),
  name: label,
  createdAt: new Date().toISOString(),
})
const safeStorage = () => (typeof window !== 'undefined' ? window.localStorage : undefined)

const readProfiles = (): UserProfile[] => {
  try {
    const storage = safeStorage()
    if (!storage) return [defaultProfile()]
    const raw = storage.getItem(PROFILE_LIST_KEY)
    if (!raw) return [defaultProfile()]
    const parsed = JSON.parse(raw) as UserProfile[]
    return parsed.length > 0 ? parsed : [defaultProfile()]
  } catch (error) {
    console.error('Failed to parse profiles from storage', error)
    return [defaultProfile()]
  }
}

const ProfilesContext = createContext<ProfileStoreValue | undefined>(undefined)

export const ProfileProvider = ({ children }: PropsWithChildren) => {
  const [profiles, setProfiles] = useState<UserProfile[]>(() => readProfiles())
  const [activeId, setActiveId] = useState(() => safeStorage()?.getItem(ACTIVE_PROFILE_KEY) ?? '')
  const [peerId, setPeerId] = useState(() => safeStorage()?.getItem(PEER_PROFILE_KEY) ?? '')

  useEffect(() => {
    const storage = safeStorage()
    if (storage) {
      storage.setItem(PROFILE_LIST_KEY, JSON.stringify(profiles))
    }
  }, [profiles])

  useEffect(() => {
    if (!activeId && profiles.length > 0) {
      setActiveId(profiles[0].id)
    }
  }, [activeId, profiles])

  useEffect(() => {
    const storage = safeStorage()
    if (storage && activeId) {
      storage.setItem(ACTIVE_PROFILE_KEY, activeId)
    }
  }, [activeId])

  useEffect(() => {
    if (peerId && !profiles.some((profile) => profile.id === peerId)) {
      setPeerId('')
      return
    }
    if (peerId && peerId === activeId) {
      const fallback = profiles.find((profile) => profile.id !== activeId)
      setPeerId(fallback?.id ?? '')
    } else if (!peerId && profiles.length > 1) {
      const fallback = profiles.find((profile) => profile.id !== activeId)
      if (fallback) setPeerId(fallback.id)
    }
  }, [profiles, activeId, peerId])

  useEffect(() => {
    const storage = safeStorage()
    if (!storage) return
    if (peerId) {
      storage.setItem(PEER_PROFILE_KEY, peerId)
    } else {
      storage.removeItem(PEER_PROFILE_KEY)
    }
  }, [peerId])

  const activeProfile = useMemo(() => {
    if (!profiles.length) return defaultProfile()
    const found = profiles.find((profile) => profile.id === activeId)
    return found ?? profiles[0]
  }, [profiles, activeId])

  const peerProfile = useMemo(() => {
    if (!peerId || peerId === activeProfile.id) return null
    return profiles.find((profile) => profile.id === peerId) ?? null
  }, [peerId, profiles, activeProfile.id])

  const selectProfile = useCallback((id: string) => {
    setActiveId(id)
  }, [])

  const createProfile = useCallback((name: string) => {
    setProfiles((prev) => {
      const profile: UserProfile = {
        id: generateId(),
        name: name.trim() || `User ${prev.length + 1}`,
        createdAt: new Date().toISOString(),
      }
      setActiveId(profile.id)
      return [...prev, profile]
    })
  }, [])

  const selectPeerProfile = useCallback(
    (id: string) => {
      if (!id) {
        setPeerId('')
        return
      }
      if (id === activeProfile.id) return
      setPeerId(id)
    },
    [activeProfile.id],
  )

  const value = useMemo<ProfileStoreValue>(
    () => ({
      profiles,
      activeProfile,
      peerProfile,
      selectProfile,
      selectPeerProfile,
      createProfile,
    }),
    [profiles, activeProfile, peerProfile, selectProfile, selectPeerProfile, createProfile],
  )

  return <ProfilesContext.Provider value={value}>{children}</ProfilesContext.Provider>
}

export const useProfileStore = () => {
  const context = useContext(ProfilesContext)
  if (!context) {
    throw new Error('useProfileStore must be used within a ProfileProvider')
  }
  return context
}
