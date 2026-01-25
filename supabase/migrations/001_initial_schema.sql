-- Phase 1: Initial Database Schema
-- Run this in Supabase SQL Editor first: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql

-- ============================================
-- 1. Create parties table
-- ============================================
CREATE TABLE IF NOT EXISTS parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT,
  host_session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Create index for code lookups
CREATE INDEX IF NOT EXISTS idx_parties_code ON parties(code);

-- ============================================
-- 2. Create party_members table
-- ============================================
CREATE TABLE IF NOT EXISTS party_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '🎉',
  is_host BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for party lookups
CREATE INDEX IF NOT EXISTS idx_party_members_party_id ON party_members(party_id);
CREATE INDEX IF NOT EXISTS idx_party_members_session_id ON party_members(session_id);

-- Unique constraint: one session per party
CREATE UNIQUE INDEX IF NOT EXISTS idx_party_members_unique ON party_members(party_id, session_id);

-- ============================================
-- 3. Create queue_items table
-- ============================================
CREATE TABLE IF NOT EXISTS queue_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('youtube', 'tweet', 'reddit', 'note')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'showing', 'shown')),
  position INTEGER NOT NULL,
  added_by_name TEXT NOT NULL,
  added_by_session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- YouTube fields
  title TEXT,
  channel TEXT,
  duration TEXT,
  thumbnail TEXT,

  -- Tweet fields
  tweet_author TEXT,
  tweet_handle TEXT,
  tweet_content TEXT,
  tweet_timestamp TEXT,

  -- Reddit fields
  subreddit TEXT,
  reddit_title TEXT,
  reddit_body TEXT,
  upvotes INTEGER,
  comment_count INTEGER,

  -- Note fields
  note_content TEXT
);

-- Create indexes for queue item queries
CREATE INDEX IF NOT EXISTS idx_queue_items_party_id ON queue_items(party_id);
CREATE INDEX IF NOT EXISTS idx_queue_items_status ON queue_items(status);
CREATE INDEX IF NOT EXISTS idx_queue_items_position ON queue_items(party_id, position);

-- ============================================
-- 4. Enable Realtime for all tables
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE parties;
ALTER PUBLICATION supabase_realtime ADD TABLE party_members;
ALTER PUBLICATION supabase_realtime ADD TABLE queue_items;

-- ============================================
-- 5. Helper function to generate party codes
-- ============================================
CREATE OR REPLACE FUNCTION generate_party_code() RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
