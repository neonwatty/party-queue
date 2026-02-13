# Auth Wall & User Profiles — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make authentication mandatory for all app routes, add a `user_profiles` table with unique usernames and avatars, build a `/profile` page, and remove anonymous party flows.

**Architecture:** Next.js middleware intercepts all routes and redirects unauthenticated users to `/login`. A new `user_profiles` table stores username, display_name, and avatar (separate from Supabase's `auth.users` metadata). After sign-up, users are redirected to a profile setup step. The create/join party flows are updated to require `user_id` (no more optional anonymous session fallback).

**Tech Stack:** Next.js 16 App Router, Supabase (PostgreSQL + Auth), Tailwind CSS v4, existing campfire design system.

---

## Task 1: Create `user_profiles` Migration

**Files:**

- Create: `supabase/migrations/012_user_profiles.sql`

**Step 1: Write the migration**

```sql
-- User profiles (extends auth.users with social identity)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_type TEXT NOT NULL DEFAULT 'emoji',
  avatar_value TEXT NOT NULL DEFAULT '🎉',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Username must be lowercase alphanumeric + underscores, 3-20 chars
ALTER TABLE user_profiles
  ADD CONSTRAINT username_format CHECK (
    username IS NULL OR username ~ '^[a-z0-9_]{3,20}$'
  );

-- Index for username search (partial — only non-null)
CREATE INDEX idx_user_profiles_username ON user_profiles (username) WHERE username IS NOT NULL;

-- Index for display name search
CREATE INDEX idx_user_profiles_display_name ON user_profiles (LOWER(display_name));

-- RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read any profile (for friend search, party members)
CREATE POLICY "Profiles are viewable by authenticated users"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can create their own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Auto-create profile on signup via trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill: create profiles for existing authenticated users
INSERT INTO public.user_profiles (id, display_name)
SELECT id, COALESCE(raw_user_meta_data->>'display_name', '')
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.user_profiles)
ON CONFLICT (id) DO NOTHING;
```

**Step 2: Apply migration to production**

Run via Supabase SQL Editor (project `ptmjlvchqkpdhlfbpnyy`). After applying, verify:

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'user_profiles' ORDER BY ordinal_position;
```

Expected: `id, username, display_name, avatar_type, avatar_value, created_at, updated_at`

```sql
SELECT COUNT(*) FROM user_profiles;
```

Expected: count >= number of existing `auth.users` rows (from backfill).

**Step 3: Commit**

```bash
git add supabase/migrations/012_user_profiles.sql
git commit -m "feat: add user_profiles table with username, avatar, and auto-create trigger"
```

---

## Task 2: Add Profile API Library

**Files:**

- Create: `lib/profile.ts`
- Create: `lib/profile.test.ts`

**Step 1: Write the profile library**

`lib/profile.ts` provides CRUD for user profiles using the browser Supabase client:

```typescript
'use client'

import { supabase } from '@/lib/supabase'

export interface UserProfile {
  id: string
  username: string | null
  display_name: string
  avatar_type: 'emoji' | 'image'
  avatar_value: string
  created_at: string
  updated_at: string
}

export async function getMyProfile(): Promise<UserProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase.from('user_profiles').select('*').eq('id', user.id).single()
  if (error) return null
  return data as UserProfile
}

export async function getProfileById(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase.from('user_profiles').select('*').eq('id', userId).single()
  if (error) return null
  return data as UserProfile
}

export async function updateProfile(updates: {
  display_name?: string
  username?: string | null
  avatar_type?: 'emoji' | 'image'
  avatar_value?: string
}): Promise<{ data: UserProfile | null; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('user_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return { data: null, error: 'Username already taken' }
    if (error.code === '23514')
      return { data: null, error: 'Username must be 3-20 characters, lowercase letters, numbers, and underscores only' }
    return { data: null, error: error.message }
  }
  return { data: data as UserProfile, error: null }
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const { data } = await supabase.from('user_profiles').select('id').eq('username', username.toLowerCase()).single()
  return !data
}

