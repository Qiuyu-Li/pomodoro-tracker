import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/theme.css'
import './index.css'
import App from './App.tsx'
import { SessionProvider } from './hooks/useSessionStore'
import { ProfileProvider } from './hooks/useProfileStore'

const basename = import.meta.env.BASE_URL ?? '/'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <ProfileProvider>
        <SessionProvider>
          <App />
        </SessionProvider>
      </ProfileProvider>
    </BrowserRouter>
  </StrictMode>,
)
