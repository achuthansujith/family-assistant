import { describe, it, expect, vi, beforeEach } from "vitest";
import { PERSON_A, chainable } from "../mocks/supabase";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({ auth: { getUser: mockGetUser }, from: mockFrom }),
}));

const { GET } = await import("@/app/api/notifications/bell/route");

const recentNotification = {
  id: "notif-1",
  type: "morning",
  summary_text: "Good morning!",
  ai_powered: false,
  created_at: new Date().toISOString(),
};

const oldNotification = {
  id: "notif-2",
  type: "evening",
  summary_text: "Good evening!",
  ai_powered: false,
  created_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25h ago
};

describe("GET /api/notifications/bell", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns notifications and unread count for authenticated user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: PERSON_A } });
    mockFrom.mockReturnValue(chainable({ data: [recentNotification], error: null }));

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.notifications).toHaveLength(1);
    expect(data.unread).toBe(1);
  });

  it("counts only notifications from last 24h as unread", async () => {
    mockGetUser.mockResolvedValue({ data: { user: PERSON_A } });
    mockFrom.mockReturnValue(
      chainable({ data: [recentNotification, oldNotification], error: null })
    );

    const res = await GET();
    const data = await res.json();

    expect(data.notifications).toHaveLength(2);
    expect(data.unread).toBe(1); // only recentNotification is within 24h
  });

  it("returns empty list and zero unread when no notifications exist", async () => {
    mockGetUser.mockResolvedValue({ data: { user: PERSON_A } });
    mockFrom.mockReturnValue(chainable({ data: [], error: null }));

    const res = await GET();
    const data = await res.json();

    expect(data.notifications).toEqual([]);
    expect(data.unread).toBe(0);
  });

  it("returns 500 when db query fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: PERSON_A } });
    mockFrom.mockReturnValue(chainable({ data: null, error: { message: "DB error" } }));

    const res = await GET();
    expect(res.status).toBe(500);
  });

  it("queries notification_delivery_log for the current user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: PERSON_A } });
    mockFrom.mockReturnValue(chainable({ data: [], error: null }));

    await GET();

    expect(mockFrom).toHaveBeenCalledWith("notification_delivery_log");
  });
});