export async function searchProfiles(query: string): Promise<UserProfile[]> {
  const trimmed = query.trim().toLowerCase()
  if (trimmed.length < 2) return []

  // Search by username or display_name
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .or(`username.ilike.%${trimmed}%,display_name.ilike.%${trimmed}%`)
    .limit(20)

  if (error) return []
  return (data || []) as UserProfile[]
}
```

**Step 2: Write unit tests**

`lib/profile.test.ts` — mock Supabase and test the library functions:

```typescript
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
import { getMyProfile, updateProfile, checkUsernameAvailable, searchProfiles } from './profile'

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
  })
})
```

**Step 3: Run tests**

```bash
npm run test -- lib/profile.test.ts
```

Expected: All tests PASS.

**Step 4: Commit**

```bash
git add lib/profile.ts lib/profile.test.ts
git commit -m "feat: add user profile CRUD library with unit tests"
```

---

## Task 3: Add Next.js Auth Middleware

**Files:**

- Create: `middleware.ts` (project root)

**Step 1: Write the middleware**

The middleware checks for a Supabase auth session cookie. If absent, redirect to `/login`. Public routes (login, signup, reset-password, auth callback) are exempt.

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/signup', '/reset-password', '/auth/callback']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Allow static assets, API routes, and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Check for Supabase auth cookie
  // Supabase stores session in cookies with pattern: sb-<project-ref>-auth-token
  const hasAuthCookie = request.cookies.getAll().some((cookie) => cookie.name.includes('auth-token'))

  if (!hasAuthCookie) {
    const loginUrl = new URL('/login', request.url)
    // Preserve the original destination for post-login redirect
    loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

**Important note:** This is a lightweight cookie check (presence of auth cookie), NOT a full session validation. The Supabase client on the page will handle actual session validation. The middleware just prevents unauthenticated users from seeing the app shell at all.

**Step 2: Update login page to handle redirect param**

Read `app/login/page.tsx` first. Then modify the login success handler to check for `?redirect=` and navigate there instead of `/`.

In the login page's success handler (after `signInWithEmail` or `signInWithGoogle` succeeds), add:

```typescript
// After successful auth, redirect to original destination or home
const params = new URLSearchParams(window.location.search)
const redirect = params.get('redirect') || '/'
router.push(redirect)
```

**Step 3: Test manually**

1. Clear cookies / open incognito
2. Navigate to `localhost:3000/create` → should redirect to `/login?redirect=/create`
3. Sign in → should redirect back to `/create`
4. Navigate to `/login` while signed in → should render normally (public route)

**Step 4: Commit**

```bash
git add middleware.ts app/login/page.tsx
git commit -m "feat: add auth middleware — redirect unauthenticated users to login"
```

---

## Task 4: Build `/profile` Page

**Files:**

- Create: `app/profile/page.tsx`
- Create: `components/profile/ProfileEditor.tsx`
- Create: `components/icons/UserIcon.tsx` (if not already existing)

**Step 1: Build the ProfileEditor component**

`components/profile/ProfileEditor.tsx` — editable form for display name, username, and avatar:

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { type UserProfile, getMyProfile, updateProfile, checkUsernameAvailable } from '@/lib/profile'

const EMOJI_OPTIONS = ['🎉', '🎸', '🎭', '🎪', '🎵', '🌟', '🔥', '🎯', '🦊', '🐻', '🦁', '🐱', '🐶', '🦄', '🌈', '🍕']

export default function ProfileEditor() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [avatarValue, setAvatarValue] = useState('🎉')
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [usernameChecking, setUsernameChecking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyProfile().then((p) => {
      if (p) {
        setProfile(p)
        setDisplayName(p.display_name)
        setUsername(p.username || '')
        setAvatarValue(p.avatar_value)
      }
      setLoading(false)
    })
  }, [])

  // Debounced username availability check
  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null)
      return
    }
    if (username === profile?.username) {
      setUsernameAvailable(true)
      return
    }
    setUsernameChecking(true)
    const timer = setTimeout(async () => {
      const available = await checkUsernameAvailable(username)
      setUsernameAvailable(available)
      setUsernameChecking(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [username, profile?.username])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    const updates: Parameters<typeof updateProfile>[0] = {
      display_name: displayName.trim(),
      avatar_type: 'emoji',
      avatar_value: avatarValue,
    }
    if (username.trim()) {
      updates.username = username.trim().toLowerCase()
    } else {
      updates.username = null
    }

    const result = await updateProfile(updates)
    setSaving(false)

    if (result.error) {
      setError(result.error)
    } else {
      setProfile(result.data)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    }
  }, [displayName, username, avatarValue])

  if (loading) {
    return <div className="flex items-center justify-center p-12"><div className="loader" /></div>
  }

  // Render: back button, avatar picker (emoji grid), display name input,
  // username input with availability indicator, save button.
  // Follow existing form patterns: surface-800 inputs, rounded-12px,
  // text-secondary labels, character counters.
  // ... (full JSX implementation)
}
```

**Step 2: Build the profile page**

`app/profile/page.tsx`:

```typescript
import ProfileEditor from '@/components/profile/ProfileEditor'

export default function ProfilePage() {
  return (
    <div className="container-mobile min-h-dvh px-4 py-6">
      {/* Back button */}
      {/* Page title: "Profile" in display font */}
      <ProfileEditor />
    </div>
  )
}
```

Follow existing page patterns:

- `container-mobile` wrapper (max-w 430px)
- Back button (ChevronLeft, btn-ghost, rounded-full) linking to `/`
- Title in display font (font-display text-3xl)
- Twinkling stars background

