import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase module
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabase'
import { getMyProfile, getProfileById, updateProfile, checkUsernameAvailable, searchProfiles } from './profile'

const mockFrom = supabase.from as ReturnType<typeof vi.fn>
const mockGetUser = supabase.auth.getUser as ReturnType<typeof vi.fn>

describe('profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getMyProfile', () => {
    it('returns null when not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      expect(await getMyProfile()).toBeNull()
    })

    it('returns profile when authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'user-1', display_name: 'Test' }, error: null }),
          }),
        }),
      })
      const profile = await getMyProfile()
      expect(profile).toEqual({ id: 'user-1', display_name: 'Test' })
    })
  })

  describe('getProfileById', () => {
    it('returns profile for valid ID', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'user-1', display_name: 'Alice' }, error: null }),
          }),
        }),
      })
      const profile = await getProfileById('user-1')
      expect(profile).toEqual({ id: 'user-1', display_name: 'Alice' })
    })

    it('returns null on error', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
          }),
        }),
      })
      const profile = await getProfileById('nonexistent')
      expect(profile).toBeNull()
    })
  })

  describe('updateProfile', () => {
    it('returns error when not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      const result = await updateProfile({ display_name: 'New' })
      expect(result.error).toBe('Not authenticated')
    })

    it('returns username taken error on unique violation', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { code: '23505', message: 'unique' } }),
            }),
          }),
        }),
      })
      const result = await updateProfile({ username: 'taken' })
      expect(result.error).toBe('Username already taken')
    })
  })

  describe('checkUsernameAvailable', () => {
    it('returns true when username not found', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      })
      expect(await checkUsernameAvailable('newuser')).toBe(true)
    })

    it('returns false when username exists', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'someone' } }),
          }),
        }),
      })
      expect(await checkUsernameAvailable('taken')).toBe(false)
    })
  })

  describe('searchProfiles', () => {
    it('returns empty for short queries', async () => {
      expect(await searchProfiles('a')).toEqual([])
    })

    it('returns results on valid query', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [{ id: 'user-1', display_name: 'Alice', username: 'alice' }],
              error: null,
            }),
          }),
        }),
      })
      const results = await searchProfiles('ali')
      expect(results).toEqual([{ id: 'user-1', display_name: 'Alice', username: 'alice' }])
    })

    it('returns empty array on error', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'db error' },
            }),
          }),
        }),
      })
      const results = await searchProfiles('test')
      expect(results).toEqual([])
    })
  })
})
