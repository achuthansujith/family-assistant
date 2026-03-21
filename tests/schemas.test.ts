import { describe, it, expect } from "vitest";
import {
  ChoreSchema, ReminderSchema, GroceryItemSchema, EventSchema, HouseholdSettingsSchema
} from "../src/lib/validators/schemas";

describe("ChoreSchema", () => {
  it("validates a valid chore", () => {
    const result = ChoreSchema.safeParse({ title: "Vacuum", priority: "high" });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = ChoreSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("validates recurrence rule", () => {
    const result = ChoreSchema.safeParse({ title: "Trash", recurrence_rule: "weekly" });
    expect(result.success).toBe(true);
  });

  it("validates custom recurrence", () => {
    const result = ChoreSchema.safeParse({ title: "Trash", recurrence_rule: "custom:3:days" });
    expect(result.success).toBe(true);
  });
});

describe("ReminderSchema", () => {
  it("validates a valid reminder", () => {
    const result = ReminderSchema.safeParse({
      title: "Call doctor",
      due_at: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing due_at", () => {
    const result = ReminderSchema.safeParse({ title: "Call doctor" });
    expect(result.success).toBe(false);
  });
});

describe("GroceryItemSchema", () => {
  it("validates with category", () => {
    const result = GroceryItemSchema.safeParse({ name: "Milk", category: "dairy" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid category", () => {
    const result = GroceryItemSchema.safeParse({ name: "Milk", category: "invalid_cat" });
    expect(result.success).toBe(false);
  });
});

describe("HouseholdSettingsSchema", () => {
  it("validates valid settings", () => {
    const result = HouseholdSettingsSchema.safeParse({
      ai_enabled: true,
      ai_max_calls_per_day: 5,
      ai_max_summary_tokens: 400,
      scheduled_summary_enabled: false,
      scheduled_summary_time: "07:00",
    });
    expect(result.success).toBe(true);
  });

  it("rejects calls over max", () => {
    const result = HouseholdSettingsSchema.safeParse({
      ai_enabled: true,
      ai_max_calls_per_day: 100,
      ai_max_summary_tokens: 400,
      scheduled_summary_enabled: false,
      scheduled_summary_time: "07:00",
    });
    expect(result.success).toBe(false);
  });
});
