import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { apiFetch, AUTH_UNAUTHORIZED_EVENT } from '../lib/api'

interface AuthUser {
  id: string
  email: string
  displayName: string
  createdAt: string
}

interface AuthResponse {
  user: AuthUser
  accessToken: string
  refreshToken: string
}

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  error: string | null
  login: (input: CredentialsInput) => Promise<void>
  signup: (input: SignupInput) => Promise<void>
  logout: () => void
  ensureSession: () => Promise<void>
  getAccessToken: () => string | null
}

const STORAGE_KEY = 'pomodoro-auth'

interface StoredAuth {
  user: AuthUser
  accessToken: string
  refreshToken: string
}

interface CredentialsInput {
  email: string
  password: string
}

interface SignupInput extends CredentialsInput {
  displayName: string
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)
const AUTH_EVENT_MESSAGE = 'Your session expired. Please log in again.'

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const persistAuth = useCallback((payload: StoredAuth | null) => {
    const storage = window.localStorage
    if (!storage) return
    if (!payload) {
      storage.removeItem(STORAGE_KEY)
    } else {
      storage.setItem(STORAGE_KEY, JSON.stringify(payload))
    }
  }, [])

  useEffect(() => {
    const storage = typeof window !== 'undefined' ? window.localStorage : undefined
    if (!storage) {
      setIsLoading(false)
      return
    }

    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) {
      setIsLoading(false)
      return
    }

    try {
      const saved = JSON.parse(raw) as StoredAuth
      setUser(saved.user)
      setAccessToken(saved.accessToken)
      setRefreshToken(saved.refreshToken)
      setIsLoading(false)
    } catch (storageError) {
      console.error('Failed to parse auth storage', storageError)
      storage.removeItem(STORAGE_KEY)
      setIsLoading(false)
    }
  }, [])

  const hydrateProfile = useCallback(
    async (token: string) => {
      try {
        const response = await apiFetch<{ user: AuthUser }>('/auth/me', {
          accessToken: token,
        })
        setUser(response.user)
      } catch (profileError) {
        console.error(profileError)
      }
    },
    [],
  )

  const handleAuthSuccess = useCallback(
    (payload: AuthResponse) => {
      setUser(payload.user)
      setAccessToken(payload.accessToken)
      setRefreshToken(payload.refreshToken)
      persistAuth({ user: payload.user, accessToken: payload.accessToken, refreshToken: payload.refreshToken })
    },
    [persistAuth],
  )

  const login = useCallback(
    async (input: CredentialsInput) => {
      setError(null)
      setIsLoading(true)
      try {
        const response = await apiFetch<AuthResponse>('/auth/login', {
          method: 'POST',
          body: JSON.stringify(input),
        })
        handleAuthSuccess(response)
      } catch (loginError) {
        setError(loginError instanceof Error ? loginError.message : 'Login failed')
        throw loginError
      } finally {
        setIsLoading(false)
      }
    },
    [handleAuthSuccess],
  )

  const signup = useCallback(
    async (input: SignupInput) => {
      setError(null)
      setIsLoading(true)
      try {
        const response = await apiFetch<AuthResponse>('/auth/signup', {
          method: 'POST',
          body: JSON.stringify(input),
        })
        handleAuthSuccess(response)
      } catch (signupError) {
        setError(signupError instanceof Error ? signupError.message : 'Signup failed')
        throw signupError
      } finally {
        setIsLoading(false)
      }
    },
    [handleAuthSuccess],
  )

  const clearSession = useCallback(() => {
    setUser(null)
    setAccessToken(null)
    setRefreshToken(null)
    persistAuth(null)
  }, [persistAuth])

  const logout = useCallback(() => {
    if (accessToken) {
      void apiFetch('/auth/logout', {
        method: 'POST',
        accessToken,
      }).catch(() => {
        /* ignore */
      })
    }
    clearSession()
  }, [accessToken, clearSession])

  const refreshTokens = useCallback(async () => {
    if (!refreshToken) throw new Error('No refresh token available')
    const response = await apiFetch<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    })
    setAccessToken(response.accessToken)
    setRefreshToken(response.refreshToken)
    if (user) {
      persistAuth({ user, accessToken: response.accessToken, refreshToken: response.refreshToken })
    }
    return response.accessToken
  }, [refreshToken, user, persistAuth])

  const ensureSession = useCallback(async () => {
    if (!accessToken && refreshToken) {
      await refreshTokens()
    } else if (accessToken && !user) {
      await hydrateProfile(accessToken)
    }
  }, [accessToken, refreshToken, refreshTokens, user, hydrateProfile])

  const getAccessToken = useCallback(() => accessToken, [accessToken])

  useEffect(() => {
    if (accessToken && !user) {
      void hydrateProfile(accessToken)
    }
  }, [accessToken, user, hydrateProfile])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail
      setError(detail?.message ?? AUTH_EVENT_MESSAGE)
      clearSession()
    }
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handler as EventListener)
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handler as EventListener)
  }, [clearSession])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      error,
      login,
      signup,
      logout,
      ensureSession,
      getAccessToken,
    }),
    [user, isLoading, error, login, signup, logout, ensureSession, getAccessToken],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
