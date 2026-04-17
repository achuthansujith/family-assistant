/**
 * Tests that completion alerts are delivered back to the original assigner (person A)
 * when person B completes an assigned item.
 *
 * Completion alerts use the same push/send route, targeting person A's userId.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { PERSON_A, PERSON_B, SUB_A, chainable } from "../mocks/supabase";

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

describe("Completion notifications (Person B → Person A)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VAPID_SUBJECT = "mailto:test@example.com";
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "mock-pub";
    process.env.VAPID_PRIVATE_KEY = "mock-priv";
    mockSendNotification.mockResolvedValue({ statusCode: 201 });
  });

  it("notifies person A when person B completes a chore", async () => {
    mockGetUser.mockResolvedValue({ data: { user: PERSON_B } });
    mockFrom.mockReturnValue(chainable({ data: [SUB_A], error: null }));

    const res = await sendNotif({
      title: "Chore completed!",
      body: "Person B completed: Take out trash",
      url: "/chores",
      userId: PERSON_A.id,
    });
    const data = await res.json();

    expect(data.sent).toBe(1);
    const payload = JSON.parse((mockSendNotification.mock.calls[0] as any)[1]);
    expect(payload.title).toBe("Chore completed!");
    expect(payload.url).toBe("/chores");
  });

  it("notifies person A when person B completes a reminder", async () => {
    mockGetUser.mockResolvedValue({ data: { user: PERSON_B } });
    mockFrom.mockReturnValue(chainable({ data: [SUB_A], error: null }));

    const res = await sendNotif({
      title: "Reminder done",
      body: "Person B completed: Doctor appointment",
      url: "/reminders",
      userId: PERSON_A.id,
    });
    const data = await res.json();

    expect(data.sent).toBe(1);
  });

  it("handles person A having multiple devices — notifies all", async () => {
    mockGetUser.mockResolvedValue({ data: { user: PERSON_B } });
    const sub2 = { endpoint: "https://fcm.example/a2", p256dh: "pk-a2", auth: "auth-a2" };
    mockFrom.mockReturnValue(chainable({ data: [SUB_A, sub2], error: null }));

    const res = await sendNotif({
      title: "Done!",
      body: "Completed",
      userId: PERSON_A.id,
    });
    const data = await res.json();

    expect(mockSendNotification).toHaveBeenCalledTimes(2);
    expect(data.sent).toBe(2);
    expect(data.total).toBe(2);
  });

  it("returns sent:0 when person A has no devices subscribed", async () => {
    mockGetUser.mockResolvedValue({ data: { user: PERSON_B } });
    mockFrom.mockReturnValue(chainable({ data: [], error: null }));

    const res = await sendNotif({ title: "Done", userId: PERSON_A.id });
    const data = await res.json();

    expect(data.sent).toBe(0);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("includes deep-link url in completion notification", async () => {
    mockGetUser.mockResolvedValue({ data: { user: PERSON_B } });
    mockFrom.mockReturnValue(chainable({ data: [SUB_A], error: null }));

    await sendNotif({
      title: "Done",
      body: "Completed: Dishes",
      url: "/chores?highlight=dishes-123",
      userId: PERSON_A.id,
    });

    const payload = JSON.parse((mockSendNotification.mock.calls[0] as any)[1]);
    expect(payload.url).toBe("/chores?highlight=dishes-123");
  });
});