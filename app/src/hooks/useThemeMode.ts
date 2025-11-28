import { useCallback, useEffect, useState } from 'react'

type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'pomodoro-theme-mode'

const getPreferredMode = (): ThemeMode => {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null
  if (stored === 'light' || stored === 'dark') return stored
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

export const useThemeMode = () => {
  const [mode, setMode] = useState<ThemeMode>(getPreferredMode)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode)
    window.localStorage.setItem(STORAGE_KEY, mode)
  }, [mode])

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'))
  }, [])

  return { mode, toggleMode }
}
