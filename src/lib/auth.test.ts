import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted so these fns are available when the hoisted vi.mock factory runs
const {
  mockSignInWithOAuth,
  mockSignOut,
  mockGetSession,
  mockOnAuthStateChange,
  mockSignUp,
  mockSignInWithPassword,
  mockResetPasswordForEmail,
  mockUpdateUser,
} = vi.hoisted(() => ({
  mockSignInWithOAuth: vi.fn(),
  mockSignOut: vi.fn(),
  mockGetSession: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
  mockSignUp: vi.fn(),
  mockSignInWithPassword: vi.fn(),
  mockResetPasswordForEmail: vi.fn(),
  mockUpdateUser: vi.fn(),
}))

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
      signOut: mockSignOut,
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      resetPasswordForEmail: mockResetPasswordForEmail,
      updateUser: mockUpdateUser,
    },
  },
}))

vi.mock('./logger', () => ({
  logger: {
    createLogger: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}))

import {
  signInWithGoogle,
  signOut,
  getCurrentSession,
  onAuthStateChange,
  signUpWithEmail,
  signInWithEmail,
  resetPassword,
  updatePassword,
} from './auth'

describe('signInWithGoogle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call signInWithOAuth with google provider', async () => {
    const mockData = { provider: 'google', url: 'https://accounts.google.com/o/oauth2' }
    mockSignInWithOAuth.mockResolvedValue({ data: mockData, error: null })

    const result = await signInWithGoogle()

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: expect.any(String),
      },
    })
    expect(result).toEqual(mockData)
  })

  it('should throw error when OAuth fails', async () => {
    const authError = { message: 'OAuth error', code: 'oauth_error' }
    mockSignInWithOAuth.mockResolvedValue({ data: null, error: authError })

    await expect(signInWithGoogle()).rejects.toEqual(authError)
  })
})

describe('signOut', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call supabase auth signOut', async () => {
    mockSignOut.mockResolvedValue({ error: null })

    await signOut()

    expect(mockSignOut).toHaveBeenCalled()
  })

  it('should throw error when sign out fails', async () => {
    const authError = { message: 'Sign out failed' }
    mockSignOut.mockResolvedValue({ error: authError })

    await expect(signOut()).rejects.toEqual(authError)
  })
})

describe('getCurrentSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return session when available', async () => {
    const mockSession = { access_token: 'abc123', user: { id: 'user-1' } }
    mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null })

    const result = await getCurrentSession()

    expect(mockGetSession).toHaveBeenCalled()
    expect(result).toEqual(mockSession)
  })

  it('should return null when no session exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })

    const result = await getCurrentSession()

    expect(result).toBeNull()
  })

  it('should return null when getSession errors', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: { message: 'Session error' } })

    const result = await getCurrentSession()

    expect(result).toBeNull()
  })
})

describe('onAuthStateChange', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should set up auth state change subscription', () => {
    const mockSubscription = { unsubscribe: vi.fn() }
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: mockSubscription } })

    const callback = vi.fn()
    const subscription = onAuthStateChange(callback)

    expect(mockOnAuthStateChange).toHaveBeenCalledWith(expect.any(Function))
    expect(subscription).toBe(mockSubscription)
  })

  it('should invoke callback with session when auth state changes', () => {
    const mockSubscription = { unsubscribe: vi.fn() }
    mockOnAuthStateChange.mockImplementation((handler) => {
      // Simulate an auth state change event
      const mockSession = { access_token: 'token', user: { id: 'user-1' } }
      handler('SIGNED_IN', mockSession)
      return { data: { subscription: mockSubscription } }
    })

    const callback = vi.fn()
    onAuthStateChange(callback)

    expect(callback).toHaveBeenCalledWith({ access_token: 'token', user: { id: 'user-1' } })
  })

  it('should invoke callback with null on sign out event', () => {
    const mockSubscription = { unsubscribe: vi.fn() }
    mockOnAuthStateChange.mockImplementation((handler) => {
      handler('SIGNED_OUT', null)
      return { data: { subscription: mockSubscription } }
    })

    const callback = vi.fn()
    onAuthStateChange(callback)

    expect(callback).toHaveBeenCalledWith(null)
  })
})

