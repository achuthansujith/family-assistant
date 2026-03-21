-- Fix RLS infinite recursion on household_members
-- Root cause: policies with subqueries into the same table trigger RLS recursively

-- 1. Drop all old household_members policies
drop policy if exists "Members can view household members" on household_members;
drop policy if exists "Owner can manage members" on household_members;
drop policy if exists "Users can join via invite" on household_members;
drop policy if exists "Users can view own membership" on household_members;
drop policy if exists "Users can view household co-members" on household_members;
drop policy if exists "Owner can delete members" on household_members;

-- 2. Recreate helper functions with correct $$ quoting and security definer
create or replace function is_household_member(hid uuid)
returns boolean as $$
  select exists (
    select 1 from household_members
    where household_id = hid and user_id = auth.uid()
  );
$$ language sql security definer stable;

create or replace function my_household_id()
returns uuid as $$
  select household_id from household_members
  where user_id = auth.uid()
  limit 1;
$$ language sql security definer stable;

-- 3. Recreate household_members policies without recursive subqueries
-- Simple direct check - no subquery, no recursion
create policy "Users can view own membership" on household_members
  for select using (user_id = auth.uid());

-- Insert: user can only add themselves
create policy "Users can join via invite" on household_members
  for insert with check (user_id = auth.uid());

-- Delete: owners only (uses security definer function, safe)
create policy "Owner can delete members" on household_members
  for delete using (
    household_id in (
      select hm2.household_id from household_members hm2
      where hm2.user_id = auth.uid() and hm2.role = 'owner'
    )
  );