**Step 3: Add profile link to home page**

Modify `components/home/AppHome.tsx` to add a profile icon/link in the header area (next to the existing "Sign out" text link).

**Step 4: Test manually in browser**

1. Sign in → navigate to `/profile`
2. Verify profile loads with display name from signup
3. Change avatar emoji → save → verify persistence
4. Set a username → check availability indicator → save
5. Try duplicate username → verify error

**Step 5: Commit**

```bash
git add app/profile/page.tsx components/profile/ProfileEditor.tsx components/home/AppHome.tsx
git commit -m "feat: add /profile page with display name, username, and avatar editing"
```

---

## Task 5: Sync Auth Identity with localStorage

**Files:**

- Modify: `contexts/AuthContext.tsx`
- Modify: `lib/supabase.ts`

**Step 1: Update AuthContext to sync profile data**

Currently `AuthContext` regenerates `link-party-session-id` on auth change but doesn't sync `display_name` from the profile. After auth change with `SIGNED_IN`, fetch the user's profile and sync `display_name` to localStorage:

```typescript
// In AuthContext.tsx, inside the onAuthStateChange handler for SIGNED_IN:
if (event === 'SIGNED_IN' && session?.user) {
  // Existing session ID logic...

  // Sync display name from user metadata to localStorage
  const metaName = session.user.user_metadata?.display_name
  if (metaName) {
    setDisplayName(metaName)
  }
}
```

This ensures `getDisplayName()` returns the authenticated user's name when they enter a party room.

**Step 2: Test**

1. Sign up with display name "Alice"
2. Navigate to create party → verify display name pre-fills as "Alice"
3. Sign out → sign in → verify display name persists

**Step 3: Commit**

```bash
git add contexts/AuthContext.tsx
git commit -m "feat: sync auth display name to localStorage on sign-in"
```

---

## Task 6: Remove Anonymous Party Creation/Join Paths

**Files:**

- Modify: `app/create/page.tsx`
- Modify: `app/join/page.tsx`
- Modify: `app/api/parties/create/route.ts` (if exists) or inline API logic
- Modify: `app/party/[id]/PartyRoomClient.tsx`

**Step 1: Update create page**

The create page currently shows a display name input and works without auth. Changes:

- Remove the display name input field (read from profile instead)
- Read `user.id` from AuthContext — it's guaranteed to exist (middleware ensures auth)
- Pass `userId` as required (not optional) to the create API

```typescript
// In create page, replace:
//   const displayName = getDisplayName()
// With:
//   const { user } = useAuth()
//   const displayName = user?.user_metadata?.display_name || ''
```

**Step 2: Update join page**

Same pattern — remove display name input, read from auth context. The join flow becomes:

1. Enter party code (or arrive via deep link)
2. Click "Join Party" (display name comes from profile)

**Step 3: Update PartyRoomClient**

Currently reads display name from `getDisplayName()` (localStorage). Update to prefer auth user metadata, falling back to localStorage:

```typescript
const { user } = useAuth()
const displayName = user?.user_metadata?.display_name || getDisplayName() || 'Anonymous'
```

**Step 4: Test manually**

1. Must be signed in to reach `/create` (middleware ensures this)
2. Create party → display name from profile appears in member list
3. Join party → display name from profile appears
4. Party room → member list shows correct names

**Step 5: Commit**

```bash
git add app/create/page.tsx app/join/page.tsx app/party/[id]/PartyRoomClient.tsx
git commit -m "feat: remove anonymous party paths — require auth, read identity from profile"
```

---

## Task 7: Update Home Page for Auth-Only Experience

**Files:**

- Modify: `app/page.tsx`
- Modify: `components/home/AppHome.tsx`
- Modify: `components/home/LandingPage.tsx`

**Step 1: Simplify home page**

Since middleware now forces auth on `/`, the home page will always show `AppHome`. However, we should keep `LandingPage` accessible from `/login` and `/signup` (which are public routes). The home page becomes:

```typescript
// app/page.tsx — simplified, always authenticated
export default function Home() {
  return <AppHome />
}
```

Move the landing page marketing content to the login/signup pages if desired, or keep it as the background for those public pages.

**Step 2: Update AppHome**

Add profile link, show user's avatar + name in header:

```typescript
// Show greeting: "Hey, {displayName}" with avatar emoji
// Profile link: avatar emoji button → /profile
// Keep existing: "Start a Party" and "Join with Code" CTAs
// Keep existing: History link
```

**Step 3: Test**

1. Unauthenticated → `/` redirects to `/login`
2. Authenticated → `/` shows AppHome with greeting and profile link
3. `/login` still shows the landing/login UI

**Step 4: Commit**

```bash
git add app/page.tsx components/home/AppHome.tsx
git commit -m "feat: update home page for auth-only experience with profile link"
```

