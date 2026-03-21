import { describe, it, expect } from "vitest";
import { deterministicParse } from "../src/lib/parsers/quick-add";

describe("deterministicParse", () => {
  it("parses grocery list with buy keyword", () => {
    const { result, needsAi } = deterministicParse("Buy milk and eggs");
    expect(needsAi).toBe(false);
    expect(result.type).toBe("grocery");
    expect(result.confidence).toBeGreaterThan(0.8);
    if (result.type === "grocery") {
      expect(result.data.length).toBe(2);
      expect(result.data[0].name).toBe("milk");
      expect(result.data[1].name).toBe("eggs");
    }
  });

  it("parses comma-separated grocery list", () => {
    const { result } = deterministicParse("milk, eggs, rice and soap");
    expect(result.type).toBe("grocery");
    if (result.type === "grocery") {
      expect(result.data.length).toBe(4);
    }
  });

  it("parses reminder with tomorrow", () => {
    const { result, needsAi } = deterministicParse("Remind me tomorrow 6pm to call school");
    expect(needsAi).toBe(false);
    expect(result.type).toBe("reminder");
    if (result.type === "reminder") {
      expect(result.data.due_at).toBeDefined();
      const due = new Date(result.data.due_at!);
      expect(due.getHours()).toBe(18);
    }
  });

  it("parses chore with weekly recurrence", () => {
    const { result } = deterministicParse("Clean bathroom every week");
    expect(result.type).toBe("chore");
    if (result.type === "chore") {
      expect(result.data.recurrence_rule).toBe("weekly");
    }
  });

  it("parses event with day and time", () => {
    const { result } = deterministicParse("Doctor appointment Friday 3pm");
    expect(result.type).toBe("event");
    if (result.type === "event") {
      expect(result.data.starts_at).toBeDefined();
    }
  });

  it("returns unknown for ambiguous input", () => {
    const { result, needsAi } = deterministicParse("something completely ambiguous xyz");
    expect(needsAi).toBe(true);
    expect(result.type).toBe("unknown");
  });
});
