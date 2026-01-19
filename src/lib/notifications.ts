import { PushNotifications } from '@capacitor/push-notifications'
import { Capacitor } from '@capacitor/core'
import { supabase } from './supabase'
import { getSessionId } from './supabase'

// Check if we're running on a native platform
export const isNativePlatform = () => Capacitor.isNativePlatform()

// Request permission and register for push notifications
export async function registerPushNotifications(): Promise<string | null> {
  if (!isNativePlatform()) {
    console.log('Push notifications only available on native platforms')
    return null
  }

  try {
    // Request permission
    const permStatus = await PushNotifications.requestPermissions()

    if (permStatus.receive !== 'granted') {
      console.log('Push notification permission not granted')
      return null
    }

    // Register with APNS/FCM
    await PushNotifications.register()

    // Get the token via listener
    return new Promise((resolve) => {
      PushNotifications.addListener('registration', async (token) => {
        console.log('Push registration success, token:', token.value)

        // Save token to Supabase
        await savePushToken(token.value)
        resolve(token.value)
      })

      PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', error)
        resolve(null)
      })
    })
  } catch (error) {
    console.error('Error registering push notifications:', error)
    return null
  }
}

// Save push token to Supabase
async function savePushToken(token: string): Promise<void> {
  const sessionId = getSessionId()
  const platform = Capacitor.getPlatform()

  const { error } = await supabase
    .from('push_tokens')
    .upsert(
      {
        session_id: sessionId,
        token,
        platform,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'session_id',
      }
    )

  if (error) {
    console.error('Error saving push token:', error)
  }
}

// Set up notification listeners
export function setupNotificationListeners(
  onNotificationReceived?: (notification: { title?: string; body?: string; data?: Record<string, unknown> }) => void
): void {
  if (!isNativePlatform()) return

  // Notification received while app is in foreground
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push notification received:', notification)
    onNotificationReceived?.({
      title: notification.title,
      body: notification.body,
      data: notification.data,
    })
  })

  // Notification tapped (app opened from notification)
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    console.log('Push notification action performed:', action)
    // Handle navigation based on notification data
    const data = action.notification.data
    if (data?.partyId) {
      // Navigate to party - this would need to be connected to app routing
      console.log('Navigate to party:', data.partyId)
    }
  })
}

// Remove push token (on logout)
export async function removePushToken(): Promise<void> {
  const sessionId = getSessionId()

  const { error } = await supabase
    .from('push_tokens')
    .delete()
    .eq('session_id', sessionId)

  if (error) {
    console.error('Error removing push token:', error)
  }
}

// Check notification permission status
export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'prompt'> {
  if (!isNativePlatform()) {
    return 'denied'
  }

  const status = await PushNotifications.checkPermissions()
  return status.receive as 'granted' | 'denied' | 'prompt'
}
