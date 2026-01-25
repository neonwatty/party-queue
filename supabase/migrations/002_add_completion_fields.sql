-- Phase 2: Add Completion and User ID Fields
-- Run this in Supabase SQL Editor after 001_initial_schema.sql

-- ============================================
-- 1. Add user_id to party_members (for auth integration)
-- ============================================
ALTER TABLE party_members
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_party_members_user_id ON party_members(user_id);

-- ============================================
-- 2. Add reminder/completion fields to queue_items
-- ============================================
ALTER TABLE queue_items
ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

ALTER TABLE queue_items
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE;

ALTER TABLE queue_items
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE queue_items
ADD COLUMN IF NOT EXISTS completed_by_user_id UUID REFERENCES auth.users(id);

-- Create index for due date queries
CREATE INDEX IF NOT EXISTS idx_queue_items_due_date ON queue_items(due_date) WHERE due_date IS NOT NULL;

-- Create index for completion status queries
CREATE INDEX IF NOT EXISTS idx_queue_items_is_completed ON queue_items(is_completed);