describe('signUpWithEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return success with needsConfirmation on successful sign up', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: 'new-user' } }, error: null })

    const result = await signUpWithEmail('test@example.com', 'password123', 'Test User')

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      options: {
        data: { display_name: 'Test User' },
        emailRedirectTo: expect.any(String),
      },
    })
    expect(result).toEqual({ success: true, needsConfirmation: true })
  })

  it('should pass undefined displayName when not provided', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: 'new-user' } }, error: null })

    await signUpWithEmail('test@example.com', 'password123')

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      options: {
        data: { display_name: undefined },
        emailRedirectTo: expect.any(String),
      },
    })
  })

  it('should return mapped error for invalid_credentials', async () => {
    mockSignUp.mockResolvedValue({
      data: null,
      error: { message: 'Invalid login credentials', code: 'invalid_credentials' },
    })

    const result = await signUpWithEmail('test@example.com', 'password123')

    expect(result).toEqual({ success: false, error: 'Invalid email or password' })
  })

  it('should return mapped error for user_already_exists', async () => {
    mockSignUp.mockResolvedValue({
      data: null,
      error: { message: 'User already registered', code: 'user_already_exists' },
    })

    const result = await signUpWithEmail('test@example.com', 'password123')

    expect(result).toEqual({ success: false, error: 'An account with this email already exists' })
  })

  it('should return mapped error for weak_password', async () => {
    mockSignUp.mockResolvedValue({
      data: null,
      error: { message: 'Password is too weak', code: 'weak_password' },
    })

    const result = await signUpWithEmail('test@example.com', 'short')

    expect(result).toEqual({ success: false, error: 'Password must be at least 8 characters' })
  })

  it('should return mapped error for email_not_confirmed by code', async () => {
    mockSignUp.mockResolvedValue({
      data: null,
      error: { message: 'Some error', code: 'email_not_confirmed' },
    })

    const result = await signUpWithEmail('test@example.com', 'password123')

    expect(result).toEqual({ success: false, error: 'Please check your email to confirm your account' })
  })

  it('should return generic error for unknown errors', async () => {
    mockSignUp.mockResolvedValue({
      data: null,
      error: { message: 'Something unexpected' },
    })

    const result = await signUpWithEmail('test@example.com', 'password123')

    expect(result).toEqual({ success: false, error: 'Something went wrong. Please try again.' })
  })
})

describe('signInWithEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return success on valid credentials', async () => {
    mockSignInWithPassword.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const result = await signInWithEmail('test@example.com', 'password123')

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
    expect(result).toEqual({ success: true })
  })

  it('should return mapped error for invalid credentials', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Invalid login credentials', code: 'invalid_credentials' },
    })

    const result = await signInWithEmail('test@example.com', 'wrongpassword')

    expect(result).toEqual({ success: false, error: 'Invalid email or password' })
  })

  it('should return mapped error for email not confirmed', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Email not confirmed', code: 'email_not_confirmed' },
    })

    const result = await signInWithEmail('test@example.com', 'password123')

    expect(result).toEqual({ success: false, error: 'Please check your email to confirm your account' })
  })

  it('should return mapped error when message includes password hint', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Password should be longer' },
    })

    const result = await signInWithEmail('test@example.com', 'short')

    expect(result).toEqual({ success: false, error: 'Password must be at least 8 characters' })
  })

  it('should return generic error for unknown error codes', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Rate limit exceeded', code: 'rate_limit' },
    })

    const result = await signInWithEmail('test@example.com', 'password123')

    expect(result).toEqual({ success: false, error: 'Something went wrong. Please try again.' })
  })
})

describe('resetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return success when reset email is sent', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null })

    const result = await resetPassword('test@example.com')

    expect(mockResetPasswordForEmail).toHaveBeenCalledWith('test@example.com', {
      redirectTo: expect.any(String),
    })
    expect(result).toEqual({ success: true })
  })

  it('should return mapped error on failure', async () => {
    mockResetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { message: 'User not found' },
    })

    const result = await resetPassword('unknown@example.com')

    expect(result).toEqual({ success: false, error: 'Something went wrong. Please try again.' })
  })

  it('should return mapped error for invalid credentials code', async () => {
    mockResetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { message: 'Error', code: 'invalid_credentials' },
    })

    const result = await resetPassword('test@example.com')

    expect(result).toEqual({ success: false, error: 'Invalid email or password' })
  })
})

describe('updatePassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return success when password is updated', async () => {
    mockUpdateUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const result = await updatePassword('newSecurePassword123')

    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newSecurePassword123' })
    expect(result).toEqual({ success: true })
  })

  it('should return mapped error for weak password', async () => {
    mockUpdateUser.mockResolvedValue({
      data: null,
      error: { message: 'Password is too weak', code: 'weak_password' },
    })

    const result = await updatePassword('123')

    expect(result).toEqual({ success: false, error: 'Password must be at least 8 characters' })
  })

  it('should return generic error for unknown failures', async () => {
    mockUpdateUser.mockResolvedValue({
      data: null,
      error: { message: 'Internal server error' },
    })

    const result = await updatePassword('newPassword123')

    expect(result).toEqual({ success: false, error: 'Something went wrong. Please try again.' })
  })
})
