-- ═══════════════════════════════════════════════
-- AI(r)Drop Waitlist — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════

-- Waitlist entries table
CREATE TABLE waitlist_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  metadata JSONB DEFAULT '{}',
  source TEXT DEFAULT 'landing_page',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Metadata schema:
-- {
--   "wallet_address": "0x...",
--   "branch": "educator|builder|creator|scout|diplomat",
--   "source": "landing_page|twitter|referral"
-- }

-- Enable Row Level Security
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts only (no read/update/delete from client)
CREATE POLICY "Allow anonymous inserts"
  ON waitlist_entries FOR INSERT
  TO anon
  WITH CHECK (true);

-- Index for fast count queries
CREATE INDEX idx_waitlist_created_at ON waitlist_entries (created_at DESC);

-- Function to get waitlist count (for landing page display)
CREATE OR REPLACE FUNCTION get_waitlist_count()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER FROM waitlist_entries;
$$;
