import { useState, type FormEvent } from 'react'
import { useAuth } from '../../hooks/useAuth'

export const ProfileSwitcher = () => {
  const { user, isLoading, error, login, signup, logout } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus(null)
    try {
      if (mode === 'login') {
        await login({ email, password })
        setStatus('Logged in')
      } else {
        await signup({ email, password, displayName: displayName || email.split('@')[0] })
        setStatus('Account created')
      }
      setEmail('')
      setPassword('')
      setDisplayName('')
    } catch (submitError) {
      console.error(submitError)
      setStatus(submitError instanceof Error ? submitError.message : 'Request failed')
    }
  }

  if (user) {
    return (
      <div className="profile-switcher profile-switcher--auth" aria-label="Account controls">
        <span className="profile-switcher__status-label">Logged in as:</span>
        <div className="profile-switcher__chip profile-switcher__chip--wide">{user.displayName}</div>
        <button type="button" onClick={logout} className="profile-switcher__logout">
          Log out
        </button>
      </div>
    )
  }

  return (
    <form className="profile-switcher profile-switcher--form" onSubmit={handleSubmit}>
      <label className="profile-switcher__label" htmlFor="auth-email">
        {mode === 'login' ? 'Log in' : 'Create account'}
      </label>
      <div className="profile-switcher__create-row">
        <input
          id="auth-email"
          type="email"
          placeholder="email@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <input
          id="auth-password"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>
      {mode === 'signup' && (
        <input
          id="auth-display"
          type="text"
          placeholder="Display name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
      )}
      <div className="profile-switcher__actions">
        <button type="submit" disabled={isLoading}>
          {mode === 'login' ? 'Log in' : 'Sign up'}
        </button>
        <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? 'Need an account?' : 'Have an account?'}
        </button>
      </div>
      {status && <p className="text-muted">{status}</p>}
      {error && <p className="text-error">{error}</p>}
    </form>
  )
}

export default ProfileSwitcher
