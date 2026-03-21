-- ============================================================
-- Migration 006: Recurring events, notification prefs, visibility RLS
-- ============================================================

-- ============================================================
-- EXTEND EVENTS: recurrence fields
-- ============================================================
alter table events add column if not exists recurrence_type text
  check (recurrence_type in ('none','daily','weekly','monthly','custom'));
alter table events add column if not exists recurrence_interval integer default 1;
alter table events add column if not exists recurrence_end_date date;
alter table events add column if not exists recurrence_series_id uuid; -- groups instances of same series

-- Default existing rows
update events set recurrence_type = 'none' where recurrence_type is null;

-- ============================================================
-- USER NOTIFICATION PREFERENCES (per user, not per household)
-- ============================================================
create table if not exists user_notification_prefs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references profiles(id) on delete cascade,
  morning_enabled boolean not null default false,
  morning_time text not null default '07:30',  -- HH:MM
  evening_enabled boolean not null default false,
  evening_time text not null default '20:00',  -- HH:MM
  ai_summaries boolean not null default false,  -- use AI rewrite for notifications
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_notif_prefs_updated_at before update on user_notification_prefs
  for each row execute function update_updated_at();

-- RLS
alter table user_notification_prefs enable row level security;
create policy "Users manage own prefs" on user_notification_prefs
  for all using (user_id = auth.uid());

-- ============================================================
-- NOTIFICATION DELIVERY LOG
-- ============================================================
create table if not exists notification_delivery_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('morning','evening')),
  delivered_at timestamptz not null default now(),
  ai_powered boolean not null default false,
  summary_text text
);

create index idx_notif_delivery_user on notification_delivery_log(user_id);
create index idx_notif_delivery_date on notification_delivery_log(delivered_at);

alter table notification_delivery_log enable row level security;
create policy "Users view own delivery log" on notification_delivery_log
  for select using (user_id = auth.uid());
create policy "Service can insert delivery log" on notification_delivery_log
  for insert with check (true); -- service role only in practice

-- ============================================================
-- FIX EVENT VISIBILITY RLS
-- Private events only visible to creator; shared to all members
-- ============================================================
drop policy if exists "Members can view events" on events;

create policy "Members can view shared events" on events for select
  using (
    is_household_member(household_id)
    and (visibility = 'shared' or created_by = auth.uid())
  );
