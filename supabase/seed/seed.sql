-- ============================================================
-- Sample seed data (run after creating two test users in Supabase Auth)
-- Replace the UUIDs with real user IDs from your auth.users table
-- ============================================================

-- Insert profiles (these are normally created via trigger on signup)
-- insert into profiles (id, email, display_name) values
--   ('user-uuid-1', 'partner1@example.com', 'Alex'),
--   ('user-uuid-2', 'partner2@example.com', 'Jordan');

-- insert into households (id, name, created_by) values
--   ('household-uuid-1', 'Our Home', 'user-uuid-1');

-- insert into household_members (household_id, user_id, role) values
--   ('household-uuid-1', 'user-uuid-1', 'owner'),
--   ('household-uuid-1', 'user-uuid-2', 'member');

-- insert into household_settings (household_id) values ('household-uuid-1');

-- Sample chores
-- insert into chores (household_id, title, recurrence_rule, assignee_id, priority, created_by) values
--   ('household-uuid-1', 'Take out trash', 'weekly', 'user-uuid-1', 'high', 'user-uuid-1'),
--   ('household-uuid-1', 'Vacuum living room', 'weekly', 'user-uuid-2', 'medium', 'user-uuid-1'),
--   ('household-uuid-1', 'Clean bathroom', 'weekly', null, 'medium', 'user-uuid-1');

-- Sample grocery items
-- insert into grocery_items (household_id, name, quantity, category, added_by) values
--   ('household-uuid-1', 'Milk', '2L', 'dairy', 'user-uuid-1'),
--   ('household-uuid-1', 'Eggs', '12', 'dairy', 'user-uuid-1'),
--   ('household-uuid-1', 'Bread', '1 loaf', 'bakery', 'user-uuid-2');
