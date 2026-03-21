-- ============================================================
-- Row Level Security Policies
-- ============================================================

alter table profiles enable row level security;
alter table households enable row level security;
alter table household_members enable row level security;
alter table household_settings enable row level security;
alter table chores enable row level security;
alter table chore_completions enable row level security;
alter table reminders enable row level security;
alter table grocery_items enable row level security;
alter table grocery_templates enable row level security;
alter table events enable row level security;
alter table ai_usage_logs enable row level security;

-- Helper: is the current user a member of a given household?
create or replace function is_household_member(hid uuid)
returns boolean as $$
  select exists (
    select 1 from household_members
    where household_id = hid and user_id = auth.uid()
  );
$$ language sql security definer stable;

-- Helper: get the household_id for the current user (first one)
create or replace function my_household_id()
returns uuid as $$
  select household_id from household_members
  where user_id = auth.uid()
  limit 1;
$$ language sql security definer stable;

-- PROFILES
create policy "Users can view own profile" on profiles for select using (id = auth.uid());
create policy "Users can update own profile" on profiles for update using (id = auth.uid());
create policy "Household members can view each other" on profiles for select
  using (id in (
    select user_id from household_members where household_id = my_household_id()
  ));

-- HOUSEHOLDS
create policy "Members can view their household" on households for select
  using (is_household_member(id));
create policy "Owner can update household" on households for update
  using (created_by = auth.uid());
create policy "Authenticated users can create household" on households for insert
  with check (auth.uid() is not null);

-- HOUSEHOLD MEMBERS
create policy "Members can view household members" on household_members for select
  using (is_household_member(household_id));
create policy "Owner can manage members" on household_members for all
  using (
    exists (
      select 1 from household_members hm
      where hm.household_id = household_members.household_id
        and hm.user_id = auth.uid()
        and hm.role = 'owner'
    )
  );
create policy "Users can join via invite" on household_members for insert
  with check (user_id = auth.uid());

-- HOUSEHOLD SETTINGS
create policy "Members can view settings" on household_settings for select
  using (is_household_member(household_id));
create policy "Owner can update settings" on household_settings for update
  using (
    exists (
      select 1 from household_members
      where household_id = household_settings.household_id
        and user_id = auth.uid() and role = 'owner'
    )
  );
create policy "Owner can insert settings" on household_settings for insert
  with check (
    exists (
      select 1 from household_members
      where household_id = household_settings.household_id
        and user_id = auth.uid() and role = 'owner'
    )
  );

-- CHORES
create policy "Members can view chores" on chores for select using (is_household_member(household_id));
create policy "Members can create chores" on chores for insert with check (is_household_member(household_id) and created_by = auth.uid());
create policy "Members can update chores" on chores for update using (is_household_member(household_id));
create policy "Members can delete chores" on chores for delete using (is_household_member(household_id));

-- CHORE COMPLETIONS
create policy "Members can view completions" on chore_completions for select
  using (exists (select 1 from chores where id = chore_completions.chore_id and is_household_member(household_id)));
create policy "Members can add completions" on chore_completions for insert
  with check (completed_by = auth.uid() and exists (select 1 from chores where id = chore_completions.chore_id and is_household_member(household_id)));

-- REMINDERS
create policy "Members can view reminders" on reminders for select using (is_household_member(household_id));
create policy "Members can create reminders" on reminders for insert with check (is_household_member(household_id) and created_by = auth.uid());
create policy "Members can update reminders" on reminders for update using (is_household_member(household_id));
create policy "Members can delete reminders" on reminders for delete using (is_household_member(household_id));

-- GROCERY ITEMS
create policy "Members can view groceries" on grocery_items for select using (is_household_member(household_id));
create policy "Members can add groceries" on grocery_items for insert with check (is_household_member(household_id) and added_by = auth.uid());
create policy "Members can update groceries" on grocery_items for update using (is_household_member(household_id));
create policy "Members can delete groceries" on grocery_items for delete using (is_household_member(household_id));

-- GROCERY TEMPLATES
create policy "Members can view templates" on grocery_templates for select using (is_household_member(household_id));
create policy "Members can manage templates" on grocery_templates for all using (is_household_member(household_id));

-- EVENTS
create policy "Members can view events" on events for select using (is_household_member(household_id));
create policy "Members can create events" on events for insert with check (is_household_member(household_id) and created_by = auth.uid());
create policy "Members can update events" on events for update using (is_household_member(household_id));
create policy "Members can delete events" on events for delete using (is_household_member(household_id));

-- AI USAGE LOGS
create policy "Members can view ai logs" on ai_usage_logs for select using (is_household_member(household_id));
create policy "Members can insert ai logs" on ai_usage_logs for insert with check (is_household_member(household_id) and user_id = auth.uid());
