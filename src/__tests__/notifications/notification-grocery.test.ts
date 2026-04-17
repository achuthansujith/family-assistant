/**
 * Tests for grocery and event notifications across household members.
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

describe("Grocery notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VAPID_SUBJECT = "mailto:test@example.com";
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "mock-pub";
    process.env.VAPID_PRIVATE_KEY = "mock-priv";
    mockSendNotification.mockResolvedValue({ statusCode: 201 });
  });

  it("notifies person B when assigned to pick up a grocery item", async () => {
    mockGetUser.mockResolvedValue({ data: { user: PERSON_A } });
    mockFrom.mockReturnValue(chainable({ data: [SUB_B], error: null }));

    const res = await sendNotif({
      title: "Grocery item assigned",
      body: "Please pick up: Milk, Eggs",
      url: "/groceries",
      userId: PERSON_B.id,
    });
    const data = await res.json();

    expect(data.sent).toBe(1);
    const payload = JSON.parse((mockSendNotification.mock.calls[0] as any)[1]);
    expect(payload.url).toBe("/groceries");
  });

  it("notifies person A when person B marks grocery item as purchased", async () => {
    mockGetUser.mockResolvedValue({ data: { user: PERSON_B } });
    mockFrom.mockReturnValue(chainable({ data: [SUB_A], error: null }));

    const res = await sendNotif({
      title: "Item purchased",
      body: "Person B bought: Milk",
      url: "/groceries",
      userId: PERSON_A.id,
    });
    const data = await res.json();

    expect(data.sent).toBe(1);
  });
});

describe("Event notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VAPID_SUBJECT = "mailto:test@example.com";
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "mock-pub";
    process.env.VAPID_PRIVATE_KEY = "mock-priv";
    mockSendNotification.mockResolvedValue({ statusCode: 201 });
  });

  it("can notify all household members of a new event", async () => {
    mockGetUser.mockResolvedValue({ data: { user: PERSON_A } });
    // First call for person B, second for person A (if self-notifying)
    mockFrom
      .mockReturnValueOnce(chainable({ data: [SUB_B], error: null }))
      .mockReturnValueOnce(chainable({ data: [SUB_A], error: null }));

    // Simulate notifying each member individually
    await sendNotif({
      title: "New household event",
      body: "Family dinner on Saturday at 7pm",
      url: "/events",
      userId: PERSON_B.id,
    });

    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    const payload = JSON.parse((mockSendNotification.mock.calls[0] as any)[1]);
    expect(payload.url).toBe("/events");
  });

  it("notification payload includes icon and badge fields", async () => {
    mockGetUser.mockResolvedValue({ data: { user: PERSON_A } });
    mockFrom.mockReturnValue(chainable({ data: [SUB_B], error: null }));

    await sendNotif({ title: "Event", body: "Test", userId: PERSON_B.id });

    const payload = JSON.parse((mockSendNotification.mock.calls[0] as any)[1]);
    expect(payload.icon).toBeDefined();
    expect(payload.badge).toBeDefined();
  });
});