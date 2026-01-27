import { useState, useEffect, lazy, Suspense } from 'react'
import './App.css'
import { getCurrentParty } from './lib/supabase'
import { initAnalytics } from './lib/analytics'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ErrorProvider } from './contexts/ErrorContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { OfflineIndicator } from './components/ui/OfflineIndicator'
import { InstallPrompt } from './components/ui/InstallPrompt'
import type { Screen } from './types'
import { LoaderIcon } from './components/icons'

// Eager load common entry screens
import { HomeScreen } from './components/screens/HomeScreen'
import { CreatePartyScreen } from './components/screens/CreatePartyScreen'
import { JoinPartyScreen } from './components/screens/JoinPartyScreen'

// Lazy load less frequently accessed screens
const LoginScreen = lazy(() => import('./components/screens/LoginScreen').then(m => ({ default: m.LoginScreen })))
const SignupScreen = lazy(() => import('./components/screens/SignupScreen').then(m => ({ default: m.SignupScreen })))
const ResetPasswordScreen = lazy(() => import('./components/screens/ResetPasswordScreen').then(m => ({ default: m.ResetPasswordScreen })))
const PartyRoomScreen = lazy(() => import('./components/screens/PartyRoomScreen').then(m => ({ default: m.PartyRoomScreen })))
const TVModeScreen = lazy(() => import('./components/screens/TVModeScreen').then(m => ({ default: m.TVModeScreen })))
const HistoryScreen = lazy(() => import('./components/screens/HistoryScreen').then(m => ({ default: m.HistoryScreen })))

// Loading fallback for lazy screens
function ScreenLoader() {
  return (
    <div className="container-mobile bg-gradient-party flex flex-col items-center justify-center">
      <LoaderIcon />
      <p className="text-text-muted mt-4">Loading...</p>
    </div>
  )
}

// Main App Content
function AppContent() {
  // Check for join code in URL parameters
  const [joinCodeFromUrl] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search)
    const joinCode = params.get('join') || ''
    // Clean up the URL parameter after extracting
    if (joinCode) {
      window.history.replaceState(null, '', window.location.pathname)
    }
    return joinCode
  })

  // Use lazy initialization to restore state from localStorage
  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    // Check for password reset URL parameter (Supabase sends type=recovery)
    const hash = window.location.hash
    if (hash.includes('type=recovery')) {
      // Clean up the URL hash after detecting recovery
      window.history.replaceState(null, '', window.location.pathname)
      return 'reset-password'
    }
    // Check for join code in URL - navigate to join screen
    const params = new URLSearchParams(window.location.search)
    if (params.get('join')) {
      return 'join'
    }
    const savedParty = getCurrentParty()
    return savedParty ? 'party' : 'home'
  })
  const [currentPartyId, setCurrentPartyId] = useState<string | null>(() => {
    const savedParty = getCurrentParty()
    return savedParty?.partyId ?? null
  })
  const [currentPartyCode, setCurrentPartyCode] = useState<string | null>(() => {
    const savedParty = getCurrentParty()
    return savedParty?.partyCode ?? null
  })
  const { isLoading: authLoading } = useAuth()

  const handlePartyCreated = (partyId: string, partyCode: string) => {
    setCurrentPartyId(partyId)
    setCurrentPartyCode(partyCode)
    setCurrentScreen('party')
  }

  const handlePartyJoined = (partyId: string, partyCode: string) => {
    setCurrentPartyId(partyId)
    setCurrentPartyCode(partyCode)
    setCurrentScreen('party')
  }

  const handleLeaveParty = () => {
    setCurrentPartyId(null)
    setCurrentPartyCode(null)
    setCurrentScreen('home')
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="container-mobile bg-gradient-party flex flex-col items-center justify-center">
        <LoaderIcon />
        <p className="text-text-muted mt-4">Loading...</p>
      </div>
    )
  }

  const screens: Record<Screen, React.ReactNode> = {
    home: <HomeScreen onNavigate={setCurrentScreen} />,
    login: <LoginScreen onNavigate={setCurrentScreen} />,
    signup: <SignupScreen onNavigate={setCurrentScreen} />,
    create: <CreatePartyScreen onNavigate={setCurrentScreen} onPartyCreated={handlePartyCreated} />,
    join: <JoinPartyScreen onNavigate={setCurrentScreen} onPartyJoined={handlePartyJoined} initialCode={joinCodeFromUrl} />,
    party: currentPartyId && currentPartyCode ? (
      <PartyRoomScreen
        onNavigate={setCurrentScreen}
        partyId={currentPartyId}
        partyCode={currentPartyCode}
        onLeaveParty={handleLeaveParty}
      />
    ) : (
      <HomeScreen onNavigate={setCurrentScreen} />
    ),
    tv: currentPartyId && currentPartyCode ? (
      <TVModeScreen
        onNavigate={setCurrentScreen}
        partyId={currentPartyId}
        partyCode={currentPartyCode}
      />
    ) : (
      <HomeScreen onNavigate={setCurrentScreen} />
    ),
    history: <HistoryScreen onNavigate={setCurrentScreen} />,
    'reset-password': <ResetPasswordScreen onNavigate={setCurrentScreen} />,
  }

  return (
    <>
      <OfflineIndicator />
      <Suspense fallback={<ScreenLoader />}>
        {screens[currentScreen]}
      </Suspense>
      <InstallPrompt />
    </>
  )
}

// Main App with providers and ErrorBoundary
function App() {
  // Initialize analytics on mount
  useEffect(() => {
    initAnalytics()
  }, [])

  return (
    <ErrorBoundary>
      <AuthProvider>
        <ErrorProvider>
          <AppContent />
        </ErrorProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
