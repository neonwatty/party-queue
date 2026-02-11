'use client'

import { useState, useEffect } from 'react'
import { usePushSubscription } from '@/hooks/usePushSubscription'
import { IS_MOCK_MODE } from '@/lib/supabase'

const DELAY_MS = 10_000

export function PushPrompt() {
  const { isSubscribed, isSupported, isDismissed, subscribe, dismiss } = usePushSubscription()
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isSupported || isSubscribed || isDismissed || IS_MOCK_MODE) return
    if (typeof Notification !== 'undefined' && Notification.permission !== 'default') return

    const timer = setTimeout(() => setVisible(true), DELAY_MS)
    return () => clearTimeout(timer)
  }, [isSupported, isSubscribed, isDismissed])

  if (!visible) return null

  const handleEnable = async () => {
    setLoading(true)
    await subscribe()
    setVisible(false)
    setLoading(false)
  }

  const handleDismiss = () => {
    dismiss()
    setVisible(false)
  }

  return (
    <div className="mx-4 mb-3 p-3 rounded-xl bg-surface-800/80 backdrop-blur-sm border border-surface-700/50 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <span className="text-lg" aria-hidden="true">
          🔔
        </span>
        <p className="text-sm text-text-secondary flex-1">Get notified when content is added</p>
        <button onClick={handleDismiss} className="btn-ghost text-xs px-2 py-1" disabled={loading}>
          Dismiss
        </button>
        <button onClick={handleEnable} className="btn-primary text-xs px-3 py-1" disabled={loading}>
          {loading ? 'Enabling...' : 'Enable'}
        </button>
      </div>
    </div>
  )
}
