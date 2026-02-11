'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSessionId } from '@/lib/supabase'
import { subscribeToPush, unsubscribeFromPush, getExistingSubscription } from '@/lib/webPushClient'

const DISMISSED_KEY = 'link-party-push-dismissed'

function getInitialSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
}

function getInitialDismissed() {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(DISMISSED_KEY) === 'true'
}

export function usePushSubscription() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isSupported] = useState(getInitialSupported)
  const [isDismissed, setIsDismissed] = useState(getInitialDismissed)

  useEffect(() => {
    if (isSupported) {
      getExistingSubscription().then((sub) => {
        setIsSubscribed(!!sub)
      })
    }
  }, [isSupported])

  const subscribe = useCallback(async () => {
    const sessionId = getSessionId()
    const success = await subscribeToPush(sessionId)
    if (success) setIsSubscribed(true)
    return success
  }, [])

  const unsubscribe = useCallback(async () => {
    const sessionId = getSessionId()
    const success = await unsubscribeFromPush(sessionId)
    if (success) setIsSubscribed(false)
    return success
  }, [])

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, 'true')
    setIsDismissed(true)
  }, [])

  return { isSubscribed, isSupported, isDismissed, subscribe, unsubscribe, dismiss }
}
