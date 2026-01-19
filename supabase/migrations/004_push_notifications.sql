-- Phase 5: Push Notifications Migration
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/jvoppjybagyeffklbohr/sql

-- ============================================
-- 1. Create push_tokens table
-- ============================================
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id),
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_push_tokens_session_id ON push_tokens(session_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);

-- ============================================
-- 2. Enable RLS on push_tokens
-- ============================================
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tokens
CREATE POLICY "Users can view their own tokens" ON push_tokens
  FOR SELECT USING (
    user_id = auth.uid() OR auth.uid() IS NULL
  );

CREATE POLICY "Users can insert their own tokens" ON push_tokens
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own tokens" ON push_tokens
  FOR UPDATE USING (
    user_id = auth.uid() OR auth.uid() IS NULL
  );

CREATE POLICY "Users can delete their own tokens" ON push_tokens
  FOR DELETE USING (
    user_id = auth.uid() OR auth.uid() IS NULL
  );

-- ============================================
-- 3. Function to link user_id to push_token
-- ============================================
CREATE OR REPLACE FUNCTION link_user_to_push_token()
RETURNS TRIGGER AS $$
BEGIN
  -- When a user signs in, link their user_id to push_tokens with matching session_id
  UPDATE push_tokens
  SET user_id = NEW.id
  WHERE session_id IN (
    SELECT session_id FROM party_members WHERE user_id = NEW.id
  )
  AND user_id IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. Create notification_logs table (optional, for debugging)
-- ============================================
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_session_id TEXT NOT NULL,
  party_id UUID REFERENCES parties(id) ON DELETE CASCADE,
  queue_item_id UUID REFERENCES queue_items(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('item_added', 'item_completed', 'reminder_due')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_party_id ON notification_logs(party_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);

-- Enable RLS
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Only allow viewing own notification logs
CREATE POLICY "Users can view their notification logs" ON notification_logs
  FOR SELECT USING (
    recipient_session_id IN (
      SELECT session_id FROM party_members WHERE user_id = auth.uid()
    )
    OR auth.uid() IS NULL
  );
