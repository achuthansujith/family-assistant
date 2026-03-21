// ============================================================
// Core domain types - mirrors DB schema
// ============================================================

export type Profile = {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Household = {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type HouseholdMember = {
  id: string;
  household_id: string;
  user_id: string;
  role: "owner" | "member";
  joined_at: string;
  profile?: Profile;
};

export type HouseholdSettings = {
  id: string;
  household_id: string;
  ai_enabled: boolean;
  ai_max_calls_per_day: number;
  ai_max_summary_tokens: number;
  scheduled_summary_enabled: boolean;
  scheduled_summary_time: string;
};

export type ChoreStatus = "pending" | "done" | "snoozed";
export type ChorePriority = "low" | "medium" | "high";
export type RecurrenceRule = "daily" | "weekly" | "monthly" | `custom:${number}:days`;
export type Visibility = "shared" | "private";

export type Chore = {
  id: string;
  household_id: string;
  title: string;
  notes: string | null;
  due_date: string | null;
  recurrence_rule: RecurrenceRule | null;
  assignee_id: string | null;
  rotate_assignees: boolean;
  priority: ChorePriority;
  status: ChoreStatus;
  snoozed_until: string | null;
  last_completed_at: string | null;
  visibility: Visibility;
  created_by: string;
  created_at: string;
  updated_at: string;
  assignee?: Profile;
};

export type ChoreCompletion = {
  id: string;
  chore_id: string;
  completed_by: string;
  completed_at: string;
  notes: string | null;
};

export type ReminderStatus = "pending" | "done" | "snoozed";

export type Reminder = {
  id: string;
  household_id: string;
  title: string;
  notes: string | null;
  due_at: string;
  created_by: string;
  assigned_to: string | null;
  status: ReminderStatus;
  snoozed_until: string | null;
  visibility: Visibility;
  linked_entity_type: "chore" | "grocery_item" | "event" | null;
  linked_entity_id: string | null;
  created_at: string;
  updated_at: string;
  assignee?: Profile;
};

export type GroceryCategory =
  | "produce" | "dairy" | "meat" | "bakery" | "frozen"
  | "snacks" | "beverages" | "household" | "personal_care" | "other";

export type GroceryItem = {
  id: string;
  household_id: string;
  name: string;
  quantity: string | null;
  category: GroceryCategory;
  purchased: boolean;
  purchased_by: string | null;
  purchased_at: string | null;
  added_by: string;
  from_template_id: string | null;
  need_soon: boolean;
  created_at: string;
  updated_at: string;
  adder?: Profile;
};

export type GroceryTemplate = {
  id: string;
  household_id: string;
  name: string;
  quantity: string | null;
  category: GroceryCategory;
  created_by: string;
  created_at: string;
};

export type EventCategory = "appointment" | "school" | "family" | "travel" | "bill_payment" | "other";

export type CalendarEvent = {
  id: string;
  household_id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  category: EventCategory;
  attendee_ids: string[];
  visibility: Visibility;
  created_by: string;
  created_at: string;
  updated_at: string;
};

// ============================================================
// MEALS
// ============================================================
export type Meal = {
  id: string;
  household_id: string;
  name: string;
  description: string | null;
  prep_minutes: number | null;
  tags: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  ingredients?: MealIngredient[];
};

export type MealIngredient = {
  id: string;
  meal_id: string;
  name: string;
  quantity: string | null;
  category: GroceryCategory;
};

export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export type MealPlan = {
  id: string;
  household_id: string;
  meal_id: string | null;
  meal_name: string;
  plan_date: string;
  slot: MealSlot;
  notes: string | null;
  created_by: string;
  created_at: string;
  meal?: Meal;
};

// ============================================================
// NOTIFICATIONS
// ============================================================
export type NotificationType = "info" | "reminder" | "chore" | "grocery" | "meal" | "system";

export type Notification = {
  id: string;
  household_id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: NotificationType;
  read: boolean;
  linked_entity_type: string | null;
  linked_entity_id: string | null;
  created_at: string;
};

export type AiUsageLog = {
  id: string;
  household_id: string;
  user_id: string;
  feature: "daily_summary" | "weekly_summary" | "quick_add" | "parse_item" | "meal_suggestion";
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  model: string | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
};

// ============================================================
// App-level types
// ============================================================

export type QuickAddResult =
  | { type: "chore"; data: Partial<Chore>; confidence: number }
  | { type: "reminder"; data: Partial<Reminder>; confidence: number }
  | { type: "grocery"; data: Partial<GroceryItem>[]; confidence: number }
  | { type: "event"; data: Partial<CalendarEvent>; confidence: number }
  | { type: "unknown"; raw: string; confidence: number };

export type DailySummary = {
  generated_at: string;
  ai_powered: boolean;
  overdue_chores: Chore[];
  due_today_chores: Chore[];
  todays_events: CalendarEvent[];
  pending_reminders: Reminder[];
  unpurchased_groceries: GroceryItem[];
  summary_text: string;
};