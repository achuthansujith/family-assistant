-- ============================================================
-- Family OS Upgrade - Migration 005
-- Adds: meals, meal_plans, meal_ingredients, notifications,
--       visibility on items, last_completed_at on chores
-- ============================================================

-- ============================================================
-- MEALS (reusable meal templates)
-- ============================================================
create table meals (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  description text,
  prep_minutes integer,
  tags text[] not null default '{}',
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_meals_household on meals(household_id);

-- ============================================================
-- MEAL INGREDIENTS (linked to a meal template)
-- ============================================================
create table meal_ingredients (
  id uuid primary key default uuid_generate_v4(),
  meal_id uuid not null references meals(id) on delete cascade,
  name text not null,
  quantity text,
  category text default 'other' check (category in (
    'produce','dairy','meat','bakery','frozen','snacks','beverages','household','personal_care','other'
  ))
);

create index idx_meal_ingredients_meal on meal_ingredients(meal_id);

-- ============================================================
-- MEAL PLANS (assign a meal to a specific day slot)
-- ============================================================
create table meal_plans (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  meal_id uuid references meals(id) on delete set null,
  meal_name text not null, -- denormalized for display even if meal deleted
  plan_date date not null,
  slot text not null default 'dinner' check (slot in ('breakfast','lunch','dinner','snack')),
  notes text,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create index idx_meal_plans_household on meal_plans(household_id);
create index idx_meal_plans_date on meal_plans(plan_date);
create unique index idx_meal_plans_unique on meal_plans(household_id, plan_date, slot);

-- ============================================================
-- NOTIFICATIONS (in-app)
-- ============================================================
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text,
  type text not null default 'info' check (type in ('info','reminder','chore','grocery','meal','system')),
  read boolean not null default false,
  linked_entity_type text,
  linked_entity_id uuid,
  created_at timestamptz not null default now()
);

create index idx_notifications_user on notifications(user_id);
create index idx_notifications_read on notifications(read);

-- ============================================================
-- EXTEND EXISTING TABLES
-- ============================================================

-- Add visibility to chores, reminders, events (shared vs private)
alter table chores add column if not exists visibility text not null default 'shared'
  check (visibility in ('shared','private'));

alter table reminders add column if not exists visibility text not null default 'shared'
  check (visibility in ('shared','private'));

alter table events add column if not exists visibility text not null default 'shared'
  check (visibility in ('shared','private'));

-- Add last_completed_at to chores for recurring next-due calculation
alter table chores add column if not exists last_completed_at timestamptz;

-- Add need_soon flag to grocery_items
alter table grocery_items add column if not exists need_soon boolean not null default false;

-- ============================================================
-- UPDATED_AT TRIGGERS for new tables
-- ============================================================
create trigger trg_meals_updated_at before update on meals
  for each row execute function update_updated_at();

-- ============================================================
-- RLS for new tables
-- ============================================================
alter table meals enable row level security;
alter table meal_ingredients enable row level security;
alter table meal_plans enable row level security;
alter table notifications enable row level security;

-- MEALS
create policy "Members can view meals" on meals for select using (is_household_member(household_id));
create policy "Members can create meals" on meals for insert with check (is_household_member(household_id) and created_by = auth.uid());
create policy "Members can update meals" on meals for update using (is_household_member(household_id));
create policy "Members can delete meals" on meals for delete using (is_household_member(household_id));

-- MEAL INGREDIENTS (access via meal ownership)
create policy "Members can view ingredients" on meal_ingredients for select
  using (exists (select 1 from meals where id = meal_ingredients.meal_id and is_household_member(household_id)));
create policy "Members can manage ingredients" on meal_ingredients for all
  using (exists (select 1 from meals where id = meal_ingredients.meal_id and is_household_member(household_id)));

-- MEAL PLANS
create policy "Members can view meal plans" on meal_plans for select using (is_household_member(household_id));
create policy "Members can create meal plans" on meal_plans for insert with check (is_household_member(household_id) and created_by = auth.uid());
create policy "Members can update meal plans" on meal_plans for update using (is_household_member(household_id));
create policy "Members can delete meal plans" on meal_plans for delete using (is_household_member(household_id));

-- NOTIFICATIONS (user sees only their own)
create policy "Users can view own notifications" on notifications for select using (user_id = auth.uid());
create policy "Users can update own notifications" on notifications for update using (user_id = auth.uid());
create policy "Members can insert notifications" on notifications for insert
  with check (is_household_member(household_id));
