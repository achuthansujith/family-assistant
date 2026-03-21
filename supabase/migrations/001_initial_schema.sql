-- ============================================================
-- Household AI - Initial Schema
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- HOUSEHOLDS
-- ============================================================
create table households (
  id uuid primary key default uuid_generate_v4(),
  name text not null default 'Our Home',
  invite_code text unique not null default substr(md5(random()::text), 1, 8),
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- HOUSEHOLD MEMBERS
-- ============================================================
create table household_members (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  unique(household_id, user_id)
);

create index idx_household_members_household on household_members(household_id);
create index idx_household_members_user on household_members(user_id);

-- ============================================================
-- HOUSEHOLD SETTINGS
-- ============================================================
create table household_settings (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null unique references households(id) on delete cascade,
  ai_enabled boolean not null default true,
  ai_max_calls_per_day integer not null default 5,
  ai_max_summary_tokens integer not null default 400,
  scheduled_summary_enabled boolean not null default false,
  scheduled_summary_time text not null default '07:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- CHORES
-- ============================================================
create table chores (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  title text not null,
  notes text,
  due_date date,
  recurrence_rule text, -- 'daily' | 'weekly' | 'monthly' | 'custom:N:days'
  assignee_id uuid references profiles(id),
  rotate_assignees boolean not null default false,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'pending' check (status in ('pending', 'done', 'snoozed')),
  snoozed_until timestamptz,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_chores_household on chores(household_id);
create index idx_chores_due_date on chores(due_date);
create index idx_chores_status on chores(status);
create index idx_chores_assignee on chores(assignee_id);

-- ============================================================
-- CHORE COMPLETIONS
-- ============================================================
create table chore_completions (
  id uuid primary key default uuid_generate_v4(),
  chore_id uuid not null references chores(id) on delete cascade,
  completed_by uuid not null references profiles(id),
  completed_at timestamptz not null default now(),
  notes text
);

create index idx_chore_completions_chore on chore_completions(chore_id);

-- ============================================================
-- REMINDERS
-- ============================================================
create table reminders (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  title text not null,
  notes text,
  due_at timestamptz not null,
  created_by uuid not null references profiles(id),
  assigned_to uuid references profiles(id), -- null = self
  status text not null default 'pending' check (status in ('pending', 'done', 'snoozed')),
  snoozed_until timestamptz,
  linked_entity_type text, -- 'chore' | 'grocery_item' | 'event' | null
  linked_entity_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_reminders_household on reminders(household_id);
create index idx_reminders_due_at on reminders(due_at);
create index idx_reminders_assigned_to on reminders(assigned_to);

-- ============================================================
-- GROCERY ITEMS
-- ============================================================
create table grocery_items (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  quantity text,
  category text default 'other' check (category in ('produce', 'dairy', 'meat', 'bakery', 'frozen', 'snacks', 'beverages', 'household', 'personal_care', 'other')),
  purchased boolean not null default false,
  purchased_by uuid references profiles(id),
  purchased_at timestamptz,
  added_by uuid not null references profiles(id),
  from_template_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_grocery_items_household on grocery_items(household_id);
create index idx_grocery_items_purchased on grocery_items(purchased);

-- ============================================================
-- GROCERY TEMPLATES (recurring grocery lists)
-- ============================================================
create table grocery_templates (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  quantity text,
  category text default 'other',
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create index idx_grocery_templates_household on grocery_templates(household_id);

-- ============================================================
-- EVENTS
-- ============================================================
create table events (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  title text not null,
  description text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  category text not null default 'other' check (category in ('appointment', 'school', 'family', 'travel', 'bill_payment', 'other')),
  attendee_ids uuid[] not null default '{}',
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_events_household on events(household_id);
create index idx_events_starts_at on events(starts_at);

-- ============================================================
-- AI USAGE LOGS
-- ============================================================
create table ai_usage_logs (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references profiles(id),
  feature text not null, -- 'daily_summary' | 'weekly_summary' | 'quick_add' | 'parse_item'
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  model text,
  success boolean not null default true,
  error_message text,
  created_at timestamptz not null default now()
);

create index idx_ai_usage_logs_household on ai_usage_logs(household_id);
create index idx_ai_usage_logs_created_at on ai_usage_logs(created_at);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at before update on profiles for each row execute function update_updated_at();
create trigger trg_households_updated_at before update on households for each row execute function update_updated_at();
create trigger trg_household_settings_updated_at before update on household_settings for each row execute function update_updated_at();
create trigger trg_chores_updated_at before update on chores for each row execute function update_updated_at();
create trigger trg_reminders_updated_at before update on reminders for each row execute function update_updated_at();
create trigger trg_grocery_items_updated_at before update on grocery_items for each row execute function update_updated_at();
create trigger trg_events_updated_at before update on events for each row execute function update_updated_at();
