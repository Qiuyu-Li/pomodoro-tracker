import type { FC } from 'react'
import { NavLink } from 'react-router-dom'
import ProfileSwitcher from './ProfileSwitcher'

interface PageHeaderProps {
  themeLabel: string
  onToggleTheme: () => void
}

export const PageHeader: FC<PageHeaderProps> = ({ themeLabel, onToggleTheme }) => (
  <header className="page-header">
    <div>
      <h1>PomodoroTracker</h1>
      <p className="text-muted">Elegant, local-first rhythm for deep work.</p>
    </div>
    <div className="page-header__controls">
      <ProfileSwitcher />
      <nav className="page-nav">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          Rhythm
        </NavLink>
        <NavLink to="/insights" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          Insights
        </NavLink>
        <button className="theme-toggle" onClick={onToggleTheme}>
          Toggle {themeLabel === 'light' ? 'Dark' : 'Light'} Mode
        </button>
      </nav>
    </div>
  </header>
)

export default PageHeader
