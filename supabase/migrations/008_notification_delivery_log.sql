-- ============================================================
-- NOTIFICATION DELIVERY LOG
-- Tracks summary notifications sent to household members.
-- Migration 006 defined this table but was never applied to
-- production. This migration creates it with the correct schema.
-- ============================================================

-- Drop the old definition from 006 if it somehow got applied with
-- the wrong columns, then recreate cleanly.
drop table if exists notification_delivery_log;

create table notification_delivery_log (
  id          uuid        primary key default gen_random_uuid(),
  household_id uuid       references households(id) on delete cascade,
  type        text        not null check (type in ('morning', 'evening', 'manual')),
  summary     text,
  sent_at     timestamptz not null default now(),
  sent_by     uuid        references auth.users(id) on delete set null
);

create index idx_notif_log_household on notification_delivery_log(household_id);
create index idx_notif_log_sent_at   on notification_delivery_log(sent_at desc);

alter table notification_delivery_log enable row level security;

-- Household members can read logs for their own household
create policy "Household members can view delivery log"
  on notification_delivery_log
  for select
  using (
    household_id in (
      select household_id from household_members where user_id = auth.uid()
    )
  );

-- Authenticated users can insert (service role used in practice)
create policy "Authenticated can insert delivery log"
  on notification_delivery_log
  for insert
  with check (auth.uid() is not null);
