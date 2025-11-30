import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/theme.css'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './hooks/useAuth'
import { SessionProvider } from './hooks/useSessionStore'
import { FriendsProvider } from './hooks/useFriends'
import { PomodoroProvider } from './hooks/usePomodoroController'

const basename = import.meta.env.BASE_URL ?? '/'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <FriendsProvider>
          <SessionProvider>
            <PomodoroProvider>
              <App />
            </PomodoroProvider>
          </SessionProvider>
        </FriendsProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
