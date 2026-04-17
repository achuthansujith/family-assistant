/**
 * Tests for reminder-related notifications:
 * - Reminder assignment (person A assigns reminder to person B)
 * - Reminder due alert (notified when a reminder is due)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { PERSON_A, PERSON_B, SUB_A, SUB_B, chainable } from "../mocks/supabase";

const mockSendNotification = vi.fn();

vi.mock("web-push", () => ({
  default: { setVapidDetails: vi.fn(), sendNotification: mockSendNotification },
}));

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({ auth: { getUser: mockGetUser } }),
  createServiceClient: () => ({ from: mockFrom }),
}));

const { POST } = await import("@/app/api/push/send/route");

function sendNotif(body: object) {
  return POST(new NextRequest("http://localhost/api/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));
}

describe("Reminder notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VAPID_SUBJECT = "mailto:test@example.com";
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "mock-pub";
    process.env.VAPID_PRIVATE_KEY = "mock-priv";
    mockSendNotification.mockResolvedValue({ statusCode: 201 });
  });

  it("notifies person B when assigned a new reminder by person A", async () => {
    mockGetUser.mockResolvedValue({ data: { user: PERSON_A } });
    mockFrom.mockReturnValue(chainable({ data: [SUB_B], error: null }));

    const res = await sendNotif({
      title: "New reminder assigned",
      body: "Doctor appointment on Friday",
      url: "/reminders",
      userId: PERSON_B.id,
    });
    const data = await res.json();

    expect(data.sent).toBe(1);
    const payload = JSON.parse((mockSendNotification.mock.calls[0] as any)[1]);
    expect(payload.title).toContain("reminder");
    expect(payload.url).toBe("/reminders");
  });

  it("sends due-alert to the assigned person when reminder is due", async () => {
    mockGetUser.mockResolvedValue({ data: { user: PERSON_A } });
    mockFrom.mockReturnValue(chainable({ data: [SUB_B], error: null }));

    const res = await sendNotif({
      title: "Reminder due now",
      body: "Doctor appointment is due",
      url: "/reminders",
      userId: PERSON_B.id,
    });
    const data = await res.json();

    expect(data.sent).toBe(1);
    const payload = JSON.parse((mockSendNotification.mock.calls[0] as any)[1]);
    expect(payload.title).toBe("Reminder due now");
  });

  it("notifies person A when person B completes a reminder", async () => {
    mockGetUser.mockResolvedValue({ data: { user: PERSON_B } });
    mockFrom.mockReturnValue(chainable({ data: [SUB_A], error: null }));

    const res = await sendNotif({
      title: "Reminder completed",
      body: "Person B completed: Doctor appointment",
      url: "/reminders",
      userId: PERSON_A.id,
    });
    const data = await res.json();

    expect(data.sent).toBe(1);
  });
});