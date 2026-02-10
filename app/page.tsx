'use client'

import { useAuth } from '@/contexts/AuthContext'
import { LandingPage, AppHome } from '@/components/landing'

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-party flex items-center justify-center">
        <div className="campfire-glow" />
      </div>
    )
  }

  return isAuthenticated ? <AppHome /> : <LandingPage />
}
