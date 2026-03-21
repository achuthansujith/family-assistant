import { z } from "zod";

export const ProfileSchema = z.object({
  display_name: z.string().min(1).max(50),
  avatar_url: z.string().url().optional().nullable(),
});

export const HouseholdSchema = z.object({
  name: z.string().min(1).max(100),
});

export const ChoreSchema = z.object({
  title: z.string().min(1).max(200),
  notes: z.string().max(1000).optional().nullable(),
  due_date: z.string().optional().nullable(),
  recurrence_rule: z.enum(["daily", "weekly", "monthly"]).or(
    z.string().regex(/^custom:\d+:days$/)
  ).optional().nullable(),
  assignee_id: z.string().uuid().optional().nullable(),
  rotate_assignees: z.boolean().default(false),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  status: z.enum(["pending", "done", "snoozed"]).default("pending"),
  snoozed_until: z.string().datetime().optional().nullable(),
});

export const ReminderSchema = z.object({
  title: z.string().min(1).max(200),
  notes: z.string().max(1000).optional().nullable(),
  due_at: z.string().datetime(),
  assigned_to: z.string().uuid().optional().nullable(),
  linked_entity_type: z.enum(["chore", "grocery_item", "event"]).optional().nullable(),
  linked_entity_id: z.string().uuid().optional().nullable(),
});

export const GroceryItemSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.string().max(50).optional().nullable(),
  category: z.enum([
    "produce", "dairy", "meat", "bakery", "frozen",
    "snacks", "beverages", "household", "personal_care", "other"
  ]).default("other"),
});

export const GroceryTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.string().max(50).optional().nullable(),
  category: z.enum([
    "produce", "dairy", "meat", "bakery", "frozen",
    "snacks", "beverages", "household", "personal_care", "other"
  ]).default("other"),
});

export const EventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  location: z.string().max(300).optional().nullable(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime().optional().nullable(),
  all_day: z.boolean().default(false),
  category: z.enum(["appointment", "school", "family", "travel", "bill_payment", "other"]).default("other"),
  attendee_ids: z.array(z.string().uuid()).default([]),
});

export const QuickAddInputSchema = z.object({
  text: z.string().min(1).max(500),
  // household_id is now derived server-side from session - not accepted from client
});

export const HouseholdSettingsSchema = z.object({
  ai_enabled: z.boolean(),
  ai_max_calls_per_day: z.number().int().min(0).max(50),
  ai_max_summary_tokens: z.number().int().min(100).max(1000),
  scheduled_summary_enabled: z.boolean(),
  scheduled_summary_time: z.string().regex(/^\d{2}:\d{2}$/),
});

export const JoinHouseholdSchema = z.object({
  invite_code: z.string().min(6).max(12),
});

// AI response schemas - validate before accepting
export const AiQuickAddResponseSchema = z.object({
  type: z.enum(["chore", "reminder", "grocery", "event", "unknown"]),
  confidence: z.number().min(0).max(1),
  data: z.record(z.unknown()),
});

export const AiSummaryResponseSchema = z.object({
  summary: z.string().max(2000),
});
