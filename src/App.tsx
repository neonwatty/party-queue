import { useState, useEffect } from 'react'
import './App.css'
import {
  supabase,
  getSessionId,
  generatePartyCode,
  getDisplayName,
  setDisplayName,
  getAvatar,
  getCurrentParty,
  setCurrentParty,
  clearCurrentParty,
} from './lib/supabase'
import { useParty } from './hooks/useParty'
import type { QueueItem } from './hooks/useParty'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, updatePassword } from './lib/auth'
import { validateEmail, validatePassword, validateDisplayName } from './lib/validation'
import { fetchContentMetadata, type ContentMetadataResponse } from './lib/contentMetadata'
import type { Screen, ContentType, AddContentStep } from './types'
import { detectContentType, getContentTypeBadge } from './utils/contentHelpers'
import { getQueueItemTitle, getQueueItemSubtitle } from './utils/queueHelpers'
import { isItemOverdue } from './utils/dateHelpers'
import {
  PlayIcon,
  SkipIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  DragIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PlayNextIcon,
  ShareIcon,
  ChevronLeftIcon,
  CloseIcon,
  YoutubeIcon,
  TwitterIcon,
  RedditIcon,
  NoteIcon,
  LinkIcon,
  CheckIcon,
  CheckCircleIcon,
  LoaderIcon,
  AlertIcon,
  ClockIcon,
  CalendarIcon,
  UsersIcon,
  TvIcon,
  HistoryIcon,
} from './components/icons'

// Components

function HomeScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  return (
    <div className="container-mobile bg-gradient-party flex flex-col px-6 py-8 safe-area-bottom">
      {/* Header */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => onNavigate('history')}
          className="btn-ghost p-2 rounded-full"
        >
          <HistoryIcon />
        </button>
      </div>

      {/* Hero */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="animate-fade-in-up opacity-0">
          <div className="text-accent-500 font-mono text-sm tracking-wider mb-4">
            SHARE LINKS TOGETHER
          </div>
          <h1 className="text-5xl font-bold leading-tight mb-4">
            Link<br />Party
          </h1>
          <p className="text-text-secondary text-lg mb-6 max-w-xs">
            Share content together. Queue videos, tweets, posts, and notes in real-time.
          </p>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => onNavigate('create')}
              className="btn btn-primary w-full text-lg"
            >
              Start a Party
            </button>
            <button
              onClick={() => onNavigate('join')}
              className="btn btn-secondary w-full text-lg"
            >
              Join with Code
            </button>

            {/* Sign in link - inline with buttons */}
            <div className="text-center pt-2">
              <button
                onClick={() => onNavigate('login')}
                className="text-text-muted text-sm hover:text-text-secondary transition-colors"
              >
                Already have an account? <span className="text-accent-400">Sign in</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LoginScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmailSent, setResetEmailSent] = useState(false)

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await signInWithGoogle()
    } catch {
      setError('Failed to sign in with Google')
      setIsLoading(false)
    }
  }

  const handleEmailSignIn = async () => {
    setEmailError(null)
    setPasswordError(null)
    setError(null)

    const emailValidation = validateEmail(email)
    const passwordValidation = validatePassword(password)

    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error || null)
    }
    if (!passwordValidation.isValid) {
      setPasswordError(passwordValidation.error || null)
    }

    if (!emailValidation.isValid || !passwordValidation.isValid) {
      return
    }

    setIsLoading(true)
    const result = await signInWithEmail(email, password)
    setIsLoading(false)

    if (!result.success) {
      setError(result.error || 'Failed to sign in')
    }
  }

  const handleForgotPassword = async () => {
    setEmailError(null)
    setError(null)

    const emailValidation = validateEmail(email)
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error || null)
      return
    }

    setIsLoading(true)
    const result = await resetPassword(email)
    setIsLoading(false)

    if (result.success) {
      setResetEmailSent(true)
    } else {
      setError(result.error || 'Failed to send reset email')
    }
  }

  if (showForgotPassword) {
    return (
      <div className="container-mobile bg-gradient-party flex flex-col px-6 py-8">
        <button
          onClick={() => {
            setShowForgotPassword(false)
            setResetEmailSent(false)
          }}
          className="btn-ghost p-2 -ml-2 w-fit rounded-full mb-8"
          disabled={isLoading}
        >
          <ChevronLeftIcon />
        </button>

        <div className="flex-1 flex flex-col">
          <h1 className="text-3xl font-bold mb-2 animate-fade-in-up opacity-0">
            Reset password
          </h1>
          <p className="text-text-secondary mb-8 animate-fade-in-up opacity-0 delay-100">
            Enter your email to receive a reset link
          </p>

          {resetEmailSent ? (
            <div className="animate-fade-in-up opacity-0 delay-200">
              <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-4 text-center">
                <p className="text-teal-400 font-medium mb-2">Check your email</p>
                <p className="text-text-secondary text-sm">
                  We've sent a password reset link to {email}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowForgotPassword(false)
                  setResetEmailSent(false)
                }}
                className="btn btn-secondary w-full mt-6"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="text-red-400 text-sm text-center mb-4">{error}</div>
              )}

              <div className="space-y-4 animate-fade-in-up opacity-0 delay-200">
                <div>
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`input ${emailError ? 'input-error' : ''}`}
                    disabled={isLoading}
                  />
                  {emailError && (
                    <p className="text-red-400 text-sm mt-1">{emailError}</p>
                  )}
                </div>
                <button
                  onClick={handleForgotPassword}
                  className="btn btn-primary w-full"
                  disabled={isLoading}
                >
                  {isLoading ? <LoaderIcon /> : 'Send Reset Link'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="container-mobile bg-gradient-party flex flex-col px-6 py-8">
      {/* Back button */}
      <button
        onClick={() => onNavigate('home')}
        className="btn-ghost p-2 -ml-2 w-fit rounded-full mb-8"
        disabled={isLoading}
      >
        <ChevronLeftIcon />
      </button>

      <div className="flex-1 flex flex-col">
        <h1 className="text-3xl font-bold mb-2 animate-fade-in-up opacity-0">
          Welcome back
        </h1>
        <p className="text-text-secondary mb-8 animate-fade-in-up opacity-0 delay-100">
          Sign in to access your party history
        </p>

        {error && (
          <div className="text-red-400 text-sm text-center mb-4">{error}</div>
        )}

        {/* OAuth buttons */}
        <div className="space-y-3 mb-8 animate-fade-in-up opacity-0 delay-200">
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="btn btn-secondary w-full flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isLoading ? (
              <LoaderIcon />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
              </svg>
            )}
            Continue with Google
          </button>
        </div>

        <div className="flex items-center gap-4 mb-8 animate-fade-in-up opacity-0 delay-300">
          <div className="flex-1 h-px bg-surface-700"></div>
          <span className="text-text-muted text-sm">or</span>
          <div className="flex-1 h-px bg-surface-700"></div>
        </div>

        {/* Email form */}
        <div className="space-y-4 animate-fade-in-up opacity-0 delay-400">
          <div>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`input ${emailError ? 'input-error' : ''}`}
              disabled={isLoading}
            />
            {emailError && (
              <p className="text-red-400 text-sm mt-1">{emailError}</p>
            )}
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`input ${passwordError ? 'input-error' : ''}`}
              disabled={isLoading}
            />
            {passwordError && (
              <p className="text-red-400 text-sm mt-1">{passwordError}</p>
            )}
          </div>
          <button
            onClick={handleEmailSignIn}
            className="btn btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? <LoaderIcon /> : 'Sign In'}
          </button>
        </div>

        <div className="mt-4 text-center animate-fade-in-up opacity-0 delay-500">
          <button
            onClick={() => setShowForgotPassword(true)}
            className="text-text-muted text-sm hover:text-text-secondary transition-colors"
          >
            Forgot password?
          </button>
        </div>

        <div className="mt-4 text-center animate-fade-in-up opacity-0 delay-500">
          <button
            onClick={() => onNavigate('signup')}
            className="text-text-muted text-sm hover:text-text-secondary transition-colors"
          >
            Don't have an account? <span className="text-accent-400">Sign up</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function SignupScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [displayName, setDisplayNameInput] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [signupSuccess, setSignupSuccess] = useState(false)

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await signInWithGoogle()
    } catch {
      setError('Failed to sign in with Google')
      setIsLoading(false)
    }
  }

  const handleEmailSignUp = async () => {
    setNameError(null)
    setEmailError(null)
    setPasswordError(null)
    setError(null)

    const nameValidation = validateDisplayName(displayName)
    const emailValidation = validateEmail(email)
    const passwordValidation = validatePassword(password)

    if (!nameValidation.isValid) {
      setNameError(nameValidation.error || null)
    }
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error || null)
    }
    if (!passwordValidation.isValid) {
      setPasswordError(passwordValidation.error || null)
    }

    if (!nameValidation.isValid || !emailValidation.isValid || !passwordValidation.isValid) {
      return
    }

    setIsLoading(true)
    const result = await signUpWithEmail(email, password, displayName.trim())
    setIsLoading(false)

    if (result.success && result.needsConfirmation) {
      setSignupSuccess(true)
    } else if (!result.success) {
      setError(result.error || 'Failed to create account')
    }
  }

  if (signupSuccess) {
    return (
      <div className="container-mobile bg-gradient-party flex flex-col px-6 py-8">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="animate-fade-in-up opacity-0">
            <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-6">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-teal-400">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h1 className="text-3xl font-bold mb-4">Check your email</h1>
            <p className="text-text-secondary mb-8">
              We've sent a confirmation link to <span className="text-text-primary">{email}</span>. Click the link to activate your account.
            </p>
            <button
              onClick={() => onNavigate('login')}
              className="btn btn-primary"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container-mobile bg-gradient-party flex flex-col px-6 py-8">
      <button
        onClick={() => onNavigate('home')}
        className="btn-ghost p-2 -ml-2 w-fit rounded-full mb-8"
        disabled={isLoading}
      >
        <ChevronLeftIcon />
      </button>

      <div className="flex-1 flex flex-col">
        <h1 className="text-3xl font-bold mb-2 animate-fade-in-up opacity-0">
          Create account
        </h1>
        <p className="text-text-secondary mb-8 animate-fade-in-up opacity-0 delay-100">
          Join parties and share content with friends
        </p>

        {error && (
          <div className="text-red-400 text-sm text-center mb-4">{error}</div>
        )}

        <div className="space-y-3 mb-8 animate-fade-in-up opacity-0 delay-200">
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="btn btn-secondary w-full flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isLoading ? (
              <LoaderIcon />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
              </svg>
            )}
            Continue with Google
          </button>
        </div>

        <div className="flex items-center gap-4 mb-8 animate-fade-in-up opacity-0 delay-300">
          <div className="flex-1 h-px bg-surface-700"></div>
          <span className="text-text-muted text-sm">or</span>
          <div className="flex-1 h-px bg-surface-700"></div>
        </div>

        {/* Email form */}
        <div className="space-y-4 animate-fade-in-up opacity-0 delay-400">
          <div>
            <input
              type="text"
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayNameInput(e.target.value)}
              className={`input ${nameError ? 'input-error' : ''}`}
              disabled={isLoading}
            />
            {nameError && (
              <p className="text-red-400 text-sm mt-1">{nameError}</p>
            )}
          </div>
          <div>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`input ${emailError ? 'input-error' : ''}`}
              disabled={isLoading}
            />
            {emailError && (
              <p className="text-red-400 text-sm mt-1">{emailError}</p>
            )}
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`input ${passwordError ? 'input-error' : ''}`}
              disabled={isLoading}
            />
            {passwordError && (
              <p className="text-red-400 text-sm mt-1">{passwordError}</p>
            )}
          </div>
          <button
            onClick={handleEmailSignUp}
            className="btn btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? <LoaderIcon /> : 'Create Account'}
          </button>
        </div>

        <div className="mt-6 text-center animate-fade-in-up opacity-0 delay-500">
          <button
            onClick={() => onNavigate('login')}
            className="text-text-muted text-sm hover:text-text-secondary transition-colors"
          >
            Already have an account? <span className="text-accent-400">Sign in</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function ResetPasswordScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = useState(false)

  const handleUpdatePassword = async () => {
    setPasswordError(null)
    setConfirmError(null)
    setError(null)

    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.isValid) {
      setPasswordError(passwordValidation.error || null)
      return
    }

    if (newPassword !== confirmPassword) {
      setConfirmError('Passwords do not match')
      return
    }

    setIsLoading(true)
    const result = await updatePassword(newPassword)
    setIsLoading(false)

    if (result.success) {
      setResetSuccess(true)
    } else {
      setError(result.error || 'Failed to update password')
    }
  }

  if (resetSuccess) {
    return (
      <div className="container-mobile bg-gradient-party flex flex-col px-6 py-8">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="animate-fade-in-up opacity-0">
            <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-6">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-teal-400">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h1 className="text-3xl font-bold mb-4">Password updated</h1>
            <p className="text-text-secondary mb-8">
              Your password has been successfully updated. You can now sign in with your new password.
            </p>
            <button
              onClick={() => onNavigate('login')}
              className="btn btn-primary"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container-mobile bg-gradient-party flex flex-col px-6 py-8">
      <button
        onClick={() => onNavigate('login')}
        className="btn-ghost p-2 -ml-2 w-fit rounded-full mb-8"
        disabled={isLoading}
      >
        <ChevronLeftIcon />
      </button>

      <div className="flex-1 flex flex-col">
        <h1 className="text-3xl font-bold mb-2 animate-fade-in-up opacity-0">
          Set new password
        </h1>
        <p className="text-text-secondary mb-8 animate-fade-in-up opacity-0 delay-100">
          Enter your new password below
        </p>

        {error && (
          <div className="text-red-400 text-sm text-center mb-4">{error}</div>
        )}

        <div className="space-y-4 animate-fade-in-up opacity-0 delay-200">
          <div>
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={`input ${passwordError ? 'input-error' : ''}`}
              disabled={isLoading}
            />
            {passwordError && (
              <p className="text-red-400 text-sm mt-1">{passwordError}</p>
            )}
          </div>
          <div>
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`input ${confirmError ? 'input-error' : ''}`}
              disabled={isLoading}
            />
            {confirmError && (
              <p className="text-red-400 text-sm mt-1">{confirmError}</p>
            )}
          </div>
          <button
            onClick={handleUpdatePassword}
            className="btn btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? <LoaderIcon /> : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface CreatePartyScreenProps {
  onNavigate: (screen: Screen) => void
  onPartyCreated: (partyId: string, partyCode: string) => void
}

