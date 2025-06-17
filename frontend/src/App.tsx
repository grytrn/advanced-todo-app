import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore, useThemeStore } from './store'
import { Layout, ProtectedRoute } from './components'
import { LoginPage, SignupPage, DashboardPage, TodosPage, SettingsPage, NotFoundPage } from './pages'
import { useEffect, useCallback, useState } from 'react'
import { CommandPalette, OfflineIndicator, ToastProvider } from './components/advanced'
import { useKeyboardShortcuts, NetworkStatus, useOfflineStore } from './features'
import { useWebSocket } from './hooks/useWebSocket'
import { useSentry } from './hooks/useSentry'

function App() {
  const { theme } = useThemeStore()
  const { isAuthenticated, user } = useAuthStore()
  const { isOnline, syncPending } = useOfflineStore()
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  
  // Initialize Sentry
  useSentry()
  
  // Initialize WebSocket connection for authenticated users
  const { socket, isConnected } = useWebSocket({
    enabled: isAuthenticated,
    userId: user?.id,
  })

  // Apply theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])
  
  // Register service worker for offline functionality
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => console.log('SW registered:', registration))
        .catch(error => console.error('SW registration failed:', error))
    }
  }, [])
  
  // Keyboard shortcuts
  const handleOpenCommandPalette = useCallback(() => {
    setCommandPaletteOpen(true)
  }, [])
  
  useKeyboardShortcuts({
    'cmd+k': handleOpenCommandPalette,
    'ctrl+k': handleOpenCommandPalette,
  })

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background gradient-mesh">
        {/* Global UI elements */}
        <OfflineIndicator isOnline={isOnline} syncPending={syncPending} />
        <NetworkStatus />
        <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
        
        <Routes>
        {/* Public routes */}
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
        } />
        <Route path="/signup" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <SignupPage />
        } />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/todos" element={<TodosPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </ToastProvider>
  )
}

export default App