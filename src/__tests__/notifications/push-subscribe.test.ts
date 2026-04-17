import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { PERSON_A, chainable } from "../mocks/supabase";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({ auth: { getUser: mockGetUser } }),
  createServiceClient: () => ({ from: mockFrom }),
}));

const { POST, DELETE } = await import("@/app/api/push/subscribe/route");

const validSub = {
  endpoint: "https://fcm.googleapis.com/fcm/send/test-123",
  keys: { p256dh: "mock-p256dh", auth: "mock-auth" },
};

function req(method: string, body: object) {
  return new NextRequest("http://localhost/api/push/subscribe", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/push/subscribe", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(req("POST", validSub));
    expect(res.status).toBe(401);
  });

  it("returns 400 when endpoint is missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: PERSON_A } });
    const res = await POST(req("POST", { keys: validSub.keys }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when p256dh key is missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: PERSON_A } });
    const res = await POST(req("POST", { endpoint: validSub.endpoint, keys: { auth: "x" } }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when auth key is missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: PERSON_A } });
    const res = await POST(req("POST", { endpoint: validSub.endpoint, keys: { p256dh: "x" } }));
    expect(res.status).toBe(400);
  });

  it("saves subscription to push_subscriptions table", async () => {
    mockGetUser.mockResolvedValue({ data: { user: PERSON_A } });
    mockFrom.mockReturnValue(chainable({ error: null }));

    const res = await POST(req("POST", validSub));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith("push_subscriptions");
  });

  it("returns 500 when db upsert fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: PERSON_A } });
    mockFrom.mockReturnValue(chainable({ error: { message: "DB error" } }));

    const res = await POST(req("POST", validSub));
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/push/subscribe", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await DELETE(req("DELETE", { endpoint: validSub.endpoint }));
    expect(res.status).toBe(401);
  });

  it("deletes subscription for authenticated user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: PERSON_A } });
    mockFrom.mockReturnValue(chainable({ error: null }));

    const res = await DELETE(req("DELETE", { endpoint: validSub.endpoint }));
    const data = await res.json();

    expect(data.ok).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith("push_subscriptions");
  });
});