function CreatePartyScreen({ onNavigate, onPartyCreated }: CreatePartyScreenProps) {
  const [partyName, setPartyName] = useState('')
  const [displayName, setDisplayNameInput] = useState(getDisplayName() || '')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!displayName.trim()) {
      setError('Please enter a display name')
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const sessionId = getSessionId()
      const code = generatePartyCode()
      const avatar = getAvatar()

      // Check if we're in mock mode (no Supabase)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const isMockMode = !supabaseUrl || supabaseUrl.includes('placeholder') || supabaseUrl.includes('your-project-id')

      if (isMockMode) {
        // Mock party creation
        const mockPartyId = `mock-party-${Date.now()}`
        setDisplayName(displayName.trim())
        setCurrentParty(mockPartyId, code)
        onPartyCreated(mockPartyId, code)
        return
      }

      // Create the party
      const { data: party, error: partyError } = await supabase
        .from('parties')
        .insert({
          code,
          name: partyName.trim() || null,
          host_session_id: sessionId,
        })
        .select()
        .single()

      if (partyError) throw partyError

      // Add host as a member
      const { error: memberError } = await supabase
        .from('party_members')
        .insert({
          party_id: party.id,
          session_id: sessionId,
          display_name: displayName.trim(),
          avatar,
          is_host: true,
        })

      if (memberError) throw memberError

      // Save display name for future use
      setDisplayName(displayName.trim())
      setCurrentParty(party.id, code)

      onPartyCreated(party.id, code)
    } catch (err) {
      console.error('Error creating party:', err)
      setError('Failed to create party. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="container-mobile bg-gradient-party flex flex-col px-6 py-8">
      <button
        onClick={() => onNavigate('home')}
        className="btn-ghost p-2 -ml-2 w-fit rounded-full mb-8"
        disabled={isCreating}
      >
        <ChevronLeftIcon />
      </button>

      <div className="flex-1 flex flex-col">
        <h1 className="text-3xl font-bold mb-2 animate-fade-in-up opacity-0">
          Start a party
        </h1>
        <p className="text-text-secondary mb-8 animate-fade-in-up opacity-0 delay-100">
          Create a room and invite your friends
        </p>

        <div className="space-y-6 animate-fade-in-up opacity-0 delay-200">
          <div>
            <label className="block text-sm text-text-secondary mb-2">
              Your name
            </label>
            <input
              type="text"
              placeholder="Enter your display name"
              value={displayName}
              onChange={(e) => setDisplayNameInput(e.target.value)}
              className="input"
              disabled={isCreating}
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-2">
              Party name (optional)
            </label>
            <input
              type="text"
              placeholder="Saturday Night Hangout"
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              className="input"
              disabled={isCreating}
            />
          </div>

          {/* Settings preview */}
          <div className="card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Queue limit</div>
                <div className="text-xs text-text-muted">Max items in queue</div>
              </div>
              <div className="bg-surface-700 px-3 py-1.5 rounded-lg font-mono text-sm">
                100
              </div>
            </div>
            <div className="h-px bg-surface-700"></div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Rate limit</div>
                <div className="text-xs text-text-muted">Items per person/minute</div>
              </div>
              <div className="bg-surface-700 px-3 py-1.5 rounded-lg font-mono text-sm">
                5
              </div>
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center">{error}</div>
          )}

          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="btn btn-primary w-full text-lg mt-4 disabled:opacity-50"
          >
            {isCreating ? (
              <span className="flex items-center justify-center gap-2">
                <LoaderIcon />
                Creating...
              </span>
            ) : (
              'Create Party'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

interface JoinPartyScreenProps {
  onNavigate: (screen: Screen) => void
  onPartyJoined: (partyId: string, partyCode: string) => void
  initialCode?: string
}

function JoinPartyScreen({ onNavigate, onPartyJoined, initialCode = '' }: JoinPartyScreenProps) {
  const [code, setCode] = useState(initialCode)
  const [displayName, setDisplayNameInput] = useState(getDisplayName() || '')
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleJoin = async () => {
    if (!displayName.trim()) {
      setError('Please enter a display name')
      return
    }

    if (code.length !== 6) {
      setError('Please enter a 6-character party code')
      return
    }

    setIsJoining(true)
    setError(null)

    try {
      const sessionId = getSessionId()
      const avatar = getAvatar()

      // Look up party by code
      const { data: party, error: partyError } = await supabase
        .from('parties')
        .select('*')
        .eq('code', code.toUpperCase())
        .single()

      if (partyError) {
        if (partyError.code === 'PGRST116') {
          setError('Party not found. Check the code and try again.')
        } else {
          throw partyError
        }
        return
      }

      // Upsert member (in case they've joined before)
      const { error: memberError } = await supabase
        .from('party_members')
        .upsert(
          {
            party_id: party.id,
            session_id: sessionId,
            display_name: displayName.trim(),
            avatar,
            is_host: false,
          },
          {
            onConflict: 'party_id,session_id',
          }
        )

      if (memberError) throw memberError

      // Save display name for future use
      setDisplayName(displayName.trim())
      setCurrentParty(party.id, party.code)

      onPartyJoined(party.id, party.code)
    } catch (err) {
      console.error('Error joining party:', err)
      setError('Failed to join party. Please try again.')
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="container-mobile bg-gradient-party flex flex-col px-6 py-8">
      <button
        onClick={() => onNavigate('home')}
        className="btn-ghost p-2 -ml-2 w-fit rounded-full mb-8"
        disabled={isJoining}
      >
        <ChevronLeftIcon />
      </button>

      <div className="flex-1 flex flex-col">
        <h1 className="text-3xl font-bold mb-2 animate-fade-in-up opacity-0">
          Join a party
        </h1>
        <p className="text-text-secondary mb-8 animate-fade-in-up opacity-0 delay-100">
          Enter the code from your host
        </p>

        <div className="space-y-6 animate-fade-in-up opacity-0 delay-200">
          <div>
            <label className="block text-sm text-text-secondary mb-2">
              Your name
            </label>
            <input
              type="text"
              placeholder="Enter your display name"
              value={displayName}
              onChange={(e) => setDisplayNameInput(e.target.value)}
              className="input"
              disabled={isJoining}
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-2">
              Party code
            </label>
            <input
              type="text"
              placeholder="ABC123"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="input text-center text-2xl font-mono tracking-[0.3em] uppercase"
              disabled={isJoining}
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center">{error}</div>
          )}

          <button
            onClick={handleJoin}
            className="btn btn-primary w-full text-lg disabled:opacity-50"
            disabled={code.length !== 6 || !displayName.trim() || isJoining}
          >
            {isJoining ? (
              <span className="flex items-center justify-center gap-2">
                <LoaderIcon />
                Joining...
              </span>
            ) : (
              'Join Party'
            )}
          </button>
        </div>

        <div className="mt-auto pt-12 text-center animate-fade-in-up opacity-0 delay-300">
          <p className="text-text-muted text-sm">
            Ask your host for the 6-character code
          </p>
        </div>
      </div>
    </div>
  )
}

interface PartyRoomScreenProps {
  onNavigate: (screen: Screen) => void
  partyId: string
  partyCode: string
  onLeaveParty: () => void
}

function PartyRoomScreen({ onNavigate, partyId, partyCode, onLeaveParty }: PartyRoomScreenProps) {
  const {
    queue,
    members,
    partyInfo,
    isLoading,
    addToQueue,
    moveItem,
    deleteItem,
    advanceQueue,
    showNext,
    updateNoteContent,
    toggleComplete,
  } = useParty(partyId)

  const [showAddContent, setShowAddContent] = useState(false)
  const [addContentStep, setAddContentStep] = useState<AddContentStep>('input')
  const [contentUrl, setContentUrl] = useState('')
  const [noteText, setNoteText] = useState('')
  const [noteDueDate, setNoteDueDate] = useState<string>('')
  const [detectedType, setDetectedType] = useState<ContentType | null>(null)
  const [fetchedPreview, setFetchedPreview] = useState<ContentMetadataResponse['data'] | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  // Note editing state
  const [showEditNote, setShowEditNote] = useState(false)
  const [editNoteText, setEditNoteText] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  // Note viewing state
  const [showViewNote, setShowViewNote] = useState(false)
  const [viewingNote, setViewingNote] = useState<QueueItem | null>(null)
  // Share/copy feedback state
  const [showCopied, setShowCopied] = useState(false)

  const sessionId = getSessionId()
  const currentUserDisplayName = getDisplayName() || 'You'
  const isHost = partyInfo?.hostSessionId === sessionId

  const currentItem = queue.find(v => v.status === 'showing')
  const pendingItems = queue.filter(v => v.status === 'pending')

  // Handle URL submission - fetch real metadata
  const handleUrlSubmit = async () => {
    const type = detectContentType(contentUrl)
    if (!type) return

    setDetectedType(type)
    setAddContentStep('loading')
    setFetchError(null)

    try {
      const result = await fetchContentMetadata(contentUrl)

      if (result.success && result.data) {
        setFetchedPreview(result.data)
        setAddContentStep('preview')
      } else {
        setFetchError(result.error || 'Failed to fetch content')
        // Still show preview with limited data
        setFetchedPreview(null)
        setAddContentStep('preview')
      }
    } catch (err) {
      console.error('Metadata fetch error:', err)
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch content')
      setFetchedPreview(null)
      setAddContentStep('preview')
    }
  }

  const handleAddToQueue = () => {
    if (!detectedType) return

    // Immediately show success state (sync) to ensure iOS touch event completes
    setAddContentStep('success')

    // Then do async work
    const doAddToQueue = async () => {
      try {
        let queueItemData: Partial<QueueItem>

        if (detectedType === 'note') {
          queueItemData = { noteContent: noteText, dueDate: noteDueDate || undefined }
        } else if (fetchedPreview) {
          // Map fetched preview data to queue item fields
          queueItemData = {
            title: fetchedPreview.title,
            channel: fetchedPreview.channel,
            duration: fetchedPreview.duration,
            thumbnail: fetchedPreview.thumbnail,
            tweetAuthor: fetchedPreview.tweetAuthor,
            tweetHandle: fetchedPreview.tweetHandle,
            tweetContent: fetchedPreview.tweetContent,
            tweetTimestamp: fetchedPreview.tweetTimestamp,
            subreddit: fetchedPreview.subreddit,
            redditTitle: fetchedPreview.redditTitle,
            redditBody: fetchedPreview.redditBody,
            upvotes: fetchedPreview.upvotes,
            commentCount: fetchedPreview.commentCount,
          }
        } else {
          // Fallback if no preview data
          queueItemData = {}
        }

        await addToQueue({
          type: detectedType,
          status: queue.length === 0 ? 'showing' : 'pending',
          addedBy: currentUserDisplayName,
          isCompleted: false,
          ...queueItemData,
        })
      } catch (err) {
        console.error('Failed to add to queue:', err)
      }
    }

    doAddToQueue()

    setTimeout(() => {
      setShowAddContent(false)
      setAddContentStep('input')
      setContentUrl('')
      setNoteText('')
      setNoteDueDate('')
      setDetectedType(null)
      setFetchedPreview(null)
      setFetchError(null)
    }, 1500)
  }

  const handleNoteSubmit = () => {
    console.log('handleNoteSubmit called, noteText:', noteText.trim())
    if (noteText.trim()) {
      console.log('Setting detectedType to note')
      setDetectedType('note')
      setAddContentStep('preview')
    }
  }

  // Note editing handlers
  const handleOpenEditNote = (item: QueueItem) => {
    if (item.type === 'note') {
      setEditNoteText(item.noteContent || '')
      setEditingNoteId(item.id)
      setShowEditNote(true)
      setSelectedItem(null)
    }
  }

  const handleSaveNote = async () => {
    if (editingNoteId && editNoteText.trim()) {
      try {
        await updateNoteContent(editingNoteId, editNoteText.trim())
        setShowEditNote(false)
        setEditNoteText('')
        setEditingNoteId(null)
      } catch (err) {
        console.error('Failed to update note:', err)
      }
    }
  }

  const handleCancelEditNote = () => {
    setShowEditNote(false)
    setEditNoteText('')
    setEditingNoteId(null)
  }

  // Note viewing handlers
  const handleViewNote = (item: QueueItem) => {
    if (item.type === 'note') {
      setViewingNote(item)
      setShowViewNote(true)
      setSelectedItem(null)
    }
  }

  const handleMoveUp = async (itemId: string) => {
    await moveItem(itemId, 'up')
    setSelectedItem(null)
  }

  const handleMoveDown = async (itemId: string) => {
    await moveItem(itemId, 'down')
    setSelectedItem(null)
  }

  const handleDelete = async () => {
    if (selectedItem) {
      try {
        await deleteItem(selectedItem.id)
        setShowDeleteConfirm(false)
        setSelectedItem(null)
      } catch (err) {
        console.error('Failed to delete item:', err)
      }
    }
  }

  const handleShowNext = async (itemId: string) => {
    await showNext(itemId)
    setSelectedItem(null)
  }

  const handleNext = async () => {
    await advanceQueue()
  }

  const handleLeave = () => {
    clearCurrentParty()
    onLeaveParty()
  }

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}?join=${partyCode}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${partyInfo?.name || 'Party'}`,
          text: `Join my Link Party with code ${partyCode}`,
          url: shareUrl,
        })
      } catch (err) {
        // User cancelled or share failed, fall back to clipboard
        if ((err as Error).name !== 'AbortError') {
          await copyToClipboard(shareUrl)
        }
      }
    } else {
      await copyToClipboard(shareUrl)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="container-mobile bg-surface-950 flex flex-col items-center justify-center">
        <LoaderIcon />
        <p className="text-text-muted mt-4">Loading party...</p>
      </div>
    )
  }

  return (
    <div className="container-mobile bg-surface-950 flex flex-col min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-surface-800 safe-area-top">
        <button
          onClick={handleLeave}
          className="btn-ghost icon-btn -ml-2 rounded-full"
        >
          <ChevronLeftIcon />
        </button>
        <div className="text-center">
          <div className="font-semibold">{partyInfo?.name || 'Party'}</div>
          <div className="text-xs text-text-muted font-mono">{partyCode}</div>
        </div>
        <div className="flex gap-0">
          <button
            onClick={() => onNavigate('tv')}
            className="btn-ghost icon-btn rounded-full"
            title="TV Mode"
          >
            <TvIcon />
          </button>
          <button
            onClick={handleShare}
            className="btn-ghost icon-btn rounded-full"
            title="Share Party"
          >
            <ShareIcon />
          </button>
        </div>
      </div>

      {/* Now Showing */}
      {currentItem && (
        <div className="p-4 bg-gradient-to-b from-surface-900 to-surface-950">
          <div className="text-xs text-accent-500 font-mono mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse"></span>
            NOW SHOWING
          </div>

          {/* Content Display - Different for each type */}
          {currentItem.type === 'youtube' && (
            <>
              <div className="relative aspect-video bg-surface-800 rounded-xl overflow-hidden mb-4 glow-accent">
                <img
                  src={currentItem.thumbnail}
                  alt={currentItem.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                    <PlayIcon />
                  </div>
                </div>
              </div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-lg truncate">{currentItem.title}</h2>
                  <p className="text-text-muted text-sm">{currentItem.channel}</p>
                </div>
              </div>
            </>
          )}

          {currentItem.type === 'tweet' && (
            <div className="bg-surface-800 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <TwitterIcon size={24} />
                </div>
                <div>
                  <div className="font-semibold">{currentItem.tweetAuthor}</div>
                  <div className="text-text-muted text-sm">{currentItem.tweetHandle}</div>
                </div>
              </div>
              <p className="text-lg leading-relaxed mb-3">{currentItem.tweetContent}</p>
              <div className="text-text-muted text-sm">{currentItem.tweetTimestamp}</div>
            </div>
          )}

          {currentItem.type === 'reddit' && (
            <div className="bg-surface-800 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500">
                  <RedditIcon size={14} />
                </div>
                <span className="text-orange-500 text-sm font-medium">{currentItem.subreddit}</span>
              </div>
              <h2 className="font-semibold text-lg mb-2">{currentItem.redditTitle}</h2>
              <p className="text-text-secondary text-sm mb-3 line-clamp-3">{currentItem.redditBody}</p>
              <div className="flex items-center gap-4 text-text-muted text-sm">
                <span>{currentItem.upvotes?.toLocaleString()} upvotes</span>
                <span>{currentItem.commentCount?.toLocaleString()} comments</span>
              </div>
            </div>
          )}

          {currentItem.type === 'note' && (
            <div className="bg-surface-800 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-gray-500/20 flex items-center justify-center text-gray-400">
                  <NoteIcon size={16} />
                </div>
                <span className="text-text-muted text-sm">Note from {currentItem.addedBy}</span>
              </div>
              <p className="text-lg leading-relaxed">{currentItem.noteContent}</p>
            </div>
          )}

          {/* Host Controls - Just Next button */}
          {isHost && (
            <div className="flex items-center justify-center mt-4">
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-accent-500 hover:bg-accent-400 transition-colors font-medium"
              >
                <SkipIcon />
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Members */}
      <div className="px-4 py-3 border-b border-surface-800">
        <div className="flex items-center gap-2 text-text-secondary text-sm">
          <UsersIcon />
          <span>{members.length} watching</span>
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          {members.map(member => (
            <div
              key={member.id}
              className="flex items-center gap-1.5 bg-surface-800 px-2 py-1 rounded-full text-sm"
            >
              <span>{member.avatar}</span>
              <span>{member.sessionId === sessionId ? 'You' : member.name}</span>
              {member.isHost && (
                <span className="text-[10px] bg-accent-500/20 text-accent-400 px-1.5 py-0.5 rounded-full">
                  HOST
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Queue */}
      <div className="flex-1 overflow-auto">
        <div className="px-4 py-3 flex items-center justify-between sticky top-0 bg-surface-950/95 backdrop-blur z-10">
          <div className="text-sm text-text-secondary">
            Up next · {pendingItems.length} items
          </div>
          <div className="text-xs text-text-muted">Tap to edit</div>
        </div>

        <div className="px-4 pb-24">
          {pendingItems.map((item, index) => {
            const badge = getContentTypeBadge(item.type)
            const BadgeIcon = badge.icon
            const isOwnItem = item.addedBySessionId === sessionId
            const overdue = isItemOverdue(item)
            return (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`queue-item cursor-pointer active:bg-surface-700 ${item.isCompleted ? 'opacity-60' : ''}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Completion checkbox for notes */}
                {item.type === 'note' ? (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleComplete(item.id)
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      toggleComplete(item.id)
                    }}
                    className={`flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 cursor-pointer ${item.isCompleted ? 'text-green-500' : overdue ? 'text-red-500' : 'text-text-muted'}`}
                  >
                    <CheckCircleIcon size={24} filled={item.isCompleted} />
                  </div>
                ) : (
                  <DragIcon />
                )}
                {/* Content type badge/preview */}
                <div className={`relative w-20 h-12 rounded-lg overflow-hidden flex-shrink-0 ${badge.bg} flex items-center justify-center`}>
                  {item.type === 'youtube' && item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className={badge.color}>
                      <BadgeIcon size={24} />
                    </span>
                  )}
                  {isOwnItem && (
                    <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-teal-500"></div>
                  )}
                  {/* Overdue indicator */}
                  {overdue && (
                    <div className="absolute bottom-0.5 right-0.5 text-red-500">
                      <AlertIcon size={12} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`${badge.color}`}>
                      <BadgeIcon size={12} />
                    </span>
                    <span className={`font-medium text-sm truncate ${item.isCompleted ? 'line-through' : ''}`}>
                      {getQueueItemTitle(item)}
                    </span>
                    {/* Due date indicator */}
                    {item.dueDate && !item.isCompleted && (
                      <span className={`flex-shrink-0 ${overdue ? 'text-red-400' : 'text-amber-400'}`}>
                        <ClockIcon size={12} />
                      </span>
                    )}
                  </div>
                  <div className={`text-xs ${overdue ? 'text-red-400' : 'text-text-muted'}`}>
                    {getQueueItemSubtitle(item)}
                  </div>
                </div>
                <div className="text-text-muted">
                  <EditIcon />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add Content FAB */}
      <button
        onClick={() => setShowAddContent(true)}
        className="fab bg-accent-500 hover:bg-accent-400 transition-all hover:scale-105 animate-pulse-glow"
      >
        <PlusIcon />
      </button>

      {/* Add Content Modal - Enhanced */}
      {showAddContent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50">
          <div className="bg-surface-900 w-full max-w-md rounded-t-3xl p-6 bottom-sheet animate-fade-in-up">
            <div className="w-12 h-1 bg-surface-600 rounded-full mx-auto mb-6"></div>

            {/* Step: Input - URL or Note */}
            {addContentStep === 'input' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Add to queue</h3>
                  <button onClick={() => setShowAddContent(false)} className="text-text-muted">
                    <CloseIcon />
                  </button>
                </div>

                {/* URL Input */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <LinkIcon />
                    <span className="text-sm text-text-secondary">Paste a URL</span>
                  </div>
                  <input
                    type="text"
                    placeholder="YouTube, Twitter/X, or Reddit URL..."
                    value={contentUrl}
                    onChange={(e) => setContentUrl(e.target.value)}
                    className="input"
                    autoFocus
                  />
                  <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                    <span className="flex items-center gap-1"><YoutubeIcon size={12} /> YouTube</span>
                    <span className="flex items-center gap-1"><TwitterIcon size={12} /> Twitter/X</span>
                    <span className="flex items-center gap-1"><RedditIcon size={12} /> Reddit</span>
                  </div>
                </div>

                <button
                  onClick={handleUrlSubmit}
                  disabled={!contentUrl || !detectContentType(contentUrl)}
                  className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                >
                  Continue
                </button>

                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1 h-px bg-surface-700"></div>
                  <span className="text-text-muted text-sm">or</span>
                  <div className="flex-1 h-px bg-surface-700"></div>
                </div>

                {/* Write a Note Button */}
                <button
                  onClick={() => setAddContentStep('note')}
                  className="btn btn-secondary w-full flex items-center justify-center gap-2"
                >
                  <NoteIcon size={20} />
                  Write a note
                </button>
              </>
            )}

            {/* Step: Write Note */}
            {addContentStep === 'note' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Write a note</h3>
                  <button
                    onClick={() => { setAddContentStep('input'); setNoteText(''); }}
                    className="text-text-muted"
                  >
                    <CloseIcon />
                  </button>
                </div>

                <textarea
                  placeholder="Share a thought, reminder, or message..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="input min-h-[120px] resize-none mb-4"
                  autoFocus
                />

                {/* Optional Due Date */}
                <div className="mb-4">
                  <label className="flex items-center gap-2 text-sm text-text-secondary mb-2">
                    <CalendarIcon size={16} />
                    Due date (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={noteDueDate}
                    onChange={(e) => setNoteDueDate(e.target.value)}
                    className="input"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  {noteDueDate && (
                    <button
                      onClick={() => setNoteDueDate('')}
                      className="text-xs text-text-muted hover:text-text-secondary mt-1"
                    >
                      Clear due date
                    </button>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setAddContentStep('input'); setNoteText(''); setNoteDueDate(''); }}
                    className="btn btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleNoteSubmit}
                    disabled={!noteText.trim()}
                    className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Preview
                  </button>
                </div>
              </>
            )}

            {/* Step: Loading */}
            {addContentStep === 'loading' && (
              <div className="py-8 flex flex-col items-center">
                <LoaderIcon />
                <p className="text-text-secondary mt-4">Fetching content details...</p>
              </div>
            )}

            {/* Step: Preview */}
            {addContentStep === 'preview' && detectedType && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Add to queue?</h3>
                  <button
                    onClick={() => { setAddContentStep('input'); setContentUrl(''); setNoteText(''); setDetectedType(null); setFetchedPreview(null); setFetchError(null); }}
                    className="text-text-muted"
                  >
                    <CloseIcon />
                  </button>
                </div>

                {/* Error message if fetch failed */}
                {fetchError && (
                  <div className="card p-3 mb-4 border-yellow-500/50 bg-yellow-500/10">
                    <p className="text-yellow-500 text-sm">{fetchError}</p>
                    <p className="text-text-muted text-xs mt-1">Content will be added with limited preview</p>
                  </div>
                )}

                {/* Preview Card - Different for each type */}
                <div className="card p-3 mb-4">
                  {detectedType === 'youtube' && (
                    <div className="flex gap-3">
                      {fetchedPreview?.thumbnail && (
                        <div className="w-32 h-18 rounded-lg overflow-hidden bg-surface-800 flex-shrink-0">
                          <img
                            src={fetchedPreview.thumbnail}
                            alt={fetchedPreview.title || 'YouTube video'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-1">
                          <YoutubeIcon size={12} />
                          <span className="text-red-500 text-xs">YouTube</span>
                        </div>
                        <div className="font-medium text-sm line-clamp-2">{fetchedPreview?.title || 'YouTube Video'}</div>
                        {fetchedPreview?.channel && (
                          <div className="text-text-muted text-xs mt-1">{fetchedPreview.channel}</div>
                        )}
                        {fetchedPreview?.duration && (
                          <div className="text-text-muted text-xs mt-1 font-mono">{fetchedPreview.duration}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {detectedType === 'tweet' && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-blue-400/20 flex items-center justify-center text-blue-400">
                          <TwitterIcon size={16} />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{fetchedPreview?.tweetAuthor || 'Twitter User'}</div>
                          {fetchedPreview?.tweetHandle && (
                            <div className="text-text-muted text-xs">{fetchedPreview.tweetHandle}</div>
                          )}
                        </div>
                      </div>
                      {fetchedPreview?.tweetContent && (
                        <p className="text-sm">{fetchedPreview.tweetContent}</p>
                      )}
                    </div>
                  )}

                  {detectedType === 'reddit' && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-orange-500"><RedditIcon size={16} /></span>
                        <span className="text-orange-500 text-sm">{fetchedPreview?.subreddit || 'Reddit'}</span>
                      </div>
                      <div className="font-medium text-sm mb-1">{fetchedPreview?.redditTitle || 'Reddit Post'}</div>
                      {fetchedPreview?.redditBody && (
                        <p className="text-text-muted text-xs line-clamp-2">{fetchedPreview.redditBody}</p>
                      )}
                    </div>
                  )}

                  {detectedType === 'note' && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-gray-400"><NoteIcon size={16} /></span>
                        <span className="text-gray-400 text-sm">Your note</span>
                      </div>
                      <p className="text-sm">{noteText}</p>
                    </div>
                  )}
                </div>

                <div className="text-text-muted text-xs mb-4">
                  This will be added to the end of the queue
                </div>

                <div className="flex gap-3 pb-2">
                  <button
                    onClick={() => { setAddContentStep('input'); setContentUrl(''); setNoteText(''); setDetectedType(null); setFetchedPreview(null); setFetchError(null); }}
                    onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); setAddContentStep('input'); setContentUrl(''); setNoteText(''); setDetectedType(null); setFetchedPreview(null); setFetchError(null); }}
                    className="btn btn-secondary flex-1 min-h-[52px]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddToQueue}
                    onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); handleAddToQueue(); }}
                    className="btn btn-primary flex-1 min-h-[52px]"
                  >
                    Add to Queue
                  </button>
                </div>
              </>
            )}

            {/* Step: Success */}
            {addContentStep === 'success' && (
              <div className="py-8 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center mb-4">
                  <CheckIcon />
                </div>
                <p className="text-text-primary font-semibold">Added to queue!</p>
                <p className="text-text-muted text-sm mt-1">Position #{pendingItems.length + 1}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Queue Item Actions Sheet */}
      {selectedItem && !showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50">
          <div className="bg-surface-900 w-full max-w-md rounded-t-3xl p-6 bottom-sheet animate-fade-in-up max-h-[85vh] overflow-hidden flex flex-col">
            <div className="w-12 h-1 bg-surface-600 rounded-full mx-auto mb-6 flex-shrink-0"></div>

            {/* Item Info */}
            <div className="flex gap-3 mb-6 flex-shrink-0">
              {(() => {
                const badge = getContentTypeBadge(selectedItem.type)
                const BadgeIcon = badge.icon
                return (
                  <>
                    <div className={`w-20 h-12 rounded-lg overflow-hidden flex-shrink-0 ${badge.bg} flex items-center justify-center`}>
                      {selectedItem.type === 'youtube' && selectedItem.thumbnail ? (
                        <img
                          src={selectedItem.thumbnail}
                          alt={selectedItem.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className={badge.color}>
                          <BadgeIcon size={24} />
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{getQueueItemTitle(selectedItem)}</div>
                      <div className="text-text-muted text-xs">Added by {selectedItem.addedBy}</div>
                    </div>
                  </>
                )
              })()}
            </div>

            {/* Actions */}
            <div className="space-y-2 flex-1 overflow-y-auto min-h-0">
              {/* Note-specific actions */}
              {selectedItem.type === 'note' && (
                <>
                  <button
                    onClick={() => {
                      toggleComplete(selectedItem.id)
                      setSelectedItem(null)
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      toggleComplete(selectedItem.id)
                      setSelectedItem(null)
                    }}
                    className="w-full flex items-center gap-4 p-3 rounded-xl bg-green-900/30 hover:bg-surface-800 transition-colors text-left min-h-[64px]"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${selectedItem.isCompleted ? 'bg-gray-500/20 text-gray-400' : 'bg-green-500/20 text-green-400'}`}>
                      <CheckCircleIcon size={20} filled={selectedItem.isCompleted} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{selectedItem.isCompleted ? 'Mark Incomplete' : 'Mark Complete'}</div>
                      <div className="text-text-muted text-xs">{selectedItem.isCompleted ? 'Remove completion status' : 'Mark this note as done'}</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleViewNote(selectedItem)}
                    className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-surface-800 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-500/20 flex items-center justify-center text-gray-400">
                      <NoteIcon size={20} />
                    </div>
                    <div>
                      <div className="font-medium">View Note</div>
                      <div className="text-text-muted text-xs">Read the full note</div>
                    </div>
                  </button>

                  {selectedItem.addedBySessionId === sessionId && (
                    <button
                      onClick={() => handleOpenEditNote(selectedItem)}
                      className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-surface-800 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                        <EditIcon />
                      </div>
                      <div>
                        <div className="font-medium">Edit Note</div>
                        <div className="text-text-muted text-xs">Modify note content</div>
                      </div>
                    </button>
                  )}

                  <div className="h-px bg-surface-700 my-2"></div>
                </>
              )}

              <button
                onClick={() => handleShowNext(selectedItem.id)}
                className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-surface-800 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-accent-500/20 flex items-center justify-center text-accent-500">
                  <PlayNextIcon />
                </div>
                <div>
                  <div className="font-medium">Show Next</div>
                  <div className="text-text-muted text-xs">Move to top of queue</div>
                </div>
              </button>

              <button
                onClick={() => handleMoveUp(selectedItem.id)}
                className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-surface-800 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-surface-700 flex items-center justify-center text-text-secondary">
                  <ArrowUpIcon />
                </div>
                <div>
                  <div className="font-medium">Move Up</div>
                  <div className="text-text-muted text-xs">Move one position earlier</div>
                </div>
              </button>

              <button
                onClick={() => handleMoveDown(selectedItem.id)}
                className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-surface-800 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-surface-700 flex items-center justify-center text-text-secondary">
                  <ArrowDownIcon />
                </div>
                <div>
                  <div className="font-medium">Move Down</div>
                  <div className="text-text-muted text-xs">Move one position later</div>
                </div>
              </button>

              <div className="h-px bg-surface-700 my-2"></div>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-red-500/10 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                  <TrashIcon />
                </div>
                <div>
                  <div className="font-medium text-red-400">Remove from Queue</div>
                  <div className="text-text-muted text-xs">Delete this item</div>
                </div>
              </button>
            </div>

            <button
              onClick={() => setSelectedItem(null)}
              className="btn btn-secondary w-full mt-4 flex-shrink-0"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && selectedItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-surface-900 w-full max-w-sm rounded-2xl p-6 animate-fade-in-up">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <TrashIcon />
              </div>
              <h3 className="text-xl font-bold mb-2">Remove item?</h3>
              <p className="text-text-muted text-sm">
                This item will be removed from the queue.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setSelectedItem(null); }}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="btn flex-1 bg-red-500 text-white hover:bg-red-600"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Note Modal */}
      {showViewNote && viewingNote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50">
          <div className="bg-surface-900 w-full max-w-md rounded-t-3xl p-6 bottom-sheet animate-fade-in-up max-h-[80vh] flex flex-col">
            <div className="w-12 h-1 bg-surface-600 rounded-full mx-auto mb-6"></div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-500/20 flex items-center justify-center text-gray-400">
                  <NoteIcon size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Note</h3>
                  <p className="text-text-muted text-xs">Added by {viewingNote.addedBy}</p>
                </div>
              </div>
              <button
                onClick={() => { setShowViewNote(false); setViewingNote(null); }}
                className="text-text-muted"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              <div className="bg-surface-800 rounded-xl p-4">
                <p className="text-lg leading-relaxed whitespace-pre-wrap">{viewingNote.noteContent}</p>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              {viewingNote.addedBySessionId === sessionId && (
                <button
                  onClick={() => {
                    setShowViewNote(false)
                    setViewingNote(null)
                    handleOpenEditNote(viewingNote)
                  }}
                  className="btn btn-secondary flex-1 flex items-center justify-center gap-2"
                >
                  <EditIcon />
                  Edit
                </button>
              )}
              <button
                onClick={() => { setShowViewNote(false); setViewingNote(null); }}
                className="btn btn-primary flex-1"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Note Modal */}
      {showEditNote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50">
          <div className="bg-surface-900 w-full max-w-md rounded-t-3xl p-6 bottom-sheet animate-fade-in-up">
            <div className="w-12 h-1 bg-surface-600 rounded-full mx-auto mb-6"></div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <EditIcon />
                </div>
                <h3 className="text-xl font-bold">Edit Note</h3>
              </div>
              <button onClick={handleCancelEditNote} className="text-text-muted">
                <CloseIcon />
              </button>
            </div>

            <textarea
              placeholder="Write your note..."
              value={editNoteText}
              onChange={(e) => setEditNoteText(e.target.value)}
              className="input min-h-[150px] resize-none mb-4"
              autoFocus
            />

            <p className="text-text-muted text-xs mb-4">
              {editNoteText.length} characters
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleCancelEditNote}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                disabled={!editNoteText.trim()}
                className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share toast notification */}
      {showCopied && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface-800 text-white px-4 py-2 rounded-full shadow-lg z-50 animate-fade-in">
          Party link copied!
        </div>
      )}
    </div>
  )
}

interface TVModeScreenProps {
  onNavigate: (screen: Screen) => void
  partyId: string
  partyCode: string
}

function TVModeScreen({ onNavigate, partyId, partyCode }: TVModeScreenProps) {
  const { queue, members, partyInfo } = useParty(partyId)

  const currentItem = queue.find(v => v.status === 'showing')
  const upNext = queue.filter(v => v.status === 'pending').slice(0, 3)

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Exit button - clearly visible */}
      <button
        onClick={() => onNavigate('party')}
        className="absolute top-12 left-4 z-10 bg-surface-800/90 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-full text-sm text-white font-medium cursor-pointer hover:bg-surface-700 active:scale-95 transition-all flex items-center gap-2"
      >
        <ChevronLeftIcon />
        Exit
      </button>

      {/* Content area - Different display for each type */}
      <div className="flex-1 flex items-center justify-center relative">
        {currentItem?.type === 'youtube' && (
          <>
            <img
              src={currentItem.thumbnail}
              alt={currentItem.title}
              className="w-full h-full object-cover absolute inset-0"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white/50 text-6xl">▶</div>
            </div>
          </>
        )}

        {currentItem?.type === 'tweet' && (
          <div className="max-w-3xl mx-auto p-8">
            <div className="bg-surface-900/90 backdrop-blur rounded-2xl p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <TwitterIcon size={32} />
                </div>
                <div>
                  <div className="text-2xl font-bold">{currentItem.tweetAuthor}</div>
                  <div className="text-text-muted text-lg">{currentItem.tweetHandle}</div>
                </div>
              </div>
              <p className="text-3xl leading-relaxed mb-6">{currentItem.tweetContent}</p>
              <div className="text-text-muted text-lg">{currentItem.tweetTimestamp}</div>
            </div>
          </div>
        )}

        {currentItem?.type === 'reddit' && (
          <div className="max-w-4xl mx-auto p-8">
            <div className="bg-surface-900/90 backdrop-blur rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500">
                  <RedditIcon size={20} />
                </div>
                <span className="text-orange-500 text-xl font-medium">{currentItem.subreddit}</span>
              </div>
              <h2 className="text-3xl font-bold mb-4">{currentItem.redditTitle}</h2>
              <p className="text-xl text-text-secondary leading-relaxed mb-6">{currentItem.redditBody}</p>
              <div className="flex items-center gap-6 text-text-muted text-lg">
                <span>{currentItem.upvotes?.toLocaleString()} upvotes</span>
                <span>{currentItem.commentCount?.toLocaleString()} comments</span>
              </div>
            </div>
          </div>
        )}

        {currentItem?.type === 'note' && (
          <div className="max-w-3xl mx-auto p-8">
            <div className="bg-surface-900/90 backdrop-blur rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-gray-500/20 flex items-center justify-center text-gray-400">
                  <NoteIcon size={24} />
                </div>
                <span className="text-text-muted text-lg">Note from {currentItem.addedBy}</span>
              </div>
              <p className="text-3xl leading-relaxed">{currentItem.noteContent}</p>
            </div>
          </div>
        )}

        {!currentItem && (
          <div className="text-center text-text-muted">
            <p className="text-2xl">No content showing</p>
            <p className="text-lg mt-2">Add items to the queue to get started</p>
          </div>
        )}
      </div>

      {/* Bottom bar - Now showing + Up next */}
      <div className="bg-gradient-to-t from-black via-black/95 to-transparent p-6 pt-12">
        <div className="flex items-end justify-between gap-8">
          {/* Now showing */}
          <div className="flex-1">
            <div className="text-accent-500 text-xs font-mono mb-1 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse"></span>
              NOW SHOWING
            </div>
            <h2 className="text-2xl font-bold">{currentItem ? getQueueItemTitle(currentItem) : 'Nothing playing'}</h2>
            <p className="text-text-muted mt-1">
              {currentItem?.type === 'youtube' && currentItem.channel}
              {currentItem?.type === 'tweet' && currentItem.tweetAuthor}
              {currentItem?.type === 'reddit' && currentItem.subreddit}
              {currentItem?.type === 'note' && `Added by ${currentItem.addedBy}`}
            </p>
          </div>

          {/* Up next */}
          {upNext.length > 0 && (
            <div className="flex-shrink-0">
              <div className="text-text-muted text-xs mb-2">UP NEXT</div>
              <div className="flex gap-2">
                {upNext.map((item) => {
                  const badge = getContentTypeBadge(item.type)
                  const BadgeIcon = badge.icon
                  return (
                    <div key={item.id} className={`w-24 h-14 rounded-lg overflow-hidden ${badge.bg} flex items-center justify-center`}>
                      {item.type === 'youtube' && item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-full h-full object-cover opacity-70"
                        />
                      ) : (
                        <span className={`${badge.color} opacity-70`}>
                          <BadgeIcon size={24} />
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Party info */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/10">
          <div className="font-mono text-sm text-text-muted">{partyCode}</div>
          <div className="flex items-center gap-1 text-text-muted text-sm">
            <UsersIcon />
            <span>{members.length}</span>
          </div>
          {partyInfo?.name && (
            <div className="text-text-muted text-sm">{partyInfo.name}</div>
          )}
        </div>
      </div>
    </div>
  )
}

interface PartyHistoryItem {
  id: string
  name: string
  date: string
  members: number
  items: number
}

function HistoryScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [parties, setParties] = useState<PartyHistoryItem[]>([])

  useEffect(() => {
    async function fetchPartyHistory() {
      try {
        setLoading(true)
        setError(null)
        const sessionId = getSessionId()

        // Fetch parties the user has joined
        const { data: memberData, error: memberError } = await supabase
          .from('party_members')
          .select(`
            party_id,
            joined_at,
            parties (id, code, name, created_at)
          `)
          .eq('session_id', sessionId)
          .order('joined_at', { ascending: false })
          .limit(10)

        if (memberError) {
          throw memberError
        }

        if (!memberData || memberData.length === 0) {
          setParties([])
          return
        }

        // Get unique party IDs
        const partyIds = memberData.map(m => m.party_id)

        // Get member counts for each party
        const { data: memberCounts, error: countError } = await supabase
          .from('party_members')
          .select('party_id')
          .in('party_id', partyIds)

        if (countError) {
          throw countError
        }

        // Get item counts for each party
        const { data: itemCounts, error: itemError } = await supabase
          .from('queue_items')
          .select('party_id')
          .in('party_id', partyIds)

        if (itemError) {
          throw itemError
        }

        // Count members per party
        const memberCountMap: Record<string, number> = {}
        memberCounts?.forEach(m => {
          memberCountMap[m.party_id] = (memberCountMap[m.party_id] || 0) + 1
        })

        // Count items per party
        const itemCountMap: Record<string, number> = {}
        itemCounts?.forEach(i => {
          itemCountMap[i.party_id] = (itemCountMap[i.party_id] || 0) + 1
        })

        // Format the data
        const formattedParties: PartyHistoryItem[] = memberData
          .filter(m => m.parties)
          .map(m => {
            const party = m.parties as unknown as { id: string; code: string; name: string | null; created_at: string }
            const createdAt = new Date(party.created_at)
            const dateStr = createdAt.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })
            return {
              id: party.id,
              name: party.name || `Party ${party.code}`,
              date: dateStr,
              members: memberCountMap[party.id] || 1,
              items: itemCountMap[party.id] || 0
            }
          })

        setParties(formattedParties)
      } catch (err) {
        console.error('Error fetching party history:', err)
        setError('Failed to load party history')
      } finally {
        setLoading(false)
      }
    }

    fetchPartyHistory()
  }, [])

  return (
    <div className="container-mobile bg-gradient-party flex flex-col px-6 py-8">
      <button
        onClick={() => onNavigate('home')}
        className="btn-ghost p-2 -ml-2 w-fit rounded-full mb-8"
      >
        <ChevronLeftIcon />
      </button>

      <h1 className="text-3xl font-bold mb-2 animate-fade-in-up opacity-0">
        Party History
      </h1>
      <p className="text-text-secondary mb-8 animate-fade-in-up opacity-0 delay-100">
        Your past watch sessions
      </p>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
        </div>
      )}

      {error && (
        <div className="card p-4 text-center text-red-400 animate-fade-in-up opacity-0 delay-150">
          {error}
        </div>
      )}

      {!loading && !error && parties.length === 0 && (
        <div className="card p-8 text-center animate-fade-in-up opacity-0 delay-150">
          <div className="text-4xl mb-4">🎉</div>
          <div className="text-text-secondary">No party history yet</div>
          <div className="text-text-muted text-sm mt-2">Join or create a party to get started!</div>
        </div>
      )}

      {!loading && !error && parties.length > 0 && (
        <div className="space-y-3">
          {parties.map((party, index) => (
            <div
              key={party.id}
              className="card p-4 cursor-pointer hover:border-surface-600 transition-colors animate-fade-in-up opacity-0"
              style={{ animationDelay: `${150 + index * 50}ms` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{party.name}</div>
                  <div className="text-text-muted text-sm mt-1">{party.date}</div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-text-secondary">{party.items} items</div>
                  <div className="text-text-muted">{party.members} people</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
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

  return screens[currentScreen]
}

// Main App with AuthProvider wrapper
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