---

## Task 8: E2E Tests for Auth Wall

**Files:**

- Modify: `e2e/auth.spec.ts` or create `e2e/auth-wall.spec.ts`

**Step 1: Write E2E tests**

```typescript
test.describe('Auth Wall', () => {
  test('unauthenticated user is redirected to login from home', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated user is redirected to login from create', async ({ page }) => {
    await page.goto('/create')
    await expect(page).toHaveURL(/\/login/)
    // Verify redirect param is preserved
    const url = new URL(page.url())
    expect(url.searchParams.get('redirect')).toBe('/create')
  })

  test('unauthenticated user is redirected to login from join', async ({ page }) => {
    await page.goto('/join')
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page is accessible without auth', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading')).toBeVisible()
  })

  test('signup page is accessible without auth', async ({ page }) => {
    await page.goto('/signup')
    await expect(page).toHaveURL(/\/signup/)
  })
})
```

**Step 2: Run tests**

```bash
npx playwright test e2e/auth-wall.spec.ts --project=chromium
```

Expected: All tests PASS. Note: existing E2E tests that rely on anonymous party creation will need updating — they should either mock auth or be tagged as requiring auth.

**Step 3: Update existing E2E tests**

Many existing tests (create-party, join-party, multi-user, etc.) rely on anonymous access. These will break with the auth wall. Two approaches:

- **Option A**: Have the test helper `createPartyAsHost()` perform a mock sign-up first
- **Option B**: Add a test-only bypass (e.g., cookie injection)

Recommended: **Option A** — update `createPartyAsHost` and `joinPartyAsGuest` helpers to sign up via the UI first. This tests the real flow.

Since the app runs in mock mode during E2E, Supabase auth may not work. The middleware cookie check is lightweight (just checks cookie presence), so we can inject a fake auth cookie in the test setup:

```typescript
// In test helpers, before navigating:
await context.addCookies([
  {
    name: 'sb-mock-auth-token',
    value: 'test-session',
    domain: 'localhost',
    path: '/',
  },
])
```

This lets existing mock-mode tests pass the middleware check.

**Step 4: Commit**

```bash
git add e2e/auth-wall.spec.ts
git commit -m "test: add E2E tests for auth wall redirect behavior"
```

---

## Task 9: Final Cleanup & Verification

**Files:**

- Various — cleanup pass

**Step 1: Run full lint + type check + tests**

```bash
npm run lint && npx tsc --noEmit && npm run test && npx playwright test --project=chromium
```

Fix any issues.

**Step 2: Remove dead code**

- Remove anonymous session fallback logic in `lib/supabase.ts` (the `getSessionId()` anonymous path)
- Remove display name input from create/join pages if not already done
- Remove the `isAuthenticated ? <AppHome /> : <LandingPage />` ternary in `app/page.tsx`

**Step 3: Run knip for dead code detection**

```bash
npm run knip
```

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: cleanup anonymous paths and dead code after auth wall"
```

---

## Summary

| Task | Description                        | Key Files                                                         |
| ---- | ---------------------------------- | ----------------------------------------------------------------- |
| 1    | user_profiles migration            | `supabase/migrations/012_user_profiles.sql`                       |
| 2    | Profile CRUD library + tests       | `lib/profile.ts`, `lib/profile.test.ts`                           |
| 3    | Auth middleware + login redirect   | `middleware.ts`, `app/login/page.tsx`                             |
| 4    | /profile page + ProfileEditor      | `app/profile/page.tsx`, `components/profile/ProfileEditor.tsx`    |
| 5    | Sync auth identity to localStorage | `contexts/AuthContext.tsx`                                        |
| 6    | Remove anonymous party paths       | `app/create/page.tsx`, `app/join/page.tsx`, `PartyRoomClient.tsx` |
| 7    | Update home page for auth-only     | `app/page.tsx`, `AppHome.tsx`                                     |
| 8    | E2E tests for auth wall            | `e2e/auth-wall.spec.ts`                                           |
| 9    | Cleanup + verification             | Various                                                           |

## Notes for Implementer

- **Migration must be applied manually** to production via Supabase SQL Editor (project `ptmjlvchqkpdhlfbpnyy`). Never edit existing migrations.
- **Mock mode**: The auth middleware checks for cookie presence only, not validity. This means mock mode (no real Supabase) can still work if a fake cookie is injected in tests.
- **Display name source of truth** moves from localStorage to `user_profiles.display_name`. localStorage remains a cache for quick access in the party room.
- **Username is optional** — users can set it later from `/profile`. No blocking onboarding step required.
- **Existing tests will break** after Task 3 (middleware). Task 8 addresses this with cookie injection for mock mode.
- **The protect-files hook** will block edits to existing migration files. Only create new ones.
