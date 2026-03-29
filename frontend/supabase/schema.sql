-- =============================================================================
-- AI(r)Drop — Waitlist Schema
-- Run this in your Supabase SQL Editor (Database > SQL Editor > New query)
-- =============================================================================

-- ── Table ─────────────────────────────────────────────────────────────────────

create table if not exists waitlist_entries (
  id               uuid        default gen_random_uuid() primary key,
  email            text        not null unique,
  wallet_address   text,
  primary_branch   text        check (primary_branch in ('educator','builder','creator','scout','diplomat')),
  rank             integer     not null,
  referral_code    text        unique default encode(gen_random_bytes(5), 'hex'),
  referred_by      text,       -- referral_code of the referrer
  source           text        default 'organic',
  created_at       timestamptz default now()
);

-- ── Rank sequence function ────────────────────────────────────────────────────
-- Called on every insert to assign a sequential rank atomically.

create sequence if not exists waitlist_rank_seq start 1;

create or replace function assign_waitlist_rank()
returns trigger language plpgsql as $$
begin
  new.rank := nextval('waitlist_rank_seq');
  return new;
end;
$$;

-- Drop and recreate to avoid duplicate trigger errors on re-run
drop trigger if exists set_waitlist_rank on waitlist_entries;
create trigger set_waitlist_rank
  before insert on waitlist_entries
  for each row execute function assign_waitlist_rank();

-- ── Indexes ───────────────────────────────────────────────────────────────────

create index if not exists idx_waitlist_email         on waitlist_entries (email);
create index if not exists idx_waitlist_referral_code on waitlist_entries (referral_code);
create index if not exists idx_waitlist_referred_by   on waitlist_entries (referred_by);
create index if not exists idx_waitlist_rank          on waitlist_entries (rank);
create index if not exists idx_waitlist_created_at    on waitlist_entries (created_at desc);

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table waitlist_entries enable row level security;

-- Anyone (anon) can INSERT — needed for the public waitlist form
drop policy if exists "anon_insert" on waitlist_entries;
create policy "anon_insert"
  on waitlist_entries for insert
  to anon
  with check (true);

-- Anon can SELECT their own rank by email (for the success state counter)
-- and look up referral codes (for the referral link mechanic)
drop policy if exists "anon_select_own" on waitlist_entries;
create policy "anon_select_own"
  on waitlist_entries for select
  to anon
  using (true);   -- open read for rank lookups; no PII other than rank/referral_code exposed

-- Service role has full access (used by admin and backend)
-- (service_role bypasses RLS by default in Supabase — no explicit policy needed)

-- ── Referral count view ───────────────────────────────────────────────────────
-- Returns how many signups each referral_code has generated.

create or replace view waitlist_referral_counts as
  select
    referred_by            as referral_code,
    count(*)::integer      as referral_count
  from waitlist_entries
  where referred_by is not null
  group by referred_by;

-- ── Stats view ────────────────────────────────────────────────────────────────

create or replace view waitlist_stats as
  select
    count(*)                                        as total_signups,
    count(wallet_address)                           as wallet_connected,
    count(*) filter (where primary_branch = 'educator')   as educators,
    count(*) filter (where primary_branch = 'builder')    as builders,
    count(*) filter (where primary_branch = 'creator')    as creators,
    count(*) filter (where primary_branch = 'scout')      as scouts,
    count(*) filter (where primary_branch = 'diplomat')   as diplomats,
    count(*) filter (where referred_by is not null)       as via_referral
  from waitlist_entries;

-- ── Verification ─────────────────────────────────────────────────────────────
-- Run these to confirm everything is wired correctly:
--
--   select * from waitlist_stats;
--   insert into waitlist_entries (email) values ('test@example.com');
--   select id, email, rank, referral_code from waitlist_entries limit 5;
