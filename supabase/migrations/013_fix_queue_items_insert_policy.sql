-- Migration 013: Fix queue_items INSERT policy to require party membership
--
-- Problem: The "Anyone can add queue items" policy (from migration 005) only checks
-- that the party exists, not that the user is a member of it. This allows any user
-- with the party_id to insert queue items without joining the party first.
--
-- Fix: Replace with a policy that verifies the inserting user is a member of the party,
-- matching on either session_id (anonymous users) or user_id (authenticated users).

-- ============================================
-- 1. Drop the overly permissive INSERT policy
-- ============================================

DROP POLICY IF EXISTS "Anyone can add queue items" ON queue_items;

-- ============================================
-- 2. Create a new INSERT policy requiring party membership
-- ============================================

CREATE POLICY "Party members can add queue items" ON queue_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM party_members
      WHERE party_members.party_id = queue_items.party_id
      AND (
        party_members.session_id = queue_items.added_by_session_id
        OR (auth.uid() IS NOT NULL AND party_members.user_id = auth.uid())
      )
    )
  );
