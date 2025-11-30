import type { FC } from 'react'
import { NavLink } from 'react-router-dom'
import ProfileSwitcher from './ProfileSwitcher'

interface PageHeaderProps {
  themeLabel: string
  onToggleTheme: () => void
}

export const PageHeader: FC<PageHeaderProps> = ({ themeLabel, onToggleTheme }) => (
  <header className="page-header">
    <div className="page-header__primary">
      <div className="page-header__title">
        <h1>PomodoroTracker</h1>
        <p className="page-header__subtitle">Stay in rhythm, log every lap.</p>
      </div>
      <nav className="page-nav">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          Rhythm
        </NavLink>
        <NavLink to="/insights" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          Insights
        </NavLink>
      </nav>
    </div>
      <div className="page-header__secondary">
        <ProfileSwitcher />
        <div className="page-header__utility">
          <button
            className="theme-toggle"
            onClick={onToggleTheme}
            aria-label={`Switch to ${themeLabel === 'light' ? 'dark' : 'light'} mode`}
            type="button"
          >
            <span aria-hidden="true">{themeLabel === 'light' ? '🌙' : '☀️'}</span>
          </button>
        </div>
      </div>
  </header>
)

export default PageHeader
