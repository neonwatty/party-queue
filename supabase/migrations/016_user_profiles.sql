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
