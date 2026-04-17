import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { PERSON_A, PERSON_B, SUB_B, chainable } from "../mocks/supabase";

const mockSendNotification = vi.fn();
const mockSetVapidDetails = vi.fn();

vi.mock("web-push", () => ({
  default: { setVapidDetails: mockSetVapidDetails, sendNotification: mockSendNotification },
}));

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({ auth: { getUser: mockGetUser } }),
  createServiceClient: () => ({ from: mockFrom }),
}));

// Import after mocks are registered
const { POST } = await import("@/app/api/push/send/route");

function req(body: object) {
  return new NextRequest("http://localhost/api/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/push/send", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VAPID_SUBJECT = "mailto:test@example.com";
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "mock-vapid-pub";
    process.env.VAPID_PRIVATE_KEY = "mock-vapid-priv";
    mockSendNotification.mockResolvedValue({ statusCode: 201 });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(req({ title: "Test", body: "Hi" }));
    expect(res.status).toBe(401);
  });

  it("delivers notification to target user (person B) when person A sends with userId", async () => {
    mockGetUser.mockResolvedValue({ data: { user: PERSON_A } });
    mockFrom.mockReturnValue(chainable({ data: [SUB_B], error: null }));

    const res = await POST(req({
      title: "New chore assigned",
      body: "Person A assigned you: Take out trash",
      url: "/chores",
      userId: PERSON_B.id,
    }));
    const data = await res.json();

    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    expect(mockSendNotification).toHaveBeenCalledWith(
      { endpoint: SUB_B.endpoint, keys: { p256dh: SUB_B.p256dh, auth: SUB_B.auth } },
      expect.stringContaining("Take out trash")
    );
    expect(data.sent).toBe(1);
    expect(data.total).toBe(1);
  });

  it("returns sent:0 when target user has no subscriptions", async () => {
    mockGetUser.mockResolvedValue({ data: { user: PERSON_A } });
    mockFrom.mockReturnValue(chainable({ data: [], error: null }));

    const res = await POST(req({ title: "Test", userId: PERSON_B.id }));
    const data = await res.json();

    expect(data.sent).toBe(0);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("targets the calling user when no userId is provided", async () => {
    mockGetUser.mockResolvedValue({ data: { user: PERSON_A } });
    mockFrom.mockReturnValue(chainable({ data: [SUB_B], error: null }));

    await POST(req({ title: "Self-notify" }));

    const fromCall = mockFrom.mock.calls[0];
    expect(fromCall[0]).toBe("push_subscriptions");
  });

  it("includes url in notification payload", async () => {
    mockGetUser.mockResolvedValue({ data: { user: PERSON_A } });
    mockFrom.mockReturnValue(chainable({ data: [SUB_B], error: null }));

    await POST(req({ title: "Done", body: "Chore complete", url: "/chores/123", userId: PERSON_B.id }));

    const payload = JSON.parse((mockSendNotification.mock.calls[0] as any)[1]);
    expect(payload.url).toBe("/chores/123");
  });

  it("counts only fulfilled sends in response", async () => {
    mockGetUser.mockResolvedValue({ data: { user: PERSON_A } });
    mockFrom.mockReturnValue(chainable({
      data: [SUB_B, { endpoint: "https://dead.example", p256dh: "x", auth: "y" }],
      error: null,
    }));
    mockSendNotification
      .mockResolvedValueOnce({ statusCode: 201 })
      .mockRejectedValueOnce(Object.assign(new Error("Gone"), { statusCode: 410 }));

    const res = await POST(req({ title: "Test", userId: PERSON_B.id }));
    const data = await res.json();

    expect(data.sent).toBe(1);
    expect(data.total).toBe(2);
  });
});