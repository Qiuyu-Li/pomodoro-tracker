import './App.css'
import { Routes, Route } from 'react-router-dom'
import PageHeader from './components/Layout/PageHeader'
import { useThemeMode } from './hooks/useThemeMode'
import DashboardPage from './pages/Dashboard'
import InsightsPage from './pages/Insights'

function App() {
  const { mode, toggleMode } = useThemeMode()

  return (
    <div className="app-shell">
      <PageHeader themeLabel={mode} onToggleTheme={toggleMode} />
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/insights" element={<InsightsPage />} />
      </Routes>
    </div>
  )
}

export default App
