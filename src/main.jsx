import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { ChatProvider } from './context/ChatContext'
import { TokenProvider } from './context/TokenContext'
import { ReminderProvider } from './context/ReminderContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <TokenProvider>
        <ChatProvider>
          <ReminderProvider>
            <App />
          </ReminderProvider>
        </ChatProvider>
      </TokenProvider>
    </AuthProvider>
  </StrictMode>,
)
